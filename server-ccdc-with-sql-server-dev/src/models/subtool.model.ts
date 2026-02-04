import sql from 'mssql';
import { getPool } from '../config/database';

export interface ISubToolSpecifications {
  screenSize?: string;
  resolution?: string;
  refreshRate?: string;
  panelType?: string;
  connectionType?: string;
  dpi?: string;
  switchType?: string;
  other?: { [key: string]: string };
}

export interface ISubTool {
  id?: string;
  code?: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  unitOC?: string;
  parentTool: string;
  subToolTypeId: string;
  categoryId?: string;
  unitId: string;
  departmentId: string;
  quantity?: number;
  specifications?: ISubToolSpecifications;
  purchaseDate?: Date;
  purchasePrice?: number;
  dateOfReceipt?: Date;
  warrantyUntil?: Date;
  status?: string;
  condition?: string;
  assignedTo?: string;
  assignedDate?: Date;
  notes?: string;
  description?: string;
  hasAccessorys?: boolean;
  isDelete?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  images?: string[];
  restoredAt?: Date;
  restoredBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISubToolWithRelations extends ISubTool {
  parentToolInfo?: any;
  subToolTypeInfo?: any;
  categoryInfo?: any;
  unitInfo?: any;
  departmentInfo?: any;
  assignedToInfo?: any;
  accessorys?: any[];
  accessorysCount?: number;
  isUnderWarranty?: boolean;
  deletedByInfo?: {
    _id: string;
    name: string;
    email: string;
    code: string;
  };
}

export class SubToolModel {
  static async createTable(): Promise<void> {
    const pool = getPool();
    const query = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SubTools' AND xtype='U')
      BEGIN
        CREATE TABLE SubTools (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          code NVARCHAR(100) NULL UNIQUE,
          name NVARCHAR(255) NOT NULL,
          brand NVARCHAR(100) NULL,
          model NVARCHAR(100) NULL,
          serialNumber NVARCHAR(100) NULL UNIQUE,
          unitOC NVARCHAR(50) NULL,
          parentTool UNIQUEIDENTIFIER NOT NULL,
          subToolTypeId UNIQUEIDENTIFIER NOT NULL,
          categoryId UNIQUEIDENTIFIER NULL,
          unitId UNIQUEIDENTIFIER NOT NULL,
          departmentId UNIQUEIDENTIFIER NOT NULL,
          quantity INT NULL,
          specifications NVARCHAR(MAX) NULL,
          purchaseDate DATE NULL,
          purchasePrice DECIMAL(18, 2) NULL CHECK (purchasePrice >= 0),
          dateOfReceipt DATE NULL,
          warrantyUntil DATE NULL,
          status NVARCHAR(50) DEFAULT N'Đang sử dụng' CHECK (status IN (N'Khả dụng', N'Đang sử dụng', N'Hỏng', N'Thanh lý', N'Dự phòng')),
          condition NVARCHAR(50) DEFAULT N'Mới' CHECK (condition IN (N'Mới', N'Cũ', N'Hỏng')),
          assignedTo UNIQUEIDENTIFIER NULL,
          assignedDate DATE NULL,
          notes NVARCHAR(1000) NULL,
          description NVARCHAR(2000) NULL,
          hasAccessorys BIT DEFAULT 0,
          isDelete BIT DEFAULT 0,
          deletedAt DATETIME NULL,
          deletedBy UNIQUEIDENTIFIER NULL,
          images NVARCHAR(MAX) NULL,
          restoredAt DATETIME NULL,
          restoredBy UNIQUEIDENTIFIER NULL,
          createdAt DATETIME DEFAULT GETDATE(),
          updatedAt DATETIME DEFAULT GETDATE(),
          
          FOREIGN KEY (parentTool) REFERENCES Tools(id),
          FOREIGN KEY (subToolTypeId) REFERENCES CategorySubTool(id),
          FOREIGN KEY (categoryId) REFERENCES Categories(id),
          FOREIGN KEY (unitId) REFERENCES Units(id),
          FOREIGN KEY (departmentId) REFERENCES Departments(id),
          FOREIGN KEY (assignedTo) REFERENCES Employees(id),
          FOREIGN KEY (deletedBy) REFERENCES Employees(id),
          FOREIGN KEY (restoredBy) REFERENCES Employees(id)
        );

        CREATE INDEX idx_subtools_parentTool ON SubTools(parentTool);
        CREATE INDEX idx_subtools_subToolTypeId ON SubTools(subToolTypeId);
        CREATE INDEX idx_subtools_code ON SubTools(code);
        CREATE INDEX idx_subtools_serialNumber ON SubTools(serialNumber);
        CREATE INDEX idx_subtools_status ON SubTools(status);
        CREATE INDEX idx_subtools_assignedTo ON SubTools(assignedTo);
        CREATE INDEX idx_subtools_isDelete ON SubTools(isDelete);
      END
      ELSE
      BEGIN
        -- Thêm cột images nếu bảng đã tồn tại nhưng chưa có cột này
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('SubTools') AND name = 'images')
        BEGIN
          ALTER TABLE SubTools ADD images NVARCHAR(MAX) NULL;
        END
      END
      -- Use EXEC to isolate the TRIGGER creation from the batch
      IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_SubTools_UpdatedAt')
      BEGIN
        EXEC('
          CREATE TRIGGER trg_SubTools_UpdatedAt
          ON SubTools
          AFTER UPDATE
          AS
          BEGIN
            SET NOCOUNT ON;
            UPDATE SubTools
            SET updatedAt = GETDATE()
            FROM SubTools st
            INNER JOIN inserted i ON st.id = i.id;
          END
        ');
      END
    `;

    await pool.request().query(query);
  }

  static async findAll(params: {
    parentToolId?: string;
    subToolTypeId?: string;
    status?: string;
    condition?: string;
    assignedTo?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    includeDeleted?: boolean;
  }): Promise<{ subTools: ISubToolWithRelations[]; total: number }> {
    const pool = getPool();
    const {
      parentToolId,
      subToolTypeId,
      status,
      condition,
      assignedTo,
      departmentId,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeDeleted = false
    } = params;

    const whereClauses: string[] = ['st.isDelete = 0'];
    const request = pool.request();

    if (!includeDeleted) {
      whereClauses.push('st.isDelete = 0');
    }


    if (parentToolId) {
      whereClauses.push('st.parentTool = @parentToolId');
      request.input('parentToolId', sql.UniqueIdentifier, parentToolId);
    }

    if (subToolTypeId) {
      whereClauses.push('st.subToolTypeId = @subToolTypeId');
      request.input('subToolTypeId', sql.UniqueIdentifier, subToolTypeId);
    }

    if (status) {
      whereClauses.push('st.status = @status');
      request.input('status', sql.NVarChar, status);
    }

    if (condition) {
      whereClauses.push('st.condition = @condition');
      request.input('condition', sql.NVarChar, condition);
    }

    if (assignedTo) {
      whereClauses.push('st.assignedTo = @assignedTo');
      request.input('assignedTo', sql.UniqueIdentifier, assignedTo);
    }

    if (departmentId) {
      whereClauses.push('st.departmentId = @departmentId');
      request.input('departmentId', sql.UniqueIdentifier, departmentId);
    }

    const whereClause = whereClauses.length > 0 ? whereClauses.join(' AND ') : '1=1';
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as total FROM SubTools st WHERE ${whereClause}`;

    const dataQuery = `
      SELECT 
        st.*,
        t.name as parentTool_name, t.code as parentTool_code,
        cst.name as subToolType_name,
        c.name as category_name,
        u.name as unit_name, u.code as unit_code,
        d.name as department_name, d.code as department_code,
        e.name as assignedTo_name, e.email as assignedTo_email, e.code as assignedTo_code
      FROM SubTools st
      LEFT JOIN Tools t ON st.parentTool = t.id
      LEFT JOIN CategorySubTool cst ON st.subToolTypeId = cst.id
      LEFT JOIN Categories c ON st.categoryId = c.id
      LEFT JOIN Units u ON st.unitId = u.id
      LEFT JOIN Departments d ON st.departmentId = d.id
      LEFT JOIN Employees e ON st.assignedTo = e.id
      WHERE ${whereClause}
      ORDER BY st.${sortBy} ${sortOrder.toUpperCase()}
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

    const subTools = dataResult.recordset.map(row => this.mapSubToolWithRelations(row));

    return {
      subTools,
      total: countResult.recordset[0].total
    };
  }

  static async findById(id: string, includeDeleted: boolean = false): Promise<ISubToolWithRelations | null> {
    const pool = getPool();
    const whereClause = includeDeleted ? '' : 'AND st.isDelete = 0';

    const query = `
      SELECT 
        st.*,
        t.name as parentTool_name, t.code as parentTool_code,
        cst.name as subToolType_name,
        c.name as category_name,
        u.name as unit_name, u.code as unit_code,
        d.name as department_name, d.code as department_code,
        e.name as assignedTo_name, e.email as assignedTo_email, e.code as assignedTo_code,
        e.departmentId as assignedTo_departmentId
      FROM SubTools st
      LEFT JOIN Tools t ON st.parentTool = t.id
      LEFT JOIN CategorySubTool cst ON st.subToolTypeId = cst.id
      LEFT JOIN Categories c ON st.categoryId = c.id
      LEFT JOIN Units u ON st.unitId = u.id
      LEFT JOIN Departments d ON st.departmentId = d.id
      LEFT JOIN Employees e ON st.assignedTo = e.id
      WHERE st.id = @id ${whereClause}
    `;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    if (result.recordset.length === 0) return null;

    return this.mapSubToolWithRelations(result.recordset[0]);
  }

  static async search(params: {
    keyword: string;
    parentToolId?: string;
    subToolTypeId?: string;
    status?: string;
    level?: number;
    currentEmployeeDepartmentId?: string;
    currentEmployeeUnitId?: string;
  }): Promise<ISubToolWithRelations[]> {
    const pool = getPool();
    const { keyword, parentToolId, subToolTypeId, status, level, currentEmployeeDepartmentId, currentEmployeeUnitId } = params;

    const whereClauses: string[] = [
      'st.isDelete = 0',
      '(st.name LIKE @keyword OR st.code LIKE @keyword)'
    ];
    const request = pool.request().input('keyword', sql.NVarChar, `%${keyword}%`);

    if (level && level < 4) {
      if (level === 3 && currentEmployeeUnitId) {
        whereClauses.push('st.unitId = @unitId');
        request.input('unitId', sql.UniqueIdentifier, currentEmployeeUnitId);
      } else if (level < 3 && currentEmployeeDepartmentId) {
        whereClauses.push('st.departmentId = @departmentId');
        request.input('departmentId', sql.UniqueIdentifier, currentEmployeeDepartmentId);
      }
    }

    if (parentToolId) {
      whereClauses.push('st.parentTool = @parentToolId');
      request.input('parentToolId', sql.UniqueIdentifier, parentToolId);
    }

    if (subToolTypeId) {
      whereClauses.push('st.subToolTypeId = @subToolTypeId');
      request.input('subToolTypeId', sql.UniqueIdentifier, subToolTypeId);
    }

    if (status) {
      whereClauses.push('st.status = @status');
      request.input('status', sql.NVarChar, status);
    }

    const query = `
      SELECT TOP 50
        st.*,
        t.name as parentTool_name, t.code as parentTool_code,
        cst.name as subToolType_name,
        u.name as unit_name, u.code as unit_code,
        d.name as department_name, d.code as department_code,
        e.name as assignedTo_name, e.email as assignedTo_email, e.code as assignedTo_code
      FROM SubTools st
      LEFT JOIN Tools t ON st.parentTool = t.id
      LEFT JOIN CategorySubTool cst ON st.subToolTypeId = cst.id
      LEFT JOIN Units u ON st.unitId = u.id
      LEFT JOIN Departments d ON st.departmentId = d.id
      LEFT JOIN Employees e ON st.assignedTo = e.id
      WHERE ${whereClauses.join(' AND ')}
    `;

    const result = await request.query(query);
    return result.recordset.map(row => this.mapSubToolWithRelations(row));
  }

  
  
  //create
  static async create(subTool: ISubTool): Promise<ISubToolWithRelations> {
    const pool = getPool();

    let categoryId = subTool.categoryId;

    if (!categoryId && subTool.parentTool) {
      const parentQuery = `
      SELECT categoryId 
      FROM Tools 
      WHERE id = @parentToolId
    `;

      const parentResult = await pool.request()
        .input('parentToolId', sql.UniqueIdentifier, subTool.parentTool)
        .query(parentQuery);

      if (parentResult.recordset.length > 0) {
        categoryId = parentResult.recordset[0].categoryId;
      }
    }

    const specificationsJson = subTool.specifications ? JSON.stringify(subTool.specifications) : null;

    const imagesJson = subTool.images && subTool.images.length > 0
      ? JSON.stringify(subTool.images)
      : null;

    const query = `
      INSERT INTO SubTools (
        code, name, brand, model, serialNumber, unitOC, parentTool, subToolTypeId, categoryId,
        unitId, departmentId, quantity, specifications, purchaseDate, purchasePrice, dateOfReceipt,
        warrantyUntil, status, condition, assignedTo, assignedDate, notes, description, hasAccessorys, images
      )
      OUTPUT INSERTED.id
      VALUES (
        @code, @name, @brand, @model, @serialNumber, @unitOC, @parentTool, @subToolTypeId, @categoryId,
        @unitId, @departmentId, @quantity, @specifications, @purchaseDate, @purchasePrice, @dateOfReceipt,
        @warrantyUntil, @status, @condition, @assignedTo, @assignedDate, @notes, @description, @hasAccessorys, @images
      )
    `;

    const request = pool.request()
      .input('code', sql.NVarChar, subTool.code)
      .input('name', sql.NVarChar, subTool.name)
      .input('brand', sql.NVarChar, subTool.brand || null)
      .input('model', sql.NVarChar, subTool.model || null)
      .input('serialNumber', sql.NVarChar, subTool.serialNumber || null)
      .input('unitOC', sql.NVarChar, subTool.unitOC || null)
      .input('parentTool', sql.UniqueIdentifier, subTool.parentTool)
      .input('subToolTypeId', sql.UniqueIdentifier, subTool.subToolTypeId)
      .input('categoryId', sql.UniqueIdentifier, categoryId)
      .input('unitId', sql.UniqueIdentifier, subTool.unitId)
      .input('departmentId', sql.UniqueIdentifier, subTool.departmentId)
      .input('quantity', sql.Int, subTool.quantity || 1)
      .input('specifications', sql.NVarChar(sql.MAX), specificationsJson)
      .input('purchaseDate', sql.Date, subTool.purchaseDate || null)
      .input('purchasePrice', sql.Decimal(18, 2), subTool.purchasePrice || null)
      .input('dateOfReceipt', sql.Date, subTool.dateOfReceipt || null)
      .input('warrantyUntil', sql.Date, subTool.warrantyUntil || null)
      .input('status', sql.NVarChar, subTool.status || 'Đang sử dụng')
      .input('condition', sql.NVarChar, subTool.condition || 'Mới')
      .input('assignedTo', sql.UniqueIdentifier, subTool.assignedTo || null)
      .input('assignedDate', sql.Date, subTool.assignedDate || null)
      .input('notes', sql.NVarChar, subTool.notes || null)
      .input('description', sql.NVarChar, subTool.description || null)
      .input('hasAccessorys', sql.Bit, subTool.hasAccessorys ? 1 : 0)
      .input('images', sql.NVarChar, imagesJson);

    const result = await request.query(query);

    const insertedId = result.recordset[0].id;
    return this.findById(insertedId) as Promise<ISubToolWithRelations>;
  }


  //update
  static async update(id: string, subToolData: Partial<ISubTool>): Promise<ISubToolWithRelations | null> {
    const pool = getPool();
    const updates: string[] = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    const allowedFields = [
      'name', 'brand', 'model', 'serialNumber', 'unitOC', 'quantity', 'specifications',
      'purchaseDate', 'purchasePrice', 'dateOfReceipt', 'warrantyUntil', 'status',
      'condition', 'assignedTo', 'assignedDate', 'notes', 'description', 'hasAccessorys',
      'unitId', 'departmentId', 'categoryId', 'parentTool', 'images'
    ];

    allowedFields.forEach(field => {
      if (subToolData[field as keyof ISubTool] !== undefined) {
        const value = subToolData[field as keyof ISubTool];
        if (field === 'images') {
          const imagesJson = value && Array.isArray(value) && value.length > 0
           ? JSON.stringify(value)
           : null
          updates.push('images = @images');
          request.input('images', sql.NVarChar, imagesJson);
        } else if (field === 'specifications') {
          updates.push('specifications = @specifications');
          request.input('specifications', sql.NVarChar(sql.MAX), JSON.stringify(value));
        } else if (field === 'hasAccessorys') {
          updates.push('hasAccessorys = @hasAccessorys');
          request.input('hasAccessorys', sql.Bit, value ? 1 : 0);
        } else if (['unitId', 'departmentId', 'categoryId', 'assignedTo', 'parentTool'].includes(field)) {
          updates.push(`${field} = @${field}`);
          request.input(field, sql.UniqueIdentifier, value);
        } else if (['purchaseDate', 'dateOfReceipt', 'warrantyUntil', 'assignedDate'].includes(field)) {
          updates.push(`${field} = @${field}`);
          request.input(field, sql.Date, value);
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
      UPDATE SubTools 
      SET ${updates.join(', ')}
      WHERE id = @id AND isDelete = 0
    `;

    await request.query(query);
    return this.findById(id);
  }

