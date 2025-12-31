import sql from 'mssql';
import { getPool } from '../config/database';

export interface IAccessorySpecifications {
  // CPU specs
  cores?: number;
  threads?: number;
  baseClock?: string;
  boostClock?: string;
  cache?: string;
  tdp?: string;
  socket?: string;

  // RAM specs
  capacity?: string;
  speed?: string;
  generation?: string;
  latency?: string;

  // Storage specs
  storageCapacity?: string;
  interface?: string;
  readSpeed?: string;
  writeSpeed?: string;
  formFactor?: string;

  // GPU specs
  vram?: string;
  coreClock?: string;
  memoryClock?: string;
  powerConnector?: string;

  // Motherboard specs
  chipset?: string;
  memorySlots?: number;
  m2Slots?: number;
  pciSlots?: number;
  sataports?: number;

  // PSU specs
  wattage?: string;
  efficiency?: string;
  modular?: string;

  // Other specs
  other?: { [key: string]: string };
}

export interface IAccessory {
  id?: string;
  code?: string;
  name: string;
  serialNumber?: string | null;
  model?: string | null;
  subTool: string;
  parentTool: string;
  accessoryTypeId: string;
  categoryId?: string | null;
  unitId: string;
  departmentId: string;
  assignedTo?: string;
  assignedDate?: Date;
  quantity?: number;
  brand?: string;
  unitOC?: string;
  specifications?: IAccessorySpecifications;
  slot?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  warrantyUntil?: Date;
  status?: string;
  condition?: string;
  upgradedFrom?: string;
  upgradedTo?: string;
  upgradeDate?: Date;
  dateOfReceipt?: Date;
  upgradeReason?: string;
  notes?: string;
  description?: string;
  isDelete?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  restoredAt?: Date;
  restoredBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAccessoryWithRelations extends IAccessory {
  subToolInfo?: any;
  parentToolInfo?: any;
  accessoryTypeInfo?: any;
  categoryInfo?: any;
  unitInfo?: any;
  departmentInfo?: any;
  assignedToInfo?: any;
  upgradedFromInfo?: any;
  upgradedToInfo?: any;
  isUnderWarranty?: boolean;
}

export class AccessoryModel {
  static async createTable(): Promise<void> {
    const pool = getPool();
    const query = `
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Accessories' AND xtype='U')
      BEGIN
        CREATE TABLE Accessories (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          code NVARCHAR(100) NULL UNIQUE,
          name NVARCHAR(255) NOT NULL,
          subTool UNIQUEIDENTIFIER NOT NULL,
          parentTool UNIQUEIDENTIFIER NOT NULL,
          accessoryTypeId UNIQUEIDENTIFIER NOT NULL,
          categoryId UNIQUEIDENTIFIER NULL,
          unitId UNIQUEIDENTIFIER NOT NULL,
          departmentId UNIQUEIDENTIFIER NOT NULL,
          assignedTo UNIQUEIDENTIFIER NULL,
          assignedDate DATETIME NULL,
          quantity INT NULL,
          brand NVARCHAR(100) NULL,
          unitOC NVARCHAR(50) NULL,
          specifications NVARCHAR(MAX) NULL,
          slot NVARCHAR(100) NULL,
          purchaseDate DATE NULL,
          purchasePrice DECIMAL(18, 2) NULL CHECK (purchasePrice >= 0),
          warrantyUntil DATE NULL,
          status NVARCHAR(50) DEFAULT N'Đang sử dụng' CHECK (status IN (N'Khả dụng', N'Đang sử dụng', N'Bảo trì', N'Hỏng', N'Đã nâng cấp', N'Thanh lý')),
          condition NVARCHAR(50) DEFAULT N'Mới' CHECK (condition IN (N'Mới', N'Cũ', N'Hỏng')),
          upgradedFrom UNIQUEIDENTIFIER NULL,
          upgradedTo UNIQUEIDENTIFIER NULL,
          upgradeDate DATE NULL,
          dateOfReceipt DATE NULL,
          upgradeReason NVARCHAR(1000) NULL,
          notes NVARCHAR(1000) NULL,
          description NVARCHAR(2000) NULL,
          isDelete BIT DEFAULT 0,
          deletedAt DATETIME NULL,
          deletedBy UNIQUEIDENTIFIER NULL,
          restoredAt DATETIME NULL,
          restoredBy UNIQUEIDENTIFIER NULL,
          createdAt DATETIME DEFAULT GETDATE(),
          updatedAt DATETIME DEFAULT GETDATE(),
          
          FOREIGN KEY (subTool) REFERENCES SubTools(id),
          FOREIGN KEY (parentTool) REFERENCES Tools(id),
          FOREIGN KEY (accessoryTypeId) REFERENCES CategoryAccessory(id),
          FOREIGN KEY (categoryId) REFERENCES Categories(id),
          FOREIGN KEY (unitId) REFERENCES Units(id),
          FOREIGN KEY (departmentId) REFERENCES Departments(id),
          FOREIGN KEY (assignedTo) REFERENCES Employees(id),
          FOREIGN KEY (upgradedFrom) REFERENCES Accessories(id),
          FOREIGN KEY (upgradedTo) REFERENCES Accessories(id),
          FOREIGN KEY (deletedBy) REFERENCES Employees(id),
          FOREIGN KEY (restoredBy) REFERENCES Employees(id)
        );

        CREATE INDEX idx_accessories_subTool ON Accessories(subTool);
        CREATE INDEX idx_accessories_parentTool ON Accessories(parentTool);
        CREATE INDEX idx_accessories_code ON Accessories(code);
        CREATE INDEX idx_accessories_status ON Accessories(status);
        CREATE INDEX idx_accessories_assignedTo ON Accessories(assignedTo);
        CREATE INDEX idx_accessories_isDelete ON Accessories(isDelete);
      END

      IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_Accessories_UpdatedAt')
      BEGIN
        EXEC('
          CREATE TRIGGER trg_Accessories_UpdatedAt
          ON Accessories
          AFTER UPDATE
          AS
          BEGIN
            SET NOCOUNT ON;
            UPDATE Accessories
            SET updatedAt = GETDATE()
            FROM Accessories a
            INNER JOIN inserted i ON a.id = i.id;
          END
        ');
      END
    `;

    await pool.request().query(query);
  }

