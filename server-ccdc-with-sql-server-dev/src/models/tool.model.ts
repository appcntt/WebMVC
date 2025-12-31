import sql from 'mssql';
import { getPool } from '../config/database';

export interface ITool {
  id?: string;
  name: string;
  code?: string;
  assignedTo: string;
  assignedDate?: Date;
  unitId: string;
  departmentId: string;
  categoryId: string;
  unitOC?: string;
  quantity?: number;
  status?: string;
  condition?: string;
  purchasePrice?: number;
  purchaseDate?: Date;
  dateOfReceipt?: Date;
  notes?: string;
  warrantyUntil?: Date;
  isDelete?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  description?: string;
  restoredAt?: Date;
  restoredBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IToolWithRelations extends ITool {
  assignedToInfo?: any;
  unitInfo?: any;
  departmentInfo?: any;
  categoryInfo?: any;
  deletedByInfo?: any;
  restoredByInfo?: any;
  isUnderWarranty?: boolean;
}

export class ToolModel {
  static async createTable(): Promise<void> {
    const pool = getPool();
    const query = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Tools' AND xtype='U')
      BEGIN
        CREATE TABLE Tools (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          name NVARCHAR(255) NOT NULL,
          code NVARCHAR(100) NULL,
          
          -- These must match the IDs in the parent tables EXACTLY
          assignedTo UNIQUEIDENTIFIER NOT NULL, 
          unitId UNIQUEIDENTIFIER NOT NULL,
          departmentId UNIQUEIDENTIFIER NOT NULL,
          categoryId UNIQUEIDENTIFIER NOT NULL,
          
          assignedDate DATETIME NULL,
          unitOC NVARCHAR(50) DEFAULT N'Cái' CHECK (unitOC IN (N'Bộ', N'Cái')),
          quantity INT DEFAULT 1,
          status NVARCHAR(50) DEFAULT N'Dự phòng' CHECK (status IN (N'Dự phòng', N'Đang sử dụng', N'Hỏng', N'Thanh lý')),
          condition NVARCHAR(50) DEFAULT N'Mới' CHECK (condition IN (N'Mới', N'Cũ', N'Hỏng')),
          purchasePrice DECIMAL(18, 2) NULL CHECK (purchasePrice >= 0),
          purchaseDate DATETIME NULL,
          dateOfReceipt DATETIME NULL,
          notes NVARCHAR(MAX) NULL,
          warrantyUntil DATETIME NULL,
          isDelete BIT DEFAULT 0,
          deletedAt DATETIME NULL,
          deletedBy UNIQUEIDENTIFIER NULL,
          description NVARCHAR(MAX) NULL,
          restoredAt DATETIME NULL,
          restoredBy UNIQUEIDENTIFIER NULL,
          createdAt DATETIME DEFAULT GETDATE(),
          updatedAt DATETIME DEFAULT GETDATE(),
          
          -- Adding explicit constraint names for easier debugging
          CONSTRAINT FK_Tools_Employees FOREIGN KEY (assignedTo) REFERENCES Employees(id),
          CONSTRAINT FK_Tools_Units FOREIGN KEY (unitId) REFERENCES Units(id),
          CONSTRAINT FK_Tools_Departments FOREIGN KEY (departmentId) REFERENCES Departments(id),
          CONSTRAINT FK_Tools_Categories FOREIGN KEY (categoryId) REFERENCES Categories(id)
        );

        CREATE INDEX idx_tools_code ON Tools(code);
        CREATE INDEX idx_tools_assignedTo ON Tools(assignedTo);
        CREATE INDEX idx_tools_status ON Tools(status);
        CREATE INDEX idx_tools_isDelete ON Tools(isDelete);
      END

      -- Batch-safe Trigger creation
      IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_Tools_UpdatedAt')
      BEGIN
        EXEC('
          CREATE TRIGGER trg_Tools_UpdatedAt
          ON Tools
          AFTER UPDATE
          AS
          BEGIN
            SET NOCOUNT ON;
            UPDATE Tools
            SET updatedAt = GETDATE()
            FROM Tools t
            INNER JOIN inserted i ON t.id = i.id;
          END
        ');
      END
    `;

    await pool.request().query(query);
  }

  static async findAll(params: {
    assignedTo?: string;
    categoryId?: string;
    status?: string;
    condition?: string;
    departmentId?: string;
    unitId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ tools: IToolWithRelations[]; total: number }> {
    const pool = getPool();
    const {
      assignedTo,
      categoryId,
      status,
      condition,
      departmentId,
      unitId,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    const whereClauses: string[] = ['t.isDelete = 0'];
    const request = pool.request();

    if (assignedTo) {
      whereClauses.push('t.assignedTo = @assignedTo');
      request.input('assignedTo', sql.UniqueIdentifier, assignedTo);
    }

    if (categoryId) {
      whereClauses.push('t.categoryId = @categoryId');
      request.input('categoryId', sql.UniqueIdentifier, categoryId);
    }

    if (status) {
      whereClauses.push('t.status = @status');
      request.input('status', sql.NVarChar, status);
    }

    if (condition) {
      whereClauses.push('t.condition = @condition');
      request.input('condition', sql.NVarChar, condition);
    }

    if (departmentId) {
      whereClauses.push('t.departmentId = @departmentId');
      request.input('departmentId', sql.UniqueIdentifier, departmentId);
    }

    if (unitId) {
      whereClauses.push('t.unitId = @unitId');
      request.input('unitId', sql.UniqueIdentifier, unitId);
    }

    const whereClause = whereClauses.join(' AND ');
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as total FROM Tools t WHERE ${whereClause}`;

    const dataQuery = `
      SELECT 
        t.*,
        e.name as assignedTo_name, e.code as assignedTo_code, 
        e.email as assignedTo_email,
        p.name as assignedTo_position_name,
        u.name as unit_name, u.code as unit_code,
        d.name as department_name, d.code as department_code,
        c.name as category_name
      FROM Tools t
      LEFT JOIN Employees e ON t.assignedTo = e.id
      LEFT JOIN Positions p ON e.positionId = p.id
      LEFT JOIN Units u ON t.unitId = u.id
      LEFT JOIN Departments d ON t.departmentId = d.id
      LEFT JOIN Categories c ON t.categoryId = c.id
      LEFT JOIN Employees de ON t.deletedBy = de.id 
      WHERE ${whereClause}
      ORDER BY t.${sortBy} ${sortOrder.toUpperCase()}
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

    const tools = dataResult.recordset.map(row => this.mapToolWithRelations(row));

    return {
      tools,
      total: countResult.recordset[0].total
    };
  }

  static async findById(id: string, includeDeleted: boolean = false): Promise<IToolWithRelations | null> {
    const pool = getPool();
    const whereClause = includeDeleted ? '' : 'AND t.isDelete = 0';

    const query = `
      SELECT 
        t.*,
        e.name as assignedTo_name, e.code as assignedTo_code, 
        e.email as assignedTo_email, e.unitId as assignedTo_unitId,
        e.departmentId as assignedTo_departmentId,
        p.name as assignedTo_position_name,
        u.name as unit_name, u.code as unit_code,
        d.name as department_name, d.code as department_code,
        c.name as category_name
      FROM Tools t
      LEFT JOIN Employees e ON t.assignedTo = e.id
      LEFT JOIN Positions p ON e.positionId = p.id
      LEFT JOIN Units u ON t.unitId = u.id
      LEFT JOIN Departments d ON t.departmentId = d.id
      LEFT JOIN Categories c ON t.categoryId = c.id
      LEFT JOIN Employees de ON t.deletedBy = de.id
      LEFT JOIN Employees re ON t.restoredBy = re.id 
      WHERE t.id = @id ${whereClause}
    `;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    if (result.recordset.length === 0) return null;

    return this.mapToolWithRelations(result.recordset[0]);
  }

  static async findByEmployee(employeeId: string): Promise<IToolWithRelations[]> {
    const pool = getPool();
    const query = `
      SELECT 
        t.*,
        e.name as assignedTo_name,
        p.name as assignedTo_position_name,
        u.name as unit_name, u.code as unit_code,
        c.name as category_name
      FROM Tools t
      LEFT JOIN Employees e ON t.assignedTo = e.id
      LEFT JOIN Positions p ON e.positionId = p.id
      LEFT JOIN Units u ON t.unitId = u.id
      LEFT JOIN Categories c ON t.categoryId = c.id
      WHERE t.assignedTo = @employeeId 
        AND t.status = N'Đang sử dụng' 
        AND t.isDelete = 0
      ORDER BY t.assignedDate DESC
    `;

    const result = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .query(query);

    return result.recordset.map(row => this.mapToolWithRelations(row));
  }

  static async search(params: {
    keyword: string;
    categoryId?: string;
    status?: string;
    level?: number;
    currentEmployeeDepartmentId?: string;
    currentEmployeeUnitId?: string;
  }): Promise<IToolWithRelations[]> {
    const pool = getPool();
    const { keyword, categoryId, status, level, currentEmployeeDepartmentId, currentEmployeeUnitId } = params;

    const whereClauses: string[] = [
      't.isDelete = 0',
      '(t.name LIKE @keyword OR t.code LIKE @keyword OR t.description LIKE @keyword)'
    ];
    const request = pool.request().input('keyword', sql.NVarChar, `%${keyword}%`);

    if (level && level < 5) {
      if (level === 3 && currentEmployeeUnitId) {
        whereClauses.push('t.unitId = @unitId');
        request.input('unitId', sql.UniqueIdentifier, currentEmployeeUnitId);
      } else if (level < 3 && currentEmployeeDepartmentId) {
        whereClauses.push('t.departmentId = @departmentId');
        request.input('departmentId', sql.UniqueIdentifier, currentEmployeeDepartmentId);
      }
    }

    if (categoryId) {
      whereClauses.push('t.categoryId = @categoryId');
      request.input('categoryId', sql.UniqueIdentifier, categoryId);
    }

    if (status) {
      whereClauses.push('t.status = @status');
      request.input('status', sql.NVarChar, status);
    }

    const query = `
      SELECT TOP 50
        t.*,
        e.name as assignedTo_name, e.code as assignedTo_code, e.email as assignedTo_email,
        u.name as unit_name, u.code as unit_code,
        d.name as department_name, d.code as department_code,
        c.name as category_name
      FROM Tools t
      LEFT JOIN Employees e ON t.assignedTo = e.id
      LEFT JOIN Units u ON t.unitId = u.id
      LEFT JOIN Departments d ON t.departmentId = d.id
      LEFT JOIN Categories c ON t.categoryId = c.id
      WHERE ${whereClauses.join(' AND ')}
    `;

    const result = await request.query(query);
    return result.recordset.map(row => this.mapToolWithRelations(row));
  }

  static async create(tool: ITool): Promise<IToolWithRelations> {
    const pool = getPool();

    const query = `
      INSERT INTO Tools (
        name, code, assignedTo, assignedDate, unitId, departmentId, categoryId,
        unitOC, quantity, status, condition, purchasePrice, purchaseDate, 
        dateOfReceipt, notes, warrantyUntil, description
      )
      OUTPUT INSERTED.id
      VALUES (
        @name, @code, @assignedTo, @assignedDate, @unitId, @departmentId, @categoryId,
        @unitOC, @quantity, @status, @condition, @purchasePrice, @purchaseDate,
        @dateOfReceipt, @notes, @warrantyUntil, @description
      )
    `;

    const result = await pool.request()
      .input('name', sql.NVarChar, tool.name)
      .input('code', sql.NVarChar, tool.code)
      .input('assignedTo', sql.UniqueIdentifier, tool.assignedTo)
      .input('assignedDate', sql.DateTime, tool.assignedDate)
      .input('unitId', sql.UniqueIdentifier, tool.unitId)
      .input('departmentId', sql.UniqueIdentifier, tool.departmentId)
      .input('categoryId', sql.UniqueIdentifier, tool.categoryId)
      .input('unitOC', sql.NVarChar, tool.unitOC || 'Cái')
      .input('quantity', sql.Int, tool.quantity || 1)
      .input('status', sql.NVarChar, tool.status || 'Dự phòng')
      .input('condition', sql.NVarChar, tool.condition || 'Mới')
      .input('purchasePrice', sql.Decimal(18, 2), tool.purchasePrice)
      .input('purchaseDate', sql.DateTime, tool.purchaseDate)
      .input('dateOfReceipt', sql.DateTime, tool.dateOfReceipt)
      .input('notes', sql.NVarChar, tool.notes)
      .input('warrantyUntil', sql.DateTime, tool.warrantyUntil)
      .input('description', sql.NVarChar, tool.description)
      .query(query);

    const insertedId = result.recordset[0].id;
    return this.findById(insertedId) as Promise<IToolWithRelations>;
  }

  static async update(id: string, toolData: Partial<ITool>): Promise<IToolWithRelations | null> {
    const pool = getPool();
    const updates: string[] = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    const allowedFields = [
      'name', 'assignedTo', 'assignedDate', 'unitId', 'departmentId', 'categoryId',
      'unitOC', 'quantity', 'status', 'condition', 'purchasePrice', 'purchaseDate',
      'dateOfReceipt', 'notes', 'warrantyUntil', 'description'
    ];

    allowedFields.forEach(field => {
      if (toolData[field as keyof ITool] !== undefined) {
        const value = toolData[field as keyof ITool];

        if (['unitId', 'departmentId', 'categoryId', 'assignedTo'].includes(field)) {
          updates.push(`${field} = @${field}`);
          request.input(field, sql.UniqueIdentifier, value);
        } else if (['purchaseDate', 'dateOfReceipt', 'warrantyUntil', 'assignedDate'].includes(field)) {
          updates.push(`${field} = @${field}`);
          request.input(field, sql.DateTime, value);
        } else if (field === 'purchasePrice') {
          updates.push('purchasePrice = @purchasePrice');
          request.input('purchasePrice', sql.Decimal(18, 2), value);
        } else if (field === 'quantity') {
          updates.push('quantity = @quantity');
          request.input('quantity', sql.Int, value);
        } else {
          updates.push(`${field} = @${field}`);
          request.input(field, sql.NVarChar, value);
        }
      }
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE Tools 
      SET ${updates.join(', ')}
      WHERE id = @id AND isDelete = 0
    `;

    await request.query(query);
    return this.findById(id);
  }

  static async softDelete(id: string, deletedBy: string): Promise<boolean> {
    const pool = getPool();
    const query = `
      UPDATE Tools 
      SET isDelete = 1, deletedAt = GETDATE(), deletedBy = @deletedBy
      WHERE id = @id AND isDelete = 0
    `;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('deletedBy', sql.UniqueIdentifier, deletedBy)
      .query(query);

    return result.rowsAffected[0] > 0;
  }

  static async restore(id: string, restoredBy: string): Promise<boolean> {
    const pool = getPool();
    const query = `
      UPDATE Tools 
      SET isDelete = 0, deletedAt = NULL, deletedBy = NULL, 
          restoredAt = GETDATE(), restoredBy = @restoredBy
      WHERE id = @id AND isDelete = 1
    `;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('restoredBy', sql.UniqueIdentifier, restoredBy)
      .query(query);

    return result.rowsAffected[0] > 0;
  }

  static async hardDelete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM Tools WHERE id = @id`;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    return result.rowsAffected[0] > 0;
  }

  static async getDeleted(params: {
    departmentId?: string;
    employeeId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ tools: IToolWithRelations[]; total: number }> {
    const pool = getPool();
    const { departmentId, employeeId, page = 1, limit = 50, sortBy = 'deletedAt', sortOrder = 'desc' } = params;

    const whereClauses: string[] = ['isDelete = 1'];
    const request = pool.request();

    if (departmentId) {
      whereClauses.push('departmentId = @departmentId');
      request.input('departmentId', sql.UniqueIdentifier, departmentId);
    }

    if (employeeId) {
      whereClauses.push('assignedTo = @employeeId');
      request.input('employeeId', sql.UniqueIdentifier, employeeId);
    }

    const whereClause = whereClauses.join(' AND ');
    const offset = (page - 1) * limit;

    const validSortColumns = ['deletedAt', 'name', 'code', 'createdAt', 'updatedAt'];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'deletedAt';

    const countQuery = `SELECT COUNT(*) as total FROM Tools WHERE ${whereClause}`;

    const dataQuery = `
      SELECT TOP (${limit})
        sub.id,
        sub.code,
        sub.name,
        sub.description,
        sub.quantity,
        sub.status,
        sub.condition,
        sub.purchasePrice,
        sub.purchaseDate,
        sub.dateOfReceipt,
        sub.warrantyUntil,
        sub.notes,
        sub.unitOC,
        sub.assignedTo,
        sub.assignedDate,
        sub.unitId,
        sub.departmentId,
        sub.categoryId,
        sub.deletedBy,
        sub.deletedAt,
        sub.isDelete,
        sub.restoredAt,
        sub.restoredBy,
        sub.createdAt,
        sub.updatedAt,
        sub.type,
        sub.typeLabel,
        e.name as assignedTo_name, 
        e.email as assignedTo_email, 
        e.code as assignedTo_code,
        p.name as assignedTo_position_name,
        u.name as unit_name, 
        u.code as unit_code,
        d.name as department_name, 
        d.code as department_code,
        c.name as category_name,
        de.name as deletedBy_name, 
        de.email as deletedBy_email,
        dp.name as deletedBy_position_name,
        re.name as restoredBy_name,
        re.email as restoredBy_email,
        re.code as restoredBy_code,
        rp.name as restoredBy_position_name
      FROM (
        SELECT 
          *,
          'Tool' as type,
          N'Công cụ' as typeLabel,
          ROW_NUMBER() OVER (ORDER BY ${safeSortBy} ${sortOrder.toUpperCase()}) as RowNum
        FROM Tools
        WHERE ${whereClause}
      ) sub
      LEFT JOIN Employees e ON sub.assignedTo = e.id
      LEFT JOIN Positions p ON e.positionId = p.id
      LEFT JOIN Units u ON sub.unitId = u.id
      LEFT JOIN Departments d ON sub.departmentId = d.id
      LEFT JOIN Categories c ON sub.categoryId = c.id
      LEFT JOIN Employees de ON sub.deletedBy = de.id
      LEFT JOIN Positions dp ON de.positionId = dp.id
      LEFT JOIN Employees re ON sub.restoredBy = re.id
      LEFT JOIN Positions rp ON re.positionId = rp.id
      WHERE sub.RowNum > ${offset}
      ORDER BY sub.RowNum
    `;

    const dataRequest = pool.request();
    if (departmentId) {
      dataRequest.input('departmentId', sql.UniqueIdentifier, departmentId);
    }
    if (employeeId) {
      dataRequest.input('employeeId', sql.UniqueIdentifier, employeeId);
    }

    const [countResult, dataResult] = await Promise.all([
      request.query(countQuery),
      dataRequest.query(dataQuery)
    ]);

    const tools = dataResult.recordset.map(row => this.mapToolWithRelations(row));

    return {
      tools,
      total: countResult.recordset[0].total
    };
  }

  static async countDocuments(filters: any): Promise<number> {
    const pool = getPool();
    const whereClauses: string[] = [];
    const request = pool.request();

    if (filters.isDelete !== undefined) {
      whereClauses.push('isDelete = @isDelete');
      request.input('isDelete', sql.Bit, filters.isDelete ? 1 : 0);
    }

    if (filters.assignedTo) {
      if (filters.assignedTo === null) {
        whereClauses.push('assignedTo IS NULL');
      } else {
        whereClauses.push('assignedTo = @assignedTo');
        request.input('assignedTo', sql.UniqueIdentifier, filters.assignedTo);
      }
    }

    if (filters.departmentId) {
      whereClauses.push('departmentId = @departmentId');
      request.input('departmentId', sql.UniqueIdentifier, filters.departmentId);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const query = `SELECT COUNT(*) as total FROM Tools ${whereClause}`;

    const result = await request.query(query);
    return result.recordset[0].total;
  }

  static async getStatistics(departmentId?: string): Promise<any> {
    const pool = getPool();
    const request = pool.request();
    let whereClause = 't.isDelete = 0';

    if (departmentId) {
      whereClause += ' AND t.departmentId = @departmentId';
      request.input('departmentId', sql.UniqueIdentifier, departmentId);
    }

    const query = `
      SELECT 
        COUNT(*) as totalTools,
        SUM(CASE WHEN t.status = N'Đang sử dụng' THEN 1 ELSE 0 END) as inUse,
        SUM(CASE WHEN t.status = N'Dự phòng' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN t.status = N'Hỏng' THEN 1 ELSE 0 END) as broken,
        SUM(CASE WHEN t.status = N'Thanh lý' THEN 1 ELSE 0 END) as liquidated,
        SUM(CASE WHEN t.assignedTo IS NOT NULL THEN 1 ELSE 0 END) as assigned,
        SUM(CASE WHEN t.assignedTo IS NULL THEN 1 ELSE 0 END) as unassigned,
        SUM(ISNULL(t.purchasePrice, 0)) as totalValue,
        AVG(ISNULL(t.purchasePrice, 0)) as avgValue
      FROM Tools t
      WHERE ${whereClause};

      SELECT 
        t.status,
        COUNT(*) as count
      FROM Tools t
      WHERE ${whereClause}
      GROUP BY t.status
      ORDER BY count DESC;

      SELECT 
        t.condition,
        COUNT(*) as count
      FROM Tools t
      WHERE ${whereClause}
      GROUP BY t.condition
      ORDER BY count DESC;

      SELECT 
        c.id as categoryId,
        c.name as categoryName,
        COUNT(*) as count,
        SUM(ISNULL(t.purchasePrice, 0)) as totalValue,
        AVG(ISNULL(t.purchasePrice, 0)) as avgValue
      FROM Tools t
      LEFT JOIN Categories c ON t.categoryId = c.id
      WHERE ${whereClause}
      GROUP BY c.id, c.name
      ORDER BY count DESC;
    `;

    const result = await request.query(query);

    const recordsets = result.recordsets as sql.IRecordSet<any>[];

    return {
      overview: recordsets[0][0],
      statusStats: recordsets[1],
      conditionStats: recordsets[2],
      categoryStats: recordsets[3]
    };
  }

  private static mapToolWithRelations(row: any): IToolWithRelations {
    const tool: IToolWithRelations = {
      id: row.id,
      name: row.name,
      code: row.code,
      assignedTo: row.assignedTo,
      assignedDate: row.assignedDate,
      unitId: row.unitId,
      departmentId: row.departmentId,
      categoryId: row.categoryId,
      unitOC: row.unitOC,
      quantity: row.quantity,
      status: row.status,
      condition: row.condition,
      purchasePrice: row.purchasePrice,
      purchaseDate: row.purchaseDate,
      dateOfReceipt: row.dateOfReceipt,
      notes: row.notes,
      warrantyUntil: row.warrantyUntil,
      isDelete: row.isDelete,
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy,
      description: row.description,
      restoredAt: row.restoredAt,
      restoredBy: row.restoredBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };

    if (row.assignedTo_name) {
      tool.assignedToInfo = {
        _id: row.assignedTo,
        id: row.assignedTo,
        name: row.assignedTo_name,
        email: row.assignedTo_email,
        code: row.assignedTo_code,
        unitId: row.assignedTo_unitId,
        departmentId: row.assignedTo_departmentId,
        positionId: row.assignedTo_position_name ? {
          name: row.assignedTo_position_name
        } : undefined
      };
    }

    if (row.unit_name) {
      tool.unitInfo = {
        _id: row.unitId,
        id: row.unitId,
        name: row.unit_name,
        code: row.unit_code
      };
    }


    if (row.department_name) {
      tool.departmentInfo = {
        _id: row.departmentId,
        id: row.departmentId,
        name: row.department_name,
        code: row.department_code
      };
    }

    if (row.category_name) {
      tool.categoryInfo = {
        _id: row.categoryId,
        name: row.category_name
      };
    }

    if (row.deletedBy_name) {
      tool.deletedByInfo = {
        _id: row.deletedBy,
        id: row.deletedBy,
        name: row.deletedBy_name,
        email: row.deletedBy_email,
        code: row.deletedBy_code,
        positionId: row.deletedBy_position_name ? {
          name: row.deletedBy_position_name
        } : undefined
      };
    }

    if (row.restoredBy_name) {
      tool.restoredByInfo = {
        _id: row.restoredBy,
        id: row.restoredBy,
        name: row.restoredBy_name,
        email: row.restoredBy_email,
        positionId: row.restoredBy_position_name ? {
          name: row.restoredBy_position_name
        } : undefined
      };
    }

    if (row.warrantyUntil) {
      tool.isUnderWarranty = new Date(row.warrantyUntil) > new Date();
    }

    return tool;
  }
}

export default ToolModel;