  //soft delete
  static async softDelete(id: string, deletedBy: string): Promise<boolean> {
    const pool = getPool();
    const query = `
      UPDATE SubTools 
      SET isDelete = 1, deletedAt = GETDATE(), deletedBy = @deletedBy
      WHERE id = @id AND isDelete = 0
    `;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('deletedBy', sql.UniqueIdentifier, deletedBy)
      .query(query);

    return result.rowsAffected[0] > 0;
  }

  //lấy subtool theo tool
  static async getParentToolInfo(subToolId: string): Promise<any> {
    const pool = getPool();
    const query = `
        SELECT 
            t.assignedTo,
            t.assignedDate,
            t.unitId,
            t.departmentId
        FROM Tools t
        INNER JOIN SubTools st ON st.parentTool = t.id
        WHERE st.id = @subToolId
    `;

    const result = await pool.request()
      .input('subToolId', sql.UniqueIdentifier, subToolId)
      .query(query);

    return result.recordset[0];
  }


  //restore
  static async restore(id: string, restoredBy: string): Promise<{
    success: boolean;
    message: string;
    syncedWithParent?: boolean;
  }> {
    const pool = getPool();

    try {
      const subToolInfo = await this.findById(id, true);

      if (!subToolInfo || !subToolInfo.isDelete) {
        return {
          success: false,
          message: 'SubTool không tồn tại hoặc chưa bị xóa'
        };
      }

      const parentInfo = await this.getParentToolInfo(id);

      if (!parentInfo) {
        const query = `
                UPDATE SubTools 
                SET 
                    isDelete = 0, 
                    deletedAt = NULL, 
                    deletedBy = NULL, 
                    restoredAt = GETDATE(), 
                    restoredBy = @restoredBy
                WHERE id = @id AND isDelete = 1
            `;

        const result = await pool.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('restoredBy', sql.UniqueIdentifier, restoredBy)
          .query(query);

        return {
          success: result.rowsAffected[0] > 0,
          message: 'Khôi phục thành công (Tool cha không tồn tại)',
          syncedWithParent: false
        };
      }

      const query = `
            UPDATE SubTools 
            SET 
                isDelete = 0, 
                deletedAt = NULL, 
                deletedBy = NULL, 
                restoredAt = GETDATE(), 
                restoredBy = @restoredBy,
                assignedTo = @assignedTo,
                assignedDate = @assignedDate,
                unitId = @unitId,
                departmentId = @departmentId
            WHERE id = @id AND isDelete = 1
        `;

      const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('restoredBy', sql.UniqueIdentifier, restoredBy)
        .input('assignedTo', sql.UniqueIdentifier, parentInfo.assignedTo)
        .input('assignedDate', sql.DateTime, parentInfo.assignedDate)
        .input('unitId', sql.UniqueIdentifier, parentInfo.unitId)
        .input('departmentId', sql.UniqueIdentifier, parentInfo.departmentId)
        .query(query);

      return {
        success: result.rowsAffected[0] > 0,
        message: 'Khôi phục và đồng bộ với Tool cha thành công',
        syncedWithParent: true
      };

    } catch (error) {
      console.error('Restore SubTool error:', error);
      throw error;
    }
  }

