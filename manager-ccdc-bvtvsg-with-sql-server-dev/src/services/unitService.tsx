import api from './api';
import { AxiosResponse } from 'axios';

export enum UnitType {
  HEAD_OFFICE = 'head_office',
  BRANCH = 'branch'
}

export interface IUnit {
  id?: string;
  _id?: string; // Support both id formats
  name: string;
  code: string;
  type: string;
  phone?: string;
  address?: string;
  description?: string;
  email?: string;
  isActive?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface UnitResponse {
  success: boolean;
  message?: string;
  data?: IUnit;
}

export interface UnitsResponse {
  success: boolean;
  message?: string;
  data?: IUnit[];
}

export interface CreateUnitData {
  name: string;
  code: string;
  type: string;
  phone?: string;
  address?: string;
  description?: string;
  email?: string;
  isActive?: boolean;
}

export interface UpdateUnitData {
  name?: string;
  type?: string;
  phone?: string;
  address?: string;
  description?: string;
  email?: string;
  isActive?: boolean;
}

export interface GetAllParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  isActive?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export const unitService = {
  getAll: async (params: GetAllParams = {}): Promise<UnitsResponse> => {
    const response: AxiosResponse<UnitsResponse> = await api.get('/units', { params });
    return response.data;
  },

  getById: async (id: string): Promise<UnitResponse> => {
    const response: AxiosResponse<UnitResponse> = await api.get(`/units/${id}`);
    return response.data;
  },

  create: async (unitData: CreateUnitData): Promise<UnitResponse> => {
    const response: AxiosResponse<UnitResponse> = await api.post('/units', unitData);
    return response.data;
  },

  update: async (id: string, unitData: UpdateUnitData): Promise<UnitResponse> => {
    const response: AxiosResponse<UnitResponse> = await api.put(`/units/${id}`, unitData);
    return response.data;
  },

  delete: async (id: string): Promise<UnitResponse> => {
    const response: AxiosResponse<UnitResponse> = await api.delete(`/units/${id}`);
    return response.data;
  },
};

export default unitService;