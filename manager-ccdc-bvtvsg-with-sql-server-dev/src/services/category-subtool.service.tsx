import api from "./api";

export interface ICategorySubTool {
  id?: string;
  _id?: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICategorySubToolResponse {
  success: boolean;
  message?: string;
  data?: ICategorySubTool | ICategorySubTool[];
}

export interface ICategorySubToolListResponse {
  success: boolean;
  message?: string;
  data: ICategorySubTool[];
}

export const categorySubToolService = {
  // Option 1: Return the full response object (RECOMMENDED)
  getAll: async (): Promise<ICategorySubToolListResponse> => {
    const res = await api.get('/category-sub-tool');
    
    // Handle different response formats
    if (res.data?.success !== undefined) {
      // Already in correct format
      return res.data;
    }
    
    // If response is just an array
    if (Array.isArray(res.data)) {
      return {
        success: true,
        data: res.data
      };
    }
    
    // If response has nested data property
    if (res.data?.data && Array.isArray(res.data.data)) {
      return {
        success: true,
        data: res.data.data
      };
    }
    
    // Fallback
    return {
      success: false,
      data: []
    };
  },

  // Alternative: Keep the array return but rename the method
  getAllArray: async (): Promise<ICategorySubTool[]> => {
    const res = await api.get('/category-sub-tool');
    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (res.data?.data && Array.isArray(res.data.data)) {
      return res.data.data;
    }
    return [];
  },

  getById: async (id: string): Promise<ICategorySubToolResponse> => {
    const res = await api.get(`/category-sub-tool/${id}`);
    return res.data;
  },

  create: async (data: { name: string }): Promise<ICategorySubToolResponse> => {
    const res = await api.post('/category-sub-tool', data);
    return res.data;
  },

  update: async (id: string, data: { name: string }): Promise<ICategorySubToolResponse> => {
    const res = await api.put(`/category-sub-tool/${id}`, data);
    return res.data;
  },

  delete: async (id: string): Promise<ICategorySubToolResponse> => {
    const res = await api.delete(`/category-sub-tool/${id}`);
    return res.data;
  }
};

export default categorySubToolService;