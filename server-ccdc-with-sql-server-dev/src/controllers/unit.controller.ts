import { Request, Response } from 'express';
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
    
    let units: any[] = [];
    
    if (checkPermission(currentEmployee, 'manage_units')) {
      units = await UnitModel.findAll('createdAt', 'desc');
    } else {
      const unit = await UnitModel.findById(currentEmployee.unitId);
      if (unit) {
        units = [unit];
      }
    }
    
    res.json({ 
      success: true,
      data: units 
    });
  } catch (error: any) {
    console.error('Get units error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi lấy danh sách đơn vị',
      error: error.message 
    });
  }
};

export const getById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;
    const unit = await UnitModel.findById(req.params.id);
    
    if (!unit) {
      res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy đơn vị' 
      });
      return;
    }

    const canManageAll = checkPermission(currentEmployee, 'manage_units');
    
    if (!canManageAll && unit.id !== currentEmployee.unitId) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem đơn vị này'
      });
      return;
    }
    
    res.json({ 
      success: true,
      data: unit 
    });
  } catch (error: any) {
    console.error('Get unit by ID error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi lấy thông tin đơn vị',
      error: error.message 
    });
  }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;
    const { name, code, type, description, isActive, address, phone, email } = req.body;
    
    if (!checkPermission(currentEmployee, 'manage_units')) {
      console.log('❌ Permission denied for create unit');
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tạo đơn vị'
      });
      return;
    }

    if (!name || !code || !type) {
      res.status(400).json({ 
        success: false,
        message: 'Thiếu thông tin bắt buộc: name, code, type' 
      });
      return;
    }

    const existingUnit = await UnitModel.findByCode(code);
    if (existingUnit) {
      res.status(400).json({ 
        success: false,
        message: 'Mã đơn vị đã tồn tại' 
      });
      return;
    }
    
    const unit = await UnitModel.create({ 
      name, 
      code: code.toUpperCase(), 
      type, 
      description, 
      isActive: isActive ?? true, 
      address, 
      phone,
      email 
    });
    
    res.status(201).json({ 
      success: true,
      message: 'Tạo đơn vị thành công', 
      data: unit 
    });
  } catch (error: any) {
    console.error('Create unit error:', error);
    
    if (error.number === 2627 || error.number === 2601) {
      res.status(400).json({
        success: false,
        message: 'Mã đơn vị đã tồn tại'
      });
      return;
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi tạo đơn vị',
      error: error.message 
    });
  }
};

export const update = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, type, description, isActive, address, phone, email } = req.body;
    
    const currentEmployee = req.employee;

    if (!checkPermission(currentEmployee, 'manage_units')) {
      console.log('❌ Permission denied for update unit');
      res.status(403).json({ 
        success: false,
        message: 'Bạn không có quyền cập nhật đơn vị' 
      });
      return;
    }

    const unit = await UnitModel.findById(id);
    if (!unit) {
      res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy đơn vị' 
      });
      return;
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;

    const updatedUnit = await UnitModel.update(id, updateData);
    
    res.json({ 
      success: true,
      message: 'Cập nhật đơn vị thành công', 
      data: updatedUnit 
    });
  } catch (error: any) {
    console.error('Update unit error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi cập nhật đơn vị',
      error: error.message 
    });
  }
};

export const deleteUnit = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const currentEmployee = req.employee;

    if (!checkPermission(currentEmployee, 'manage_units')) {
      console.log('❌ Permission denied for delete unit');
      res.status(403).json({ 
        success: false,
        message: 'Bạn không có quyền xóa đơn vị' 
      });
      return;
    }

    const unit = await UnitModel.findById(id);
    if (!unit) {
      res.status(404).json({ 
        success: false,
        message: 'Không tìm thấy đơn vị' 
      });
      return;
    }

    const employeeCount = await UnitModel.countEmployees(id);
    
    if (employeeCount > 0) {
      res.status(400).json({ 
        success: false,
        message: `Không thể xóa đơn vị này vì còn ${employeeCount} nhân viên đang làm việc` 
      });
      return;
    }

    const departmentCount = await UnitModel.countDepartments(id);
    
    if (departmentCount > 0) {
      res.status(400).json({ 
        success: false,
        message: `Không thể xóa đơn vị này vì còn ${departmentCount} phòng ban` 
      });
      return;
    }

    const toolCount = await UnitModel.countTools(id);
    
    if (toolCount > 0) {
      res.status(400).json({ 
        success: false,
        message: `Không thể xóa đơn vị này vì còn ${toolCount} công cụ` 
      });
      return;
    }

    await UnitModel.delete(id);
    
    res.json({ 
      success: true,
      message: 'Xóa đơn vị thành công' 
    });
  } catch (error: any) {
    console.error('Delete unit error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Lỗi khi xóa đơn vị',
      error: error.message 
    });
  }
};

export default {
  getAll,
  getById,
  create,
  update,
  delete: deleteUnit
};