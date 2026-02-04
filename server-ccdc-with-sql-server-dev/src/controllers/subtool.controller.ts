import { Request, Response } from 'express';
import sql from 'mssql';
import { getPool } from '../config/database';
import { SubToolModel } from '../models/subtool.model';
import { ToolModel } from '../models/tool.model';
import { CategorySubToolModel } from '../models/category-subtool.model';
import { EmployeeModel } from '../models/employee.model';
import { AccessoryModel } from '../models/accessory.model';
import { ToolHistoryModel } from '../models/history.model';
import path from 'path';
import fs from 'fs';

interface AuthRequest extends Request {
    employee?: any;
    user?: { id: string };
}

const hasPermission = (employee: any, requiredPermissions: string[]): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    const userPermissions = employee.positionInfo?.permissions || employee.positionId?.permissions || [];
    return requiredPermissions.some(permission => userPermissions.includes(permission));
};

const removeVietnameseTones = (str: string): string => {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D');
};

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

        const imagesUrls = files.map(file => `/uploads/subtools/${file.filename}`);

        res.json({
            success: true,
            message: 'Upload ảnh thành công',
            data: imagesUrls
        });
    } catch (error: any) {
        console.error('Upload images error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
}

export const deleteImage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { filename } = req.params;

        const filePath = path.join('uploads/subtools', filename);

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
            message: 'Xoá ảnh thành công'
        });
    } catch (error: any) {
        console.error('Delete image error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
}

export const getAll = async (req: AuthRequest, res: Response) => {
    try {
        const {
            parentToolId,
            subToolTypeId,
            status,
            condition,
            page = '1',
            limit = '50',
            sortBy = 'createdAt',
            sortOrder = 'desc',
            assignedTo,
        } = req.query;

        const currentEmployee = req.employee!;

        if (!hasPermission(currentEmployee, ['view_all_tools', 'view_department_tools', 'view_assigned_tools'])) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xem danh sách loại thiết bị',
            });
        }

        const params: any = {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            sortBy: sortBy as string,
            sortOrder: sortOrder as 'asc' | 'desc',
        };

        if (!hasPermission(currentEmployee, ['view_all_tools'])) {
            if (hasPermission(currentEmployee, ['view_department_tools'])) {
                params.departmentId = currentEmployee.departmentId;
            } else if (hasPermission(currentEmployee, ['view_assigned_tools'])) {
                params.assignedTo = currentEmployee.id;
            }
        }

        if (parentToolId) params.parentToolId = parentToolId as string;
        if (assignedTo) params.assignedTo = assignedTo as string;
        if (subToolTypeId) params.subToolTypeId = subToolTypeId as string;
        if (status) params.status = status as string;
        if (condition) params.condition = condition as string;

        const { subTools, total } = await SubToolModel.findAll(params);

        res.json({
            success: true,
            count: subTools.length,
            total,
            totalPages: Math.ceil(total / params.limit),
            currentPage: params.page,
            data: subTools,
        });
    } catch (error: any) {
        console.error('Get all subtools error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message,
        });
    }
}

export const getById = async (req: AuthRequest, res: Response) => {
    try {
        const currentEmployee = req.employee!;

        if (!hasPermission(currentEmployee, ['view_all_tools', 'view_department_tools', 'view_assigned_tools'])) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xem chi tiết bộ phận',
            });
        }

        const subTool = await SubToolModel.findById(req.params.id);

        if (!subTool) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy công cụ phụ',
            });
        }

        if (subTool.isDelete) {
            return res.status(404).json({
                success: false,
                message: 'Công cụ phụ đã bị xóa',
            });
        }

        if (!hasPermission(currentEmployee, ['view_all_tools'])) {
            if (hasPermission(currentEmployee, ['view_department_tools'])) {
                const subToolInMyDept = subTool.departmentId === currentEmployee.departmentId;
                const assignedToMyDept = subTool.assignedToInfo &&
                    subTool.assignedToInfo.departmentId === currentEmployee.departmentId;

                if (!subToolInMyDept && !assignedToMyDept) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn không có quyền xem loại thiết bị này',
                    });
                }
            } else if (hasPermission(currentEmployee, ['view_assigned_tools'])) {
                if (subTool.assignedTo !== currentEmployee.id) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn chỉ có quyền xem loại thiết bị được giao cho mình',
                    });
                }
            }
        }

        res.json({
            success: true,
            data: subTool,
        });
    } catch (error: any) {
        console.error('Get subtool by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message,
        });
    }
}

