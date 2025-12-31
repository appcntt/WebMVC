import api from "./api";

export interface ICategoryAccessory {
  id?: string;
  _id?: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICategoryAccessoryResponse {
  success: boolean;
  message?: string;
  data?: ICategoryAccessory | ICategoryAccessory[];
}

export const categoryAccessoryService = {
  getAll: async (): Promise<ICategoryAccessory[]> => {
    const res = await api.get('/cateAccessory');
    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (res.data?.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  },

  getById: async (id: string): Promise<ICategoryAccessoryResponse> => {
    const res = await api.get(`/cateAccessory/${id}`);
    return res.data;
  },

  create: async (data: { name: string }): Promise<ICategoryAccessoryResponse> => {
    const res = await api.post('/cateAccessory', data);
    return res.data;
  },

  update: async (id: string, data: { name: string }): Promise<ICategoryAccessoryResponse> => {
    const res = await api.put(`/cateAccessory/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<ICategoryAccessoryResponse> => {
    const res = await api.delete(`/cateAccessory/${id}`);
    return res.data;
  }
};

export default categoryAccessoryService;