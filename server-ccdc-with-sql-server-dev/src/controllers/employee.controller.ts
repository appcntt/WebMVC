import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import EmployeeModel from '../models/employee.model';

interface AuthRequest extends Request {
    employee?: any;
}

const hasPermission = (employee: any, requiredPermissions: string[]): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    const userPermissions = employee.positionInfo?.permissions || employee.positionId?.permissions || [];
    return requiredPermissions.some(permission => userPermissions.includes(permission));
};

let adminPositionIdsCache: string[] | null = null;
let cacheTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000;

const getAdminPositionIds = async (): Promise<string[]> => {
    const now = Date.now();
    if (adminPositionIdsCache && cacheTime && (now - cacheTime < CACHE_DURATION)) {
        return adminPositionIdsCache;
    }
    adminPositionIdsCache = await EmployeeModel.getAdminPositionIds();
    cacheTime = now;
    return adminPositionIdsCache;
};

export const getAll = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { unitId, departmentId, positionId, status, page = '1', limit = '50' } = req.query;
        const currentEmployee = req.employee;

        const canViewAll = hasPermission(currentEmployee, ['view_all_employees']);
        const canViewEmployees = hasPermission(currentEmployee, ['view_employees']);
        const canViewDept = hasPermission(currentEmployee, ['view_department_employees']);

        if (!canViewAll && !canViewEmployees && !canViewDept) {
            res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xem danh sách nhân viên',
            });
            return;
        }

        const params: any = {
            page: parseInt(page as string),
            limit: parseInt(limit as string)
        };

        if (!canViewAll) {
            const adminPositionIds = await getAdminPositionIds();
            if (adminPositionIds.length > 0) {
                params.excludePositions = adminPositionIds;
            }

            if (canViewDept && !canViewEmployees) {
                params.departmentId = currentEmployee.departmentId;
            }
        }

        if (unitId) {
            if (!canViewAll && currentEmployee.unitId !== unitId) {
                res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xem đơn vị khác'
                });
                return;
            }
            params.unitId = unitId as string;
        }

        if (departmentId) {
            if (!canViewAll && !canViewEmployees && currentEmployee.departmentId !== departmentId) {
                res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xem phòng ban khác'
                });
                return;
            }
            params.departmentId = departmentId as string;
        }

        if (positionId) {
            if (!canViewAll) {
                const adminPositionIds = await getAdminPositionIds();
                if (adminPositionIds.includes(positionId as string)) {
                    res.status(403).json({
                        success: false,
                        message: 'Bạn không có quyền xem chức vụ này'
                    });
                    return;
                }
            }
            params.positionId = positionId as string;
        }

        if (status) {
            params.status = status as string;
        }

        const { employees, total } = await EmployeeModel.findAll(params);

        res.json({
            success: true,
            count: employees.length,
            total,
            totalPages: Math.ceil(total / params.limit),
            currentPage: params.page,
            data: employees
        });
    } catch (error: any) {
        console.error('Get all employees error:', error);
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

        if (!hasPermission(currentEmployee, ['view_all_employees', 'view_department_employees'])) {
            res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xem thông tin nhân viên'
            });
            return;
        }

        const targetEmployee = await EmployeeModel.findById(req.params.id);

        if (!targetEmployee) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
            return;
        }

        if (!hasPermission(currentEmployee, ['view_all_employees'])) {
            if (hasPermission(currentEmployee, ['view_department_employees'])) {
                if (currentEmployee.departmentId !== targetEmployee.departmentId) {
                    res.status(403).json({
                        success: false,
                        message: 'Bạn không có quyền xem nhân viên phòng ban khác'
                    });
                    return;
                }
            }
        }

        res.json({
            success: true,
            data: targetEmployee
        });
    } catch (error: any) {
        console.error('Get employee by ID error:', error);
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
        const { departmentId } = req.query;
        const currentEmployee = req.employee;

        if (!hasPermission(currentEmployee, ['view_all_employees', 'view_department_employees'])) {
            res.status(403).json({
                success: false,
                message: 'Bạn không có quyền tìm kiếm nhân viên'
            });
            return;
        }

        const params: any = {};

        if (!hasPermission(currentEmployee, ['view_all_employees'])) {
            if (hasPermission(currentEmployee, ['view_department_employees'])) {
                params.departmentId = currentEmployee.departmentId;
            }
        }

        if (departmentId) {
            if (!hasPermission(currentEmployee, ['view_all_employees'])) {
                if (currentEmployee.departmentId !== departmentId) {
                    res.status(403).json({
                        success: false,
                        message: 'Bạn không có quyền tìm kiếm trong phòng ban khác'
                    });
                    return;
                }
            }
            params.departmentId = departmentId as string;
        }

        const employees = await EmployeeModel.search(keyword, params);

        res.json({
            success: true,
            count: employees.length,
            data: employees
        });
    } catch (error: any) {
        console.error('Search employees error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

export const create = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { code, name, username, email, password, unitId, departmentId, positionId, phone, address, joinDate, dateOfBirth } = req.body;
        const currentEmployee = req.employee;

        if (!code || !username || !name || !email || !password || !unitId || !departmentId || !positionId || !address || !joinDate || !dateOfBirth) {
            res.status(400).json({
                success: false,
                message: 'Thiếu trường bắt buộc'
            });
            return;
        }

        if (!hasPermission(currentEmployee, ['create_employee'])) {
            res.status(403).json({
                success: false,
                message: 'Bạn không có quyền tạo nhân viên'
            });
            return;
        }

        if (!hasPermission(currentEmployee, ['view_all_employees'])) {
            if (currentEmployee.departmentId !== departmentId) {
                res.status(403).json({
                    success: false,
                    message: 'Bạn chỉ có quyền tạo nhân viên trong phòng ban của mình'
                });
                return;
            }
        }

        const existingEmployee = await EmployeeModel.findOne({ username, email, code });

        if (existingEmployee) {
            if (existingEmployee.username === username) {
                res.status(400).json({
                    success: false,
                    message: 'Username đã được sử dụng'
                });
                return;
            }
            if (existingEmployee.email === email) {
                res.status(400).json({
                    success: false,
                    message: 'Email đã được sử dụng'
                });
                return;
            }
            if (existingEmployee.code === code) {
                res.status(400).json({
                    success: false,
                    message: 'Mã nhân viên đã được sử dụng'
                });
                return;
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newEmployee = await EmployeeModel.create({
            code,
            name,
            username,
            email,
            password: hashedPassword,
            phone,
            unitId,
            departmentId,
            positionId,
            address,
            joinDate: new Date(joinDate),
            dateOfBirth: new Date(dateOfBirth)
        });

        res.status(201).json({
            success: true,
            message: 'Tạo nhân viên thành công',
            data: newEmployee
        });
    } catch (error: any) {
        console.error('Create employee error:', error);

        if (error.number === 2627 || error.number === 2601) {
            res.status(400).json({
                success: false,
                message: 'Username, email hoặc mã nhân viên đã tồn tại'
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

        if (!hasPermission(currentEmployee, ['update_employee'])) {
            res.status(403).json({
                success: false,
                message: 'Bạn không có quyền sửa nhân viên'
            });
            return;
        }

        const targetEmployee = await EmployeeModel.findById(req.params.id);

        if (!targetEmployee) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
            return;
        }

        if (!hasPermission(currentEmployee, ['view_all_employees'])) {
            if (currentEmployee.departmentId !== targetEmployee.departmentId) {
                res.status(403).json({
                    success: false,
                    message: 'Bạn chỉ có quyền sửa nhân viên trong phòng ban của mình'
                });
                return;
            }
        }

        if (req.body.email && req.body.email !== targetEmployee.email) {
            res.status(400).json({
                success: false,
                message: 'Không được phép thay đổi email'
            });
            return;
        }

        if (req.body.username && req.body.username !== targetEmployee.username) {
            const existingUser = await EmployeeModel.findOne({ username: req.body.username });
            if (existingUser && existingUser.id !== req.params.id) {
                res.status(400).json({
                    success: false,
                    message: 'Tên đăng nhập đã tồn tại'
                });
                return;
            }
        }

        if (req.body.departmentId && !hasPermission(currentEmployee, ['view_all_employees'])) {
            if (req.body.departmentId !== currentEmployee.departmentId) {
                res.status(403).json({
                    success: false,
                    message: 'Bạn không thể chuyển nhân viên sang phòng ban khác'
                });
                return;
            }
        }
        const allowedFields = [
            'code', 'name', 'username', 'phone', 'unitId', 'departmentId',
            'positionId', 'address', 'joinDate', 'dateOfBirth', 'status'
        ];

        const updateData: any = {};
        allowedFields.forEach(field => {
            const value = req.body[field];
            if (value !== undefined && value !== null && value !== '') {
                updateData[field] = value;
            }
        });

        const updatedEmployee = await EmployeeModel.update(req.params.id, updateData);

        res.json({
            success: true,
            message: 'Cập nhật nhân viên thành công',
            data: updatedEmployee
        });
    } catch (error: any) {
        console.error('Update employee error:', error);
        if (error.number === 2627 || error.number === 2601) {
            res.status(400).json({
                success: false,
                message: 'Tên đăng nhập hoặc email đã tồn tại'
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
export const deleteSoft = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const currentEmployee = req.employee;
        if (!hasPermission(currentEmployee, ['delete_soft_employee'])) {
            res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xóa nhân viên'
            });
            return;
        }

        const targetEmployee = await EmployeeModel.findById(req.params.id);

        if (!targetEmployee) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
            return;
        }

        if (!hasPermission(currentEmployee, ['view_all_employees'])) {
            if (currentEmployee.departmentId !== targetEmployee.departmentId) {
                res.status(403).json({
                    success: false,
                    message: 'Bạn chỉ có quyền xóa nhân viên trong phòng ban của mình'
                });
                return;
            }
        }

        if (currentEmployee.id === targetEmployee.id) {
            res.status(403).json({
                success: false,
                message: 'Bạn không thể xóa chính mình'
            });
            return;
        }

        // Check tools count (assuming you have ToolModel)
        // const toolsCount = await ToolModel.countByEmployee(targetEmployee.id as string, false);
        // if (toolsCount > 0) {
        //   res.status(400).json({
        //     success: false,
        //     message: `Không thể xoá nhân viên này vì đang còn giữ ${toolsCount} công cụ. Vui lòng thu hồi hoặc bàn giao cho người mới trước khi xoá`
        //   });
        //   return;
        // }

        await EmployeeModel.update(req.params.id, { status: 'inactive' });

        res.json({
            success: true,
            message: 'Xóa nhân viên thành công'
        });
    } catch (error: any) {
        console.error('Delete employee error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};
export const getEmployeeInactive = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { unitId, departmentId, positionId, page = '1', limit = '50' } = req.query;
        const currentEmployee = req.employee;
        if (!hasPermission(currentEmployee, ['view_all_employees', 'view_department_employees'])) {
            res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xem danh sách nhân viên đã nghỉ'
            });
            return;
        }

        const params: any = {
            status: 'inactive',
            page: parseInt(page as string),
            limit: parseInt(limit as string)
        };

        if (!hasPermission(currentEmployee, ['view_all_employees'])) {
            if (hasPermission(currentEmployee, ['view_department_employees'])) {
                params.departmentId = currentEmployee.departmentId;
            }
        }

        if (unitId) {
            if (!hasPermission(currentEmployee, ['view_all_employees']) && currentEmployee.unitId !== unitId) {
                res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xem đơn vị khác'
                });
                return;
            }
            params.unitId = unitId as string;
        }

        if (departmentId) {
            if (!hasPermission(currentEmployee, ['view_all_employees']) && currentEmployee.departmentId !== departmentId) {
                res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xem phòng ban khác'
                });
                return;
            }
            params.departmentId = departmentId as string;
        }

        if (positionId) {
            params.positionId = positionId as string;
        }

        const { employees, total } = await EmployeeModel.findAll(params);

        res.json({
            success: true,
            count: employees.length,
            total,
            totalPages: Math.ceil(total / params.limit),
            currentPage: params.page,
            data: employees
        });
    } catch (error: any) {
        console.error('Get inactive employees error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};
export const permanentDeleteEmployee = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const currentEmployee = req.employee;
        if (!hasPermission(currentEmployee, ['permanent_delete_employee'])) {
            res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xóa vĩnh viễn nhân viên'
            });
            return;
        }

        const targetEmployee = await EmployeeModel.findById(req.params.id);

        if (!targetEmployee) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
            return;
        }

        // Check tools count (assuming you have ToolModel)
        // const toolsCount = await ToolModel.countByEmployee(targetEmployee.id as string);
        // if (toolsCount > 0) {
        //   res.status(400).json({
        //     success: false,
        //     message: `Không thể xóa vĩnh viễn nhân viên này vì có ${toolsCount} công cụ liên quan. Vui lòng xử lý tất cả công cụ trước.`
        //   });
        //   return;
        // }

        await EmployeeModel.delete(req.params.id);

        res.json({
            success: true,
            message: 'Xóa vĩnh viễn nhân viên thành công'
        });
    } catch (error: any) {
        console.error('Permanent delete employee error:', error);
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
        if (!hasPermission(currentEmployee, ['restore_employee'])) {
            res.status(403).json({
                success: false,
                message: 'Bạn không có quyền khôi phục nhân viên'
            });
            return;
        }

        const targetEmployee = await EmployeeModel.findById(req.params.id);

        if (!targetEmployee) {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy nhân viên'
            });
            return;
        }

        if (targetEmployee.status !== 'inactive') {
            res.status(400).json({
                success: false,
                message: 'Nhân viên này chưa bị kết thúc hợp đồng',
            });
            return;
        }

        if (!hasPermission(currentEmployee, ['view_all_employees'])) {
            if (currentEmployee.departmentId !== targetEmployee.departmentId) {
                res.status(403).json({
                    success: false,
                    message: 'Bạn chỉ có quyền khôi phục nhân viên trong phòng ban của mình'
                });
                return;
            }
        }

        const updatedEmployee = await EmployeeModel.update(req.params.id, { status: 'active' });

        res.json({
            success: true,
            message: 'Khôi phục nhân viên thành công',
            data: updatedEmployee
        });
    } catch (error: any) {
        console.error('Restore employee error:', error);
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
    search,
    create,
    update,
    deleteSoft,
    getEmployeeInactive,
    permanentDeleteEmployee,
    restore
};