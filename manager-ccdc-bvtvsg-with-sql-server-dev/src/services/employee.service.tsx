/* eslint-disable @typescript-eslint/no-explicit-any */
import api from './api';

interface IEmployeeParams {
  unitId?: string;
  departmentId?: string;
  positionId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface IEmployeeData {
  code: string;
  name: string;
  username: string;
  email: string;
  password?: string;
  phone?: string;
  unitId: string;
  departmentId: string;
  positionId: string;
  address?: string;
  joinDate: string;
  dateOfBirth: string;
}

export const employeeService = {
  // Lấy tất cả nhân viên
  getAll: async (params: IEmployeeParams = {}) => {
    const response = await api.get('/employees', { params });
    return response.data;
  },

  // Lấy nhân viên đã nghỉ
  getEmployeeInactive: async (params: IEmployeeParams = {}) => {
    const response = await api.get('/employees/inactive', { params });
    return response.data;
  },

  // Export Excel
  exportExcel: () => api.get('/employees/export/excel', { responseType: 'blob' }),
  
  // Import Excel
  importExcel: (formData: FormData) => api.post('/employees/import/excel', formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }),

  // Lấy chi tiết nhân viên theo ID
  getById: async (id: string) => {
    const response = await api.get(`/employees/${id}`);
    return response.data;
  },

  // Tìm kiếm nhân viên
  search: async (keyword: string, params: { departmentId?: string } = {}) => {
    const response = await api.get(`/employees/search/${keyword}`, { params });
    return response.data;
  },

  // Tạo nhân viên mới
  create: async (data: IEmployeeData) => {
    const payload = {
      code: data.code,
      name: data.name,
      username: data.username,
      email: data.email,
      password: data.password,
      phone: data.phone || '',
      unitId: data.unitId,
      departmentId: data.departmentId,
      positionId: data.positionId,
      address: data.address || '',
      joinDate: data.joinDate,
      dateOfBirth: data.dateOfBirth,
    };

    const response = await api.post('/employees', payload);
    return response.data;
  },

  // Cập nhật nhân viên
  update: async (id: string, data: Partial<IEmployeeData>) => {
    const payload: any = {
      code: data.code,
      name: data.name,
      username: data.username,
      phone: data.phone || '',
      unitId: data.unitId,
      departmentId: data.departmentId,
      positionId: data.positionId,
      address: data.address || '',
      joinDate: data.joinDate,
      dateOfBirth: data.dateOfBirth,
    };

    // Chỉ thêm password nếu có
    if (data.password && data.password.trim()) {
      payload.password = data.password;
    }

    const response = await api.put(`/employees/${id}`, payload);
    return response.data;
  },

  // Xóa mềm (soft delete)
  delete: async (id: string) => {
    const response = await api.delete(`/employees/${id}/soft`);
    return response.data;
  },

  // Xóa vĩnh viễn
  permanentDelete: async (id: string) => {
    const response = await api.delete(`/employees/${id}/permanent`);
    return response.data;
  },

  // Khôi phục nhân viên
  restore: async (id: string) => {
    const response = await api.put(`/employees/${id}/restore`);
    return response.data;
  }
};

export default employeeService;