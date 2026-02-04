import { Request, Response } from 'express';
import { ToolModel, ITool } from '../models/tool.model';
import { EmployeeModel } from '../models/employee.model';
import { CategoryModel } from '../models/category.model';
import { SubToolModel } from '../models/subtool.model';
import { AccessoryModel } from '../models/accessory.model';
import { ToolHistoryModel } from '../models/history.model';
import path from 'path';
import fs from 'fs';

export interface AuthRequest extends Request {
  employee?: any;
  user?: any;
}

const hasPermission = (employee: any, requiredPermissions: string[]): boolean => {
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  const userPermissions = employee.positionInfo?.permissions || employee.positionId?.permissions || [];
  return requiredPermissions.some(permission => userPermissions.includes(permission));
};


function removeVietnameseTones(str: string): string {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  str = str.replace(/[^a-zA-Z0-9\s]/g, "");
  return str;
}

async function generateToolCode(categoryName: string): Promise<string> {
  const normalizedName = removeVietnameseTones(categoryName || 'TOOL');
  const code = normalizedName.replace(/\s+/g, '').toUpperCase();
  return code || 'TOOL';
}

export const uploadImages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Không có file nào được upload'
      });
      return;
    }

    const imageUrls = files.map(file => `/uploads/tools/${file.filename}`);

    res.json({
      success: true,
      message: 'Upload ảnh thành công',
      data: imageUrls
    });
  } catch (error: any) {
    console.error('Upload images error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const deleteImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    const filePath = path.join('uploads/tools', filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy file'
      });
      return;
    }

    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: 'Xóa ảnh thành công'
    });
  } catch (error: any) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      assignedTo,
      categoryId,
      status,
      condition,
      page = '1',
      limit = '50',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      departmentId,
      unitId
    } = req.query;

    const currentEmployee = req.employee;

    if (!hasPermission(currentEmployee, ['view_all_tools', 'view_department_tools', 'view_assigned_tools'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem danh sách công cụ/thiết bị'
      });
      return;
    }

    const filters: any = {};

    if (hasPermission(currentEmployee, ['view_all_tools'])) {
    } else if (hasPermission(currentEmployee, ['view_department_tools'])) {
      filters.departmentId = currentEmployee.departmentId;
    } else if (hasPermission(currentEmployee, ['view_assigned_tools'])) {
      filters.assignedTo = currentEmployee.id;
    }

    if (unitId) filters.unitId = unitId as string;
    if (departmentId) filters.departmentId = departmentId as string;
    if (categoryId) filters.categoryId = categoryId as string;
    if (assignedTo) filters.assignedTo = assignedTo as string;
    if (status) filters.status = status as string;
    if (condition) filters.condition = condition as string;

    filters.page = parseInt(page as string);
    filters.limit = parseInt(limit as string);
    filters.sortBy = sortBy as string;
    filters.sortOrder = sortOrder as 'asc' | 'desc';

    const { tools, total } = await ToolModel.findAll(filters);

    res.json({
      success: true,
      count: tools.length,
      total,
      totalPages: Math.ceil(total / filters.limit),
      currentPage: filters.page,
      data: tools
    });
  } catch (error: any) {
    console.error('Get all tools error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getToolsByEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const currentEmployee = req.employee;

    if (!hasPermission(currentEmployee, ['view_all_tools', 'view_department_tools', 'view_assigned_tools'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem công cụ/thiết bị'
      });
      return;
    }

    const tools = await ToolModel.findByEmployee(employeeId);

    res.json({
      success: true,
      count: tools.length,
      data: tools
    });
  } catch (error: any) {
    console.error('Get employee tools error:', error);
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

    if (!hasPermission(currentEmployee, ['view_all_tools', 'view_department_tools', 'view_assigned_tools'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem công cụ/thiết bị'
      });
      return;
    }

    const tool = await ToolModel.findById(req.params.id);

    if (!tool) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy công cụ/thiết bị'
      });
      return;
    }

    if (tool.isDelete) {
      res.status(404).json({
        success: false,
        message: 'Công cụ/thiết bị đã bị xóa'
      });
      return;
    }

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        const toolDeptId = tool.departmentId;
        const currentDeptId = currentEmployee.departmentId;

        const toolInMyDept = toolDeptId === currentDeptId;
        const assignedToMyDept = tool.assignedToInfo &&
          tool.assignedToInfo.departmentId === currentDeptId;

        if (!toolInMyDept && !assignedToMyDept) {
          res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xem công cụ/thiết bị này'
          });
          return;
        }
      } else if (hasPermission(currentEmployee, ['view_assigned_tools'])) {
        if (tool.assignedTo !== currentEmployee.id) {
          res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền xem công cụ/thiết bị được giao cho mình'
          });
          return;
        }
      }
    }

    res.json({
      success: true,
      data: tool
    });
  } catch (error: any) {
    console.error('Get tool by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const search = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { keyword } = req.params;
    const { categoryId, status } = req.query;
    const currentEmployee = req.employee;
    const level = currentEmployee.positionId?.level;

    const params: any = { keyword };

    if (level !== undefined && level < 5) {
      if (level === 3) {
        params.currentEmployeeUnitId = currentEmployee.unitId;
      } else if (level < 3) {
        params.currentEmployeeDepartmentId = currentEmployee.departmentId;
      }
    }
    params.level = level;

    if (categoryId) params.categoryId = categoryId as string;
    if (status) params.status = status as string;

    const tools = await ToolModel.search(params);

    res.json({
      success: true,
      count: tools.length,
      data: tools
    });
  } catch (error: any) {
    console.error('Search tools error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let {
      name,
      code,
      assignedTo,
      category,
      quantity,
      status,
      condition,
      notes,
      purchasePrice,
      purchaseDate,
      warrantyUntil,
      unitOC,
      description,
      dateOfReceipt,
      assignedDate,
      images
    } = req.body;

    const currentEmployee = req.employee;

    if (!name || !assignedTo || !category) {
      res.status(400).json({
        success: false,
        message: 'Thiếu trường bắt buộc: name, assignedTo, category'
      });
      return;
    }

    if (!hasPermission(currentEmployee, ['create_tool'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tạo công cụ/thiết bị'
      });
      return;
    }

    const employee = await EmployeeModel.findById(assignedTo);
    if (!employee) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên được gán'
      });
      return;
    }

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        if (currentEmployee.departmentId !== employee.departmentId) {
          res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền tạo công cụ/thiết bị cho nhân viên trong phòng ban của mình'
          });
          return;
        }
      }
    }

    const categoryExists = await CategoryModel.findById(category);
    if (!categoryExists) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục nhóm thiết bị'
      });
      return;
    }

    if (!code || code.trim() === '') {
      code = await generateToolCode(categoryExists.name);
    }

    let procesedImages: string[] = [];
    if (images) {
      if (Array.isArray(images)) {
        procesedImages = images.filter(img => img && typeof img === 'string');
      } else if (typeof images === 'string') {
        try {
          procesedImages = JSON.parse(images);
        } catch (error) {
          procesedImages = [images];
        }
      }
    }

    const toolData: ITool = {
      name,
      code,
      assignedTo,
      assignedDate,
      unitId: employee.unitId,
      departmentId: employee.departmentId,
      categoryId: category,
      quantity: quantity || 1,
      status: status || 'Dự phòng',
      condition: condition || 'Mới',
      purchasePrice,
      purchaseDate,
      warrantyUntil,
      unitOC,
      notes,
      description,
      dateOfReceipt,
      images: procesedImages.length > 0 ? procesedImages : undefined
    };

    const savedTool = await ToolModel.create(toolData);

    res.status(201).json({
      success: true,
      message: 'Tạo công cụ/thiết bị thành công',
      data: savedTool
    });
  } catch (error: any) {
    console.error('Create tool error:', error);
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

    if (!hasPermission(currentEmployee, ['update_tool'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền sửa công cụ/thiết bị'
      });
      return;
    }

    const tool = await ToolModel.findById(req.params.id);

    if (!tool) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy công cụ/thiết bị'
      });
      return;
    }

    if (tool.isDelete) {
      res.status(404).json({
        success: false,
        message: 'Công cụ/thiết bị đã bị xóa'
      });
      return;
    }

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        if (currentEmployee.departmentId !== tool.departmentId) {
          res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền sửa công cụ/thiết bị trong phòng ban của mình'
          });
          return;
        }
      }
    }

    if (req.body.code && req.body.code !== tool.code) {
      res.status(400).json({
        success: false,
        message: 'Không được phép thay đổi mã công cụ/thiết bị'
      });
      return;
    }

    const updateData: Partial<ITool> = { ...req.body };
    delete (updateData as any).code;

    let processedImages: string[] = [];

    const oldImages = tool.images || [];
    if (req.body.images !== undefined) {


      if (req.body.images === null) {
        processedImages = [];
      } else if (Array.isArray(req.body.images)) {
        processedImages = req.body.images.filter((img: any) => img && typeof img === 'string');
      } else if (typeof req.body.images === 'string') {
        try {
          processedImages = JSON.parse(req.body.images);
        } catch (error) {
          processedImages = [req.body.images];
        }
      }
      updateData.images = processedImages;
    }

    const deletedImages = oldImages.filter(oldImg => !processedImages.includes(oldImg));

    for (const deletedImg of deletedImages) {
      try {
        const filename = deletedImg.split('/').pop();
        if (filename) {
          const filePath = path.join('uploads/tools', filename);

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`✅ Deleted file: ${filePath}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error deleting file ${deletedImg}:`, error)
      }
    }

    if (req.body.assignedTo && req.body.assignedTo !== tool.assignedTo) {
      const newEmployee = await EmployeeModel.findById(req.body.assignedTo);
      if (!newEmployee) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy nhân viên được gán'
        });
        return;
      }

      if (!hasPermission(currentEmployee, ['view_all_tools'])) {
        if (hasPermission(currentEmployee, ['view_department_tools'])) {
          if (currentEmployee.departmentId !== newEmployee.departmentId) {
            res.status(403).json({
              success: false,
              message: 'Bạn chỉ có quyền gán công cụ/thiết bị cho nhân viên trong phòng ban của mình'
            });
            return;
          }
        }
      }

      updateData.unitId = newEmployee.unitId;
      updateData.departmentId = newEmployee.departmentId;
      updateData.assignedDate = new Date();
    }

    const updatedTool = await ToolModel.update(req.params.id, updateData);

    res.json({
      success: true,
      message: 'Cập nhật công cụ/thiết bị thành công',
      data: updatedTool
    });
  } catch (error: any) {
    console.error('Update tool error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const deleteTool = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;
    const { id } = req.params;

    const tool = await ToolModel.findById(id);

    if (!tool) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy công cụ/thiết bị'
      });
      return;
    }

    if (tool.isDelete) {
      res.status(404).json({
        success: false,
        message: 'Công cụ/thiết bị đã bị xóa'
      });
      return;
    }

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        if (currentEmployee.departmentId !== tool.departmentId) {
          res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền xóa công cụ/thiết bị trong phòng ban của mình'
          });
          return;
        }
      }
    }

    await ToolModel.softDelete(id, req.user.id);

    const subToolsDeleted = await SubToolModel.softDeleteByParentTool(id, req.user.id);
    const accessoriesDeleted = await AccessoryModel.softDeleteByParentTool(id, req.user.id);

    res.json({
      success: true,
      message: 'Xóa công cụ/thiết bị thành công',
      data: tool,
      deletedInfo: {
        subTools: subToolsDeleted,
        accessories: accessoriesDeleted
      }
    });
  } catch (error: any) {
    console.error('Delete tool error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const restore = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;
    const { id } = req.params;
    const { type } = req.body;

    if (!hasPermission(currentEmployee, ['restore_tool'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền khôi phục công cụ/thiết bị'
      });
      return;
    }

    let item: any;
    let Model: any;

    switch (type) {
      case 'SubTool':
        Model = SubToolModel;
        item = await SubToolModel.findById(id, true);
        break;
      case 'Accessory':
        Model = AccessoryModel;
        item = await AccessoryModel.findById(id, true);
        break;
      default:
        Model = ToolModel;
        item = await ToolModel.findById(id, true);
    }

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy công cụ/thiết bị'
      });
      return;
    }

    if (!item.isDelete) {
      res.status(400).json({
        success: false,
        message: 'Công cụ/thiết bị này chưa bị xóa'
      });
      return;
    }

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        if (currentEmployee.departmentId !== item.departmentId) {
          res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền khôi phục công cụ/thiết bị trong phòng ban của mình'
          });
          return;
        }
      }
    }

    await Model.restore(id, currentEmployee.id);

    let restoreInfo: any = {};

    if (type === 'Tool') {
      const subToolsRestored = await SubToolModel.restoreByParentTool(id, currentEmployee.id);
      const accessoriesRestored = await AccessoryModel.restoreByParentTool(id, currentEmployee.id);
      restoreInfo = {
        subTools: subToolsRestored,
        accessories: accessoriesRestored
      };
    } else if (type === 'SubTool') {
      const accessoriesRestored = await AccessoryModel.restoreBySubTool(id, currentEmployee.id);
      restoreInfo = {
        accessories: accessoriesRestored
      };
    }

    res.json({
      success: true,
      message: 'Khôi phục công cụ/thiết bị thành công',
      data: item,
      restoreInfo
    });
  } catch (error: any) {
    console.error('Restore tool error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const permanentDelete = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;
    const { id } = req.params;
    const { type } = req.body;

    if (!hasPermission(currentEmployee, ['permanent_delete_tool'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa vĩnh viễn công cụ/thiết bị'
      });
      return;
    }

    let item: any;
    switch (type) {
      case 'SubTool':
        item = await SubToolModel.findById(id, true);
        break;
      case 'Accessory':
        item = await AccessoryModel.findById(id, true);
        break;
      default:
        item = await ToolModel.findById(id, true);
    }

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy công cụ/thiết bị'
      });
      return;
    }

    if (!item.isDelete) {
      res.status(400).json({
        success: false,
        message: 'Chỉ có thể xóa vĩnh viễn những công cụ/thiết bị đã bị xóa mềm'
      });
      return;
    }

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        if (currentEmployee.departmentId !== item.departmentId) {
          res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền xóa công cụ/thiết bị trong phòng ban của mình'
          });
          return;
        }
      }
    }

    let deletedSubToolCount = 0;
    let deletedAccessoriesCount = 0;
    let message = '';

    if (type === 'Tool') {
      const subTools = await SubToolModel.findAll({
        parentToolId: id,
      });

      if (subTools.subTools.length > 0) {
        for (const subTool of subTools.subTools) {

          const accCount = await AccessoryModel.hardDeleteBySubTool(subTool.id!);
          deletedAccessoriesCount += accCount;
        }
        deletedSubToolCount = await SubToolModel.hardDeleteByParentTool(id);
      }

      await ToolModel.hardDelete(id);

      message = `Xóa vĩnh viễn công cụ/thiết bị "${item.name}" thành công`;
      if (deletedSubToolCount > 0 || deletedAccessoriesCount > 0) {
        message += ` (bao gồm ${deletedSubToolCount} loại thiết bị và ${deletedAccessoriesCount} linh phụ kiện)`;
      }

      res.json({
        success: true,
        message,
        deletedItems: {
          tool: 1,
          subTools: deletedSubToolCount,
          accessories: deletedAccessoriesCount,
          total: 1 + deletedSubToolCount + deletedAccessoriesCount
        }
      });
      return;

    } else if (type === 'SubTool') {
      deletedAccessoriesCount = await SubToolModel.permanentDeleteWithChildren(id);

      message = `Xóa vĩnh viễn loại thiết bị "${item.name}" thành công`;
      if (deletedAccessoriesCount > 0) {
        message += ` (bao gồm ${deletedAccessoriesCount} linh phụ kiện)`;
      }

      res.json({
        success: true,
        message,
        deletedItems: {
          subTool: 1,
          accessories: deletedAccessoriesCount,
          total: 1 + deletedAccessoriesCount
        }
      });
      return;

    } else if (type === 'Accessory') {
      await AccessoryModel.hardDelete(id);

      message = `Xóa vĩnh viễn linh phụ kiện "${item.name}" thành công`;

      res.json({
        success: true,
        message,
        deletedItems: {
          accessory: 1,
          total: 1
        }
      });
      return;
    }

  } catch (error: any) {
    console.error('Permanent delete tool error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getDeleted = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50', sortBy = 'deletedAt', sortOrder = 'desc', employeeId } = req.query;
    const currentEmployee = req.employee;

    if (!hasPermission(currentEmployee, ['view_all_tools', 'view_department_tools'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem công cụ/thiết bị đã xóa'
      });
      return;
    }

    const params: any = {
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    if (employeeId) params.employeeId = employeeId as string;

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        params.departmentId = currentEmployee.departmentId;
      }
    }

    const [toolsResult, subToolsResult, accessoriesResult] = await Promise.all([
      ToolModel.getDeleted({ ...params, page: 1, limit: 10000 }),
      SubToolModel.getDeleted({ ...params, page: 1, limit: 10000 }),
      AccessoryModel.getDeleted({ ...params, page: 1, limit: 10000 })
    ]);

    const tools = toolsResult.tools;
    const subTools = subToolsResult.subTools;
    const accessories = accessoriesResult.accessories;

    const toolChildrenMap = new Map();
    const subToolChildrenMap = new Map();

    accessories.forEach(acc => {
      if (acc.subTool) {
        const subToolId = acc.subTool.toString();
        if (!subToolChildrenMap.has(subToolId)) {
          subToolChildrenMap.set(subToolId, []);
        }
        subToolChildrenMap.get(subToolId).push({
          ...acc,
          type: 'Accessory',
          typeLabel: 'Linh kiện',
          level: 3
        });
      }
    });

    subTools.forEach(sub => {
      if (sub.parentTool && sub.id) {
        const parentId = sub.parentTool.toString();
        if (!toolChildrenMap.has(parentId)) {
          toolChildrenMap.set(parentId, { subTools: [], accessories: [] });
        }

        const subId = sub.id.toString();
        const subWithChildren = {
          ...sub,
          type: 'SubTool',
          typeLabel: 'Loại thiết bị',
          level: 2,
          children: subToolChildrenMap.get(subId) || []
        };

        toolChildrenMap.get(parentId).subTools.push(subWithChildren);
      }
    });

    const topLevelTools = tools.map(tool => {
      if (!tool.id) return null;
      const toolId = tool.id.toString();
      const children = toolChildrenMap.get(toolId) || { subTools: [], accessories: [] };

      return {
        ...tool,
        type: 'Tool',
        typeLabel: 'Nhóm thiết bị',
        level: 1,
        childrenCount: {
          subTools: children.subTools.length,
          accessories: children.accessories.length,
          total: children.subTools.length + children.accessories.length
        },
        children: children
      };
    }).filter(Boolean);

    const toolIds = new Set(tools.map(t => t.id?.toString()).filter(Boolean));
    const orphanedSubTools = subTools
      .filter(sub => !sub.parentTool || !toolIds.has(sub.parentTool.toString()))
      .map(sub => {
        const subId = sub.id!.toString();
        const children = subToolChildrenMap.get(subId) || [];

        return {
          ...sub,
          type: 'SubTool',
          typeLabel: 'Loại thiết bị',
          level: 2,
          childrenCount: {
            accessories: children.length,
            total: children.length
          },
          children: children
        };
      });

    const subToolIds = new Set(subTools.map(s => s.id?.toString()));
    const orphanedAccessories = accessories
      .filter(acc => !acc.subTool || !subToolIds.has(acc.subTool.toString()))
      .map(acc => ({
        ...acc,
        type: 'Accessory',
        typeLabel: 'Linh kiện',
        level: 3,
        childrenCount: { total: 0 }
      }));

    const allItems = [...topLevelTools, ...orphanedSubTools, ...orphanedAccessories];

    const sortMultiplier = sortOrder === 'asc' ? 1 : -1;
    allItems.sort((a, b) => {
      const aValue = (a as any)[sortBy as string];
      const bValue = (b as any)[sortBy as string];
      if (aValue < bValue) return -1 * sortMultiplier;
      if (aValue > bValue) return 1 * sortMultiplier;
      return 0;
    });

    const total = allItems.length;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    const paginatedItems = allItems.slice(skip, skip + limitNum);

    res.json({
      success: true,
      count: paginatedItems.length,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      data: paginatedItems
    });
  } catch (error: any) {
    console.error('Get deleted tools error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const assignTool = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { toolId, employeeId, condition, notes, description } = req.body;
    const currentEmployee = req.employee;

    if (!hasPermission(currentEmployee, ['assign_tool'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền giao công cụ/thiết bị'
      });
      return;
    }

    if (!toolId || !employeeId) {
      res.status(400).json({
        success: false,
        message: 'Thiếu trường bắt buộc: toolId, employeeId'
      });
      return;
    }

    const tool = await ToolModel.findById(toolId);
    const employee = await EmployeeModel.findById(employeeId);

    if (!tool) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy công cụ/thiết bị'
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

    if (tool.isDelete) {
      res.status(400).json({
        success: false,
        message: 'Không thể giao công cụ/thiết bị đã bị xóa'
      });
      return;
    }

    if (tool.assignedTo && tool.assignedTo === employeeId) {
      res.status(400).json({
        success: false,
        message: 'Công cụ/thiết bị đã được giao cho nhân viên này rồi'
      });
      return;
    }

    const previousEmployeeId = tool.assignedTo || undefined;
    const isTransfer = !!tool.assignedTo;

    await ToolHistoryModel.create({
      tool: toolId,
      employee: employeeId,
      previousEmployee: previousEmployeeId,
      action: isTransfer ? 'Chuyển giao' : 'Giao',
      condition: condition || tool.condition,
      description,
      notes: notes || (isTransfer
        ? `Chuyển giao thiết bị/công cụ ${tool.name} từ ${tool.assignedToInfo?.name} sang ${employee.name}`
        : `Giao công cụ/thiết bị ${tool.name} cho ${employee.name}`),
      performedBy: req.user.id
    });

    const updateData: Partial<ITool> = {
      assignedTo: employeeId,
      assignedDate: new Date(),
      status: 'Đang sử dụng',
      unitId: employee.unitId,
      departmentId: employee.departmentId
    };

    if (condition) {
      updateData.condition = condition;
    }

    await ToolModel.update(toolId, updateData);

    const subToolsUpdatedCount = await SubToolModel.assignToEmployee(
      toolId,
      employeeId,
      employee.unitId,
      employee.departmentId,
      condition
    );

    const accessoriesUpdatedCount = await AccessoryModel.assignToEmployee(
      toolId,
      employeeId,
      employee.unitId,
      employee.departmentId,
      condition
    );

    const updatedTool = await ToolModel.findById(toolId);
    res.json({
      success: true,
      message: isTransfer ? 'Chuyển giao công cụ/thiết bị thành công' : 'Giao công cụ/thiết bị thành công',
      data: updatedTool,
      subToolsInfo: {
        updated: subToolsUpdatedCount
      },
      accessoriesInfo: {
        updated: accessoriesUpdatedCount
      }
    });
  } catch (error: any) {
    console.error('Assign tool error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const revokeTool = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { toolId, condition, notes } = req.body;
    const currentEmployee = req.employee;

    if (!hasPermission(currentEmployee, ['assign_tool'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thu hồi công cụ/thiết bị'
      });
      return;
    }

    if (!toolId) {
      res.status(400).json({
        success: false,
        message: 'Thiếu trường bắt buộc: toolId'
      });
      return;
    }

    const tool = await ToolModel.findById(toolId);

    if (!tool) {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy công cụ/thiết bị'
      });
      return;
    }

    if (tool.isDelete) {
      res.status(400).json({
        success: false,
        message: 'Không thể thu hồi công cụ/thiết bị đã bị xóa'
      });
      return;
    }

    if (!tool.assignedTo) {
      res.status(400).json({
        success: false,
        message: 'Công cụ/thiết bị chưa được giao cho ai'
      });
      return;
    }

    const employeeId = tool.assignedTo;
    const previousAssigneeName = tool.assignedToInfo?.name;

    await ToolHistoryModel.create({
      tool: toolId,
      employee: null as any,
      action: 'Thu hồi',
      condition: condition || tool.condition,
      notes,
      performedBy: req.user.id
    });

    const updateData: Partial<ITool> = {
      departmentId: undefined as any,
      unitId: undefined as any,
      assignedTo: undefined as any,
      assignedDate: undefined as any,
      status: 'Dự phòng'
    };

    if (condition) {
      updateData.condition = condition;
    }

    await ToolModel.update(toolId, updateData);

    await SubToolModel.revokeFromEmployee(toolId, employeeId, condition);
    await AccessoryModel.revokeFromEmployee(toolId, employeeId, condition);

    const updatedTool = await ToolModel.findById(toolId);

    res.json({
      success: true,
      message: `Thu hồi công cụ/thiết bị thành công từ ${previousAssigneeName}`,
      data: {
        tool: updatedTool,
        summary: {
          previousAssigneeId: employeeId,
          previousAssigneeName: previousAssigneeName,
          notes: notes || 'Thu hồi công cụ/thiết bị'
        }
      }
    });
  } catch (error: any) {
    console.error('Revoke tool error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentEmployee = req.employee;

    if (!hasPermission(currentEmployee, ['view_all_tools', 'view_department_tools'])) {
      res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem thống kê'
      });
      return;
    }

    let departmentId: string | undefined;

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        departmentId = currentEmployee.departmentId;
      }
    }

    const statistics = await ToolModel.getStatistics(departmentId);

    res.json({
      success: true,
      data: statistics
    });
  } catch (error: any) {
    console.error('Get statistics error:', error);
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
  getToolsByEmployee,
  search,
  create,
  update,
  deleteTool,
  permanentDelete,
  getStatistics,
  assignTool,
  revokeTool,
  getDeleted,
  restore,
  uploadImages,
  deleteImage
}