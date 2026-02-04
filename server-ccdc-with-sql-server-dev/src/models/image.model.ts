import sql from 'mssql';
import { getPool } from '../config/database';

export interface IUpload {
  id?: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  uploadedBy: string;
  relatedTo?: string;
  relatedType?: 'Tool' | 'SubTool' | 'Accessory' | 'Employee' | 'Other';
  isDeleted?: boolean;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class UploadModel {
  static async createTable(): Promise<void> {
    const pool = getPool();
    const query = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Uploads' AND xtype='U')
      BEGIN
        CREATE TABLE Uploads (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          fileName NVARCHAR(255) NOT NULL,
          originalName NVARCHAR(255) NOT NULL,
          mimeType NVARCHAR(100) NOT NULL,
          size BIGINT NOT NULL,
          path NVARCHAR(500) NOT NULL,
          url NVARCHAR(500) NOT NULL,
          uploadedBy UNIQUEIDENTIFIER NOT NULL,
          relatedTo UNIQUEIDENTIFIER NULL,
          relatedType NVARCHAR(50) NULL CHECK (relatedType IN ('Tool', 'SubTool', 'Accessory', 'Employee', 'Other')),
          isDeleted BIT DEFAULT 0,
          deletedAt DATETIME NULL,
          createdAt DATETIME DEFAULT GETDATE(),
          updatedAt DATETIME DEFAULT GETDATE(),
          
          CONSTRAINT FK_Uploads_Employees FOREIGN KEY (uploadedBy) REFERENCES Employees(id)
        );

        CREATE INDEX idx_uploads_uploadedBy ON Uploads(uploadedBy);
        CREATE INDEX idx_uploads_relatedTo ON Uploads(relatedTo);
        CREATE INDEX idx_uploads_isDeleted ON Uploads(isDeleted);
      END

      -- Trigger for updatedAt
      IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_Uploads_UpdatedAt')
      BEGIN
        EXEC('
          CREATE TRIGGER trg_Uploads_UpdatedAt
          ON Uploads
          AFTER UPDATE
          AS
          BEGIN
            SET NOCOUNT ON;
            UPDATE Uploads
            SET updatedAt = GETDATE()
            FROM Uploads u
            INNER JOIN inserted i ON u.id = i.id;
          END
        ');
      END
    `;

    await pool.request().query(query);
  }

  static async create(upload: IUpload): Promise<IUpload> {
    const pool = getPool();
    const query = `
      INSERT INTO Uploads (
        fileName, originalName, mimeType, size, path, url, 
        uploadedBy, relatedTo, relatedType
      )
      OUTPUT INSERTED.*
      VALUES (
        @fileName, @originalName, @mimeType, @size, @path, @url,
        @uploadedBy, @relatedTo, @relatedType
      )
    `;

    const result = await pool.request()
      .input('fileName', sql.NVarChar, upload.fileName)
      .input('originalName', sql.NVarChar, upload.originalName)
      .input('mimeType', sql.NVarChar, upload.mimeType)
      .input('size', sql.BigInt, upload.size)
      .input('path', sql.NVarChar, upload.path)
      .input('url', sql.NVarChar, upload.url)
      .input('uploadedBy', sql.UniqueIdentifier, upload.uploadedBy)
      .input('relatedTo', sql.UniqueIdentifier, upload.relatedTo || null)
      .input('relatedType', sql.NVarChar, upload.relatedType || null)
      .query(query);

    return result.recordset[0];
  }

  static async findById(id: string): Promise<IUpload | null> {
    const pool = getPool();
    const query = `
      SELECT * FROM Uploads
      WHERE id = @id AND isDeleted = 0
    `;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    return result.recordset[0] || null;
  }

  static async findByUrl(url: string): Promise<IUpload | null> {
    const pool = getPool();
    const query = `
      SELECT * FROM Uploads
      WHERE url = @url AND isDeleted = 0
    `;

    const result = await pool.request()
      .input('url', sql.NVarChar, url)
      .query(query);

    return result.recordset[0] || null;
  }

  static async findByRelated(relatedTo: string, relatedType?: string): Promise<IUpload[]> {
    const pool = getPool();
    let query = `
      SELECT * FROM Uploads
      WHERE relatedTo = @relatedTo AND isDeleted = 0
    `;

    const request = pool.request()
      .input('relatedTo', sql.UniqueIdentifier, relatedTo);

    if (relatedType) {
      query += ' AND relatedType = @relatedType';
      request.input('relatedType', sql.NVarChar, relatedType);
    }

    query += ' ORDER BY createdAt DESC';

    const result = await request.query(query);
    return result.recordset;
  }

  static async findByUploader(uploadedBy: string): Promise<IUpload[]> {
    const pool = getPool();
    const query = `
      SELECT * FROM Uploads
      WHERE uploadedBy = @uploadedBy AND isDeleted = 0
      ORDER BY createdAt DESC
    `;

    const result = await pool.request()
      .input('uploadedBy', sql.UniqueIdentifier, uploadedBy)
      .query(query);

    return result.recordset;
  }

  static async softDelete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `
      UPDATE Uploads
      SET isDeleted = 1, deletedAt = GETDATE()
      WHERE id = @id AND isDeleted = 0
    `;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    return result.rowsAffected[0] > 0;
  }

  static async softDeleteByUrl(url: string): Promise<boolean> {
    const pool = getPool();
    const query = `
      UPDATE Uploads
      SET isDeleted = 1, deletedAt = GETDATE()
      WHERE url = @url AND isDeleted = 0
    `;

    const result = await pool.request()
      .input('url', sql.NVarChar, url)
      .query(query);

    return result.rowsAffected[0] > 0;
  }

  static async hardDelete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM Uploads WHERE id = @id`;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    return result.rowsAffected[0] > 0;
  }

  static async hardDeleteByUrl(url: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM Uploads WHERE url = @url`;

    const result = await pool.request()
      .input('url', sql.NVarChar, url)
      .query(query);

    return result.rowsAffected[0] > 0;
  }

  static async updateRelation(id: string, relatedTo: string, relatedType: string): Promise<boolean> {
    const pool = getPool();
    const query = `
      UPDATE Uploads
      SET relatedTo = @relatedTo, relatedType = @relatedType
      WHERE id = @id
    `;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('relatedTo', sql.UniqueIdentifier, relatedTo)
      .input('relatedType', sql.NVarChar, relatedType)
      .query(query);

    return result.rowsAffected[0] > 0;
  }

  static async getStorageStats(uploadedBy?: string): Promise<any> {
    const pool = getPool();
    const request = pool.request();
    
    let whereClause = 'WHERE isDeleted = 0';
    if (uploadedBy) {
      whereClause += ' AND uploadedBy = @uploadedBy';
      request.input('uploadedBy', sql.UniqueIdentifier, uploadedBy);
    }

    const query = `
      SELECT 
        COUNT(*) as totalFiles,
        SUM(size) as totalSize,
        AVG(size) as avgSize,
        MAX(size) as maxSize,
        MIN(size) as minSize
      FROM Uploads
      ${whereClause}
    `;

    const result = await request.query(query);
    return result.recordset[0];
  }
}

export default UploadModel;