  //delete
  static async hardDelete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM SubTools WHERE id = @id`;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    return result.rowsAffected[0] > 0;
  }

  //tìm theo tool
  static async findByParentTool(parentToolId: string): Promise<ISubToolWithRelations[]> {
    const pool = getPool();
    const query = `
      SELECT 
        st.*,
        t.name as parentTool_name, t.code as parentTool_code,
        cst.name as subToolType_name,
        e.name as assignedTo_name,
        p.name as assignedTo_position_name,
        (SELECT COUNT(*) FROM Accessories WHERE subTool = st.id AND isDelete = 0) as accessorysCount
      FROM SubTools st
      LEFT JOIN Tools t ON st.parentTool = t.id
      LEFT JOIN CategorySubTool cst ON st.subToolTypeId = cst.id
      LEFT JOIN Employees e ON st.assignedTo = e.id
      LEFT JOIN Positions p ON e.positionId = p.id
      WHERE st.parentTool = @parentToolId AND st.isDelete = 0
      ORDER BY st.subToolTypeId, st.createdAt DESC
    `;

    const result = await pool.request()
      .input('parentToolId', sql.UniqueIdentifier, parentToolId)
      .query(query);

    return result.recordset.map(row => this.mapSubToolWithRelations(row));
  }

  // count
  static async countDocuments(filters: any): Promise<number> {
    const pool = getPool();
    const whereClauses: string[] = [];
    const request = pool.request();

    if (filters.isDelete !== undefined) {
      whereClauses.push('isDelete = @isDelete');
      request.input('isDelete', sql.Bit, filters.isDelete ? 1 : 0);
    }

    if (filters.parentTool) {
      whereClauses.push('parentTool = @parentTool');
      request.input('parentTool', sql.UniqueIdentifier, filters.parentTool);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const query = `SELECT COUNT(*) as total FROM SubTools ${whereClause}`;

    const result = await request.query(query);
    return result.recordset[0].total;
  }


  static async assignToEmployee(
    parentToolId: string,
    employeeId: string,
    unitId: string,
    departmentId: string,
    condition?: string
  ): Promise<number> {
    const pool = getPool();

    const updates = [
      'unitId = @unitId',
      'departmentId = @departmentId',
      'assignedTo = @employeeId',
      'assignedDate = GETDATE()',
      'status = N\'Đang sử dụng\''
    ];

    const request = pool.request()
      .input('parentToolId', sql.UniqueIdentifier, parentToolId)
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .input('unitId', sql.UniqueIdentifier, unitId)
      .input('departmentId', sql.UniqueIdentifier, departmentId);

    if (condition) {
      updates.push('condition = @condition');
      request.input('condition', sql.NVarChar, condition);
    }

    const query = `
      UPDATE SubTools 
      SET ${updates.join(', ')}
      WHERE parentTool = @parentToolId AND isDelete = 0
    `;

    const result = await request.query(query);
    return result.rowsAffected[0];
  }

  static async revokeFromEmployee(
    parentToolId: string,
    employeeId: string,
    condition?: string
  ): Promise<number> {
    const pool = getPool();

    const updates = [
      'assignedTo = NULL',
      'assignedDate = NULL',
      'status = N\'Dự phòng\''
    ];

    const request = pool.request()
      .input('parentToolId', sql.UniqueIdentifier, parentToolId)
      .input('employeeId', sql.UniqueIdentifier, employeeId);

    if (condition) {
      updates.push('condition = @condition');
      request.input('condition', sql.NVarChar, condition);
    }

    const query = `
      UPDATE SubTools 
      SET ${updates.join(', ')}
      WHERE parentTool = @parentToolId AND assignedTo = @employeeId AND isDelete = 0
    `;

    const result = await request.query(query);
    return result.rowsAffected[0];
  }

  static async softDeleteByParentTool(parentToolId: string, deletedBy: string): Promise<number> {
    const pool = getPool();
    const query = `
      UPDATE SubTools 
      SET isDelete = 1, deletedAt = GETDATE(), deletedBy = @deletedBy
      WHERE parentTool = @parentToolId AND isDelete = 0
    `;

    const result = await pool.request()
      .input('parentToolId', sql.UniqueIdentifier, parentToolId)
      .input('deletedBy', sql.UniqueIdentifier, deletedBy)
      .query(query);

    return result.rowsAffected[0];
  }

  static async restoreByParentTool(parentToolId: string, restoredBy: string): Promise<number> {
    const pool = getPool();
    const query = `
      UPDATE SubTools 
      SET isDelete = 0, deletedAt = NULL, deletedBy = NULL,
          restoredAt = GETDATE(), restoredBy = @restoredBy
      WHERE parentTool = @parentToolId AND isDelete = 1
    `;

    const result = await pool.request()
      .input('parentToolId', sql.UniqueIdentifier, parentToolId)
      .input('restoredBy', sql.UniqueIdentifier, restoredBy)
      .query(query);

    return result.rowsAffected[0];
  }

  static async permanentDeleteWithChildren(subToolId: string): Promise<number> {
    const pool = getPool();

    const deleteAccQuery = `
      DELETE FROM Accessories WHERE subTool = @subToolId
    `;

    const accResult = await pool.request()
      .input('subToolId', sql.UniqueIdentifier, subToolId)
      .query(deleteAccQuery);

    const deleteQuery = `DELETE FROM SubTools WHERE id = @subToolId`;
    await pool.request()
      .input('subToolId', sql.UniqueIdentifier, subToolId)
      .query(deleteQuery);

    return accResult.rowsAffected[0];
  }

  static async hardDeleteByParentTool(parentToolId: string): Promise<number> {
    const pool = getPool();
    const query = `DELETE FROM SubTools WHERE parentTool = @parentToolId`;

    const result = await pool.request()
      .input('parentToolId', sql.UniqueIdentifier, parentToolId)
      .query(query);

    return result.rowsAffected[0];
  }

  // lấy danh sách đã xoá
  static async getDeleted(params: {
    departmentId?: string;
    employeeId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ subTools: ISubToolWithRelations[]; total: number }> {
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

    const countQuery = `SELECT COUNT(*) as total FROM SubTools WHERE ${whereClause}`;

    const dataQuery = `
      SELECT TOP (${limit})
        sub.id,
        sub.code,
        sub.name,
        sub.parentTool,
        sub.subToolTypeId,
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
        sub.deletedBy,
        sub.deletedAt,
        sub.isDelete,
        sub.restoredAt,
        sub.restoredBy,
        sub.createdAt,
        sub.updatedAt,
        sub.type,
        sub.typeLabel,
        sub.images,
        e.name as assignedTo_name, 
        e.email as assignedTo_email, 
        e.code as assignedTo_code,
        p.name as assignedTo_position_name,
        u.name as unit_name, 
        u.code as unit_code,
        d.name as department_name, 
        d.code as department_code,
        stt.name as subToolType_name,
        de.name as deletedBy_name, 
        de.email as deletedBy_email,
        dp.name as deletedBy_position_name
      FROM (
        SELECT 
          *,
          'SubTool' as type,
          N'Bộ phận' as typeLabel,
          ROW_NUMBER() OVER (ORDER BY ${safeSortBy} ${sortOrder.toUpperCase()}) as RowNum
        FROM SubTools
        WHERE ${whereClause}
      ) sub
      LEFT JOIN Employees e ON sub.assignedTo = e.id
      LEFT JOIN Positions p ON e.positionId = p.id
      LEFT JOIN Units u ON sub.unitId = u.id
      LEFT JOIN Departments d ON sub.departmentId = d.id
      LEFT JOIN CategorySubTool stt ON sub.subToolTypeId = stt.id
      LEFT JOIN Employees de ON sub.deletedBy = de.id
      LEFT JOIN Positions dp ON de.positionId = dp.id
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

