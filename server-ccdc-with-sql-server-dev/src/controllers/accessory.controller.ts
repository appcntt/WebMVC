import { Request, Response } from 'express';
import sql from 'mssql';
import { getPool } from '../config/database';
import { AccessoryModel, IAccessory } from '../models/accessory.model';
import { SubToolModel } from '../models/subtool.model';
import { ToolModel } from '../models/tool.model';
import { EmployeeModel } from '../models/employee.model';
import { CategoryAccessory } from '../models/category-accessory.model';
import { ToolHistoryModel } from '../models/history.model';

interface AuthRequest extends Request {
  employee?: any;
  user?: { id: string };
}

const hasPermission = (employee: any, permissions: string[]): boolean => {
  if (!employee) {
    console.log('❌ No employee provided');
    return false;
  }

  if (!employee.positionInfo) {
    console.log('❌ Employee has no positionInfo:', employee);
    return false;
  }

  const userPermissions = employee.positionInfo?.permissions || [];

  console.log('🔐 Checking permissions:', {
    required: permissions,
    userHas: userPermissions
  });

  return permissions.some(permission => userPermissions.includes(permission));
};

const removeVietnameseTones = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

async function generateAccessoryCode(categoryName: string): Promise<string> {
  const normalizedName = removeVietnameseTones(categoryName || 'ACCESSORY');
  const code = normalizedName.replace(/\s+/g, '').toUpperCase();
  return code || 'ACCESSORY';
}

