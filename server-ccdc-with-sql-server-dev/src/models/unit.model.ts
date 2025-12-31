import sql from 'mssql';
import { getPool } from '../config/database';

export enum UnitType {
  HEAD_OFFICE = 'head_office',
  BRANCH = 'branch'
}

export interface IUnit {
  id?: string;
  name: string;
  code: string;
  type: string;
  phone?: string;
  address?: string;
  description?: string;
  email?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UnitModel {
  static async createTable(): Promise<void> {
    const pool = getPool();
    const query = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Units' AND xtype='U')
      BEGIN
        CREATE TABLE Units (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          name NVARCHAR(255) NOT NULL,
          code NVARCHAR(50) NOT NULL UNIQUE,
          type NVARCHAR(50) NOT NULL CHECK (type IN ('head_office', 'branch')),
          phone NVARCHAR(20) NULL,
          address NVARCHAR(500) NULL,
          description NVARCHAR(1000) NULL,
          email NVARCHAR(100) NULL,
          isActive BIT DEFAULT 1,
          createdAt DATETIME DEFAULT GETDATE(),
          updatedAt DATETIME DEFAULT GETDATE()
        );

        CREATE INDEX idx_units_code ON Units(code);
        CREATE INDEX idx_units_type ON Units(type);
        CREATE INDEX idx_units_isActive ON Units(isActive);

        -- Wrap trigger in EXEC to create a separate internal batch
        EXEC('
          CREATE TRIGGER trg_Units_UpdatedAt
          ON Units
          AFTER UPDATE
          AS
          BEGIN
            SET NOCOUNT ON;
            UPDATE Units
            SET updatedAt = GETDATE()
            FROM Units u
            INNER JOIN inserted i ON u.id = i.id;
          END
        ');
      END
    `;

    await pool.request().query(query);
  }

  static async findAll(sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc'): Promise<IUnit[]> {
    const pool = getPool();
    const query = `
      SELECT * FROM Units
      ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
    `;

    const result = await pool.request().query(query);
    return result.recordset;
  }

  static async findById(id: string): Promise<IUnit | null> {
    const pool = getPool();
    const query = `
      SELECT * FROM Units WHERE id = @id
    `;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  static async findByCode(code: string): Promise<IUnit | null> {
    const pool = getPool();
    const query = `
      SELECT * FROM Units WHERE code = @code
    `;

    const result = await pool.request()
      .input('code', sql.NVarChar, code)
      .query(query);

    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  static async create(unit: IUnit): Promise<IUnit> {
    const pool = getPool();
    const query = `
      INSERT INTO Units (name, code, type, phone, address, description, email, isActive)
      OUTPUT INSERTED.*
      VALUES (@name, @code, @type, @phone, @address, @description, @email, @isActive)
    `;

    const result = await pool.request()
      .input('name', sql.NVarChar, unit.name)
      .input('code', sql.NVarChar, unit.code.toUpperCase())
      .input('type', sql.NVarChar, unit.type)
      .input('phone', sql.NVarChar, unit.phone)
      .input('address', sql.NVarChar, unit.address)
      .input('description', sql.NVarChar, unit.description)
      .input('email', sql.NVarChar, unit.email)
      .input('isActive', sql.Bit, unit.isActive ?? true)
      .query(query);

    return result.recordset[0];
  }

  static async update(id: string, unitData: Partial<IUnit>): Promise<IUnit | null> {
    const pool = getPool();
    const updates: string[] = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (unitData.name !== undefined) {
      updates.push('name = @name');
      request.input('name', sql.NVarChar, unitData.name);
    }
    if (unitData.type !== undefined) {
      updates.push('type = @type');
      request.input('type', sql.NVarChar, unitData.type);
    }
    if (unitData.phone !== undefined) {
      updates.push('phone = @phone');
      request.input('phone', sql.NVarChar, unitData.phone);
    }
    if (unitData.address !== undefined) {
      updates.push('address = @address');
      request.input('address', sql.NVarChar, unitData.address);
    }
    if (unitData.description !== undefined) {
      updates.push('description = @description');
      request.input('description', sql.NVarChar, unitData.description);
    }
    if (unitData.email !== undefined) {
      updates.push('email = @email');
      request.input('email', sql.NVarChar, unitData.email);
    }
    if (unitData.isActive !== undefined) {
      updates.push('isActive = @isActive');
      request.input('isActive', sql.Bit, unitData.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    const query = `
    UPDATE Units 
    SET ${updates.join(', ')}
    WHERE id = @id
  `;

    await request.query(query);

    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM Units WHERE id = @id`;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    return result.rowsAffected[0] > 0;
  }

  static async countEmployees(unitId: string): Promise<number> {
    const pool = getPool();
    const query = `SELECT COUNT(*) as total FROM Employees WHERE unitId = @unitId`;

    const result = await pool.request()
      .input('unitId', sql.UniqueIdentifier, unitId)
      .query(query);

    return result.recordset[0].total;
  }

  static async countDepartments(unitId: string): Promise<number> {
    const pool = getPool();
    const query = `SELECT COUNT(*) as total FROM Departments WHERE unitId = @unitId`;

    const result = await pool.request()
      .input('unitId', sql.UniqueIdentifier, unitId)
      .query(query);

    return result.recordset[0].total;
  }

  static async countTools(unitId: string): Promise<number> {
    const pool = getPool();
    const query = `SELECT COUNT(*) as total FROM Tools WHERE unitId = @unitId`;

    const result = await pool.request()
      .input('unitId', sql.UniqueIdentifier, unitId)
      .query(query);

    return result.recordset[0].total;
  }
}

export default UnitModel;