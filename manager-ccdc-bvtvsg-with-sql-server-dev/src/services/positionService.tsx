import api from './api';
import { AxiosResponse } from 'axios';

export interface IPosition {
  id?: string;
  _id?: string;
  name: string;
  code: string;
  permissions?: string[];
  isActive?: boolean;
  departmentId?: string;
  departmentInfo?: {
    _id?: string;
    id?: string;
    name: string;
  };
  order?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface IPositionWithRelations extends IPosition {
  departmentInfo?: {
    id: string;
    name: string;
  };
  isSuperAdmin?: boolean;
  isManager?: boolean;
}

export interface PositionResponse {
  success: boolean;
  message?: string;
  data?: IPosition;
}

export interface PositionsResponse {
  success: boolean;
  message?: string;
  data?: IPosition[];
  pagination?: {
    total: number;
    totalPages: number;
    currentPage: number;
    limit: number;
  };
  count?: number;
  total?: number;
  totalPages?: number;
  limit?: number;
}

export interface CreatePositionData {
  name: string;
  code: string;
  department: string;
  order?: number;
  isActive?: boolean;
  permissions?: string[];
}

export interface UpdatePositionData {
  name?: string;
  code?: string;
  department?: string;
  order?: number;
  isActive?: boolean;
  permissions?: string[];
}

export interface GetPositionsParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  department?: string;
  isActive?: boolean;
}

export const positionService = {
  getAll: async (params: GetPositionsParams = {}): Promise<PositionsResponse> => {
    const response: AxiosResponse<PositionsResponse> = await api.get('/positions', { params });
    return response.data;
  },

  getById: async (id: string): Promise<PositionResponse> => {
    const response: AxiosResponse<PositionResponse> = await api.get(`/positions/${id}`);
    return response.data;
  },

  create: async (data: CreatePositionData): Promise<PositionResponse> => {
    const payload = {
      name: data.name,
      code: data.code,
      order: data.order,
      department: data.department,
      isActive: data.isActive !== undefined ? data.isActive : true,
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
    };
    
    const response: AxiosResponse<PositionResponse> = await api.post('/positions', payload);
    return response.data;
  },

  update: async (id: string, data: UpdatePositionData): Promise<PositionResponse> => {
    const payload = {
      name: data.name,
      code: data.code,
      order: data.order,
      department: data.department,
      isActive: data.isActive,
      permissions: Array.isArray(data.permissions) ? data.permissions : [],
    };
    
    const response: AxiosResponse<PositionResponse> = await api.put(`/positions/${id}`, payload);
    return response.data;
  },

  delete: async (id: string): Promise<PositionResponse> => {
    const response: AxiosResponse<PositionResponse> = await api.delete(`/positions/${id}`);
    return response.data;
  }
};

export default positionService;