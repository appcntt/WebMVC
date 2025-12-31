import sql from 'mssql';
import { getPool } from '../config/database';

export interface IEmployee {
    id?: string;
    code: string;
    name: string;
    email: string;
    username: string;
    password: string;
    phone?: string;
    unitId: string;
    departmentId: string;
    positionId: string;
    status?: 'active' | 'inactive';
    address?: string;
    joinDate?: Date;
    dateOfBirth?: Date;
    refreshToken?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IEmployeeWithRelations extends IEmployee {
    unitInfo?: {
        id: string;
        name: string;
        code: string;
    };
    departmentInfo?: {
        id: string;
        name: string;
        code: string;
    };
    positionInfo?: {
        id: string;
        name: string;
        code: string;
        permissions?: string[];
    };
}

export class EmployeeModel {
    static async createTable(): Promise<void> {
        const pool = getPool();
        const query = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Employees' AND xtype='U')
      BEGIN
        CREATE TABLE Employees (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          code NVARCHAR(50) NOT NULL UNIQUE,
          name NVARCHAR(255) NOT NULL,
          email NVARCHAR(255) NOT NULL UNIQUE,
          username NVARCHAR(100) NOT NULL UNIQUE,
          password NVARCHAR(255) NOT NULL,
          phone NVARCHAR(20) NULL,
          unitId UNIQUEIDENTIFIER NOT NULL,
          departmentId UNIQUEIDENTIFIER NOT NULL,
          positionId UNIQUEIDENTIFIER NOT NULL,
          status NVARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
          address NVARCHAR(500) NULL,
          joinDate DATETIME NULL,
          dateOfBirth DATETIME NULL,
          refreshToken NVARCHAR(500) NULL,
          createdAt DATETIME DEFAULT GETDATE(),
          updatedAt DATETIME DEFAULT GETDATE(),
          
          FOREIGN KEY (unitId) REFERENCES Units(id),
          FOREIGN KEY (departmentId) REFERENCES Departments(id),
          FOREIGN KEY (positionId) REFERENCES Positions(id)
        );

        CREATE INDEX idx_employees_code ON Employees(code);
        CREATE INDEX idx_employees_email ON Employees(email);
        CREATE INDEX idx_employees_username ON Employees(username);
        CREATE INDEX idx_employees_unitId ON Employees(unitId);
        CREATE INDEX idx_employees_departmentId ON Employees(departmentId);
        CREATE INDEX idx_employees_positionId ON Employees(positionId);
        CREATE INDEX idx_employees_status ON Employees(status);
      END

      IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_Employees_UpdatedAt')
      BEGIN
        EXEC('
          CREATE TRIGGER trg_Employees_UpdatedAt
          ON Employees
          AFTER UPDATE
          AS
          BEGIN
            SET NOCOUNT ON;
            UPDATE Employees
            SET updatedAt = GETDATE()
            FROM Employees e
            INNER JOIN inserted i ON e.id = i.id;
          END
        ');
      END
    `;

        await pool.request().query(query);
    }

    static async findAll(params: {
        unitId?: string;
        departmentId?: string;
        positionId?: string;
        status?: string;
        page?: number;
        limit?: number;
        excludePositions?: string[];
    }): Promise<{ employees: IEmployeeWithRelations[]; total: number }> {
        const pool = getPool();
        const { unitId, departmentId, positionId, status, page = 1, limit = 50, excludePositions } = params;

        const whereClauses: string[] = [];
        const request = pool.request();

        if (unitId) {
            whereClauses.push('e.unitId = @unitId');
            request.input('unitId', sql.UniqueIdentifier, unitId);
        }

        if (departmentId) {
            whereClauses.push('e.departmentId = @departmentId');
            request.input('departmentId', sql.UniqueIdentifier, departmentId);
        }

        if (positionId) {
            whereClauses.push('e.positionId = @positionId');
            request.input('positionId', sql.UniqueIdentifier, positionId);
        }

        if (status) {
            whereClauses.push('e.status = @status');
            request.input('status', sql.NVarChar, status);
        }

        if (excludePositions && excludePositions.length > 0) {
            const placeholders = excludePositions.map((_, idx) => `@excludePos${idx}`).join(', ');
            whereClauses.push(`e.positionId NOT IN (${placeholders})`);
            excludePositions.forEach((posId, idx) => {
                request.input(`excludePos${idx}`, sql.UniqueIdentifier, posId);
            });
        }

        const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const offset = (page - 1) * limit;

        const countQuery = `SELECT COUNT(*) as total FROM Employees e ${whereClause}`;

        const dataQuery = `
      SELECT 
        e.*,
        u.name as unit_name,
        u.code as unit_code,
        d.name as department_name,
        d.code as department_code,
        p.name as position_name,
        p.code as position_code,
        p.permissions as position_permissions
      FROM Employees e
      LEFT JOIN Units u ON e.unitId = u.id
      LEFT JOIN Departments d ON e.departmentId = d.id
      LEFT JOIN Positions p ON e.positionId = p.id
      ${whereClause}
      ORDER BY e.createdAt DESC
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

        const employees = dataResult.recordset.map(row => this.mapEmployeeWithRelations(row));

        return {
            employees,
            total: countResult.recordset[0].total
        };
    }

    static async findById(id: string): Promise<IEmployeeWithRelations | null> {
        const pool = getPool();
        const query = `
      SELECT 
        e.*,
        u.name as unit_name,
        u.code as unit_code,
        d.name as department_name,
        d.code as department_code,
        p.name as position_name,
        p.code as position_code,
        p.permissions as position_permissions
      FROM Employees e
      LEFT JOIN Units u ON e.unitId = u.id
      LEFT JOIN Departments d ON e.departmentId = d.id
      LEFT JOIN Positions p ON e.positionId = p.id
      WHERE e.id = @id
    `;

        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(query);

        if (result.recordset.length === 0) return null;

        return this.mapEmployeeWithRelations(result.recordset[0]);
    }

    static async findByUsername(username: string): Promise<IEmployeeWithRelations | null> {
        const pool = getPool();
        const query = `
      SELECT 
        e.*,
        u.name as unit_name,
        u.code as unit_code,
        d.name as department_name,
        d.code as department_code,
        p.name as position_name,
        p.code as position_code,
        p.permissions as position_permissions
      FROM Employees e
      LEFT JOIN Units u ON e.unitId = u.id
      LEFT JOIN Departments d ON e.departmentId = d.id
      LEFT JOIN Positions p ON e.positionId = p.id
      WHERE e.username = @username
    `;

        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .query(query);

        if (result.recordset.length === 0) return null;

        return this.mapEmployeeWithRelations(result.recordset[0]);
    }

    static async findOne(conditions: { username?: string; email?: string; code?: string }): Promise<IEmployee | null> {
        const pool = getPool();
        const whereClauses: string[] = [];
        const request = pool.request();

        if (conditions.username) {
            whereClauses.push('username = @username');
            request.input('username', sql.NVarChar, conditions.username);
        }

        if (conditions.email) {
            whereClauses.push('email = @email');
            request.input('email', sql.NVarChar, conditions.email);
        }

        if (conditions.code) {
            whereClauses.push('code = @code');
            request.input('code', sql.NVarChar, conditions.code);
        }

        if (whereClauses.length === 0) return null;

        const query = `SELECT TOP 1 * FROM Employees WHERE ${whereClauses.join(' OR ')}`;
        const result = await request.query(query);

        return result.recordset.length > 0 ? result.recordset[0] : null;
    }

    static async search(keyword: string, params: {
        departmentId?: string;
        excludePositions?: string[];
    }): Promise<IEmployeeWithRelations[]> {
        const pool = getPool();
        const { departmentId, excludePositions } = params;

        const whereClauses: string[] = [
            'e.status = @status',
            '(e.code LIKE @keyword OR e.name LIKE @keyword OR e.email LIKE @keyword OR p.name LIKE @keyword)'
        ];

        const request = pool.request()
            .input('status', sql.NVarChar, 'active')
            .input('keyword', sql.NVarChar, `${keyword}%`);

        if (departmentId) {
            whereClauses.push('e.departmentId = @departmentId');
            request.input('departmentId', sql.UniqueIdentifier, departmentId);
        }

        if (excludePositions && excludePositions.length > 0) {
            const placeholders = excludePositions.map((_, idx) => `@excludePos${idx}`).join(', ');
            whereClauses.push(`e.positionId NOT IN (${placeholders})`);
            excludePositions.forEach((posId, idx) => {
                request.input(`excludePos${idx}`, sql.UniqueIdentifier, posId);
            });
        }

        const query = `
      SELECT TOP 50
        e.*,
        u.name as unit_name,
        u.code as unit_code,
        d.name as department_name,
        d.code as department_code,
        p.name as position_name,
        p.code as position_code,
        p.permissions as position_permissions
      FROM Employees e
      LEFT JOIN Units u ON e.unitId = u.id
      LEFT JOIN Departments d ON e.departmentId = d.id
      LEFT JOIN Positions p ON e.positionId = p.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY e.createdAt DESC
    `;

        const result = await request.query(query);
        return result.recordset.map(row => this.mapEmployeeWithRelations(row));
    }

    static async create(employee: IEmployee): Promise<IEmployeeWithRelations> {
        const pool = getPool();
        const query = `
      INSERT INTO Employees (code, name, email, username, password, phone, unitId, departmentId, positionId, address, joinDate, dateOfBirth, status)
      OUTPUT INSERTED.id
      VALUES (@code, @name, @email, @username, @password, @phone, @unitId, @departmentId, @positionId, @address, @joinDate, @dateOfBirth, @status)
    `;

        const result = await pool.request()
            .input('code', sql.NVarChar, employee.code)
            .input('name', sql.NVarChar, employee.name)
            .input('email', sql.NVarChar, employee.email)
            .input('username', sql.NVarChar, employee.username)
            .input('password', sql.NVarChar, employee.password)
            .input('phone', sql.NVarChar, employee.phone)
            .input('unitId', sql.UniqueIdentifier, employee.unitId)
            .input('departmentId', sql.UniqueIdentifier, employee.departmentId)
            .input('positionId', sql.UniqueIdentifier, employee.positionId)
            .input('address', sql.NVarChar, employee.address)
            .input('joinDate', sql.DateTime, employee.joinDate)
            .input('dateOfBirth', sql.DateTime, employee.dateOfBirth)
            .input('status', sql.NVarChar, employee.status || 'active')
            .query(query);

        const insertedId = result.recordset[0].id;
        return this.findById(insertedId) as Promise<IEmployeeWithRelations>;
    }

    static async update(id: string, employeeData: Partial<IEmployee>): Promise<IEmployeeWithRelations | null> {
        const pool = getPool();
        const updates: string[] = [];
        const request = pool.request().input('id', sql.UniqueIdentifier, id);

        if (employeeData.code !== undefined) {
            updates.push('code = @code');
            request.input('code', sql.NVarChar, employeeData.code);
        }
        if (employeeData.name !== undefined) {
            updates.push('name = @name');
            request.input('name', sql.NVarChar, employeeData.name);
        }
        if (employeeData.username !== undefined) {
            updates.push('username = @username');
            request.input('username', sql.NVarChar, employeeData.username);
        }

        if (employeeData.password !== undefined) {
            updates.push('password = @password');
            request.input('password', sql.NVarChar, employeeData.password);
        }

        if (employeeData.phone !== undefined) {
            updates.push('phone = @phone');
            request.input('phone', sql.NVarChar, employeeData.phone);
        }
        if (employeeData.unitId !== undefined) {
            updates.push('unitId = @unitId');
            request.input('unitId', sql.UniqueIdentifier, employeeData.unitId);
        }
        if (employeeData.departmentId !== undefined) {
            updates.push('departmentId = @departmentId');
            request.input('departmentId', sql.UniqueIdentifier, employeeData.departmentId);
        }
        if (employeeData.positionId !== undefined) {
            updates.push('positionId = @positionId');
            request.input('positionId', sql.UniqueIdentifier, employeeData.positionId);
        }
        if (employeeData.address !== undefined) {
            updates.push('address = @address');
            request.input('address', sql.NVarChar, employeeData.address);
        }
        if (employeeData.joinDate !== undefined) {
            updates.push('joinDate = @joinDate');
            request.input('joinDate', sql.DateTime, employeeData.joinDate);
        }
        if (employeeData.dateOfBirth !== undefined) {
            updates.push('dateOfBirth = @dateOfBirth');
            request.input('dateOfBirth', sql.DateTime, employeeData.dateOfBirth);
        }
        if (employeeData.status !== undefined) {
            updates.push('status = @status');
            request.input('status', sql.NVarChar, employeeData.status);
        }

        if (employeeData.refreshToken !== undefined) {
            if (employeeData.refreshToken === null) {
                updates.push('refreshToken = NULL');
            } else {
                updates.push('refreshToken = @refreshToken');
                request.input('refreshToken', sql.NVarChar, employeeData.refreshToken);
            }
        }

        if (updates.length === 0) {
            return this.findById(id);
        }

        const query = `
      UPDATE Employees 
      SET ${updates.join(', ')}
      WHERE id = @id
    `;

        await request.query(query);
        return this.findById(id);
    }

    static async updatePassword(id : string, hashedPassword : string) : Promise<boolean> {
        const pool = getPool();
        const query = `
            UPDATE Employees
            SET password = @password,
                refreshToken = NULL,
                updatedAt = GETDATE()
            WHERE id = @id
        `;

        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('password', sql.NVarChar, hashedPassword)
            .query(query)

        console.log('✅ Password update - Rows affected:', result.rowsAffected[0]);

        return result.rowsAffected[0] > 0;
    }

    static async delete(id: string): Promise<boolean> {
        const pool = getPool();
        const query = `DELETE FROM Employees WHERE id = @id`;

        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(query);

        return result.rowsAffected[0] > 0;
    }

    static async getAdminPositionIds(): Promise<string[]> {
        const pool = getPool();
        const query = `
      SELECT id FROM Positions 
      WHERE permissions LIKE '%manage_system%'
    `;

        const result = await pool.request().query(query);
        return result.recordset.map(row => row.id);
    }

    // Thêm vào class EmployeeModel trong employee.model.ts

    static async findByRefreshToken(refreshToken: string): Promise<IEmployeeWithRelations | null> {
        const pool = getPool();
        const query = `
    SELECT 
      e.*,
      u.name as unit_name,
      u.code as unit_code,
      d.name as department_name,
      d.code as department_code,
      p.name as position_name,
      p.code as position_code,
      p.permissions as position_permissions
    FROM Employees e
    LEFT JOIN Units u ON e.unitId = u.id
    LEFT JOIN Departments d ON e.departmentId = d.id
    LEFT JOIN Positions p ON e.positionId = p.id
    WHERE e.refreshToken = @refreshToken
  `;

        const result = await pool.request()
            .input('refreshToken', sql.NVarChar, refreshToken)
            .query(query);

        if (result.recordset.length === 0) return null;

        return this.mapEmployeeWithRelations(result.recordset[0]);
    }

    static async findByEmail(email: string): Promise<IEmployeeWithRelations | null> {
        const pool = getPool();
        const query = `
    SELECT 
      e.*,
      u.name as unit_name,
      u.code as unit_code,
      d.name as department_name,
      d.code as department_code,
      p.name as position_name,
      p.code as position_code,
      p.permissions as position_permissions
    FROM Employees e
    LEFT JOIN Units u ON e.unitId = u.id
    LEFT JOIN Departments d ON e.departmentId = d.id
    LEFT JOIN Positions p ON e.positionId = p.id
    WHERE e.email = @email
  `;

        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .query(query);

        if (result.recordset.length === 0) return null;

        return this.mapEmployeeWithRelations(result.recordset[0]);
    }

    static async updateRefreshToken(id: string, refreshToken: string | null): Promise<boolean> {
        const pool = getPool();
        const query = `
    UPDATE Employees 
    SET refreshToken = @refreshToken
    WHERE id = @id
  `;

        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('refreshToken', sql.NVarChar, refreshToken)
            .query(query);

        return result.rowsAffected[0] > 0;
    }

    private static mapEmployeeWithRelations(row: any): IEmployeeWithRelations {
        const employee: IEmployeeWithRelations = {
            id: row.id,
            code: row.code,
            name: row.name,
            email: row.email,
            username: row.username,
            password: row.password,
            phone: row.phone,
            unitId: row.unitId,
            departmentId: row.departmentId,
            positionId: row.positionId,
            status: row.status,
            address: row.address,
            joinDate: row.joinDate,
            dateOfBirth: row.dateOfBirth,
            refreshToken: row.refreshToken,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        };

        if (row.unit_name) {
            employee.unitInfo = {
                id: row.unitId,
                name: row.unit_name,
                code: row.unit_code
            };
        }

        if (row.department_name) {
            employee.departmentInfo = {
                id: row.departmentId,
                name: row.department_name,
                code: row.department_code
            };
        }

        if (row.position_name) {
            employee.positionInfo = {
                id: row.positionId,
                name: row.position_name,
                code: row.position_code,
                permissions: row.position_permissions ? JSON.parse(row.position_permissions) : []
            };
        }

        return employee;
    }
}

export default EmployeeModel;