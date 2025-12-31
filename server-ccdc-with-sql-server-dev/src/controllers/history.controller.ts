// src/controllers/historyController.ts
import { Request, Response } from 'express';
import { ToolHistoryModel, IToolHistory } from '../models/history.model';
import { ToolModel } from '../models/tool.model';
import { EmployeeModel } from '../models/employee.model';

interface AuthRequest extends Request {
  employee?: any;
  user?: any;
}

const hasPermission = (employee: any, requiredPermissions: string[]): boolean => {
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  const userPermissions = employee.positionInfo?.permissions || employee.positionId?.permissions || [];
  return requiredPermissions.some(permission => userPermissions.includes(permission));
};

export const getAllHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { toolId, employeeId, action, startDate, endDate, page = '1', limit = '50' } = req.query;

    const params: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };

    if (toolId) params.toolId = toolId as string;
    if (employeeId) params.employeeId = employeeId as string;
    if (action) params.action = action as string;
    if (startDate) params.startDate = startDate as string;
    if (endDate) params.endDate = endDate as string;

    const { histories, total } = await ToolHistoryModel.findAll(params);

    res.json({
      success: true,
      data: histories,
      pagination: {
        total,
        page: params.page,
        limit: params.limit,
        totalPages: Math.ceil(total / params.limit)
      }
    });
  } catch (error: any) {
    console.error('Get all history error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getHistoryById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const history = await ToolHistoryModel.findById(id);

    if (!history) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch sử'
      });
      return;
    }

    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('Get history by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getHistoryByTool = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { toolId } = req.params;

    const tool = await ToolModel.findById(toolId);
    if (!tool) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy công cụ'
      });
      return;
    }

    const histories = await ToolHistoryModel.findByTool(toolId);

    res.json({
      success: true,
      data: histories,
      tool: {
        _id: tool.id,
        code: tool.code,
        name: tool.name
      }
    });
  } catch (error: any) {
    console.error('Get history by tool error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getHistoryByEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const employee = await EmployeeModel.findById(employeeId);

    if (!employee) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên'
      });
      return;
    }

    const histories = await ToolHistoryModel.findByEmployee(employeeId);

    res.json({
      success: true,
      data: histories,
      employee: {
        _id: employee.id,
        name: employee.name,
        position: employee.positionId
      }
    });
  } catch (error: any) {
    console.error('Get history by employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const createHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { toolId, employeeId, action, condition, notes } = req.body;

    if (!toolId || !employeeId || !action) {
      res.status(400).json({
        success: false,
        message: 'toolId, employeeId, action là bắt buộc'
      });
      return;
    }

    const tool = await ToolModel.findById(toolId);
    const employee = await EmployeeModel.findById(employeeId);

    if (!tool) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy công cụ'
      });
      return;
    }

    if (!employee) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên'
      });
      return;
    }

    const historyData: IToolHistory = {
      tool: toolId,
      employee: employeeId,
      action,
      condition: condition || 'Tốt',
      notes,
      performedBy: req.user?.id || req.employee?.id
    };

    const history = await ToolHistoryModel.create(historyData);

    res.status(201).json({
      success: true,
      message: 'Tạo lịch sử thành công',
      data: history
    });
  } catch (error: any) {
    console.error('Create history error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const updateHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { condition, notes } = req.body;

    const history = await ToolHistoryModel.findById(id);

    if (!history) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch sử'
      });
      return;
    }

    const updateData: Partial<IToolHistory> = {};
    if (condition) updateData.condition = condition;
    if (notes) updateData.notes = notes;

    const updatedHistory = await ToolHistoryModel.update(id, updateData);

    res.json({
      success: true,
      message: 'Cập nhật lịch sử thành công',
      data: updatedHistory
    });
  } catch (error: any) {
    console.error('Update history error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const deleteHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const currentEmployee = req.employee;

    if (!hasPermission(currentEmployee, ['manage_system'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa vĩnh viễn lịch sử'
      });
      return;
    }

    const history = await ToolHistoryModel.findById(id);

    if (!history) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch sử'
      });
      return;
    }

    await ToolHistoryModel.delete(id);

    res.json({
      success: true,
      message: 'Xóa lịch sử thành công'
    });
  } catch (error: any) {
    console.error('Delete history error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getHistoryStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;

    const params: any = {};
    if (startDate) params.startDate = startDate as string;
    if (endDate) params.endDate = endDate as string;

    const stats = await ToolHistoryModel.getStats(params);

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Get history stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getUpgradeHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { toolId, subToolId, accessoryId } = req.query;

    const params: any = {};
    if (toolId) params.toolId = toolId as string;
    if (subToolId) params.subToolId = subToolId as string;
    if (accessoryId) params.accessoryId = accessoryId as string;

    const histories = await ToolHistoryModel.getUpgradeHistory(params);

    res.json({
      success: true,
      data: histories,
      count: histories.length
    });
  } catch (error: any) {
    console.error('Get upgrade history error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getToolTimeline = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { toolId } = req.params;

    const data = await ToolHistoryModel.getToolTimeline(toolId);

    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('Get tool timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getSubToolHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { subToolId } = req.params;

    const histories = await ToolHistoryModel.findBySubTool(subToolId);

    res.json({
      success: true,
      data: histories,
      count: histories.length
    });
  } catch (error: any) {
    console.error('Get SubTool history error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getAccessoryHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { accessoryId } = req.params;

    const histories = await ToolHistoryModel.findByAccessory(accessoryId);

    res.json({
      success: true,
      data: histories,
      count: histories.length
    });
  } catch (error: any) {
    console.error('Get Accessory history error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export default {
  getAllHistory,
  getHistoryById,
  getHistoryByTool,
  getHistoryByEmployee,
  createHistory,
  updateHistory,
  deleteHistory,
  getHistoryStats,
  getUpgradeHistory,
  getToolTimeline,
  getSubToolHistory,
  getAccessoryHistory
};