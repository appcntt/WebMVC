import sql from 'mssql';
import { getPool } from '../config/database';

export interface ICategory {
  id?: string;
  name: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class CategoryModel {
  static async createTable(): Promise<void> {
    const pool = getPool();
    const query = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Categories' AND xtype='U')
      BEGIN
        CREATE TABLE Categories (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          name NVARCHAR(255) NOT NULL,
          isActive BIT DEFAULT 1,
          createdAt DATETIME DEFAULT GETDATE(),
          updatedAt DATETIME DEFAULT GETDATE()
        );

        CREATE INDEX idx_categories_name ON Categories(name);
        CREATE INDEX idx_categories_isActive ON Categories(isActive);
      END
      IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_Categories_UpdatedAt')
      BEGIN
        EXEC('
          CREATE TRIGGER trg_Categories_UpdatedAt
          ON Categories
          AFTER UPDATE
          AS
          BEGIN
            SET NOCOUNT ON;
            UPDATE Categories
            SET updatedAt = GETDATE()
            FROM Categories c
            INNER JOIN inserted i ON c.id = i.id;
          END
        ');
      END
    `;

    await pool.request().query(query);
  }

  static async findAll(): Promise<ICategory[]> {
    const pool = getPool();
    const query = `
      SELECT * FROM Categories
      ORDER BY createdAt DESC
    `;

    const result = await pool.request().query(query);
    return result.recordset;
  }

  static async findById(id: string): Promise<ICategory | null> {
    const pool = getPool();
    const query = `
      SELECT * FROM Categories WHERE id = @id
    `;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    return result.recordset.length > 0 ? result.recordset[0] : null;
  }
  static async create(category: ICategory): Promise<ICategory> {
    const pool = getPool();
    const query = `
      INSERT INTO Categories (name, isActive)
      OUTPUT INSERTED.*
      VALUES (@name, @isActive)
    `;

    const result = await pool.request()
      .input('name', sql.NVarChar, category.name)
      .input('isActive', sql.Bit, category.isActive ?? true)
      .query(query);

    return result.recordset[0];
  }

  static async update(id: string, categoryData: Partial<ICategory>): Promise<ICategory | null> {
    const pool = getPool();
    const updates: string[] = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (categoryData.name !== undefined) {
      updates.push('name = @name');
      request.input('name', sql.NVarChar, categoryData.name);
    }

    if (categoryData.isActive !== undefined) {
      updates.push('isActive = @isActive');
      request.input('isActive', sql.Bit, categoryData.isActive ? 1 : 0);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE Categories 
      SET ${updates.join(', ')}
      OUTPUT INSERTED.*
      WHERE id = @id
    `;

    const result = await request.query(query);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  static async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM Categories WHERE id = @id`;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    return result.rowsAffected[0] > 0;
  }
}

export default CategoryModel;