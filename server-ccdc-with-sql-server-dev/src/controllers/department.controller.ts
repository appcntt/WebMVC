import { Request, Response } from 'express';
import DepartmentModel from '../models/department.model';
import UnitModel from '../models/unit.model';

interface AuthRequest extends Request {
  employee?: any;
}

const checkPermission = (employee: any, requiredPermission: string): boolean => {
  if (!employee) {
    console.log('❌ No employee');
    return false;
  }

  let userPermissions: string[] = [];
  
  if (employee.positionInfo?.permissions) {
    userPermissions = employee.positionInfo.permissions;
  } else if (employee.positionId?.permissions) {
    userPermissions = employee.positionId.permissions;
  } else if (employee.position?.permissions) {
    userPermissions = employee.position.permissions;
  }
  
  return userPermissions.includes(requiredPermission);
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;
    const { unitId, page = '1', limit = '1000', search } = req.query;

    const canViewAll = checkPermission(currentEmployee, 'manage_departments');

    let filterUnitId: string | undefined;

    if (!canViewAll) {
      const empUnitId: any = currentEmployee.unitId;
      if (typeof empUnitId === 'string') {
        filterUnitId = empUnitId;
      } else if (empUnitId) {
        filterUnitId = empUnitId.id || empUnitId._id;
      }
    } else if (unitId) {
      filterUnitId = unitId as string;
    }

    const { departments, total } = await DepartmentModel.findAll({
      unitId: filterUnitId,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json({
      success: true,
      data: departments,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách phòng ban',
      error: error.message
    });
  }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;

    const department = await DepartmentModel.findById(req.params.id);

    if (!department) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng ban'
      });
      return;
    }

    const canViewAll = checkPermission(currentEmployee, 'manage_departments');

    if (!canViewAll) {
      const empUnitId: any = currentEmployee.unitId;
      const deptUnitIdRaw: any = department.unitId;
      
      let currentUnitId: string | undefined;
      let deptUnitId: string | undefined;
      
      if (typeof empUnitId === 'string') {
        currentUnitId = empUnitId;
      } else if (empUnitId) {
        currentUnitId = empUnitId.id || empUnitId._id;
      }

      if (typeof deptUnitIdRaw === 'string') {
        deptUnitId = deptUnitIdRaw;
      } else if (deptUnitIdRaw) {
        deptUnitId = deptUnitIdRaw.id || deptUnitIdRaw._id;
      }
      
      if (deptUnitId !== currentUnitId) {
        res.status(403).json({
          success: false,
          message: 'Bạn không có quyền xem phòng ban này'
        });
        return;
      }
    }

    res.json({
      success: true,
      data: department
    });
  } catch (error: any) {
    console.error('Get department by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy thông tin phòng ban',
      error: error.message
    });
  }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;
    const { name, code, unitId, description } = req.body;

    if (!checkPermission(currentEmployee, 'create_departments')) {
      console.log('❌ Permission denied for create department');
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tạo phòng ban'
      });
      return;
    }

    if (!name || !code || !unitId) {
      res.status(400).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc (name, code, unitId)'
      });
      return;
    }

    const canManageAll = checkPermission(currentEmployee, 'manage_departments');

    if (!canManageAll) {
      const empUnitId: any = currentEmployee.unitId;
      let currentUnitId: string | undefined;
      
      if (typeof empUnitId === 'string') {
        currentUnitId = empUnitId;
      } else if (empUnitId) {
        currentUnitId = empUnitId.id || empUnitId._id;
      }
      
      if (unitId !== currentUnitId) {
        res.status(403).json({
          success: false,
          message: 'Bạn chỉ có thể tạo phòng ban trong đơn vị của mình'
        });
        return;
      }
    }

    const unitExists = await UnitModel.findById(unitId);
    if (!unitExists) {
      res.status(404).json({
        success: false,
        message: 'Đơn vị không tồn tại'
      });
      return;
    }

    const existingDept = await DepartmentModel.findByCodeAndUnit(code, unitId);
    if (existingDept) {
      res.status(400).json({
        success: false,
        message: 'Mã phòng ban đã tồn tại trong đơn vị này'
      });
      return;
    }

    const department = await DepartmentModel.create({
      name,
      code: code.toUpperCase(),
      unitId,
      description
    });

    res.status(201).json({
      success: true,
      message: 'Tạo phòng ban thành công',
      data: department
    });
  } catch (error: any) {
    console.error('Create department error:', error);

    if (error.number === 2627 || error.number === 2601) {
      res.status(400).json({
        success: false,
        message: 'Mã phòng ban đã tồn tại trong đơn vị này'
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'Lỗi khi tạo phòng ban',
      error: error.message
    });
  }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;
    const { name, code, unitId, description } = req.body;

    if (!checkPermission(currentEmployee, 'update_departments')) {
      console.log('❌ Permission denied for update department');
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật phòng ban'
      });
      return;
    }

    const department = await DepartmentModel.findById(req.params.id);

    if (!department) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng ban'
      });
      return;
    }

    const canManageAll = checkPermission(currentEmployee, 'manage_departments');
    if (!canManageAll) {
      const empUnitId: any = currentEmployee.unitId;
      const deptUnitIdRaw: any = department.unitId;
      
      let currentUnitId: string | undefined;
      let deptUnitId: string | undefined;
      
      if (typeof empUnitId === 'string') {
        currentUnitId = empUnitId;
      } else if (empUnitId) {
        currentUnitId = empUnitId.id || empUnitId._id;
      }
      
      if (typeof deptUnitIdRaw === 'string') {
        deptUnitId = deptUnitIdRaw;
      } else if (deptUnitIdRaw) {
        deptUnitId = deptUnitIdRaw.id || deptUnitIdRaw._id;
      }
      
      if (deptUnitId !== currentUnitId) {
        res.status(403).json({
          success: false,
          message: 'Bạn chỉ có thể sửa phòng ban trong đơn vị của mình'
        });
        return;
      }
    }

    if (unitId) {
      const unitExists = await UnitModel.findById(unitId);
      if (!unitExists) {
        res.status(404).json({
          success: false,
          message: 'Đơn vị không tồn tại'
        });
        return;
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (unitId !== undefined) updateData.unitId = unitId;
    if (description !== undefined) updateData.description = description;

    const updatedDepartment = await DepartmentModel.update(req.params.id, updateData);

    res.json({
      success: true,
      message: 'Cập nhật phòng ban thành công',
      data: updatedDepartment
    });
  } catch (error: any) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi cập nhật phòng ban',
      error: error.message
    });
  }
};

