import api from "./api";
import { AxiosResponse } from "axios";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";

interface LoginResponse {
  success: boolean;
  message?: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

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

interface CurrentUserResponse {
  success: boolean;
  data: User;
}

interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

interface GetAllParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: string | number | undefined;
}

interface GetAllResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
  page?: number;
  totalPages?: number;
}

export const authService = {
  login: async (username: string, password: string): Promise<{ accessToken: string; user: User }> => {
    const res: AxiosResponse<LoginResponse> = await api.post("/auth/login", { username, password });

    if (res.data.success) {
      const { accessToken, refreshToken, user } = res.data.data;
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return { accessToken, user };
    }
    throw new Error(res.data.message || "Login failed");
  },

  logout: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getCurrentUser: async (): Promise<User | null> => {
    const response: AxiosResponse<CurrentUserResponse> = await api.get("/auth/me");
    if (response.data.success) {
      return response.data.data;
    }
    return null;
  },

  changePassword: async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<ChangePasswordResponse> => {
    const response: AxiosResponse<ChangePasswordResponse> = await api.post("/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return response.data;
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getStoredUser: (): User | null => {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  getAll: async <T = unknown>(params?: GetAllParams): Promise<GetAllResponse<T>> => {
    const res: AxiosResponse<GetAllResponse<T>> = await api.get("/auth", { params });
    return res.data;
  },

  getById: (id: string): Promise<AxiosResponse> => {
    return api.get(`/auth/${id}`);
  },

  getAccessToken: (): string | null => {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken: (): string | null => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setAccessToken: (token: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
};

export default authService;