export const getAll = async (req: AuthRequest, res: Response) => {
  try {
    const {
      subTool,
      parentTool,
      accessoryTypeId,
      status,
      condition,
      page = '1',
      limit = '50',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      assignedTo
    } = req.query;

    const currentEmployee = req.employee!;

    if (!hasPermission(currentEmployee, ['view_all_tools', 'view_department_tools', 'view_assigned_tools'])) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem danh sách linh kiện'
      });
    }

    const params: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc'
    };

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        params.departmentId = currentEmployee.departmentId;
      } else if (hasPermission(currentEmployee, ['view_assigned_tools'])) {
        params.assignedTo = currentEmployee.id;
      }
    }

    if (subTool) params.subTool = subTool as string;
    if (parentTool) params.parentTool = parentTool as string;
    if (assignedTo) params.assignedTo = assignedTo as string;
    if (accessoryTypeId) params.accessoryTypeId = accessoryTypeId as string;
    if (status) params.status = status as string;
    if (condition) params.condition = condition as string;

    const { accessories, total } = await AccessoryModel.findAll(params);

    res.json({
      success: true,
      count: accessories.length,
      total,
      totalPages: Math.ceil(total / params.limit),
      currentPage: params.page,
      data: accessories
    });
  } catch (error: any) {
    console.error('Get all accessories error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getById = async (req: AuthRequest, res: Response) => {
  try {
    const currentEmployee = req.employee!;

    if (!hasPermission(currentEmployee, ['view_all_tools', 'view_department_tools', 'view_assigned_tools'])) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem chi tiết linh kiện'
      });
    }

    const accessory = await AccessoryModel.findById(req.params.id);

    if (!accessory) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy linh kiện'
      });
    }

    if (accessory.isDelete) {
      return res.status(404).json({
        success: false,
        message: 'Linh kiện đã bị xóa'
      });
    }

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        if (currentEmployee.departmentId !== accessory.departmentId) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xem linh kiện đơn vị khác'
          });
        }
      } else if (hasPermission(currentEmployee, ['view_assigned_tools'])) {
        if (accessory.assignedTo !== currentEmployee.id) {
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền xem linh kiện được giao cho mình'
          });
        }
      }
    }

    res.json({
      success: true,
      data: accessory
    });
  } catch (error: any) {
    console.error('Get accessory by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getBySubTool = async (req: AuthRequest, res: Response) => {
  try {
    const { subToolId } = req.params;
    const currentEmployee = req.employee!;

    const subTool = await SubToolModel.findById(subToolId);
    if (!subTool) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bộ phận'
      });
    }

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        if (currentEmployee.departmentId !== subTool.departmentId) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xem linh kiện phòng ban khác'
          });
        }
      } else if (hasPermission(currentEmployee, ['view_assigned_tools'])) {
        if (!subTool.assignedTo || currentEmployee.id !== subTool.assignedTo) {
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền xem linh kiện được giao cho mình'
          });
        }
      }
    }

    const accessories = await AccessoryModel.findBySubTool(subToolId);

    const grouped: { [key: string]: any[] } = {};
    accessories.forEach(acc => {
      const typeName = acc.accessoryTypeInfo?.name || 'Khác';
      if (!grouped[typeName]) {
        grouped[typeName] = [];
      }
      grouped[typeName].push(acc);
    });

    res.json({
      success: true,
      count: accessories.length,
      data: accessories,
      grouped,
      subTool: {
        _id: subTool.id,
        code: subTool.code,
        name: subTool.name
      }
    });
  } catch (error: any) {
    console.error('Get accessories by SubTool error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const create = async (req: AuthRequest, res: Response) => {
  try {
    let {
      name,
      code,
      serialNumber,
      model,
      subToolId,
      parentToolId,
      accessoryTypeId,
      quantity,
      brand,
      unitOC,
      specifications,
      slot,
      assignedTo,
      assignedDate,
      purchaseDate,
      purchasePrice,
      warrantyUntil,
      status,
      condition,
      notes,
      description,
      dateOfReceipt
    } = req.body;

    const currentEmployee = req.employee!;

    if (!hasPermission(currentEmployee, ['create_tool'])) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền tạo linh kiện'
      });
    }

    if (!name || !subToolId || !parentToolId || !accessoryTypeId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu trường bắt buộc: name, subToolId, parentToolId, accessoryTypeId'
      });
    }

    const isValidGuid = (guid: any): boolean => {
      if (!guid) return false;
      if (typeof guid !== 'string') return false;
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return guidRegex.test(guid);
    };

    if (!isValidGuid(subToolId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid subToolId format: ${subToolId}`
      });
    }

    if (!isValidGuid(parentToolId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid parentToolId format: ${parentToolId}`
      });
    }

    if (!isValidGuid(accessoryTypeId)) {
      return res.status(400).json({
        success: false,
        message: `Invalid accessoryTypeId format: ${accessoryTypeId}`
      });
    }

    const accessoryType = await CategoryAccessory.findById(accessoryTypeId);
    if (!accessoryType) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy danh mục linh kiện'
      });
    }

    const subTool = await SubToolModel.findById(subToolId);
    if (!subTool) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bộ phận của thiết bị'
      });
    }

    const parentTool = await ToolModel.findById(parentToolId);
    if (!parentTool) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thiết bị'
      });
    }

    if (!isValidGuid(subTool.unitId)) {
      return res.status(400).json({
        success: false,
        message: `SubTool has invalid unitId: ${subTool.unitId}`
      });
    }

    if (!isValidGuid(subTool.departmentId)) {
      return res.status(400).json({
        success: false,
        message: `SubTool has invalid departmentId: ${subTool.departmentId}`
      });
    }

    let finalAssignedTo = assignedTo;
    let finalAssignedDate = assignedDate;

    if (!finalAssignedTo && subTool.assignedTo) {
      finalAssignedTo = subTool.assignedTo;
      finalAssignedDate = subTool.assignedDate || new Date();
    }

    if (finalAssignedTo) {
      if (!isValidGuid(finalAssignedTo)) {
        return res.status(400).json({
          success: false,
          message: `Invalid assignedTo GUID: ${finalAssignedTo}`
        });
      }

      const employee = await EmployeeModel.findById(finalAssignedTo);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy nhân viên được gán'
        });
      }
    }

    if (!code || code.trim() === '') {
      code = await generateAccessoryCode(accessoryType?.name || '');
      const timestamp = Date.now().toString().slice(-4);
      code = `${code}_${timestamp}`;
    }

    const accessoryData: IAccessory = {
      name,
      code,
      serialNumber: serialNumber || null,
      model: model || null,
      subTool: subToolId,
      parentTool: parentToolId,
      accessoryTypeId,
      unitId: subTool.unitId,
      departmentId: subTool.departmentId,
      categoryId: (subTool.categoryId && isValidGuid(subTool.categoryId)) ? subTool.categoryId : null,
      quantity: quantity || 1,
      brand: brand || null,
      unitOC: unitOC || null,
      specifications: specifications || null,
      slot: slot || null,
      purchaseDate: purchaseDate || null,
      purchasePrice: purchasePrice || null,
      warrantyUntil: warrantyUntil || null,
      assignedTo: finalAssignedTo || null,
      assignedDate: finalAssignedDate || null,
      status: status || 'Đang sử dụng',
      condition: condition || 'Tốt',
      notes: notes || null,
      description: description || null,
      dateOfReceipt: dateOfReceipt || null
    };

    console.log('Final accessory data to create:', JSON.stringify({
      ...accessoryData,
      specifications: '...'
    }, null, 2));

    const savedAccessory = await AccessoryModel.create(accessoryData);

    // Update SubTool hasAccessorys flag
    await SubToolModel.update(subToolId, { hasAccessorys: true });

    res.status(201).json({
      success: true,
      message: 'Tạo linh kiện thành công',
      data: savedAccessory
    });
  } catch (error: any) {
    console.error('Create accessory error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const update = async (req: AuthRequest, res: Response) => {
  try {
    const currentEmployee = req.employee!;

    if (!hasPermission(currentEmployee, ['update_tool'])) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa linh kiện'
      });
    }

    const accessory = await AccessoryModel.findById(req.params.id);

    if (!accessory) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy linh kiện'
      });
    }

    if (accessory.isDelete) {
      return res.status(404).json({
        success: false,
        message: 'Linh kiện đã bị xóa'
      });
    }

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        if (currentEmployee.departmentId !== accessory.departmentId) {
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền sửa linh kiện trong phòng ban của mình'
          });
        }
      }
    }

    const updateData = { ...req.body };
    delete updateData.code;
    delete updateData.subTool;
    delete updateData.parentTool;

    const updatedAccessory = await AccessoryModel.update(req.params.id, updateData);

    res.json({
      success: true,
      message: 'Cập nhật linh kiện thành công',
      data: updatedAccessory
    });
  } catch (error: any) {
    console.error('Update accessory error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const softDelete = async (req: AuthRequest, res: Response) => {
  try {
    const currentEmployee = req.employee!;

    if (!hasPermission(currentEmployee, ['delete_tool'])) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa linh kiện'
      });
    }

    const accessory = await AccessoryModel.findById(req.params.id);

    if (!accessory) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy linh kiện'
      });
    }

    if (accessory.isDelete) {
      return res.status(404).json({
        success: false,
        message: 'Linh kiện đã bị xóa'
      });
    }

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        if (currentEmployee.departmentId !== accessory.departmentId) {
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền xóa linh kiện trong phòng ban của mình'
          });
        }
      }
    }

    await AccessoryModel.softDelete(req.params.id, currentEmployee.id);

    res.json({
      success: true,
      message: 'Xóa linh kiện thành công'
    });
  } catch (error: any) {
    console.error('Delete accessory error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const restore = async (req: AuthRequest, res: Response) => {
  try {
    const currentEmployee = req.employee!;

    if (!hasPermission(currentEmployee, ['restore_tool'])) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền khôi phục linh kiện'
      });
    }

    const accessory = await AccessoryModel.findById(req.params.id, true);

    if (!accessory) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy linh kiện'
      });
    }

    if (!accessory.isDelete) {
      return res.status(400).json({
        success: false,
        message: 'Linh kiện này không bị xóa'
      });
    }

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        if (currentEmployee.departmentId !== accessory.departmentId) {
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền khôi phục linh kiện trong phòng ban của mình'
          });
        }
      }
    }

    await AccessoryModel.restore(req.params.id, currentEmployee.id);
    const restoredAccessory = await AccessoryModel.findById(req.params.id);

    res.json({
      success: true,
      message: 'Khôi phục linh kiện thành công',
      data: restoredAccessory
    });
  } catch (error: any) {
    console.error('Restore accessory error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const permanentDelete = async (req: AuthRequest, res: Response) => {
  try {
    const currentEmployee = req.employee!;

    if (!hasPermission(currentEmployee, ['permanent_delete_tool'])) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa vĩnh viễn linh kiện'
      });
    }

    const deleted = await AccessoryModel.hardDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy linh kiện'
      });
    }

    res.json({
      success: true,
      message: 'Xóa vĩnh viễn linh kiện thành công'
    });
  } catch (error: any) {
    console.error('Permanent delete accessory error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const assign = async (req: AuthRequest, res: Response) => {
  const pool = getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const { accessoryId, employeeId, targetSubToolId, condition, notes } = req.body;
    const currentEmployee = req.employee!;

    if (!hasPermission(currentEmployee, ['assign_tool'])) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chuyển giao linh kiện'
      });
    }

    if (!accessoryId || !employeeId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Thiếu thông tin: accessoryId và employeeId là bắt buộc'
      });
    }

    const accessory = await AccessoryModel.findById(accessoryId);
    if (!accessory) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy linh kiện'
      });
    }

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        if (currentEmployee.departmentId !== accessory.departmentId) {
          await transaction.rollback();
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền chuyển giao linh kiện trong phòng ban của mình'
          });
        }
      }
    }

    const newEmployee = await EmployeeModel.findById(employeeId);
    if (!newEmployee) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên'
      });
    }

    const oldSubToolId = accessory.subTool;
    const oldSubTool = await SubToolModel.findById(oldSubToolId);
    const oldParentToolId = accessory.parentTool;
    const oldCondition = accessory.condition;
    const oldEmployeeId = accessory.assignedTo || undefined;
    const oldEmployee = accessory.assignedToInfo;

    let newParentToolId = oldParentToolId;
    let isTransferred = false;

    if (targetSubToolId && targetSubToolId !== oldSubToolId) {
      const targetSubTool = await SubToolModel.findById(targetSubToolId);
      if (!targetSubTool) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bộ phận đích'
        });
      }

      const subToolAssigned = targetSubTool.assignedTo === employeeId;
      const parentToolAssigned = targetSubTool.parentToolInfo?.assignedTo === employeeId;

      if (!subToolAssigned && !parentToolAssigned) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Bộ phận đích (${targetSubTool.name}) chưa được giao cho nhân viên ${newEmployee.name}`
        });
      }

      if (!subToolAssigned && parentToolAssigned) {
        await SubToolModel.update(targetSubToolId, {
          assignedTo: employeeId,
          assignedDate: new Date()
        });
      }

      const remainingCount = await AccessoryModel.countDocuments({
        isDelete: false,
        subTool: oldSubToolId
      });

      if (remainingCount <= 1) {
        await SubToolModel.update(oldSubToolId, { hasAccessorys: false });
      }

      await SubToolModel.update(targetSubToolId, { hasAccessorys: true });

      newParentToolId = targetSubTool.parentTool;
      isTransferred = true;
    } else {
      const currentSubTool = await SubToolModel.findById(accessory.subTool);
      if (!currentSubTool) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy bộ phận hiện tại'
        });
      }

      const subToolAssigned = currentSubTool.assignedTo === employeeId;
      const parentTool = await ToolModel.findById(accessory.parentTool);
      const parentToolAssigned = parentTool?.assignedTo === employeeId;

      if (!subToolAssigned && !parentToolAssigned) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Bộ phận hiện tại chưa được giao cho nhân viên ${newEmployee.name}`
        });
      }

      if (!subToolAssigned && parentToolAssigned) {
        await SubToolModel.update(currentSubTool.id!, {
          assignedTo: employeeId,
          assignedDate: new Date()
        });
      }
    }

    const updateData: any = {
      assignedTo: employeeId,
      assignedDate: new Date(),
      status: 'Đang sử dụng',
      departmentId: newEmployee.departmentId,
      unitId: newEmployee.unitId
    };

    if (targetSubToolId) {
      updateData.subTool = targetSubToolId;
      updateData.parentTool = newParentToolId;
    }

    if (condition) {
      updateData.condition = condition;
    }

    await AccessoryModel.update(accessoryId, updateData);

    let historyNote = '';
    let historyAction = '';

    if (isTransferred) {
      historyNote = `Chuyển linh kiện ${accessory.name} từ ${oldSubTool?.name} sang bộ phận mới`;
      if (oldEmployee) {
        historyNote += ` và chuyển giao từ ${oldEmployee.name} sang ${newEmployee.name}`;
        historyAction = 'Chuyển giao';
      } else {
        historyNote += ` và giao cho ${newEmployee.name}`;
        historyAction = 'Chuyển linh kiện vào';
      }
    } else {
      if (oldEmployee) {
        historyNote = `Chuyển giao linh kiện từ ${oldEmployee.name} sang ${newEmployee.name}`;
        historyAction = 'Chuyển giao';
      } else {
        historyNote = `Giao linh kiện cho ${newEmployee.name}`;
        historyAction = 'Giao linh kiện';
      }
    }

    if (notes) {
      historyNote += `. ${notes}`;
    }

    await ToolHistoryModel.create({
      tool: newParentToolId,
      subTool: targetSubToolId || oldSubToolId,
      accessory: accessoryId,
      employee: employeeId,
      previousEmployee: oldEmployeeId,
      action: historyAction,
      conditionBefore: oldCondition,
      conditionAfter: condition || accessory.condition,
      notes: historyNote,
      performedBy: req.user!.id
    });

    await transaction.commit();

    const updatedAccessory = await AccessoryModel.findById(accessoryId);

    res.json({
      success: true,
      message: isTransferred
        ? (oldEmployee
          ? `Chuyển linh kiện sang bộ phận mới và chuyển giao từ ${oldEmployee.name} sang ${newEmployee.name} thành công`
          : `Chuyển linh kiện sang bộ phận mới và giao cho ${newEmployee.name} thành công`)
        : (oldEmployee
          ? `Chuyển giao linh kiện từ ${oldEmployee.name} sang ${newEmployee.name} thành công`
          : `Giao linh kiện cho ${newEmployee.name} thành công`),
      data: updatedAccessory,
      changes: {
        oldSubTool: oldSubTool?.name,
        newSubTool: updatedAccessory?.subToolInfo?.name,
        oldEmployee: oldEmployee?.name || 'Chưa giao',
        newEmployee: newEmployee.name,
        transferred: isTransferred
      }
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('Assign accessory error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const revoke = async (req: AuthRequest, res: Response) => {
  try {
    const { accessoryId, condition, notes } = req.body;
    const currentEmployee = req.employee!;

    if (!accessoryId) {
      return res.status(400).json({
        success: false,
        message: 'accessoryId là bắt buộc'
      });
    }

    if (!hasPermission(currentEmployee, ['revoke_tool'])) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thu hồi linh kiện'
      });
    }

    const accessory = await AccessoryModel.findById(accessoryId);

    if (!accessory) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy linh kiện'
      });
    }

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        if (currentEmployee.departmentId !== accessory.departmentId) {
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền thu hồi linh kiện trong phòng ban của mình'
          });
        }
      }
    }

    if (accessory.status === 'Dự phòng') {
      return res.status(400).json({
        success: false,
        message: 'Linh kiện đã ở trạng thái Dự phòng'
      });
    }

    const oldCondition = accessory.condition;
    const employeeId = accessory.assignedTo;

    const updateData: any = {
      status: 'Dự phòng',
      assignedTo: null,
      assignedDate: null
    };

    if (condition) {
      updateData.condition = condition;
    }

    await AccessoryModel.update(accessoryId, updateData);

    await ToolHistoryModel.create({
      tool: accessory.parentTool,
      subTool: accessory.subTool,
      accessory: accessoryId,
      employee: employeeId,
      action: 'Thu hồi linh kiện',
      conditionBefore: oldCondition,
      conditionAfter: condition || accessory.condition,
      notes: notes || `Thu hồi linh kiện ${accessory.name}`,
      performedBy: req.user!.id
    });

    const updatedAccessory = await AccessoryModel.findById(accessoryId);

    res.json({
      success: true,
      message: 'Thu hồi linh kiện thành công',
      data: updatedAccessory
    });
  } catch (error: any) {
    console.error('Revoke accessory error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
      error: error.message
    });
  }
};