    const subTools = dataResult.recordset.map(row => this.mapSubToolWithRelations(row));

    return {
      subTools,
      total: countResult.recordset[0].total
    };
  }

  private static mapSubToolWithRelations(row: any): ISubToolWithRelations {
    const subTool: ISubToolWithRelations = {
      id: row.id,
      code: row.code,
      name: row.name,
      brand: row.brand,
      model: row.model,
      serialNumber: row.serialNumber,
      unitOC: row.unitOC,
      parentTool: row.parentTool,
      subToolTypeId: row.subToolTypeId,
      categoryId: row.categoryId,
      unitId: row.unitId,
      departmentId: row.departmentId,
      quantity: row.quantity,
      specifications: row.specifications ? JSON.parse(row.specifications) : null,
      purchaseDate: row.purchaseDate,
      purchasePrice: row.purchasePrice,
      dateOfReceipt: row.dateOfReceipt,
      warrantyUntil: row.warrantyUntil,
      status: row.status,
      condition: row.condition,
      assignedTo: row.assignedTo,
      assignedDate: row.assignedDate,
      notes: row.notes,
      description: row.description,
      hasAccessorys: row.hasAccessorys,
      isDelete: row.isDelete,
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy,
      restoredAt: row.restoredAt,
      restoredBy: row.restoredBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };

    if (row.images) {
      try {
        subTool.images = JSON.parse(row.images);
      } catch (error) {
        subTool.images = [];
      }
    } else {
      subTool.images = [];
    }

    if (row.parentTool_name) {
      subTool.parentToolInfo = {
        _id: row.parentTool,
        name: row.parentTool_name,
        code: row.parentTool_code
      };
    }

    if (row.subToolType_name) {
      subTool.subToolTypeInfo = {
        id: row.subToolTypeId,
        name: row.subToolType_name,
      };
    }

    if (row.category_name) {
      subTool.categoryInfo = {
        _id: row.categoryId,
        name: row.category_name
      };
    }

    if (row.unit_name) {
      subTool.unitInfo = {
        _id: row.unitId,
        name: row.unit_name,
        code: row.unit_code
      };
    }

    if (row.department_name) {
      subTool.departmentInfo = {
        _id: row.departmentId,
        name: row.department_name,
        code: row.department_code
      };
    }

    if (row.assignedTo_name) {
      subTool.assignedToInfo = {
        _id: row.assignedTo,
        name: row.assignedTo_name,
        email: row.assignedTo_email,
        code: row.assignedTo_code,
        departmentId: row.assignedTo_departmentId,
        positionId: row.assignedTo_position_name ? {
          name: row.assignedTo_position_name
        } : undefined
      };
    }

    if (row.deletedBy_name) {
      subTool.deletedByInfo = {
        _id: row.deletedBy,
        name: row.deletedBy_name,
        email: row.deletedBy_email,
        code: row.deletedBy_code
      };
    }

    if (row.accessorysCount !== undefined) {
      subTool.accessorysCount = row.accessorysCount;
    }

    if (row.warrantyUntil) {
      subTool.isUnderWarranty = new Date(row.warrantyUntil) > new Date();
    }

    return subTool;
  }
}