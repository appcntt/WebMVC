import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/authContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: string[];
  requireAll?: boolean;
}

export default function ProtectedRoute({ 
  children, 
  requiredPermissions = [],
  requireAll = false
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!requiredPermissions || requiredPermissions.length === 0) {
    return <>{children}</>;
  }

  const userPermissions = user?.position?.permissions || [];
 
  let hasAccess = false;
  
  if (requireAll) {
    hasAccess = requiredPermissions.every(perm => userPermissions.includes(perm));
  } else {
    hasAccess = requiredPermissions.some(perm => userPermissions.includes(perm));
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center bg-red-50 p-8 rounded-lg border border-red-200 max-w-md">
          <div className="mb-4">
            <svg 
              className="w-16 h-16 text-red-500 mx-auto" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </div>
          <p className="text-xl font-semibold text-red-800 mb-2">
            Không có quyền truy cập
          </p>
          <p className="text-red-600 mb-4">
            Bạn không có quyền truy cập trang này
          </p>
          <div className="text-sm text-gray-600 bg-white p-3 rounded border border-red-200">
            <p className="font-medium mb-1">Quyền cần thiết:</p>
            <ul className="list-disc list-inside text-left">
              {requiredPermissions.map(perm => (
                <li key={perm} className="text-red-700">
                  {formatPermissionName(perm)}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function formatPermissionName(permission: string): string {
  const permissionNames: Record<string, string> = {
    'view_all_employees': 'Xem tất cả nhân viên',
    'view_department_employees': 'Xem nhân viên phòng ban',
    'create_employee': 'Tạo nhân viên',
    'update_employee': 'Cập nhật nhân viên',
    'delete_soft_employee': 'Xóa nhân viên (soft)',
    'restore_employee': 'Khôi phục nhân viên',
    'permanent_delete_employee': 'Xóa vĩnh viễn nhân viên',
    
    'view_all_tools': 'Xem tất cả công cụ',
    'view_department_tools': 'Xem công cụ phòng ban',
    'view_assigned_tools': 'Xem công cụ được giao',
    'create_tool': 'Tạo công cụ',
    'update_tool': 'Cập nhật công cụ',
    'delete_tool': 'Xóa công cụ (soft)',
    'restore_tool': 'Khôi phục công cụ',
    'permanent_delete_tool': 'Xóa vĩnh viễn công cụ',
    'assign_tool': 'Giao công cụ',
    'revoke_tool': 'Thu hồi công cụ',
    'view_all_history': 'Xem tất cả lịch sử công cụ',
    
    'create_position': 'Tạo chức vụ',
    'update_position': 'Cập nhật chức vụ',
    'delete_position': 'Xóa chức vụ',
    
    'create_department': 'Tạo phòng ban',
    'update_department': 'Cập nhật phòng ban',
    'delete_department': 'Xóa phòng ban',
    
    'manage_units': 'Quản lý đơn vị',
    'manage_departments': 'Quản lý phòng ban',
    'manage_positions': 'Quản lý chức vụ',
    
    'export_data': 'Xuất dữ liệu',
    'manage_system': 'Quản trị hệ thống',
  };
  
  return permissionNames[permission] || permission;
}