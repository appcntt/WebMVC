/* eslint-disable @typescript-eslint/no-explicit-any */
import api from './api';

export const accessoryService = {
  getAll: async (params = {}) => {
    const response = await api.get('/accessory', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/accessory/${id}`);
    return response.data;
  },

  getBySubTool: async (subToolId: string) => {
    const response = await api.get(`/accessory/subtool/${subToolId}`);
    return response.data;
  },

  search: async (keyword: string, params = {}) => {
    const response = await api.get(`/accessory/search/${keyword}`, { params });
    return response.data;
  },

  create: async (data: any) => {

    const images = Array.isArray(data.images) ? data.images : [];

    const response = await api.post('/accessory', {
      name: data.name,
      code: data.code,
      subToolId: data.subToolId,
      serialNumber: data.serialNumber,
      model: data.model,
      parentToolId: data.parentToolId,
      accessoryTypeId: data.accessoryTypeId,
      assignedTo: data.assignedTo,
      assignedDate: data.assignedDate,
      quantity: data.quantity || 1,
      brand: data.brand,
      unitOC: data.unitOC || 'Cái',
      specifications: data.specifications || {},
      slot: data.slot,
      purchaseDate: data.purchaseDate,
      purchasePrice: data.purchasePrice,
      warrantyUntil: data.warrantyEndDate,
      status: data.status || 'Đang sử dụng',
      condition: data.condition || 'Tốt',
      notes: data.notes,
      description: data.description,
      dateOfReceipt: data.dateOfReceipt,
      images: images,
    });
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await api.put(`/accessory/${id}`, {
      name: data.name,
      brand: data.brand,
      model: data.model,
      serialNumber: data.serialNumber,
      condition: data.condition,
      purchasePrice: data.purchasePrice,
      purchaseDate: data.purchaseDate,
      warrantyUntil: data.warrantyUntil,
      notes: data.notes,
      description: data.description,
      quantity: data.quantity,
      specifications: data.specifications,
      slot: data.slot,
      unitOC: data.unitOC,
      status: data.status,
      images: data.images,
    });
    return response.data;
  },

  softDeleted: async (id: string) => {
    const response = await api.delete(`/accessory/${id}`);
    return response.data;
  },

  restore: async (id: string) => {
    const response = await api.patch(`/accessory/${id}/restore`);
    return response.data;
  },

  permanentDelete: async (id: string) => {
    const response = await api.delete(`/accessory/permanent/${id}`);
    return response.data;
  },

  assign: async (data: {
    accessoryId: string;
    employeeId: string;
    targetSubToolId?: string;
    condition?: string;
    notes?: string;
  }) => {
    console.log('🌐 API assign called with:', data);

    if (!data.accessoryId || !data.employeeId) {
      console.error('❌ Missing required fields:', data);
      throw new Error('accessoryId và employeeId là bắt buộc');
    }

    const response = await api.post('/accessory/assign', data);
    return response.data;
  },

  revoke: async (data: {
    accessoryId: string;
    condition?: string;
    notes?: string;
  }) => {
    const response = await api.post('/accessory/revoke', data);
    return response.data;
  },

  getFullConfiguration: async (toolId: string) => {
    const response = await api.get(`/accessory/full-config/${toolId}`);
    return response.data;
  },

  uploadImages: async (files: File[]) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('images', file);
    });

    const response = await api.post('/accessory/upload-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteImage: async (filename: string) => {
    const response = await api.delete(`/accessory/images/${filename}`);
    return response.data;
  },
};

export default accessoryService;