export const search = async (req: AuthRequest, res: Response) => {
    try {
        const { keyword } = req.params;
        const { parentToolId, subToolTypeId, status } = req.query;
        const currentEmployee = req.employee!;
        const level = currentEmployee.positionId?.level;

        const params: any = {
            keyword,
            level,
            currentEmployeeDepartmentId: currentEmployee.departmentId,
            currentEmployeeUnitId: currentEmployee.unitId,
        };

        if (parentToolId) params.parentToolId = parentToolId as string;
        if (subToolTypeId) params.subToolTypeId = subToolTypeId as string;
        if (status) params.status = status as string;

        const subTools = await SubToolModel.search(params);

        res.json({
            success: true,
            count: subTools.length,
            data: subTools,
        });
    } catch (error: any) {
        console.error('Search subtools error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message,
        });
    }
}

export const create = async (req: AuthRequest, res: Response) => {
    try {
        const {
            name,
            code,
            brand,
            parentToolId,
            subToolTypeId,
            quantity,
            serialNumber,
            specifications,
            purchaseDate,
            purchasePrice,
            warrantyUntil,
            status,
            condition,
            assignedTo,
            assignedDate,
            notes,
            unitOC,
            model,
            description,
            dateOfReceipt,
            images
        } = req.body;

        const currentEmployee = req.employee!;

        if (!hasPermission(currentEmployee, ['create_tool'])) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền tạo loại thiết bị',
            });
        }

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu tên thiết bị',
            });
        }

        if (!parentToolId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID thiết bị cha',
            });
        }

        if (!subToolTypeId) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu ID loại thiết bị',
            });
        }

        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (!guidRegex.test(parentToolId)) {
            return res.status(400).json({
                success: false,
                message: `ID thiết bị không hợp lệ: ${parentToolId}`,
            });
        }

        if (!guidRegex.test(subToolTypeId)) {
            return res.status(400).json({
                success: false,
                message: `ID loại thiết bị không hợp lệ: ${subToolTypeId}. Nhận được: ${typeof subToolTypeId}`,
            });
        }

        const parentTool = await ToolModel.findById(parentToolId);
        if (!parentTool) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhóm thiết bị',
            });
        }

        const subToolType = await CategorySubToolModel.findById(subToolTypeId);
        if (!subToolType) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục loại thiết bị',
            });
        }

        if (!hasPermission(currentEmployee, ['view_all_tools'])) {
            if (hasPermission(currentEmployee, ['view_department_tools'])) {
                if (currentEmployee.departmentId !== parentTool.departmentId) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn chỉ có quyền tạo loại thiết bị cho nhóm thiết bị trong phòng ban của mình',
                    });
                }
            }
        }

        let finalCode = code;
        if (!finalCode) {
            if (subToolType && subToolType.name) {
                const cleaned = removeVietnameseTones(subToolType.name)
                    .replace(/\s+/g, '')
                    .toUpperCase();
                const timestamp = Date.now().toString().slice(-4);
                finalCode = `${cleaned}_${timestamp}`;
            } else {
                finalCode = `SUBTOOL_${Date.now()}`;
            }
        }

        let finalAssignedTo = assignedTo;
        let finalAssignedDate = assignedDate;

        if (!finalAssignedTo && parentTool.assignedTo) {
            finalAssignedTo = parentTool.assignedTo;
            finalAssignedDate = parentTool.assignedDate || new Date();
        }

        if (finalAssignedTo) {
            const employee = await EmployeeModel.findById(finalAssignedTo);
            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy nhân viên được gán',
                });
            }
        }


        let processImages: string[] = [];
        if (images) {
            if (Array.isArray(images)) {
                processImages = images.filter(img => img && typeof img === 'string');
            } else if (typeof images === 'string') {
                try {
                    processImages = JSON.parse(images);
                } catch (error) {
                    processImages = [images];
                }
            }
        }

        const subToolData = {
            name,
            code: finalCode,
            brand,
            parentTool: parentToolId,
            subToolTypeId,
            unitId: parentTool.unitId,
            departmentId: parentTool.departmentId,
            quantity: quantity || 1,
            serialNumber,
            specifications,
            purchaseDate,
            purchasePrice,
            warrantyUntil,
            status: status || 'Đang sử dụng',
            condition: condition || 'Mới',
            assignedTo: finalAssignedTo,
            assignedDate: finalAssignedDate,
            notes,
            unitOC,
            model,
            description,
            dateOfReceipt,
            images: processImages.length > 0 ? processImages : undefined
        };

        const savedSubTool = await SubToolModel.create(subToolData);

        res.status(201).json({
            success: true,
            message: 'Tạo loại thiết bị của nhóm thiết bị thành công',
            data: savedSubTool,
        });
    } catch (error: any) {
        console.error('Create subtool error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message,
        });
    }
}

