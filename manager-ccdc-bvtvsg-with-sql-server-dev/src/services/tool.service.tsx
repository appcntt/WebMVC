/* eslint-disable @typescript-eslint/no-explicit-any */
import api from './api';

export const toolService = {
  getAll: async (params = {}) => {
    const response = await api.get('/tools', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/tools/${id}`);
    return response.data;
  },

  search: async (keyword: string, params = {}) => {
    const response = await api.get(`/tools/search/${keyword}`, { params });
    return response.data;
  },

  getByEmployee: async (employeeId: string) => {
    const response = await api.get(`/tools/employee/${employeeId}`);
    return response.data;
  },

  create: async (toolData: any) => {
    const response = await api.post('/tools', toolData);
    return response.data;
  },

  update: async (id: string, toolData: any) => {
    const response = await api.put(`/tools/${id}`, toolData);
    return response.data;
  },

  softDelete: async (id: string) => {
    const response = await api.delete(`/tools/${id}`);
    return response.data;
  },

  restore: async (id: string, type: 'Tool' | 'SubTool' | 'Accessory' = 'Tool') => {
    const response = await api.patch(`/tools/${id}/restore`, { type });
    return response.data;
  },

  permanentDelete: async (id: string, type: 'Tool' | 'SubTool' | 'Accessory' = 'Tool') => {
    const response = await api.delete(`/tools/${id}/permanent`, { 
      data: { type } 
    });
    return response.data;
  },

  getDeleted: async (params = {}) => {
    const response = await api.get('/tools/deleted', { params });
    return response.data;
  },

  assign: async (assignData: {
    toolId: string;
    employeeId: string;
    condition?: string;
    notes?: string;
    description?: string;
  }) => {
    const response = await api.post('/tools/assign', assignData);
    return response.data;
  },

  revoke: async (revokeData: {
    toolId: string;
    condition?: string;
    notes?: string;
  }) => {
    const response = await api.post('/tools/revoke', revokeData);
    return response.data;
  },

  getStatistics: async (params = {}) => {
    const response = await api.get('/tools/statistics', { params });
    return response.data;
  }
};

export default toolService;