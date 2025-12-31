/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import authService from '../services/auth.service';

interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  phone?: string;
  position: {
    id: string;
    name: string;
    code: string;
    level: number;
    permissions: string[];
  } | null;
  unit: {
    id: string;
    name: string;
    code: string;
  } | null;
  department: {
    id: string;
    name: string;
    code: string;
  } | null;
  status: string;
}

interface LoginResponse {
  success: boolean;
  accessToken: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  updateUser: (userData: User) => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  accessToken: string | null;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [accessToken, setAccessToken] = useState<string | null>(authService.getAccessToken());

  // useEffect(() => {
  //   const storedUser = authService.getStoredUser();
  //   const storedToken = authService.getAccessToken();

  //   if (storedUser && storedToken) {
  //     setUser(storedUser);
  //     setAccessToken(storedToken);
  //   }
  //   setLoading(false);
  // }, []);


  useEffect(() => {
    const initAuth = async () => {
      const storedToken = authService.getAccessToken();

      if (storedToken) {
        try {
          // ✅ Fetch user info mới nhất từ server
          const currentUser = await authService.getCurrentUser();

          if (currentUser) {
            setUser(currentUser);
            setAccessToken(storedToken);
            // Update localStorage với data mới
            localStorage.setItem('user', JSON.stringify(currentUser));
          } else {
            // Token invalid -> logout
            authService.logout();
            setUser(null);
            setAccessToken(null);
          }
        } catch (error) {
          console.error('Failed to fetch current user:', error);

          // ✅ Fallback to stored user nếu API call fail
          const storedUser = authService.getStoredUser();
          if (storedUser) {
            setUser(storedUser);
            setAccessToken(storedToken);
          } else {
            // Không có stored user -> logout
            authService.logout();
            setUser(null);
            setAccessToken(null);
          }
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  // const login = async (username: string, password: string): Promise<LoginResponse> => {
  //   try {
  //     const response = await authService.login(username, password);

  //     const { accessToken: newAccessToken, user: userData } = response;

  //     if (!newAccessToken || !userData) {
  //       throw new Error('Thông tin đăng nhập không hợp lệ');
  //     }

  //     setUser(userData);
  //     setAccessToken(newAccessToken);

  //     return {
  //       success: true,
  //       accessToken: newAccessToken,
  //       user: userData
  //     };
  //   } catch (error: unknown) {
  //     console.error('AuthContext login error:', error);

  //     const errorMessage = (error as any).response?.data?.message
  //       || (error as Error).message
  //       || 'Sai tên đăng nhập hoặc mật khẩu';

  //     throw new Error(errorMessage);
  //   }
  // };

  const login = async (username: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await authService.login(username, password);

      const { accessToken: newAccessToken, user: userData } = response;

      if (!newAccessToken || !userData) {
        throw new Error('Thông tin đăng nhập không hợp lệ');
      }

      setUser(userData);
      setAccessToken(newAccessToken);

      return {
        success: true,
        accessToken: newAccessToken,
        user: userData
      };
    } catch (error: unknown) {
      console.error('AuthContext login error:', error);

      const errorMessage = (error as any).response?.data?.message
        || (error as Error).message
        || 'Sai tên đăng nhập hoặc mật khẩu';

      throw new Error(errorMessage);
    }
  };

  const logout = (): void => {
    authService.logout();
    setUser(null);
    setAccessToken(null);
  };

  const updateUser = (userData: User): void => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const currentUser = await authService.getCurrentUser();

      if (currentUser) {
        setUser(currentUser);
        localStorage.setItem('user', JSON.stringify(currentUser));
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    updateUser,
    refreshUser,
    isAuthenticated: !!user && !!accessToken,
    accessToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};