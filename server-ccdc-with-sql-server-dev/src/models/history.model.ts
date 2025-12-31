import sql from 'mssql';
import { getPool } from '../config/database';

export interface IUpgradeInfo {
  oldAccessory?: string;
  newAccessory?: string;
  accessoryType?: string;
  reason?: string;
  oldSpecs?: { [key: string]: string };
  newSpecs?: { [key: string]: string };
}

export interface IAttachment {
  url: string;
  description?: string;
  uploadedAt: Date;
}

export interface IToolHistory {
  id?: string;
  tool: string;
  subTool?: string;
  accessory?: string;
  employee?: string;
  previousEmployee?: string;
  action: string;
  upgradeInfo?: IUpgradeInfo;
  condition?: string;
  conditionBefore?: string;
  conditionAfter?: string;
  notes?: string;
  performedBy: string;
  attachments?: IAttachment[];
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IToolHistoryWithRelations extends IToolHistory {
  toolInfo?: any;
  subToolInfo?: any;
  accessoryInfo?: any;
  employeeInfo?: any;
  previousEmployeeInfo?: any;
  performedByInfo?: any;
}

export class ToolHistoryModel {
  static async createTable(): Promise<void> {
    const pool = getPool();
    const query = `
      -- 1. Tạo bảng và Index
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ToolHistory' AND xtype='U')
      BEGIN
        CREATE TABLE ToolHistory (
          id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
          tool UNIQUEIDENTIFIER NOT NULL,
          subTool UNIQUEIDENTIFIER NULL,
          accessory UNIQUEIDENTIFIER NULL,
          employee UNIQUEIDENTIFIER NULL,
          previousEmployee UNIQUEIDENTIFIER NULL,
          action NVARCHAR(100) NOT NULL CHECK (action IN (
            N'Giao', N'Thu hồi', N'Chuyển giao', N'Cập nhật', N'Xóa',
            N'Thêm thiết bị', N'Chuyển thiết bị', N'Gỡ thiết bị',
            N'Thêm linh kiện', N'Gỡ linh kiện', N'Nâng cấp linh kiện',
            N'Sửa chữa linh kiện', N'Bảo dưỡng', N'Chuyển thiết bị vào',
            N'Chuyển linh kiện vào', N'Chuyển linh kiện', N'Giao linh kiện',
            N'Cập nhật theo thiết bị', N'Cập nhật theo bộ phận',
            N'Chuyển bộ phận vào', N'Chuyển bộ phận'
          )),
          upgradeInfo NVARCHAR(MAX) NULL,
          condition NVARCHAR(50) DEFAULT N'Mới' CHECK (condition IN (N'Mới', N'Cũ', N'Hỏng')),
          conditionBefore NVARCHAR(50) CHECK (conditionBefore IN (N'Mới', N'Cũ', N'Hỏng')),
          conditionAfter NVARCHAR(50) CHECK (conditionAfter IN (N'Mới', N'Cũ', N'Hỏng')),
          notes NVARCHAR(MAX) NULL,
          performedBy UNIQUEIDENTIFIER NOT NULL,
          attachments NVARCHAR(MAX) NULL,
          description NVARCHAR(MAX) NULL,
          createdAt DATETIME DEFAULT GETDATE(),
          updatedAt DATETIME DEFAULT GETDATE(),
          
          FOREIGN KEY (tool) REFERENCES Tools(id),
          FOREIGN KEY (subTool) REFERENCES SubTools(id),
          FOREIGN KEY (accessory) REFERENCES Accessories(id),
          FOREIGN KEY (employee) REFERENCES Employees(id),
          FOREIGN KEY (previousEmployee) REFERENCES Employees(id),
          FOREIGN KEY (performedBy) REFERENCES Employees(id)
        );

        CREATE INDEX idx_toolhistory_tool_action ON ToolHistory(tool, action);
        CREATE INDEX idx_toolhistory_subTool ON ToolHistory(subTool);
        CREATE INDEX idx_toolhistory_accessory ON ToolHistory(accessory);
        CREATE INDEX idx_toolhistory_employee ON ToolHistory(employee);
        CREATE INDEX idx_toolhistory_previousEmployee ON ToolHistory(previousEmployee);
        CREATE INDEX idx_toolhistory_createdAt ON ToolHistory(createdAt DESC);
      END

      -- 2. Tạo Trigger bằng EXEC để tránh lỗi cú pháp lô (batch)
      IF NOT EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_ToolHistory_UpdatedAt')
      BEGIN
        EXEC('
          CREATE TRIGGER trg_ToolHistory_UpdatedAt
          ON ToolHistory
          AFTER UPDATE
          AS
          BEGIN
            SET NOCOUNT ON;
            UPDATE ToolHistory
            SET updatedAt = GETDATE()
            FROM ToolHistory th
            INNER JOIN inserted i ON th.id = i.id;
          END
        ');
      END
    `;

    await pool.request().query(query);
  }

