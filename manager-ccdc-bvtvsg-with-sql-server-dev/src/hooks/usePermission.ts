import { useAuth } from "../contexts/authContext";

export interface UsePermissionReturn {
  hasPermission: (requiredPermissions?: string[]) => boolean;
  hasAllPermissions: (requiredPermissions?: string[]) => boolean;
}

export const usePermission = (): UsePermissionReturn => {
  const { user } = useAuth();
  const hasPermission = (requiredPermissions?: string[]): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    
    const userPermissions = user?.position?.permissions || [];
    
    return requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );
  };
  const hasAllPermissions = (requiredPermissions?: string[]): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    
    const userPermissions = user?.position?.permissions || [];
    
    return requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );
  };

  return { 
    hasPermission, 
    hasAllPermissions 
  };
};

export default usePermission;