export const getFullConfiguration = async (req: AuthRequest, res: Response) => {
  try {
    const { toolId } = req.params;
    const currentEmployee = req.employee!;

    if (!hasPermission(currentEmployee, ['view_all_tools', 'view_department_tools', 'view_assigned_tools'])) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem cấu hình thiết bị'
      });
    }

    const tool = await ToolModel.findById(toolId);
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thiết bị'
      });
    }

    if (tool.isDelete) {
      return res.status(404).json({
        success: false,
        message: 'Thiết bị đã bị xóa'
      });
    }

    // Permission check
    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        if (currentEmployee.departmentId !== tool.departmentId) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền xem thiết bị phòng ban khác'
          });
        }
      } else if (hasPermission(currentEmployee, ['view_assigned_tools'])) {
        if (tool.assignedTo !== currentEmployee.id) {
          return res.status(403).json({
            success: false,
            message: 'Bạn chỉ có quyền xem thiết bị được giao cho mình'
          });
        }
      }
    }

    const subTools = await SubToolModel.findByParentTool(toolId);

    const fullConfig = await Promise.all(
      subTools.map(async (subTool) => {
        const accessories = await AccessoryModel.findAll({
          subTool: subTool.id!,
          status: 'Đang sử dụng',
          limit: 1000
        });

        return {
          subTool: {
            _id: subTool.id,
            code: subTool.code,
            name: subTool.name,
            subToolType: subTool.subToolTypeInfo,
            brand: subTool.brand,
            model: subTool.model,
            purchasePrice: subTool.purchasePrice
          },
          accessories: accessories.accessories
        };
      })
    );

    const allAccessories = await AccessoryModel.findAll({
      parentTool: toolId,
      limit: 1000
    });

    const totalAccessoryValue = allAccessories.accessories.reduce(
      (sum, c) => sum + (c.purchasePrice || 0),
      0
    );

    const totalSubToolValue = subTools.reduce(
      (sum, s) => sum + (s.purchasePrice || 0),
      0
    );

    const totalValue =
      totalAccessoryValue + totalSubToolValue + (tool.purchasePrice || 0);

    res.json({
      success: true,
      data: {
        tool: {
          _id: tool.id,
          code: tool.code,
          name: tool.name,
          assignedTo: tool.assignedToInfo,
          purchasePrice: tool.purchasePrice
        },
        configuration: fullConfig,
        summary: {
          totalSubTools: subTools.length,
          totalAccessories: allAccessories.total,
          totalValue: totalValue,
          breakdown: {
            tool: tool.purchasePrice || 0,
            subTools: totalSubToolValue,
            accessories: totalAccessoryValue
          }
        }
      }
    });
  } catch (error: any) {
    console.error('Get full configuration error:', error);
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
    const { subToolId, parentToolId, accessoryTypeId, status } = req.query;
    const currentEmployee = req.employee;

    const params: any = { keyword };

    if (!hasPermission(currentEmployee, ['view_all_tools'])) {
      if (hasPermission(currentEmployee, ['view_department_tools'])) {
        params.departmentId = currentEmployee.departmentId;
      } else if (hasPermission(currentEmployee, ['view_assigned_tools'])) {
        params.assignedToId = currentEmployee.id;
      }
    }

    if (subToolId) params.subToolId = subToolId as string;
    if (parentToolId) params.parentToolId = parentToolId as string;
    if (accessoryTypeId) params.accessoryTypeId = accessoryTypeId as string;
    if (status) params.status = status as string;

    const accessories = await AccessoryModel.search(params);

    res.json({
      success: true,
      count: accessories.length,
      data: accessories
    });
  } catch (error: any) {
    console.error('Search accessories error:', error);
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
  getBySubTool,
  search,
  create,
  update,
  softDelete,
  restore,
  permanentDelete,
  assign,
  revoke,
  getFullConfiguration
};