export const update = async (req: AuthRequest, res: Response) => {
    try {
        const currentEmployee = req.employee!;

        if (!hasPermission(currentEmployee, ['update_tool'])) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền sửa loại thiết bị',
            });
        }

        const subTool = await SubToolModel.findById(req.params.id);

        if (!subTool) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy loại thiết bị',
            });
        }

        if (subTool.isDelete) {
            return res.status(404).json({
                success: false,
                message: 'Loại thiết bị đã bị xóa',
            });
        }

        if (!hasPermission(currentEmployee, ['view_all_tools'])) {
            if (hasPermission(currentEmployee, ['view_department_tools'])) {
                if (currentEmployee.departmentId !== subTool.departmentId) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn chỉ có quyền sửa loại thiết bị trong phòng ban của mình',
                    });
                }
            }
        }

        if (req.body.code && req.body.code !== subTool.code) {
            return res.status(400).json({
                success: false,
                message: 'Không được phép thay đổi mã loại thiết bị',
            });
        }

        if (req.body.parentTool && req.body.parentTool !== subTool.parentTool) {
            return res.status(400).json({
                success: false,
                message: 'Không được phép thay đổi nhóm thiết bị',
            });
        }

        if (req.body.assignedTo && req.body.assignedTo !== (subTool.assignedTo || '')) {
            const employee = await EmployeeModel.findById(req.body.assignedTo);
            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy nhân viên được gán',
                });
            }
        }

        const updateData = { ...req.body };
        delete updateData.code;
        delete updateData.parentTool;

        if (req.body.images !== undefined) {
            const oldImages = subTool.images || [];
            let processImages: string[] = [];

            if (req.body.images === null) {
                for (const oldImg of oldImages) {
                    const filename = oldImg.split('/').pop();
                    if (filename) {
                        const filePath = path.join('uploads/subtools', filename);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }
                }
                updateData.images = [];
            } else if (Array.isArray(req.body.images)) {
                processImages = req.body.images.filter((img: any) => img && typeof img === 'string');

                const deletedImages = oldImages.filter(oldImg => !processImages.includes(oldImg));

                for (const deletedImg of deletedImages) {
                    const filename = deletedImg.split('/').pop();
                    if (filename) {
                        const filePath = path.join('uploads/subtools', filename);
                        if (fs.existsSync(filePath)) {
                            try {
                                fs.unlinkSync(filePath);
                                console.log(`Đã xóa file: ${filePath}`);
                            } catch (error) {
                                console.error(`Lỗi khi xóa file ${filePath}:`, error);
                            }
                        }
                    }
                }

                updateData.images = processImages;
            } else if (typeof req.body.images === 'string') {
                try {
                    processImages = JSON.parse(req.body.images);

                    const deletedImages = oldImages.filter(oldImg => !processImages.includes(oldImg));

                    for (const deletedImg of deletedImages) {
                        const filename = deletedImg.split('/').pop();
                        if (filename) {
                            const filePath = path.join('uploads/subtools', filename);
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                        }
                    }

                    updateData.images = processImages;
                } catch (error) {
                    processImages = [req.body.images];
                    updateData.images = processImages;
                }
            }
        }

        const updatedSubTool = await SubToolModel.update(req.params.id, updateData);

        res.json({
            success: true,
            message: 'Cập nhật loại thiết bị thành công',
            data: updatedSubTool,
        });
    } catch (error: any) {
        console.error('Update subtool error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message,
        });
    }
}

