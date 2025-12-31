import sql from 'mssql';
import { getPool } from '../config/database';

export interface IPosition {
  id?: string;
  name: string;
  code: string;
  permissions?: string[];
  isActive?: boolean;
  departmentId: string;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPositionWithRelations extends IPosition {
  departmentInfo?: {
    id: string;
    name: string;
  };
  isSuperAdmin?: boolean;
  isManager?: boolean;
}

export class PositionModel {
  static async createTable(): Promise<void> {
    const pool = getPool();
    const query = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Positions' AND xtype='U')
      BEGIN
        CREATE TABLE Positions (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          name NVARCHAR(255) NOT NULL,
          code NVARCHAR(50) NOT NULL UNIQUE,
          permissions NVARCHAR(MAX) NULL, -- JSON array of strings
          isActive BIT DEFAULT 1,
          departmentId UNIQUEIDENTIFIER NOT NULL,
          [order] INT DEFAULT 1 CHECK ([order] >= 1),
          createdAt DATETIME DEFAULT GETDATE(),
          updatedAt DATETIME DEFAULT GETDATE(),
          
          FOREIGN KEY (departmentId) REFERENCES Departments(id),
          CONSTRAINT UQ_Position_Name_Department UNIQUE (name, departmentId)
        );

        CREATE INDEX idx_positions_code ON Positions(code);
        CREATE INDEX idx_positions_name ON Positions(name);
        CREATE INDEX idx_positions_department ON Positions(departmentId);
        CREATE INDEX idx_positions_department_order ON Positions(departmentId, [order]);
      END

      -- Check and create trigger using EXEC to satisfy batch requirements
      IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_Positions_UpdatedAt')
      BEGIN
        EXEC('
          CREATE TRIGGER trg_Positions_UpdatedAt
          ON Positions
          AFTER UPDATE
          AS
          BEGIN
            SET NOCOUNT ON;
            UPDATE Positions
            SET updatedAt = GETDATE()
            FROM Positions p
            INNER JOIN inserted i ON p.id = i.id;
          END
        ');
      END
    `;

    await pool.request().query(query);
  }

  static async findAll(params: {
    departmentId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ positions: IPositionWithRelations[]; total: number }> {
    const pool = getPool();
    const {
      departmentId,
      isActive,
      page = 1,
      limit = 10,
      sortBy = 'order',
      sortOrder = 'asc'
    } = params;

    const whereClauses: string[] = [];
    const request = pool.request();

    if (departmentId) {
      whereClauses.push('p.departmentId = @departmentId');
      request.input('departmentId', sql.UniqueIdentifier, departmentId);
    }

    if (isActive !== undefined) {
      whereClauses.push('p.isActive = @isActive');
      request.input('isActive', sql.Bit, isActive ? 1 : 0);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    let orderByClause = `ORDER BY p.[${sortBy}] ${sortOrder.toUpperCase()}`;
    if (sortBy === 'order') {
      orderByClause += ', p.name ASC';
    }

    const countQuery = `
      SELECT COUNT(*) as total FROM Positions p ${whereClause}
    `;

    const dataQuery = `
      SELECT 
        p.*,
        d.name as department_name
      FROM Positions p
      LEFT JOIN Departments d ON p.departmentId = d.id
      ${whereClause}
      ${orderByClause}
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

    const positions = dataResult.recordset.map(row => this.mapPositionWithRelations(row));

    return {
      positions,
      total: countResult.recordset[0].total
    };
  }

  static async findById(id: string): Promise<IPositionWithRelations | null> {
    const pool = getPool();
    const query = `
      SELECT 
        p.*,
        d.name as department_name
      FROM Positions p
      LEFT JOIN Departments d ON p.departmentId = d.id
      WHERE p.id = @id
    `;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    if (result.recordset.length === 0) return null;

    return this.mapPositionWithRelations(result.recordset[0]);
  }

  static async findByCode(code: string, excludeId?: string): Promise<IPosition | null> {
    const pool = getPool();
    let query = `SELECT * FROM Positions WHERE code = @code`;

    if (excludeId) {
      query += ' AND id != @excludeId';
    }

    const request = pool.request()
      .input('code', sql.NVarChar, code);

    if (excludeId) {
      request.input('excludeId', sql.UniqueIdentifier, excludeId);
    }

    const result = await request.query(query);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  static async findByNameAndDepartment(
    name: string,
    departmentId: string,
    excludeId?: string
  ): Promise<IPosition | null> {
    const pool = getPool();
    let query = `SELECT * FROM Positions WHERE name = @name AND departmentId = @departmentId`;

    if (excludeId) {
      query += ' AND id != @excludeId';
    }

    const request = pool.request()
      .input('name', sql.NVarChar, name)
      .input('departmentId', sql.UniqueIdentifier, departmentId);

    if (excludeId) {
      request.input('excludeId', sql.UniqueIdentifier, excludeId);
    }

    const result = await request.query(query);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  static async create(position: IPosition): Promise<IPositionWithRelations> {
    const pool = getPool();
    const permissionsJson = position.permissions ? JSON.stringify(position.permissions) : null;

    const query = `
      INSERT INTO Positions (name, code, permissions, departmentId, [order], isActive)
      OUTPUT INSERTED.id
      VALUES (@name, @code, @permissions, @departmentId, @order, @isActive)
    `;

    const result = await pool.request()
      .input('name', sql.NVarChar, position.name.trim())
      .input('code', sql.NVarChar, position.code.toUpperCase().trim())
      .input('permissions', sql.NVarChar(sql.MAX), permissionsJson)
      .input('departmentId', sql.UniqueIdentifier, position.departmentId)
      .input('order', sql.Int, position.order ?? 1)
      .input('isActive', sql.Bit, position.isActive ?? true ? 1 : 0)
      .query(query);

    const insertedId = result.recordset[0].id;
    return this.findById(insertedId) as Promise<IPositionWithRelations>;
  }

  static async update(id: string, positionData: Partial<IPosition>): Promise<IPositionWithRelations | null> {
    const pool = getPool();
    const updates: string[] = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (positionData.name !== undefined) {
      updates.push('name = @name');
      request.input('name', sql.NVarChar, positionData.name.trim());
    }
    if (positionData.code !== undefined) {
      updates.push('code = @code');
      request.input('code', sql.NVarChar, positionData.code.toUpperCase().trim());
    }
    if (positionData.permissions !== undefined) {
      updates.push('permissions = @permissions');
      const permissionsJson = positionData.permissions ? JSON.stringify(positionData.permissions) : null;
      request.input('permissions', sql.NVarChar(sql.MAX), permissionsJson);
    }
    if (positionData.departmentId !== undefined) {
      updates.push('departmentId = @departmentId');
      request.input('departmentId', sql.UniqueIdentifier, positionData.departmentId);
    }
    if (positionData.order !== undefined) {
      updates.push('[order] = @order');
      request.input('order', sql.Int, positionData.order);
    }
    if (positionData.isActive !== undefined) {
      updates.push('isActive = @isActive');
      request.input('isActive', sql.Bit, positionData.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE Positions 
      SET ${updates.join(', ')}
      WHERE id = @id
    `;

    await request.query(query);
    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM Positions WHERE id = @id`;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    return result.rowsAffected[0] > 0;
  }

  private static mapPositionWithRelations(row: any): IPositionWithRelations {
    const permissions = row.permissions ? JSON.parse(row.permissions) : [];

    const position: IPositionWithRelations = {
      id: row.id,
      name: row.name,
      code: row.code,
      permissions,
      isActive: row.isActive,
      departmentId: row.departmentId,
      order: row.order,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };

    if (row.department_name) {
      position.departmentInfo = {
        id: row.departmentId,
        name: row.department_name
      };
    }

    position.isSuperAdmin = permissions.includes('manage_system');

    const managerPermissions = [
      'manage_departments',
      'manage_units',
      'manage_positions',
      'view_all_employees'
    ];
    position.isManager = managerPermissions.some(perm => permissions.includes(perm));

    return position;
  }
}

export default PositionModel;