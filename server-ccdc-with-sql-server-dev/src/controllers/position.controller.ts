import { Request, Response } from 'express';
import PositionModel from '../models/position.model';
import DepartmentModel from '../models/department.model';

interface AuthRequest extends Request {
  employee?: any;
}

const hasPermission = (employee: any, requiredPermissions: string[]): boolean => {
  if (!employee || !employee.positionInfo) {
    console.log('❌ No employee or positionInfo');
    return false;
  }

  const userPermissions = employee.positionInfo.permissions || [];

  return requiredPermissions.some(permission =>
    userPermissions.includes(permission)
  );
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;

    const canView = hasPermission(currentEmployee, [
      'manage_positions',
      'view_all_employees',
      'manage_system'
    ]);

    if (!canView) {
      console.log('❌ Permission denied for getAll positions');
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem danh sách chức vụ'
      });
      return;
    }

    const {
      page = '1',
      limit = '10',
      sortBy = 'order',
      sortOrder = 'asc',
      department,
      isActive
    } = req.query;

    const { positions, total } = await PositionModel.findAll({
      departmentId: department as string,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    });

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: 'Lấy danh sách chức vụ thành công',
      data: positions,
      pagination: {
        total,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
      },
      count: positions.length,
      total,
      totalPages,
      limit: limitNum,
    });
  } catch (error: any) {
    console.error('❌ Get all positions error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;

    const canView = hasPermission(currentEmployee, [
      'manage_positions',
      'view_all_employees',
      'manage_system'
    ]);

    if (!canView) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem chức vụ'
      });
      return;
    }

    const position = await PositionModel.findById(req.params.id);

    if (!position) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy chức vụ'
      });
      return;
    }

    res.json({
      success: true,
      data: position
    });
  } catch (error: any) {
    console.error('Get position by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;

    const canCreate = hasPermission(currentEmployee, [
      'create_position',
      'manage_positions',
      'manage_system'
    ]);

    if (!canCreate) {
      console.log('❌ Permission denied for create position');
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tạo chức vụ'
      });
      return;
    }

    const { name, code, permissions, department, isActive, order } = req.body;

    if (!name || code === undefined || department === undefined) {
      res.status(400).json({
        success: false,
        message: 'Thiếu trường bắt buộc: name, code, department'
      });
      return;
    }

    const departmentExists = await DepartmentModel.findById(department);
    if (!departmentExists) {
      res.status(400).json({
        success: false,
        message: 'Phòng ban không tồn tại',
      });
      return;
    }

    const existingCode = await PositionModel.findByCode(code.toUpperCase());
    if (existingCode) {
      res.status(400).json({
        success: false,
        message: 'Mã chức vụ đã tồn tại'
      });
      return;
    }

    const existingName = await PositionModel.findByNameAndDepartment(name.trim(), department);
    if (existingName) {
      res.status(400).json({
        success: false,
        message: 'Chức vụ đã tồn tại trong phòng ban này'
      });
      return;
    }

    const position = await PositionModel.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      departmentId: department,
      order: order !== undefined && order !== null ? order : 1,
      isActive: isActive !== undefined ? isActive : true,
      permissions: Array.isArray(permissions) ? permissions : [],
    });

    res.status(201).json({
      success: true,
      message: 'Tạo chức vụ thành công',
      data: position
    });
  } catch (error: any) {
    console.error('Create position error:', error);

    if (error.number === 2627 || error.number === 2601) {
      res.status(400).json({
        success: false,
        message: 'Mã chức vụ hoặc tên chức vụ đã tồn tại'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;

    const canUpdate = hasPermission(currentEmployee, [
      'update_position',
      'manage_positions',
      'manage_system'
    ]);

    if (!canUpdate) {
      console.log('❌ Permission denied for update position');
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật chức vụ'
      });
      return;
    }

    const { id } = req.params;
    const { name, code, permissions, department, isActive, order } = req.body;

    const position = await PositionModel.findById(id);
    if (!position) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy chức vụ'
      });
      return;
    }

    if (code && code.toUpperCase() !== position.code) {
      const existingCode = await PositionModel.findByCode(code.toUpperCase(), id);
      if (existingCode) {
        res.status(400).json({
          success: false,
          message: 'Mã chức vụ đã tồn tại'
        });
        return;
      }
    }

    if (name || department) {
      const checkDepartment = department || position.departmentId;
      const checkName = name ? name.trim() : position.name;

      const existingName = await PositionModel.findByNameAndDepartment(
        checkName,
        checkDepartment,
        id
      );

      if (existingName) {
        res.status(400).json({
          success: false,
          message: 'Chức vụ đã tồn tại trong phòng ban này'
        });
        return;
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (code !== undefined) updateData.code = code.toUpperCase().trim();
    if (department !== undefined) updateData.departmentId = department;
    if (order !== undefined && order !== null) updateData.order = order;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (permissions !== undefined) {
      updateData.permissions = Array.isArray(permissions) ? permissions : [];
    }

    const updatedPosition = await PositionModel.update(id, updateData);

    res.json({
      success: true,
      message: 'Cập nhật chức vụ thành công',
      data: updatedPosition
    });
  } catch (error: any) {
    console.error('❌ Update position error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const deletePosition = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;

    const canDelete = hasPermission(currentEmployee, [
      'delete_position',
      'manage_positions',
      'manage_system'
    ]);

    if (!canDelete) {
      console.log('❌ Permission denied for delete position');
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa chức vụ'
      });
      return;
    }

    const { id } = req.params;

    const position = await PositionModel.findById(id);
    if (!position) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy chức vụ'
      });
      return;
    }

    await PositionModel.delete(id);

    res.json({
      success: true,
      message: 'Xóa chức vụ thành công'
    });
  } catch (error: any) {
    console.error('Delete position error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export default {
  getAll,
  getById,
  create,
  update,
  delete: deletePosition
};