export const softdelete = async (req: AuthRequest, res: Response) => {
    try {
        const currentEmployee = req.employee!;

        if (!hasPermission(currentEmployee, ['delete_tool'])) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xóa loại thiết bị',
            });
        }

        const subTool = await SubToolModel.findById(req.params.id);

        if (!subTool) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy loại thiết bị',
            });
        }

        if (subTool.isDelete) {
            return res.status(404).json({
                success: false,
                message: 'Loại thiết bị đã bị xóa',
            });
        }

        if (!hasPermission(currentEmployee, ['view_all_tools'])) {
            if (hasPermission(currentEmployee, ['view_department_tools'])) {
                if (currentEmployee.departmentId !== subTool.departmentId) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn chỉ có quyền xóa loại thiết bị trong phòng ban của mình',
                    });
                }
            }
        }

        await SubToolModel.softDelete(req.params.id, currentEmployee.id);

        res.json({
            success: true,
            message: 'Xóa loại thiết bị thành công',
        });
    } catch (error: any) {
        console.error('Delete subtool error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message,
        });
    }
}

export const restore = async (req: AuthRequest, res: Response) => {
    try {
        const currentEmployee = req.employee!;

        if (!hasPermission(currentEmployee, ['restore_tool'])) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền khôi phục loại thiết bị',
            });
        }

        const subTool = await SubToolModel.findById(req.params.id, true);

        if (!subTool) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy loại thiết bị',
            });
        }

        if (!subTool.isDelete) {
            return res.status(400).json({
                success: false,
                message: 'Loại thiết bị này không bị xóa',
            });
        }

        if (!hasPermission(currentEmployee, ['view_all_tools'])) {
            if (hasPermission(currentEmployee, ['view_department_tools'])) {
                if (currentEmployee.departmentId !== subTool.departmentId) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn chỉ có quyền khôi phục loại thiết bị trong phòng ban của mình',
                    });
                }
            }
        }

        const restoreResult = await SubToolModel.restore(
            req.params.id,
            currentEmployee.id
        );

        if (!restoreResult.success) {
            return res.status(400).json({
                success: false,
                message: restoreResult.message
            });
        }

        const restoredSubTool = await SubToolModel.findById(req.params.id);

        res.json({
            success: true,
            message: restoreResult.message,
            syncedWithParent: restoreResult.syncedWithParent,
            data: restoredSubTool,
        });

    } catch (error: any) {
        console.error('Restore subtool error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message,
        });
    }
};

export const permanentDelete = async (req: AuthRequest, res: Response) => {
    try {
        const currentEmployee = req.employee!;

        if (!hasPermission(currentEmployee, ['permanent_delete_employee'])) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xóa vĩnh viễn loại thiết bị',
            });
        }

        const deleted = await SubToolModel.hardDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy loại thiết bị',
            });
        }

        res.json({
            success: true,
            message: 'Xóa vĩnh viễn loại thiết bị thành công',
        });
    } catch (error: any) {
        console.error('Permanent delete subtool error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message,
        });
    }
}

export const getByParentTool = async (req: AuthRequest, res: Response) => {
    try {
        const { parentId } = req.params;

        const parentTool = await ToolModel.findById(parentId);
        if (!parentTool) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhóm thiết bị',
            });
        }

        const subTools = await SubToolModel.findByParentTool(parentId);

        const subToolsWithComponentInfo = subTools.map((subTool) => ({
            ...subTool,
            hasAccessorys: subTool.subToolTypeInfo?.name === 'Thùng CPU',
            count: subTool.accessorysCount || 0,
        }));

        res.json({
            success: true,
            data: subToolsWithComponentInfo,
            count: subToolsWithComponentInfo.length,
            parentTool: {
                _id: parentTool.id,
                code: parentTool.code,
                name: parentTool.name,
            },
        });
    } catch (error: any) {
        console.error('Get sub-tools by parent error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message,
        });
    }
}