  static async findAll(params: {
    subTool?: string;
    parentTool?: string;
    accessoryTypeId?: string;
    status?: string;
    condition?: string;
    assignedTo?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ accessories: IAccessoryWithRelations[]; total: number }> {
    const pool = getPool();
    const {
      subTool,
      parentTool,
      accessoryTypeId,
      status,
      condition,
      assignedTo,
      departmentId,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    const whereClauses: string[] = ['a.isDelete = 0'];
    const request = pool.request();

    if (subTool) {
      whereClauses.push('a.subTool = @subTool');
      request.input('subTool', sql.UniqueIdentifier, subTool);
    }

    if (parentTool) {
      whereClauses.push('a.parentTool = @parentTool');
      request.input('parentTool', sql.UniqueIdentifier, parentTool);
    }

    if (accessoryTypeId) {
      whereClauses.push('a.accessoryTypeId = @accessoryTypeId');
      request.input('accessoryTypeId', sql.UniqueIdentifier, accessoryTypeId);
    }

    if (status) {
      whereClauses.push('a.status = @status');
      request.input('status', sql.NVarChar, status);
    }

    if (condition) {
      whereClauses.push('a.condition = @condition');
      request.input('condition', sql.NVarChar, condition);
    }

    if (assignedTo) {
      whereClauses.push('a.assignedTo = @assignedTo');
      request.input('assignedTo', sql.UniqueIdentifier, assignedTo);
    }

    if (departmentId) {
      whereClauses.push('a.departmentId = @departmentId');
      request.input('departmentId', sql.UniqueIdentifier, departmentId);
    }

    const whereClause = whereClauses.join(' AND ');
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as total FROM Accessories a WHERE ${whereClause}`;

    const dataQuery = `
      SELECT 
        a.*,
        st.name as subTool_name, st.code as subTool_code,
        t.name as parentTool_name, t.code as parentTool_code,
        ca.name as accessoryType_name,
        u.name as unit_name, u.code as unit_code,
        d.name as department_name, d.code as department_code,
        e.name as assignedTo_name, e.email as assignedTo_email, e.code as assignedTo_code
      FROM Accessories a
      LEFT JOIN SubTools st ON a.subTool = st.id
      LEFT JOIN Tools t ON a.parentTool = t.id
      LEFT JOIN CategoryAccessory ca ON a.accessoryTypeId = ca.id
      LEFT JOIN Units u ON a.unitId = u.id
      LEFT JOIN Departments d ON a.departmentId = d.id
      LEFT JOIN Employees e ON a.assignedTo = e.id
      WHERE ${whereClause}
      ORDER BY a.${sortBy} ${sortOrder.toUpperCase()}
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

    const accessories = dataResult.recordset.map(row => this.mapAccessoryWithRelations(row));

    return {
      accessories,
      total: countResult.recordset[0].total
    };
  }

  static async findById(id: string, includeDeleted: boolean = false): Promise<IAccessoryWithRelations | null> {
    const pool = getPool();
    const whereClause = includeDeleted ? '' : 'AND a.isDelete = 0';

    const query = `
      SELECT 
        a.*,
        st.name as subTool_name, st.code as subTool_code,
        t.name as parentTool_name, t.code as parentTool_code,
        ca.name as accessoryType_name,
        u.name as unit_name, u.code as unit_code,
        d.name as department_name, d.code as department_code,
        e.name as assignedTo_name, e.email as assignedTo_email, e.code as assignedTo_code
      FROM Accessories a
      LEFT JOIN SubTools st ON a.subTool = st.id
      LEFT JOIN Tools t ON a.parentTool = t.id
      LEFT JOIN CategoryAccessory ca ON a.accessoryTypeId = ca.id
      LEFT JOIN Units u ON a.unitId = u.id
      LEFT JOIN Departments d ON a.departmentId = d.id
      LEFT JOIN Employees e ON a.assignedTo = e.id
      WHERE a.id = @id ${whereClause}
    `;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    if (result.recordset.length === 0) return null;

    return this.mapAccessoryWithRelations(result.recordset[0]);
  }

  static async findBySubTool(subToolId: string): Promise<IAccessoryWithRelations[]> {
    const pool = getPool();
    const query = `
      SELECT 
        a.*,
        ca.name as accessoryType_name,
        e.name as assignedTo_name
      FROM Accessories a
      LEFT JOIN CategoryAccessory ca ON a.accessoryTypeId = ca.id
      LEFT JOIN Employees e ON a.assignedTo = e.id
      WHERE a.subTool = @subToolId AND a.isDelete = 0
      ORDER BY a.accessoryTypeId, a.createdAt DESC
    `;

    const result = await pool.request()
      .input('subToolId', sql.UniqueIdentifier, subToolId)
      .query(query);

    return result.recordset.map(row => this.mapAccessoryWithRelations(row));
  }

  static async create(accessory: IAccessory): Promise<IAccessoryWithRelations> {
    const pool = getPool();
    const specificationsJson = accessory.specifications ? JSON.stringify(accessory.specifications) : null;

    const query = `
      INSERT INTO Accessories (
        code, name, subTool, parentTool, accessoryTypeId,
        unitId, departmentId, assignedTo, assignedDate, quantity, brand,
        unitOC, specifications, slot, purchaseDate, purchasePrice, warrantyUntil,
        status, condition, dateOfReceipt, notes, description
      )
      OUTPUT INSERTED.id
      VALUES (
        @code, @name, @subTool, @parentTool, @accessoryTypeId,
        @unitId, @departmentId, @assignedTo, @assignedDate, @quantity, @brand,
        @unitOC, @specifications, @slot, @purchaseDate, @purchasePrice, @warrantyUntil,
        @status, @condition, @dateOfReceipt, @notes, @description
      )
    `;

    const result = await pool.request()
      .input('code', sql.NVarChar, accessory.code || null)
      .input('name', sql.NVarChar, accessory.name)
      .input('subTool', sql.UniqueIdentifier, accessory.subTool)
      .input('parentTool', sql.UniqueIdentifier, accessory.parentTool)
      .input('accessoryTypeId', sql.UniqueIdentifier, accessory.accessoryTypeId)
      .input('unitId', sql.UniqueIdentifier, accessory.unitId)
      .input('departmentId', sql.UniqueIdentifier, accessory.departmentId)
      .input('assignedTo', sql.UniqueIdentifier, accessory.assignedTo || null)
      .input('assignedDate', sql.DateTime, accessory.assignedDate || null)
      .input('quantity', sql.Int, accessory.quantity || null)
      .input('brand', sql.NVarChar, accessory.brand || null)
      .input('unitOC', sql.NVarChar, accessory.unitOC || null)
      .input('specifications', sql.NVarChar(sql.MAX), specificationsJson)
      .input('slot', sql.NVarChar, accessory.slot || null)
      .input('purchaseDate', sql.Date, accessory.purchaseDate || null)
      .input('purchasePrice', sql.Decimal(18, 2), accessory.purchasePrice || null)
      .input('warrantyUntil', sql.Date, accessory.warrantyUntil || null)
      .input('status', sql.NVarChar, accessory.status || 'Đang sử dụng')
      .input('condition', sql.NVarChar, accessory.condition || 'Mới')
      .input('dateOfReceipt', sql.Date, accessory.dateOfReceipt || null)
      .input('notes', sql.NVarChar, accessory.notes || null)
      .input('description', sql.NVarChar, accessory.description || null)
      .query(query);

    const insertedId = result.recordset[0].id;
    return this.findById(insertedId) as Promise<IAccessoryWithRelations>;
  }

  static async update(id: string, accessoryData: Partial<IAccessory>): Promise<IAccessoryWithRelations | null> {
    const pool = getPool();
    const updates: string[] = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    const allowedFields = [
      'name', 'brand', 'slot', 'quantity', 'specifications',
      'purchaseDate', 'purchasePrice', 'warrantyUntil', 'status',
      'condition', 'assignedTo', 'assignedDate', 'notes', 'description',
      'unitId', 'departmentId', 'categoryId', 'unitOC', 'dateOfReceipt',
      'subTool','parentTool'
    ];

    allowedFields.forEach(field => {
      if (accessoryData[field as keyof IAccessory] !== undefined) {
        const value = accessoryData[field as keyof IAccessory];

        if (field === 'specifications') {
          updates.push('specifications = @specifications');
          request.input('specifications', sql.NVarChar(sql.MAX), JSON.stringify(value));
        } else if (['unitId', 'departmentId', 'categoryId', 'assignedTo', 'subTool', 'parentTool'].includes(field)) {
          updates.push(`${field} = @${field}`);
          request.input(field, sql.UniqueIdentifier, value || null);
        } else if (['purchaseDate', 'warrantyUntil', 'assignedDate', 'dateOfReceipt'].includes(field)) {
          updates.push(`${field} = @${field}`);
          request.input(field, sql.Date, value || null);
        } else if (field === 'purchasePrice') {
          updates.push('purchasePrice = @purchasePrice');
          request.input('purchasePrice', sql.Decimal(18, 2), value || null);
        } else if (field === 'quantity') {
          updates.push('quantity = @quantity');
          request.input('quantity', sql.Int, value || null);
        } else {
          updates.push(`${field} = @${field}`);
          request.input(field, sql.NVarChar, value || null);
        }
      }
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE Accessories 
      SET ${updates.join(', ')}
      WHERE id = @id AND isDelete = 0
    `;

    await request.query(query);
    return this.findById(id);
  }

  static async softDelete(id: string, deletedBy: string): Promise<boolean> {
    const pool = getPool();
    const query = `
      UPDATE Accessories 
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
      UPDATE Accessories 
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
    const query = `DELETE FROM Accessories WHERE id = @id`;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    return result.rowsAffected[0] > 0;
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
      UPDATE Accessories 
      SET ${updates.join(', ')}
      WHERE parentTool = @parentToolId AND isDelete = 0
    `;

    const result = await request.query(query);
    return result.rowsAffected[0];
  }

  static async countDocuments(filters: any): Promise<number> {
    const pool = getPool();
    const whereClauses: string[] = [];
    const request = pool.request();

    if (filters.isDelete !== undefined) {
      whereClauses.push('isDelete = @isDelete');
      request.input('isDelete', sql.Bit, filters.isDelete ? 1 : 0);
    }

    if (filters.subTool) {
      whereClauses.push('subTool = @subTool');
      request.input('subTool', sql.UniqueIdentifier, filters.subTool);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const query = `SELECT COUNT(*) as total FROM Accessories ${whereClause}`;

    const result = await request.query(query);
    return result.recordset[0].total;
  }

  static async revokeFromEmployee(
    parentToolId: string,
    employeeId: string,
    condition?: string
  ): Promise<number> {
    const pool = getPool();

    const updates = [
      'departmentId = NULL',
      'unitId = NULL',
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
    UPDATE Accessories 
    SET ${updates.join(', ')}
    WHERE parentTool = @parentToolId AND assignedTo = @employeeId AND isDelete = 0
  `;

    const result = await request.query(query);
    return result.rowsAffected[0];
  }

  // Sửa method getDeleted trong AccessoryModel
  static async getDeleted(params: {
    departmentId?: string;
    employeeId?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ accessories: IAccessoryWithRelations[]; total: number }> {
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

    const countQuery = `SELECT COUNT(*) as total FROM Accessories WHERE ${whereClause}`;

    const dataQuery = `
      SELECT TOP (${limit})
        sub.id,
        sub.code,
        sub.name,
        sub.subTool,
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
        e.name as assignedTo_name, 
        e.email as assignedTo_email, 
        e.code as assignedTo_code,
        p.name as assignedTo_position_name,
        u.name as unit_name, 
        u.code as unit_code,
        d.name as department_name, 
        d.code as department_code,
        de.name as deletedBy_name, 
        de.email as deletedBy_email,
        dp.name as deletedBy_position_name
      FROM (
        SELECT 
          *,
          'Accessory' as type,
          N'Linh kiện' as typeLabel,
          ROW_NUMBER() OVER (ORDER BY ${safeSortBy} ${sortOrder.toUpperCase()}) as RowNum
        FROM Accessories
        WHERE ${whereClause}
      ) sub
      LEFT JOIN Employees e ON sub.assignedTo = e.id
      LEFT JOIN Positions p ON e.positionId = p.id
      LEFT JOIN Units u ON sub.unitId = u.id
      LEFT JOIN Departments d ON sub.departmentId = d.id
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

    const accessories = dataResult.recordset.map(row => this.mapAccessoryWithRelations(row));

    return {
      accessories,
      total: countResult.recordset[0].total
    };
  }

  static async search(params: {
    keyword: string;
    subToolId?: string;
    parentToolId?: string;
    accessoryTypeId?: string;
    status?: string;
    departmentId?: string;
    assignedToId?: string;
  }): Promise<IAccessoryWithRelations[]> {
    const pool = getPool();
    const { keyword, subToolId, parentToolId, accessoryTypeId, status, departmentId, assignedToId } = params;

    const whereClauses: string[] = [
      'a.isDelete = 0',
      '(a.name LIKE @keyword OR a.code LIKE @keyword OR a.brand LIKE @keyword OR a.notes LIKE @keyword)'
    ];
    const request = pool.request().input('keyword', sql.NVarChar, `%${keyword}%`);

    if (subToolId) {
      whereClauses.push('a.subTool = @subToolId');
      request.input('subToolId', sql.UniqueIdentifier, subToolId);
    }

    if (parentToolId) {
      whereClauses.push('a.parentTool = @parentToolId');
      request.input('parentToolId', sql.UniqueIdentifier, parentToolId);
    }

    if (accessoryTypeId) {
      whereClauses.push('a.accessoryTypeId = @accessoryTypeId');  // ✅ Sửa từ accessoryType
      request.input('accessoryTypeId', sql.UniqueIdentifier, accessoryTypeId);
    }

    if (status) {
      whereClauses.push('a.status = @status');
      request.input('status', sql.NVarChar, status);
    }

    if (departmentId) {
      whereClauses.push('a.departmentId = @departmentId');
      request.input('departmentId', sql.UniqueIdentifier, departmentId);
    }

    if (assignedToId) {
      whereClauses.push('a.assignedTo = @assignedToId');
      request.input('assignedToId', sql.UniqueIdentifier, assignedToId);
    }

    const query = `
        SELECT TOP 50
            a.*,
            st.code as subTool_code, st.name as subTool_name,
            pt.code as parentTool_code, pt.name as parentTool_name,
            cat.name as accessoryType_name,
            e.name as assignedTo_name, e.email as assignedTo_email, e.code as assignedTo_code
        FROM Accessories a
        LEFT JOIN SubTools st ON a.subTool = st.id
        LEFT JOIN Tools pt ON a.parentTool = pt.id
        LEFT JOIN CategoryAccessory cat ON a.accessoryTypeId = cat.id
        LEFT JOIN Employees e ON a.assignedTo = e.id
        WHERE ${whereClauses.join(' AND ')}
    `;

    const result = await request.query(query);
    return result.recordset.map(row => this.mapAccessoryWithRelations(row));
  }

  static async restoreByParentTool(parentToolId: string, restoredBy: string): Promise<number> {
    const pool = getPool();
    const query = `
    UPDATE Accessories 
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

  static async restoreBySubTool(subToolId: string, restoredBy: string): Promise<number> {
    const pool = getPool();
    const query = `
      UPDATE Accessories 
      SET isDelete = 0, deletedAt = NULL, deletedBy = NULL,
          restoredAt = GETDATE(), restoredBy = @restoredBy
      WHERE subTool = @subToolId AND isDelete = 1
    `;

    const result = await pool.request()
      .input('subToolId', sql.UniqueIdentifier, subToolId)
      .input('restoredBy', sql.UniqueIdentifier, restoredBy)
      .query(query);

    return result.rowsAffected[0];
  }

  // static async search(params: {
  //   keyword: string;
  //   subToolId?: string;
  //   parentToolId?: string;
  //   accessoryTypeId?: string;
  //   status?: string;
  //   departmentId?: string;
  //   assignedToId?: string;
  // }): Promise<IAccessoryWithRelations[]> {
  //   const pool = getPool();
  //   const { keyword, subToolId, parentToolId, accessoryTypeId, status, departmentId, assignedToId } = params;

  //   const whereClauses: string[] = [
  //     'a.isDelete = 0',
  //     '(a.name LIKE @keyword OR a.code LIKE @keyword OR a.brand LIKE @keyword OR a.notes LIKE @keyword)'
  //   ];
  //   const request = pool.request().input('keyword', sql.NVarChar, `%${keyword}%`);

  //   if (subToolId) {
  //     whereClauses.push('a.subTool = @subToolId');
  //     request.input('subToolId', sql.UniqueIdentifier, subToolId);
  //   }

  //   if (parentToolId) {
  //     whereClauses.push('a.parentTool = @parentToolId');
  //     request.input('parentToolId', sql.UniqueIdentifier, parentToolId);
  //   }

  //   if (accessoryTypeId) {
  //     whereClauses.push('a.accessoryType = @accessoryTypeId');
  //     request.input('accessoryTypeId', sql.UniqueIdentifier, accessoryTypeId);
  //   }

  //   if (status) {
  //     whereClauses.push('a.status = @status');
  //     request.input('status', sql.NVarChar, status);
  //   }

  //   if (departmentId) {
  //     whereClauses.push('a.departmentId = @departmentId');
  //     request.input('departmentId', sql.UniqueIdentifier, departmentId);
  //   }

  //   if (assignedToId) {
  //     whereClauses.push('a.assignedTo = @assignedToId');
  //     request.input('assignedToId', sql.UniqueIdentifier, assignedToId);
  //   }

  //   const query = `
  //     SELECT TOP 50
  //       a.*,
  //       st.code as subTool_code, st.name as subTool_name,
  //       pt.code as parentTool_code, pt.name as parentTool_name,
  //       cat.name as accessoryType_name,
  //       e.name as assignedTo_name, e.email as assignedTo_email, e.code as assignedTo_code
  //     FROM Accessories a
  //     LEFT JOIN SubTools st ON a.subTool = st.id
  //     LEFT JOIN Tools pt ON a.parentTool = pt.id
  //     LEFT JOIN CategoryAccessory cat ON a.accessoryType = cat.id
  //     LEFT JOIN Employees e ON a.assignedTo = e.id
  //     WHERE ${whereClauses.join(' AND ')}
  //   `;

  //   const result = await request.query(query);
  //   return result.recordset.map(row => this.mapAccessoryWithRelations(row));
  // }

  static async hardDeleteBySubTool(subToolId: string): Promise<number> {
    const pool = getPool();
    const query = `DELETE FROM Accessories WHERE subTool = @subToolId`;

    const result = await pool.request()
      .input('subToolId', sql.UniqueIdentifier, subToolId)
      .query(query);

    return result.rowsAffected[0];
  }

  static async softDeleteByParentTool(parentToolId: string, deletedBy: string): Promise<number> {
    const pool = getPool();
    const query = `
    UPDATE Accessories 
    SET isDelete = 1, deletedAt = GETDATE(), deletedBy = @deletedBy
    WHERE parentTool = @parentToolId AND isDelete = 0
  `;

    const result = await pool.request()
      .input('parentToolId', sql.UniqueIdentifier, parentToolId)
      .input('deletedBy', sql.UniqueIdentifier, deletedBy)
      .query(query);

    return result.rowsAffected[0];
  }

  private static mapAccessoryWithRelations(row: any): IAccessoryWithRelations {
    const accessory: IAccessoryWithRelations = {
      id: row.id,
      code: row.code,
      name: row.name,
      subTool: row.subTool,
      parentTool: row.parentTool,
      accessoryTypeId: row.accessoryTypeId,
      categoryId: row.categoryId,
      unitId: row.unitId,
      departmentId: row.departmentId,
      assignedTo: row.assignedTo,
      assignedDate: row.assignedDate,
      quantity: row.quantity,
      brand: row.brand,
      unitOC: row.unitOC,
      specifications: row.specifications ? JSON.parse(row.specifications) : null,
      slot: row.slot,
      purchaseDate: row.purchaseDate,
      purchasePrice: row.purchasePrice,
      warrantyUntil: row.warrantyUntil,
      status: row.status,
      condition: row.condition,
      upgradedFrom: row.upgradedFrom,
      upgradedTo: row.upgradedTo,
      upgradeDate: row.upgradeDate,
      dateOfReceipt: row.dateOfReceipt,
      upgradeReason: row.upgradeReason,
      notes: row.notes,
      description: row.description,
      isDelete: row.isDelete,
      deletedAt: row.deletedAt,
      deletedBy: row.deletedBy,
      restoredAt: row.restoredAt,
      restoredBy: row.restoredBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };

    // Add relations
    if (row.subTool_name) {
      accessory.subToolInfo = {
        _id: row.subTool,
        name: row.subTool_name,
        code: row.subTool_code
      };
    }

    if (row.parentTool_name) {
      accessory.parentToolInfo = {
        _id: row.parentTool,
        name: row.parentTool_name,
        code: row.parentTool_code
      };
    }

    if (row.accessoryType_name) {
      accessory.accessoryTypeInfo = {
        _id: row.accessoryTypeId,
        name: row.accessoryType_name
      };
    }

    if (row.category_name) {
      accessory.categoryInfo = {
        _id: row.categoryId,
        name: row.category_name
      };
    }

    if (row.unit_name) {
      accessory.unitInfo = {
        _id: row.unitId,
        name: row.unit_name,
        code: row.unit_code
      };
    }

    if (row.department_name) {
      accessory.departmentInfo = {
        _id: row.departmentId,
        name: row.department_name,
        code: row.department_code
      };
    }

    if (row.assignedTo_name) {
      accessory.assignedToInfo = {
        _id: row.assignedTo,
        name: row.assignedTo_name,
        email: row.assignedTo_email,
        code: row.assignedTo_code
      };
    }

    if (row.warrantyUntil) {
      accessory.isUnderWarranty = new Date(row.warrantyUntil) > new Date();
    }

    return accessory;
  }
}

export default AccessoryModel;