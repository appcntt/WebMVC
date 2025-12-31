/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Users, Building2, TrendingUp, DollarSign, LucideIcon, AlertCircle } from 'lucide-react';
import { employeeService } from '../services/employee.service';
import { useAuth } from '../contexts/authContext';
import toast from 'react-hot-toast';

interface Employee {
  id: string;
  name: string;
  email?: string;
  isActive?: boolean;
  status?: string;
  departmentId?: {
    id: string;
    name: string;
    code: string;
  } | string;
}

interface EmployeesResponse {
  success: boolean;
  data?: Employee[];
  count?: number;
  total?: number;
  message?: string;
}

interface DepartmentStat {
  name: string;
  count: number;
}

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  departments: DepartmentStat[];
}

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: number;
  color: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    activeEmployees: 0,
    departments: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [hasPermission, setHasPermission] = useState<boolean>(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async (): Promise<void> => {
    try {
      setLoading(true);
      setHasPermission(true);
      
      const employeesData = await employeeService.getAll() as EmployeesResponse;
      
      if (!employeesData.success) {
        console.warn('Failed to load employees:', employeesData.message);
        setHasPermission(false);
        return;
      }
      
      const employees: Employee[] = Array.isArray(employeesData.data) 
        ? employeesData.data 
        : [];
      
      const activeEmps = employees.filter(emp => 
        emp.status === 'active' || emp.isActive !== false
      );

      const deptCount: Record<string, number> = {};
      activeEmps.forEach((emp) => {
        let deptName = 'Chưa phân phòng';
        
        if (emp.departmentId) {
          if (typeof emp.departmentId === 'object' && emp.departmentId.name) {
            deptName = emp.departmentId.name;
          } else if (typeof emp.departmentId === 'string') {
            deptName = emp.departmentId;
          }
        }
        
        deptCount[deptName] = (deptCount[deptName] || 0) + 1;
      });
      
      const departmentStats: DepartmentStat[] = Object.entries(deptCount)
        .map(([name, count]) => ({
          name,
          count
        }))
        .sort((a, b) => b.count - a.count);

      setStats({
        totalEmployees: employees.length,
        activeEmployees: activeEmps.length,
        departments: departmentStats
      });
    } catch (error: any) {
      console.error('Load dashboard error:', error);
      
      if (error.response?.status === 403) {
        setHasPermission(false);
        console.warn('User does not have permission to view employees');
      } else {
        toast.error('Không thể tải dữ liệu dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, color }) => (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
        </div>
        <div className={`${color} p-4 rounded-full`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </div>
  );

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

  if (!hasPermission) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Chào mừng trở lại, {user?.name}!
          </p>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                Quyền truy cập bị giới hạn
              </h3>
              <p className="text-yellow-700">
                Bạn không có quyền xem thống kê nhân viên. Vui lòng liên hệ quản trị viên để được cấp quyền.
              </p>
              <div className="mt-4">
                <p className="text-sm text-yellow-600 font-medium">
                  Thông tin tài khoản:
                </p>
                <ul className="mt-2 text-sm text-yellow-700 space-y-1">
                  <li>• Tên: {user?.name}</li>
                  <li>• Chức vụ: {user?.position?.name || 'Chưa có'}</li>
                  <li>• Phòng ban: {user?.department?.name || 'Chưa có'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Thao tác nhanh
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => window.location.href = '/auth/change-password'}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
            >
              <Users className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Đổi mật khẩu</p>
            </button>
            
            <button 
              onClick={() => window.location.href = '/profile'}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <Building2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Thông tin cá nhân</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Chào mừng trở lại, {user?.name}!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          title="Tổng nhân viên"
          value={stats.totalEmployees}
          color="bg-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          title="Đang làm việc"
          value={stats.activeEmployees}
          color="bg-green-500"
        />
        <StatCard
          icon={Building2}
          title="Phòng ban"
          value={stats.departments.length}
          color="bg-orange-500"
        />
        <StatCard
          icon={DollarSign}
          title="Nghỉ việc"
          value={stats.totalEmployees - stats.activeEmployees}
          color="bg-red-500"
        />
      </div>

      {stats.departments.length > 0 ? (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Thống kê theo phòng ban
          </h2>
          <div className="space-y-3">
            {stats.departments.map((dept, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {dept.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {dept.count} nhân viên 
                      {stats.activeEmployees > 0 && 
                        ` (${Math.round((dept.count / stats.activeEmployees) * 100)}%)`
                      }
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{
                        width: stats.activeEmployees > 0 
                          ? `${(dept.count / stats.activeEmployees) * 100}%`
                          : '0%'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Chưa có dữ liệu phòng ban</p>
        </div>
      )}

      {user?.position?.level && user.position.level >= 2 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Thao tác nhanh
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => window.location.href = '/employees'}
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
            >
              <Users className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-700">Quản lý nhân viên</p>
            </button>
            
            {user?.position?.permissions?.includes('manage_units') && (
              <>
                <button 
                  onClick={() => window.location.href = '/units'}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <Building2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Quản lý đơn vị</p>
                </button>
                
                <button 
                  onClick={() => window.location.href = '/history'}
                  className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
                >
                  <TrendingUp className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Lịch sử hoạt động</p>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}