export const assign = async (req: AuthRequest, res: Response) => {
    const pool = getPool();
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const { subToolId, employeeId, condition, notes, targetToolId } = req.body;
        const currentEmployee = req.employee!;

        if (!hasPermission(currentEmployee, ['assign_tool'])) {
            await transaction.rollback();
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền bàn giao bộ phận',
            });
        }

        const subTool = await SubToolModel.findById(subToolId);
        if (!subTool) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy SubTool',
            });
        }

        const newEmployee = await EmployeeModel.findById(employeeId);
        if (!newEmployee) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên mới',
            });
        }

        if (!hasPermission(currentEmployee, ['view_all_tools'])) {
            if (hasPermission(currentEmployee, ['view_department_tools'])) {
                if (currentEmployee.departmentId !== subTool.departmentId) {
                    await transaction.rollback();
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn chỉ có quyền bàn giao bộ phận trong phòng ban của mình',
                    });
                }
            }
        }

        const oldParentToolId = subTool.parentTool;
        const oldParentTool = await ToolModel.findById(oldParentToolId);
        const oldEmployee = subTool.assignedToInfo;
        const oldEmployeeId = oldEmployee?._id || null;
        const oldCondition = subTool.condition;

        if (targetToolId && targetToolId !== subTool.parentTool) {
            const targetTool = await ToolModel.findById(targetToolId);

            if (!targetTool) {
                await transaction.rollback();
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy Tool đích',
                });
            }

            if (!targetTool.assignedTo || targetTool.assignedTo !== employeeId) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Thiết bị đích (${targetTool.name}) chưa được giao cho nhân viên ${newEmployee.name}`,
                });
            }

            const parentToolCategory = await ToolModel.findById(subTool.parentTool);
            if (parentToolCategory?.categoryId !== targetTool.categoryId) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'Bộ phận và thiết bị đích phải cùng danh mục',
                });
            }
        }

        if (!targetToolId) {
            const currentTool = await ToolModel.findById(subTool.parentTool);
            if (!currentTool?.assignedTo || currentTool.assignedTo !== employeeId) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Thiết bị hiện tại chưa được giao cho nhân viên ${newEmployee.name}`,
                });
            }
        }

        const updateData: any = {
            departmentId: newEmployee.departmentId,
            unitId: newEmployee.unitId,
            assignedTo: employeeId,
            assignedDate: new Date(),
            status: 'Đang sử dụng',
        };

        if (targetToolId) {
            updateData.parentTool = targetToolId;
        }

        if (condition) {
            updateData.condition = condition;
        }

        await SubToolModel.update(subToolId, updateData);

        let updatedAccessorysCount = 0;
        if (subTool.hasAccessorys) {
            const accessories = await AccessoryModel.findBySubTool(subToolId);

            for (const accessory of accessories) {
                await AccessoryModel.update(accessory.id!, {
                    parentTool: targetToolId || subTool.parentTool,
                    departmentId: newEmployee.departmentId,
                    unitId: newEmployee.unitId,
                    status: 'Đang sử dụng',
                    assignedTo: employeeId,
                });
                updatedAccessorysCount++;
            }

            console.log(`✅ Đã cập nhật ${updatedAccessorysCount} linh kiện trong bộ phận ${subTool.name}`);
        }

        let historyNote = '';
        if (targetToolId && targetToolId !== oldParentToolId) {
            historyNote = `Chuyển bộ phận ${subTool.name} từ thiết bị ${oldParentTool?.name} sang thiết bị mới và giao cho ${newEmployee.name}`;
            if (oldEmployee) {
                historyNote += ` (từ ${oldEmployee.name})`;
            }
            if (updatedAccessorysCount > 0) {
                historyNote += `. Đã chuyển ${updatedAccessorysCount} linh kiện theo`;
            }
        } else if (oldEmployee) {
            historyNote = `Chuyển giao bộ phận từ ${oldEmployee.name} sang ${newEmployee.name}`;
            if (updatedAccessorysCount > 0) {
                historyNote += `. ${updatedAccessorysCount} linh kiện cũng được chuyển theo`;
            }
        } else {
            historyNote = `Giao bộ phận cho ${newEmployee.name}`;
            if (updatedAccessorysCount > 0) {
                historyNote += ` (bao gồm ${updatedAccessorysCount} linh kiện)`;
            }
        }

        if (notes) {
            historyNote += `. ${notes}`;
        }

        await ToolHistoryModel.create({
            tool: targetToolId || subTool.parentTool,
            subTool: subToolId,
            employee: employeeId,
            previousEmployee: oldEmployeeId,
            action: targetToolId && targetToolId !== oldParentToolId ? 'Chuyển bộ phận' : (oldEmployee ? 'Chuyển giao' : 'Giao'),
            // conditionBefore: oldCondition || 'Mới',
            // conditionAfter: condition || subTool.condition || 'Mới',
            notes: historyNote,
            performedBy: req.user!.id,
        });

        await transaction.commit();

        const updatedSubTool = await SubToolModel.findById(subToolId);
        const updatedAccessories = await AccessoryModel.findBySubTool(subToolId);

        res.json({
            success: true,
            message: targetToolId && targetToolId !== oldParentToolId
                ? `Chuyển bộ phận và ${updatedAccessorysCount} linh kiện sang thiết bị mới và giao cho ${newEmployee.name} thành công`
                : `Giao bộ phận và ${updatedAccessorysCount} linh kiện cho ${newEmployee.name} thành công`,
            data: updatedSubTool,
            accessorysUpdated: updatedAccessorysCount,
            updatedAccessorys: updatedAccessories.slice(0, 10).map((c: any) => ({
                id: c.id,
                code: c.code,
                name: c.name,
                type: c.accessoryType,
            })),
            changes: {
                oldParentTool: oldParentTool?.name,
                newParentTool: updatedSubTool?.parentToolInfo?.name,
                oldEmployee: oldEmployee?.name || 'Chưa giao',
                newEmployee: newEmployee.name,
                transferred: targetToolId && targetToolId !== oldParentToolId,
            },
        });
    } catch (error: any) {
        await transaction.rollback();
        console.error('Assign sub-tool error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message,
        });
    }
}

