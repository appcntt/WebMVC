import api from './api';

export const departmentService = {
  getAll: async (params = {}) => {
    const res = await api.get('/departments', { params });
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/departments/${id}`);
    return res.data;
  },

  add: async (data: {
    name: string;
    code: string;
    unitId: string;
    description?: string;
  }) => {
    const res = await api.post('/departments', data);
    return res.data;
  },

  update: async (id: string, data: {
    name?: string;
    code?: string;
    unitId?: string;
    description?: string;
  }) => {
    const res = await api.put(`/departments/${id}`, data);
    return res.data;
  },
  remove: async (id: string) => {
    const res = await api.delete(`/departments/${id}`);
    return res.data;
  },

  search: async (query: string, params = {}) => {
    const res = await api.get('/departments', {
      params: { ...params, search: query }
    });
    return res.data;
  }
};

export default departmentService;