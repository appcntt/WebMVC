import { Response, NextFunction } from 'express';
import sql from 'mssql';
import { getPool } from '../config/database';

interface AuthRequest extends Request {
  employee?: any;
  targetEmployee?: any;
  params?: any;
}

const getEmployeeById = async (employeeId: string): Promise<any | null> => {
  const pool = getPool();
  
  const query = `
    SELECT 
      e.id,
      e.name,
      e.code,
      e.email,
      e.positionId,
      e.unitId,
      e.departmentId,
      
      -- Position info
      p.id as position_id,
      p.name as position_name,
      p.permissions as position_permissions,
      
      -- Unit info
      u.id as unit_id,
      u.name as unit_name,
      
      -- Department info
      d.id as department_id,
      d.name as department_name
      
    FROM Employees e
    LEFT JOIN Positions p ON e.positionId = p.id
    LEFT JOIN Units u ON e.unitId = u.id
    LEFT JOIN Departments d ON e.departmentId = d.id
    WHERE e.id = @employeeId
  `;

  const result = await pool.request()
    .input('employeeId', sql.UniqueIdentifier, employeeId)
    .query(query);

  if (result.recordset.length === 0) return null;

  const row = result.recordset[0];

  const employee: any = {
    id: row.id,
    _id: row.id,
    name: row.name,
    code: row.code,
    email: row.email,
    positionId: row.positionId,
    unitId: row.unitId,
    departmentId: row.departmentId
  };

  if (row.position_id) {
    const positionData = {
      id: row.position_id,
      _id: row.position_id,
      name: row.position_name,
      permissions: row.position_permissions ? JSON.parse(row.position_permissions) : []
    };
    
    employee.positionId = positionData;
    employee.positionInfo = positionData;
  }

  if (row.unit_id) {
    employee.unitId = {
      id: row.unit_id,
      _id: row.unit_id,
      name: row.unit_name
    };
  }

  if (row.department_id) {
    employee.departmentId = {
      id: row.department_id,
      _id: row.department_id,
      name: row.department_name
    };
  }

  return employee;
};

const getEmployeePermissions = (employee: any): string[] => {
  if (!employee) return [];
  
  // Try multiple paths
  if (employee.positionInfo?.permissions) {
    return employee.positionInfo.permissions;
  }
  if (employee.positionId?.permissions) {
    return employee.positionId.permissions;
  }
  if (employee.position?.permissions) {
    return employee.position.permissions;
  }
  
  return [];
};

export const checkPermission = (permissions: string | string[] = []) => {
  return async (req: any, res: Response, next: NextFunction): Promise<void> => {
    try {
      const current = req.employee;

      if (!current) {
        console.log('❌ No employee in request');
        res.status(401).json({ 
          success: false,
          message: "Chưa đăng nhập" 
        });
        return;
      }

      const userPermissions = getEmployeePermissions(current);
      
      if (userPermissions.length === 0) {
        console.log('❌ No permissions found for employee');
        res.status(403).json({ 
          success: false,
          message: "Không có thông tin phân quyền" 
        });
        return;
      }

      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

      const hasPermission = requiredPermissions.some(p =>
        userPermissions.includes(p)
      );

      if (!hasPermission) {
        console.log('❌ Permission denied');
        res.status(403).json({ 
          success: false,
          message: `Bạn không có quyền: ${requiredPermissions.join(', ')}` 
        });
        return;
      }


      if (req.params?.employeeId) {
        const target = await getEmployeeById(req.params.employeeId);

        if (!target) {
          res.status(404).json({ 
            success: false,
            message: "Không tìm thấy nhân viên" 
          });
          return;
        }

        const isSuperAdmin = userPermissions.includes('manage_system');
        
        if (isSuperAdmin) {
          req.targetEmployee = target;
          next();
          return;
        }

        const hasViewAll = userPermissions.includes('view_all_employees');
        const hasViewDept = userPermissions.includes('view_department_employees');

        if (hasViewAll) {
          req.targetEmployee = target;
          next();
          return;
        }

        if (hasViewDept) {
          const currentDeptId = current.departmentId?.id || current.departmentId?._id || current.departmentId;
          const targetDeptId = target.departmentId?.id || target.departmentId?._id || target.departmentId;

          if (currentDeptId && targetDeptId && currentDeptId === targetDeptId) {
            req.targetEmployee = target;
            next();
            return;
          }
          
          res.status(403).json({
            success: false,
            message: "Bạn chỉ có thể truy cập nhân viên trong phòng ban của mình"
          });
          return;
        }

        const currentId = current.id || current._id;
        const targetId = target.id || target._id;

        if (currentId !== targetId) {
          res.status(403).json({
            success: false,
            message: "Bạn không có quyền truy cập nhân viên này"
          });
          return;
        }

        req.targetEmployee = target;
      }

      next();
    } catch (error: any) {
      console.error('❌ Check permission error:', error);
      res.status(500).json({ 
        success: false,
        message: "Lỗi kiểm tra quyền",
        error: error.message 
      });
    }
  };
};

export const hasPermission = (employee: any, permission: string): boolean => {
  const userPermissions = getEmployeePermissions(employee);
  return userPermissions.includes(permission);
};

export const hasAnyPermission = (employee: any, permissions: string[]): boolean => {
  const userPermissions = getEmployeePermissions(employee);
  return permissions.some(p => userPermissions.includes(p));
};

export const hasAllPermissions = (employee: any, permissions: string[]): boolean => {
  const userPermissions = getEmployeePermissions(employee);
  return permissions.every(p => userPermissions.includes(p));
};

export default { 
  checkPermission,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions
};