export const revoke = async (req: AuthRequest, res: Response) => {
    try {
        const { subToolId, condition, notes } = req.body;
        const currentEmployee = req.employee!;

        if (!hasPermission(currentEmployee, ['revoke_tool'])) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thu hồi bộ phận',
            });
        }

        const subTool = await SubToolModel.findById(subToolId);

        if (!subTool) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bộ phận',
            });
        }

        if (!subTool.assignedTo) {
            return res.status(400).json({
                success: false,
                message: 'Bộ phận chưa được giao cho ai',
            });
        }

        if (!hasPermission(currentEmployee, ['view_all_tools'])) {
            if (hasPermission(currentEmployee, ['view_department_tools'])) {
                if (currentEmployee.departmentId !== subTool.departmentId) {
                    return res.status(403).json({
                        success: false,
                        message: 'Bạn chỉ có quyền thu hồi bộ phận trong phòng ban của mình',
                    });
                }
            }
        }

        const employeeId = subTool.assignedTo;
        const employeeName = subTool.assignedToInfo?.name || '';

        const updateData: any = {
            assignedTo: null,
            assignedDate: null,
            status: 'Dự phòng',
        };

        if (condition) {
            updateData.condition = condition;
        }

        await SubToolModel.update(subToolId, updateData);

        await ToolHistoryModel.create({
            tool: subTool.parentTool,
            subTool: subToolId,
            employee: employeeId,
            action: 'Thu hồi',
            condition: condition || subTool.condition,
            notes: notes || `Thu hồi từ ${employeeName}`,
            performedBy: req.user!.id,
        });

        const updatedSubTool = await SubToolModel.findById(subToolId);

        res.json({
            success: true,
            message: 'Thu hồi SubTool thành công',
            data: updatedSubTool,
        });
    } catch (error: any) {
        console.error('Revoke sub-tool error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message,
        });
    }
}