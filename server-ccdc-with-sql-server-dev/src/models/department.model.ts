import sql from 'mssql';
import { getPool } from '../config/database';

export interface IDepartment {
  id?: string;
  name: string;
  code: string;
  unitId: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IDepartmentWithRelations extends IDepartment {
  unitInfo?: {
    id: string;
    name: string;
    code: string;
    address?: string;
  };
}

export class DepartmentModel {
  static async createTable(): Promise<void> {
    const pool = getPool();
    const query = `
      -- 1. Create the Table if it doesn't exist
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Departments' AND xtype='U')
      BEGIN
        CREATE TABLE Departments (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          name NVARCHAR(255) NOT NULL,
          code NVARCHAR(50) NOT NULL,
          unitId UNIQUEIDENTIFIER NOT NULL, -- Must match Units.id type
          description NVARCHAR(1000) NULL,
          createdAt DATETIME DEFAULT GETDATE(),
          updatedAt DATETIME DEFAULT GETDATE(),
          
          FOREIGN KEY (unitId) REFERENCES Units(id),
          CONSTRAINT UQ_Department_Code_Unit UNIQUE (code, unitId)
        );

        CREATE INDEX idx_departments_code ON Departments(code);
        CREATE INDEX idx_departments_unitId ON Departments(unitId);
        CREATE INDEX idx_departments_name ON Departments(name);
      END

      -- 2. Create the Trigger separately using EXEC to handle batch requirements
      IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_Departments_UpdatedAt')
      BEGIN
        EXEC('
          CREATE TRIGGER trg_Departments_UpdatedAt
          ON Departments
          AFTER UPDATE
          AS
          BEGIN
            SET NOCOUNT ON;
            UPDATE Departments
            SET updatedAt = GETDATE()
            FROM Departments d
            INNER JOIN inserted i ON d.id = i.id;
          END
        ');
      END
    `;

    await pool.request().query(query);
  }

  static async findAll(params: {
    unitId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ departments: IDepartmentWithRelations[]; total: number }> {
    const pool = getPool();
    const { unitId, search, page = 1, limit = 1000 } = params;

    const whereClauses: string[] = [];
    const request = pool.request();

    if (unitId) {
      whereClauses.push('d.unitId = @unitId');
      request.input('unitId', sql.UniqueIdentifier, unitId);
    }

    if (search) {
      whereClauses.push('(d.name LIKE @search OR d.code LIKE @search)');
      request.input('search', sql.NVarChar, `%${search}%`);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*) as total FROM Departments d ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        d.*,
        u.name as unit_name,
        u.code as unit_code,
        u.address as unit_address
      FROM Departments d
      LEFT JOIN Units u ON d.unitId = u.id
      ${whereClause}
      ORDER BY d.createdAt DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const [countResult, dataResult] = await Promise.all([
      request.query(countQuery),
      request
        .input('offset', sql.Int, offset)
        .input('limit', sql.Int, limit)
        .query(dataQuery)
    ]);

    const departments = dataResult.recordset.map(row => this.mapDepartmentWithRelations(row));

    return {
      departments,
      total: countResult.recordset[0].total
    };
  }

  static async findById(id: string): Promise<IDepartmentWithRelations | null> {
    const pool = getPool();
    const query = `
      SELECT 
        d.*,
        u.name as unit_name,
        u.code as unit_code,
        u.address as unit_address
      FROM Departments d
      LEFT JOIN Units u ON d.unitId = u.id
      WHERE d.id = @id
    `;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    if (result.recordset.length === 0) return null;

    return this.mapDepartmentWithRelations(result.recordset[0]);
  }

  static async findByCodeAndUnit(code: string, unitId: string): Promise<IDepartment | null> {
    const pool = getPool();
    const query = `
      SELECT * FROM Departments 
      WHERE code = @code AND unitId = @unitId
    `;

    const result = await pool.request()
      .input('code', sql.NVarChar, code)
      .input('unitId', sql.UniqueIdentifier, unitId)
      .query(query);

    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  static async create(department: IDepartment): Promise<IDepartmentWithRelations> {
    const pool = getPool();
    const query = `
      INSERT INTO Departments (name, code, unitId, description)
      OUTPUT INSERTED.id
      VALUES (@name, @code, @unitId, @description)
    `;

    const result = await pool.request()
      .input('name', sql.NVarChar, department.name)
      .input('code', sql.NVarChar, department.code.toUpperCase())
      .input('unitId', sql.UniqueIdentifier, department.unitId)
      .input('description', sql.NVarChar, department.description)
      .query(query);

    const insertedId = result.recordset[0].id;
    return this.findById(insertedId) as Promise<IDepartmentWithRelations>;
  }

  static async update(id: string, departmentData: Partial<IDepartment>): Promise<IDepartmentWithRelations | null> {
    const pool = getPool();
    const updates: string[] = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (departmentData.name !== undefined) {
      updates.push('name = @name');
      request.input('name', sql.NVarChar, departmentData.name);
    }
    if (departmentData.code !== undefined) {
      updates.push('code = @code');
      request.input('code', sql.NVarChar, departmentData.code.toUpperCase());
    }
    if (departmentData.unitId !== undefined) {
      updates.push('unitId = @unitId');
      request.input('unitId', sql.UniqueIdentifier, departmentData.unitId);
    }
    if (departmentData.description !== undefined) {
      updates.push('description = @description');
      request.input('description', sql.NVarChar, departmentData.description);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE Departments 
      SET ${updates.join(', ')}
      WHERE id = @id
    `;

    await request.query(query);
    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM Departments WHERE id = @id`;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    return result.rowsAffected[0] > 0;
  }

  static async countEmployees(departmentId: string): Promise<number> {
    const pool = getPool();
    const query = `SELECT COUNT(*) as total FROM Employees WHERE departmentId = @departmentId`;

    const result = await pool.request()
      .input('departmentId', sql.UniqueIdentifier, departmentId)
      .query(query);

    return result.recordset[0].total;
  }

  static async countPositions(departmentId: string): Promise<number> {
    const pool = getPool();
    const query = `SELECT COUNT(*) as total FROM Positions WHERE departmentId = @departmentId`;

    const result = await pool.request()
      .input('departmentId', sql.UniqueIdentifier, departmentId)
      .query(query);

    return result.recordset[0].total;
  }

  private static mapDepartmentWithRelations(row: any): IDepartmentWithRelations {
    const department: IDepartmentWithRelations = {
      id: row.id,
      name: row.name,
      code: row.code,
      unitId: row.unitId,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };

    if (row.unit_name) {
      department.unitInfo = {
        id: row.unitId,
        name: row.unit_name,
        code: row.unit_code,
        address: row.unit_address
      };
    }

    return department;
  }
}

export default DepartmentModel;