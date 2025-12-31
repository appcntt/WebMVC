import api from "./api";

export interface ICategory {
  id?: string;
  _id?: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICategoryResponse {
  success: boolean;
  message?: string;
  data?: ICategory | ICategory[];
}

export const categoryService = {
  getAll: async (): Promise<ICategory[]> => {
    const res = await api.get('/category');
    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (res.data?.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  },

  getById: async (id: string): Promise<ICategoryResponse> => {
    const res = await api.get(`/category/${id}`);
    return res.data;
  },

  create: async (data: { name: string }): Promise<ICategoryResponse> => {
    const res = await api.post('/category', data);
    return res.data;
  },

  update: async (id: string, data: { name: string }): Promise<ICategoryResponse> => {
    const res = await api.put(`/category/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<ICategoryResponse> => {
    const res = await api.delete(`/category/${id}`);
    return res.data;
  }
};

export default categoryService;