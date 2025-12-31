import { Request, Response } from 'express';
import CategoryAccessoryModel from '../models/category-accessory.model';

interface AuthRequest extends Request {
  employee?: any;
}

const hasPermission = (employee: any, requiredPermissions: string[]): boolean => {
  if (!employee) {
    console.log('❌ No employee');
    return false;
  }

  if (!requiredPermissions || requiredPermissions.length === 0) return true;

  let userPermissions: string[] = [];

  if (employee.positionInfo?.permissions) {
    userPermissions = employee.positionInfo.permissions;
  } else if (employee.positionId?.permissions) {
    userPermissions = employee.positionId.permissions;
  } else if (employee.position?.permissions) {
    userPermissions = employee.position.permissions;
  }

  return requiredPermissions.some((permission: string) => userPermissions.includes(permission));
};

export const getAllCategories = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const categories = await CategoryAccessoryModel.findAll();

    res.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    console.error('Get all categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getCategoryById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const category = await CategoryAccessoryModel.findById(req.params.id);

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục'
      });
      return;
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error: any) {
    console.error('Get category by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;

    if (!hasPermission(currentEmployee, ['create_category_tool'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tạo danh mục'
      });
      return;
    }

    if (!req.body.name) {
      res.status(400).json({
        success: false,
        message: 'Thiếu trường bắt buộc: name'
      });
      return;
    }

    const category = await CategoryAccessoryModel.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Tạo danh mục thành công',
      data: category
    });
  } catch (error: any) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;

    if (!hasPermission(currentEmployee, ['update_category_tool'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa danh mục'
      });
      return;
    }

    const category = await CategoryAccessoryModel.findById(req.params.id);

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục'
      });
      return;
    }

    const updated = await CategoryAccessoryModel.update(req.params.id, req.body);

    res.json({
      success: true,
      message: 'Cập nhật danh mục thành công',
      data: updated
    });
  } catch (error: any) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;

    if (!hasPermission(currentEmployee, ['delete_category_tool'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xoá danh mục'
      });
      return;
    }

    const category = await CategoryAccessoryModel.findById(req.params.id);

    if (!category) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục'
      });
      return;
    }

    await CategoryAccessoryModel.delete(req.params.id);

    res.json({
      success: true,
      message: 'Xóa danh mục thành công'
    });
  } catch (error: any) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export default {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};