  static async findAll(params: {
    toolId?: string;
    employeeId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ histories: IToolHistoryWithRelations[]; total: number }> {
    const pool = getPool();
    const {
      toolId,
      employeeId,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = params;

    const whereClauses: string[] = [];
    const request = pool.request();

    if (toolId) {
      whereClauses.push('th.tool = @toolId');
      request.input('toolId', sql.UniqueIdentifier, toolId);
    }

    if (employeeId) {
      whereClauses.push('th.employee = @employeeId');
      request.input('employeeId', sql.UniqueIdentifier, employeeId);
    }

    if (action) {
      whereClauses.push('th.action = @action');
      request.input('action', sql.NVarChar, action);
    }

    if (startDate) {
      whereClauses.push('th.createdAt >= @startDate');
      request.input('startDate', sql.DateTime, new Date(startDate));
    }

    if (endDate) {
      whereClauses.push('th.createdAt <= @endDate');
      request.input('endDate', sql.DateTime, new Date(endDate));
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const countQuery = `SELECT COUNT(*) as total FROM ToolHistory th ${whereClause}`;

    const dataQuery = `
      SELECT 
        th.*,
        t.code as tool_code, t.name as tool_name,
        st.code as subTool_code, st.name as subTool_name,
        a.code as accessory_code, a.name as accessory_name,
        e.name as employee_name, e.email as employee_email, e.code as employee_code,
        ep.name as previousEmployee_name, ep.email as previousEmployee_email, ep.code as previousEmployee_code,
        pb.name as performedBy_name, pb.email as performedBy_email,
        pos.name as employee_position_name,
        ppos.name as previousEmployee_position_name
      FROM ToolHistory th
      LEFT JOIN Tools t ON th.tool = t.id
      LEFT JOIN SubTools st ON th.subTool = st.id
      LEFT JOIN Accessories a ON th.accessory = a.id
      LEFT JOIN Employees e ON th.employee = e.id
      LEFT JOIN Employees ep ON th.previousEmployee = ep.id
      LEFT JOIN Employees pb ON th.performedBy = pb.id
      LEFT JOIN Positions pos ON e.positionId = pos.id
      LEFT JOIN Positions ppos ON ep.positionId = ppos.id
      ${whereClause}
      ORDER BY th.createdAt DESC
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

    const histories = dataResult.recordset.map(row => this.mapHistoryWithRelations(row));

    return {
      histories,
      total: countResult.recordset[0].total
    };
  }

  static async findById(id: string): Promise<IToolHistoryWithRelations | null> {
    const pool = getPool();
    const query = `
      SELECT 
        th.*,
        t.code as tool_code, t.name as tool_name,
        tc.name as tool_category_name,
        tu.name as tool_unit_name, tu.code as tool_unit_code,
        st.code as subTool_code, st.name as subTool_name,
        a.code as accessory_code, a.name as accessory_name,
        e.name as employee_name, e.email as employee_email,
        ep.name as previousEmployee_name, ep.email as previousEmployee_email,
        pb.name as performedBy_name, pb.email as performedBy_email,
        pos.name as employee_position_name,
        ppos.name as previousEmployee_position_name
      FROM ToolHistory th
      LEFT JOIN Tools t ON th.tool = t.id
      LEFT JOIN Categories tc ON t.categoryId = tc.id
      LEFT JOIN Units tu ON t.unitId = tu.id
      LEFT JOIN SubTools st ON th.subTool = st.id
      LEFT JOIN Accessories a ON th.accessory = a.id
      LEFT JOIN Employees e ON th.employee = e.id
      LEFT JOIN Employees ep ON th.previousEmployee = ep.id
      LEFT JOIN Employees pb ON th.performedBy = pb.id
      LEFT JOIN Positions pos ON e.positionId = pos.id
      LEFT JOIN Positions ppos ON ep.positionId = ppos.id
      WHERE th.id = @id
    `;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    if (result.recordset.length === 0) return null;

    return this.mapHistoryWithRelations(result.recordset[0]);
  }

  static async findByTool(toolId: string): Promise<IToolHistoryWithRelations[]> {
    const pool = getPool();
    const query = `
      SELECT 
        th.*,
        e.name as employee_name, e.email as employee_email,
        ep.name as previousEmployee_name, ep.email as previousEmployee_email,
        pb.name as performedBy_name, pb.email as performedBy_email,
        pos.name as employee_position_name
      FROM ToolHistory th
      LEFT JOIN Employees e ON th.employee = e.id
      LEFT JOIN Employees ep ON th.previousEmployee = ep.id
      LEFT JOIN Employees pb ON th.performedBy = pb.id
      LEFT JOIN Positions pos ON e.positionId = pos.id
      WHERE th.tool = @toolId
      ORDER BY th.createdAt DESC
    `;

    const result = await pool.request()
      .input('toolId', sql.UniqueIdentifier, toolId)
      .query(query);

    return result.recordset.map(row => this.mapHistoryWithRelations(row));
  }

  static async findByEmployee(employeeId: string): Promise<IToolHistoryWithRelations[]> {
    const pool = getPool();
    const query = `
      SELECT 
        th.*,
        t.code as tool_code, t.name as tool_name,
        pb.name as performedBy_name, pb.email as performedBy_email
      FROM ToolHistory th
      LEFT JOIN Tools t ON th.tool = t.id
      LEFT JOIN Employees pb ON th.performedBy = pb.id
      WHERE th.employee = @employeeId
      ORDER BY th.createdAt DESC
    `;

    const result = await pool.request()
      .input('employeeId', sql.UniqueIdentifier, employeeId)
      .query(query);

    return result.recordset.map(row => this.mapHistoryWithRelations(row));
  }

  static async findBySubTool(subToolId: string): Promise<IToolHistoryWithRelations[]> {
    const pool = getPool();
    const query = `
      SELECT 
        th.*,
        t.code as tool_code, t.name as tool_name,
        a.code as accessory_code, a.name as accessory_name,
        e.name as employee_name,
        pb.name as performedBy_name,
        pos.name as employee_position_name
      FROM ToolHistory th
      LEFT JOIN Tools t ON th.tool = t.id
      LEFT JOIN Accessories a ON th.accessory = a.id
      LEFT JOIN Employees e ON th.employee = e.id
      LEFT JOIN Employees pb ON th.performedBy = pb.id
      LEFT JOIN Positions pos ON e.positionId = pos.id
      WHERE th.subTool = @subToolId
      ORDER BY th.createdAt DESC
    `;

    const result = await pool.request()
      .input('subToolId', sql.UniqueIdentifier, subToolId)
      .query(query);

    return result.recordset.map(row => this.mapHistoryWithRelations(row));
  }

  static async findByAccessory(accessoryId: string): Promise<IToolHistoryWithRelations[]> {
    const pool = getPool();
    const query = `
      SELECT 
        th.*,
        t.code as tool_code, t.name as tool_name,
        st.code as subTool_code, st.name as subTool_name,
        e.name as employee_name,
        pb.name as performedBy_name,
        pos.name as employee_position_name
      FROM ToolHistory th
      LEFT JOIN Tools t ON th.tool = t.id
      LEFT JOIN SubTools st ON th.subTool = st.id
      LEFT JOIN Employees e ON th.employee = e.id
      LEFT JOIN Employees pb ON th.performedBy = pb.id
      LEFT JOIN Positions pos ON e.positionId = pos.id
      WHERE th.accessory = @accessoryId
      ORDER BY th.createdAt DESC
    `;

    const result = await pool.request()
      .input('accessoryId', sql.UniqueIdentifier, accessoryId)
      .query(query);

    return result.recordset.map(row => this.mapHistoryWithRelations(row));
  }

  static async create(history: IToolHistory): Promise<IToolHistoryWithRelations> {
    const pool = getPool();
    const upgradeInfoJson = history.upgradeInfo ? JSON.stringify(history.upgradeInfo) : null;
    const attachmentsJson = history.attachments ? JSON.stringify(history.attachments) : null;

    const query = `
      INSERT INTO ToolHistory (
        tool, subTool, accessory, employee, previousEmployee, action,
        upgradeInfo, condition, conditionBefore, conditionAfter, notes,
        performedBy, attachments, description
      )
      OUTPUT INSERTED.id
      VALUES (
        @tool, @subTool, @accessory, @employee, @previousEmployee, @action,
        @upgradeInfo, @condition, @conditionBefore, @conditionAfter, @notes,
        @performedBy, @attachments, @description
      )
    `;

    const result = await pool.request()
      .input('tool', sql.UniqueIdentifier, history.tool)
      .input('subTool', sql.UniqueIdentifier, history.subTool)
      .input('accessory', sql.UniqueIdentifier, history.accessory)
      .input('employee', sql.UniqueIdentifier, history.employee)
      .input('previousEmployee', sql.UniqueIdentifier, history.previousEmployee)
      .input('action', sql.NVarChar, history.action)
      .input('upgradeInfo', sql.NVarChar(sql.MAX), upgradeInfoJson)
      .input('condition', sql.NVarChar, history.condition || 'Mới')
      .input('conditionBefore', sql.NVarChar, history.conditionBefore)
      .input('conditionAfter', sql.NVarChar, history.conditionAfter)
      .input('notes', sql.NVarChar, history.notes)
      .input('performedBy', sql.UniqueIdentifier, history.performedBy)
      .input('attachments', sql.NVarChar(sql.MAX), attachmentsJson)
      .input('description', sql.NVarChar, history.description)
      .query(query);

    const insertedId = result.recordset[0].id;
    return this.findById(insertedId) as Promise<IToolHistoryWithRelations>;
  }

  static async update(id: string, historyData: Partial<IToolHistory>): Promise<IToolHistoryWithRelations | null> {
    const pool = getPool();
    const updates: string[] = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    const allowedFields = ['condition', 'notes', 'description', 'conditionBefore', 'conditionAfter'];

    allowedFields.forEach(field => {
      if (historyData[field as keyof IToolHistory] !== undefined) {
        updates.push(`${field} = @${field}`);
        request.input(field, sql.NVarChar, historyData[field as keyof IToolHistory]);
      }
    });

    if (updates.length === 0) {
      return this.findById(id);
    }

    const query = `
      UPDATE ToolHistory 
      SET ${updates.join(', ')}
      WHERE id = @id
    `;

    await request.query(query);
    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    const pool = getPool();
    const query = `DELETE FROM ToolHistory WHERE id = @id`;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(query);

    return result.rowsAffected[0] > 0;
  }

  static async getStats(params: {
    startDate?: string;
    endDate?: string;
  }): Promise<any> {
    const pool = getPool();
    const { startDate, endDate } = params;

    const whereClauses: string[] = [];
    const request = pool.request();

    if (startDate) {
      whereClauses.push('createdAt >= @startDate');
      request.input('startDate', sql.DateTime, new Date(startDate));
    }

    if (endDate) {
      whereClauses.push('createdAt <= @endDate');
      request.input('endDate', sql.DateTime, new Date(endDate));
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const statsQuery = `
      SELECT action, COUNT(*) as count
      FROM ToolHistory
      ${whereClause}
      GROUP BY action
    `;

    const totalQuery = `SELECT COUNT(*) as total FROM ToolHistory ${whereClause}`;

    const recentQuery = `
      SELECT TOP 10
        th.*,
        t.code as tool_code, t.name as tool_name,
        e.name as employee_name,
        pb.name as performedBy_name
      FROM ToolHistory th
      LEFT JOIN Tools t ON th.tool = t.id
      LEFT JOIN Employees e ON th.employee = e.id
      LEFT JOIN Employees pb ON th.performedBy = pb.id
      ${whereClause}
      ORDER BY th.createdAt DESC
    `;

    const [statsResult, totalResult, recentResult] = await Promise.all([
      request.query(statsQuery),
      pool.request().query(totalQuery),
      pool.request().query(recentQuery)
    ]);

    return {
      total: totalResult.recordset[0].total,
      byAction: statsResult.recordset,
      recent: recentResult.recordset.map(row => this.mapHistoryWithRelations(row))
    };
  }

  static async getUpgradeHistory(params: {
    toolId?: string;
    subToolId?: string;
    accessoryId?: string;
  }): Promise<IToolHistoryWithRelations[]> {
    const pool = getPool();
    const { toolId, subToolId, accessoryId } = params;

    const whereClauses: string[] = [
      "th.action IN (N'Nâng cấp linh kiện', N'Thêm linh kiện', N'Gỡ linh kiện')"
    ];
    const request = pool.request();

    if (toolId) {
      whereClauses.push('th.tool = @toolId');
      request.input('toolId', sql.UniqueIdentifier, toolId);
    }

    if (subToolId) {
      whereClauses.push('th.subTool = @subToolId');
      request.input('subToolId', sql.UniqueIdentifier, subToolId);
    }

    if (accessoryId) {
      whereClauses.push('th.accessory = @accessoryId');
      request.input('accessoryId', sql.UniqueIdentifier, accessoryId);
    }

    const query = `
      SELECT 
        th.*,
        t.code as tool_code, t.name as tool_name,
        st.code as subTool_code, st.name as subTool_name,
        a.code as accessory_code, a.name as accessory_name,
        e.name as employee_name,
        pb.name as performedBy_name, pb.email as performedBy_email,
        pos.name as employee_position_name
      FROM ToolHistory th
      LEFT JOIN Tools t ON th.tool = t.id
      LEFT JOIN SubTools st ON th.subTool = st.id
      LEFT JOIN Accessories a ON th.accessory = a.id
      LEFT JOIN Employees e ON th.employee = e.id
      LEFT JOIN Employees pb ON th.performedBy = pb.id
      LEFT JOIN Positions pos ON e.positionId = pos.id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY th.createdAt DESC
    `;

    const result = await request.query(query);
    return result.recordset.map(row => this.mapHistoryWithRelations(row));
  }

  static async getToolTimeline(toolId: string): Promise<any> {
    const pool = getPool();
    const query = `
      SELECT 
        th.*,
        st.code as subTool_code, st.name as subTool_name,
        a.code as accessory_code, a.name as accessory_name,
        e.name as employee_name,
        pb.name as performedBy_name,
        pos.name as employee_position_name
      FROM ToolHistory th
      LEFT JOIN SubTools st ON th.subTool = st.id
      LEFT JOIN Accessories a ON th.accessory = a.id
      LEFT JOIN Employees e ON th.employee = e.id
      LEFT JOIN Employees pb ON th.performedBy = pb.id
      LEFT JOIN Positions pos ON e.positionId = pos.id
      WHERE th.tool = @toolId
      ORDER BY th.createdAt ASC
    `;

    const result = await pool.request()
      .input('toolId', sql.UniqueIdentifier, toolId)
      .query(query);

    const timeline = result.recordset.map(row => this.mapHistoryWithRelations(row));

    // Group by year
    const groupedByYear: any = {};
    timeline.forEach(item => {
      const year = new Date(item.createdAt!).getFullYear();
      if (!groupedByYear[year]) {
        groupedByYear[year] = [];
      }
      groupedByYear[year].push(item);
    });

    // Stats
    const stats = {
      totalEvents: timeline.length,
      toolActions: timeline.filter(t => !t.subTool && !t.accessory).length,
      subToolActions: timeline.filter(t => t.subTool && !t.accessory).length,
      accessoryActions: timeline.filter(t => t.accessory).length,
      upgrades: timeline.filter(t => t.action === 'Nâng cấp linh kiện').length
    };

    return {
      timeline,
      groupedByYear,
      stats
    };
  }

  private static mapHistoryWithRelations(row: any): IToolHistoryWithRelations {
    const history: IToolHistoryWithRelations = {
      id: row.id,
      tool: row.tool,
      subTool: row.subTool,
      accessory: row.accessory,
      employee: row.employee,
      previousEmployee: row.previousEmployee,
      action: row.action,
      upgradeInfo: row.upgradeInfo ? JSON.parse(row.upgradeInfo) : null,
      condition: row.condition,
      conditionBefore: row.conditionBefore,
      conditionAfter: row.conditionAfter,
      notes: row.notes,
      performedBy: row.performedBy,
      attachments: row.attachments ? JSON.parse(row.attachments) : null,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };

    if (row.tool_name) {
      history.toolInfo = {
        _id: row.tool,
        code: row.tool_code,
        name: row.tool_name,
        // brand: row.tool_brand,
        categoryId: row.tool_category_name ? { name: row.tool_category_name } : undefined,
        unit: row.tool_unit_name ? { name: row.tool_unit_name, code: row.tool_unit_code } : undefined
      };
    }

    if (row.subTool_name) {
      history.subToolInfo = {
        _id: row.subTool,
        code: row.subTool_code,
        name: row.subTool_name
      };
    }

    if (row.accessory_name) {
      history.accessoryInfo = {
        _id: row.accessory,
        code: row.accessory_code,
        name: row.accessory_name
      };
    }

    if (row.employee_name) {
      history.employeeInfo = {
        _id: row.employee,
        name: row.employee_name,
        email: row.employee_email,
        code: row.employee_code,
        positionId: row.employee_position_name ? { name: row.employee_position_name } : undefined
      };
    }

    if (row.previousEmployee_name) {
      history.previousEmployeeInfo = {
        _id: row.previousEmployee,
        name: row.previousEmployee_name,
        email: row.previousEmployee_email,
        code: row.previousEmployee_code,
        positionId: row.previousEmployee_position_name ? { name: row.previousEmployee_position_name } : undefined
      };
    }

    if (row.performedBy_name) {
      history.performedByInfo = {
        _id: row.performedBy,
        name: row.performedBy_name,
        email: row.performedBy_email
      };
    }

    return history;
  }
}

export default ToolHistoryModel;