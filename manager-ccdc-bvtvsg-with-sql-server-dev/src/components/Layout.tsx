import { useState, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext";
import {
  LayoutDashboard,
  Users,
  Building2,
  LogOut,
  Menu,
  X,
  Shield,
  Package,
  Settings,
  Archive,
  Package2,
  Lock,
  LucideIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";

interface MenuItem {
  path?: string;
  icon: LucideIcon;
  label: string;
  requiredPermissions: string[];
  children?: MenuItem[];
}

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [openParent, setOpenParent] = useState<string | null>(null);

  const toggleParent = (label: string): void => {
    setOpenParent(openParent === label ? null : label);
  };

  const handleLogout = (): void => {
    logout();
    toast.success("Đăng xuất thành công");
    navigate("/login");
  };

  const hasPermission = (requiredPermissions: string[]): boolean => {
    if (!requiredPermissions || requiredPermissions.length === 0) return true;
    const userPermissions = user?.position?.permissions || [];
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  };

  const menuItems: MenuItem[] = [
    {
      path: "/",
      icon: LayoutDashboard,
      label: "Dashboard",
      requiredPermissions: []
    },
    {
      label: "Tổ chức",
      icon: Building2,
      requiredPermissions: ["manage_units","manage_positions"],
      children: [
        {
          path: "/units",
          label: "Đơn vị",
          icon: Building2,
          requiredPermissions: ["manage_units"]
        },
        {
          path: "/departments",
          label: "Phòng ban",
          icon: Building2,
          requiredPermissions: ["manage_departments"]
        },
        {
          path: "/positions",
          label: "Chức vụ",
          icon: Settings,
          requiredPermissions: ["manage_positions"]
        },
      ],
    },
    {
      label: "Quản lý nhân viên",
      icon: Settings,
      requiredPermissions: ["view_all_employees", "view_department_employees"],
      children: [
        {
          path: "/employees",
          label: "Nhân viên",
          icon: Users,
          requiredPermissions: ["view_all_employees", "view_department_employees"]
        },
        {
          path: "/employees-unisactive",
          label: "Nhân viên đã nghỉ",
          icon: Users,
          requiredPermissions: ["delete_employees"]
        },
      ],
    },
    {
      label: "Danh Mục",
      icon: Building2,
      requiredPermissions: ["view_all_tools", "view_department_tools"],
      children: [
        {
          path: "/categories",
          label: "Nhóm thiết bị",
          icon: Settings,
          requiredPermissions: ["view_all_tools", "view_department_tools"]
        },
        {
          path: "/category-sub-tool",
          label: "Loại thiết bị",
          icon: Building2,
          requiredPermissions: ["view_all_tools", "view_department_tools"]
        },
        {
          path: "/category-accessory",
          label: "Linh phụ kiện",
          icon: Building2,
          requiredPermissions: ["view_all_tools", "view_department_tools"]
        },
      ],
    },
    {
      label: "Tài sản - CCDC",
      icon: Package,
      requiredPermissions: ["view_all_tools", "view_department_tools", "view_assigned_tools"],
      children: [
        {
          path: "/tools",
          label: "Công cụ",
          icon: Package,
          requiredPermissions: ["view_all_tools", "view_department_tools", "view_assigned_tools"]
        },
        {
          path: "/tool-history",
          label: "Lịch sử",
          icon: Package2,
          requiredPermissions: ["view_all_history"]
        },
        {
          path: "/deleted",
          label: "Sản phẩm đã xóa",
          icon: Archive,
          requiredPermissions: ["delete_tool"]
        },
      ],
    },
  ];

  const renderMenu = (isMobile: boolean = false): React.ReactElement => (
    <nav className="p-4 space-y-3">
      {menuItems.map((item) => {
        if (!hasPermission(item.requiredPermissions)) return null;
        if (item.path) {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => isMobile && setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-sm transition-all font-semibold
                ${isActive ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-800"}
              `}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        }

        const filteredChildren = item.children?.filter(child =>
          hasPermission(child.requiredPermissions)
        ) || [];

        if (filteredChildren.length === 0) return null;

        const ParentIcon = item.icon;
        const isOpen = openParent === item.label;

        return (
          <div key={item.label}>
            <button
              onClick={() => toggleParent(item.label)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl shadow-sm transition-all font-semibold
                ${isOpen ? "bg-indigo-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-800"}
              `}
            >
              <div className="flex items-center gap-3">
                <ParentIcon className="w-5 h-5" />
                {item.label}
              </div>
              <motion.div
                animate={{ rotate: isOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                ▶
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="ml-6 mt-2 space-y-1 overflow-hidden"
                >
                  {filteredChildren.map((child) => {
                    if (!child.path) return null;
                    
                    const ChildIcon = child.icon;
                    const isActive = location.pathname === child.path;

                    return (
                      <Link
                        key={child.path}
                        to={child.path}
                        onClick={() => isMobile && setSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition
                          ${isActive ? "bg-indigo-600 text-white shadow" : "text-gray-700 bg-gray-50 hover:bg-gray-200"}
                        `}
                      >
                        <ChildIcon className="w-4 h-4" />
                        {child.label}
                      </Link>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-md fixed top-0 left-0 right-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {sidebarOpen ? <X /> : <Menu />}
              </button>
              <Link to="/" className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2 rounded-lg">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-gray-800">
                    Quản Lý Tài Sản
                  </h1>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-800">
                  {user?.name}
                </p>
                <p className="text-xs text-indigo-600 font-medium">
                  {user?.position?.name || "N/A"}
                </p>
              </div>

              <Link
                to="/auth/change-password"
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Đổi mật khẩu"
              >
                <Lock className="w-5 h-5" />
                <span className="hidden md:inline text-sm">Đổi mật khẩu</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden md:inline text-sm">Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="pt-16 flex">
        <aside className="hidden lg:block w-64 bg-white shadow-lg fixed left-0 top-16 bottom-0 overflow-y-auto">
          {renderMenu(false)}
          <div className="p-4 m-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-xs font-medium text-indigo-600 mb-2">Thông tin</p>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-600">Họ tên</p>
                <p className="text-sm font-semibold text-gray-800">
                  {user?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Chức vụ</p>
                <p className="text-sm font-semibold text-indigo-600">
                  {user?.position?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Đơn vị</p>
                <p className="text-sm font-semibold text-gray-800">
                  {user?.unit?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Phòng ban</p>
                <p className="text-sm font-semibold text-gray-800">
                  {user?.department?.name || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-[9997] bg-black/50" onClick={() => setSidebarOpen(false)}>
            <aside className="absolute left-0 top-16 w-72 h-[calc(100%-64px)] bg-white shadow-xl overflow-y-auto rounded-r-2xl animate-slideIn"
              onClick={(e) => e.stopPropagation()}
            >
              {renderMenu(true)}
              <div className="p-4 m-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <p className="text-xs font-medium text-indigo-600 mb-2">Thông tin</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-600">Họ tên</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {user?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Chức vụ</p>
                    <p className="text-sm font-semibold text-indigo-600">
                      {user?.position?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Đơn vị</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {user?.unit?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Phòng ban</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {user?.department?.name || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        <main className="flex-1 lg:ml-64">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}