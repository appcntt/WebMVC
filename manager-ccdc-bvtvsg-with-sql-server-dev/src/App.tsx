import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import { AuthProvider } from './contexts/authContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Unit from './pages/Unit';
import Positions from './pages/Position';
import Departments from './pages/Department';
import Category from './pages/danhmuc/Category';
import CategorySubTool from './pages/danhmuc/Category-SubTool';
import History from './pages/History';
// import DeletedToolsPage from './pages/DeletedPage';
import CategoryAccessory from './pages/danhmuc/Categoy-accessory';
import Employees from './pages/Employee';
import Tools from './pages/Tools';
import SubTool from './pages/SubTool';
import Accessory from './pages/Accessory';
import DeletedToolsPage from './pages/Deleted';
import ChangePassword from './pages/auth/ChangePassword';
// import EmployeeInactive from './pages/EmployeeInactive';
// import ChangePassword from './pages/ChangePassword';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />

        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees"
            element={
              <ProtectedRoute 
                requiredPermissions={[
                  'view_all_employees',
                  'view_employees', 
                  'view_department_employees'
                ]}
              >
                <Layout>
                  <Employees />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* <Route
            path="/employees-unisactive"
            element={
              <ProtectedRoute 
                requiredPermissions={[
                  'restore_employee',
                  'permanent_delete_employee',
                  'view_all_employees'
                ]}
              >
                <Layout>
                  <EmployeeInactive />
                </Layout>
              </ProtectedRoute>
            }
          /> */}

          <Route
            path="/units"
            element={
              <ProtectedRoute requiredPermissions={['manage_units']}>
                <Layout>
                  <Unit />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/departments"
            element={
              <ProtectedRoute 
                requiredPermissions={[
                  'manage_departments',
                  'create_departments',
                  'update_departments'
                ]}
              >
                <Layout>
                  <Departments />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/positions"
            element={
              <ProtectedRoute 
                requiredPermissions={[
                  'manage_positions',
                  'create_position',
                  'update_position'
                ]}
              >
                <Layout>
                  <Positions />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/categories"
            element={
              <ProtectedRoute 
                requiredPermissions={[
                  'view_all_tools',
                  'view_department_tools',
                  'view_assigned_tools'
                ]}
              >
                <Layout>
                  <Category />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/category-sub-tool"
            element={
              <ProtectedRoute 
                requiredPermissions={[
                  'view_all_tools',
                  'view_department_tools',
                  'view_assigned_tools'
                ]}
              >
                <Layout>
                  <CategorySubTool />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/category-accessory"
            element={
              <ProtectedRoute 
                requiredPermissions={[
                  'view_all_tools',
                  'view_department_tools',
                  'create_tool'
                ]}
              >
                <Layout>
                  <CategoryAccessory />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tools"
            element={
              <ProtectedRoute 
                requiredPermissions={[
                  'view_all_tools',
                  'view_department_tools',
                  'view_assigned_tools'
                ]}
              >
                <Layout>
                  <Tools />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tool-history"
            element={
              <ProtectedRoute 
                requiredPermissions={[
                  'view_all_history',
                  'view_all_tools',
                  'view_department_tools'
                ]}
              >
                <Layout>
                  <History />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/deleted"
            element={
              <ProtectedRoute 
                requiredPermissions={[
                  'restore_tool',
                  'permanent_delete_tool',
                  'restore_employee',
                  'manage_system'
                ]}
              >
                <Layout>
                  <DeletedToolsPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route 
            path="/tools/:toolId/subtools" 
            element={
              <ProtectedRoute 
                requiredPermissions={[
                  'view_all_tools',
                  'view_department_tools',
                  'view_assigned_tools'
                ]}
              >
                <Layout>
                  <SubTool />
                </Layout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/subtool/:subToolId/:toolId/accessories" 
            element={
              <ProtectedRoute 
                requiredPermissions={[
                  'view_all_tools',
                  'view_department_tools',
                  'create_tool'
                ]}
              >
                <Layout>
                  <Accessory />
                </Layout>
              </ProtectedRoute>
            } 
          />

          <Route 
            path="/auth/change-password" 
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            } 
          />

          {/* 404 Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;