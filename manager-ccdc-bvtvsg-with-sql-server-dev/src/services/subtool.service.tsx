/* eslint-disable @typescript-eslint/no-explicit-any */
import { ISubToolFormData, ISubToolResponse } from "@/types/subtool.types";
import api from "./api";

export const subToolService = {
  getAll: async (params = {}) => {
    const res = await api.get('/sub-tool', { params });
    return res.data;
  },

  getById: async (id: string) => {
    const res = await api.get(`/sub-tool/${id}`);
    return res.data;
  },

  search: async (keyword: string, params = {}) => {
    const res = await api.get(`/sub-tool/search/${keyword}`, { params });
    return res.data;
  },

  getByParentTool: async (parentId: string) => {
    const response = await api.get(`/sub-tool/parent/${parentId}`);
    return response.data;
  },

  create: async (data: ISubToolFormData): Promise<ISubToolResponse> => {
    console.log('Service received data:', data);
    const res = await api.post('/sub-tool', data);
    return res.data;
  },

  update: async (id: string, data: any) => {
    const res = await api.put(`/sub-tool/${id}`, data);
    return res.data;
  },

  softDelete: async (id: string) => {
    const response = await api.delete(`/sub-tool/${id}`);
    return response.data;
  },

  restore: async (id: string) => {
    const response = await api.patch(`/sub-tool/${id}/restore`);
    return response.data;
  },

  permanentDelete: async (id: string) => {
    const response = await api.delete(`/sub-tool/${id}/permanent`);
    return response.data;
  },

  getDeleted: async (params = {}) => {
    const res = await api.get('/sub-tool/deleted', { params });
    return res.data;
  },

  assign: async (data: any) => {
    const response = await api.post('/sub-tool/assign', data);
    return response.data;
  },

  revoke: async (data: any) => {
    const response = await api.post('/sub-tool/revoke', data);
    return response.data;
  }
};

export default subToolService;