export const deleteDepartment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;

    if (!checkPermission(currentEmployee, 'delete_departments')) {
      console.log('❌ Permission denied for delete department');
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa phòng ban'
      });
      return;
    }

    const department = await DepartmentModel.findById(req.params.id);

    if (!department) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy phòng ban'
      });
      return;
    }

    const canManageAll = checkPermission(currentEmployee, 'manage_departments');
    if (!canManageAll) {
      res.status(403).json({
        success: false,
        message: 'Bạn cần quyền quản lý phòng ban để xóa'
      });
      return;
    }

    const employeeCount = await DepartmentModel.countEmployees(req.params.id);

    if (employeeCount > 0) {
      res.status(400).json({
        success: false,
        message: `Không thể xóa phòng ban vì còn ${employeeCount} nhân viên`
      });
      return;
    }

    const positionCount = await DepartmentModel.countPositions(req.params.id);

    if (positionCount > 0) {
      res.status(400).json({
        success: false,
        message: `Không thể xóa phòng ban vì còn ${positionCount} chức vụ`
      });
      return;
    }

    await DepartmentModel.delete(req.params.id);

    res.json({
      success: true,
      message: 'Xóa phòng ban thành công'
    });
  } catch (error: any) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa phòng ban',
      error: error.message
    });
  }
};

export default {
  getAll,
  getById,
  create,
  update,
  delete: deleteDepartment
};