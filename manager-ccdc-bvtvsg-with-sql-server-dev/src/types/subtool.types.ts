// SubTool Type Definitions

export interface ISubToolSpecifications {
  screenSize?: string;
  resolution?: string;
  refreshRate?: string;
  panelType?: string;
  connectionType?: string;
  dpi?: string;
  switchType?: string;
  [key: string]: string | undefined;
}

// Form-specific specifications (all required as strings for form state)
export interface ISubToolFormSpecifications {
  screenSize: string;
  resolution: string;
  refreshRate: string;
  panelType: string;
  connectionType: string;
  dpi: string;
  switchType: string;
}

export interface ISubToolType {
  id?: string;
  _id?: string;
  name: string;
  description?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IEmployee {
  id: string;
  name: string;
  email?: string;
  code?: string;
  departmentId?: string;
  positionInfo?: {
    id: string;
    name: string;
  };
}

export interface ITool {
  id: string;
  name: string;
  code?: string;
  category?: string | { id: string; name: string };
  categoryId?: string;
  categoryInfo?: {
    id : string,
    name : string,
  };
  assignedTo?: string;
  assignedDate?: Date | string;
}

export interface ISubTool {
  id: string;
  code?: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  unitOC?: string;
  parentTool: string;
  subToolType?: string | ISubToolType;
  subToolTypeId?: string;
  subToolTypeInfo?: ISubToolType;
  categoryId?: string;
  unitId?: string;
  departmentId?: string;
  quantity?: number;
  specifications?: ISubToolSpecifications;
  purchaseDate?: Date | string;
  purchasePrice?: number;
  dateOfReceipt?: Date | string;
  warrantyUntil?: Date | string;
  status?: string;
  condition?: string;
  assignedTo?: string | IEmployee;
  assignedToInfo?: IEmployee;
  assignedDate?: Date | string;
  notes?: string;
  description?: string;
  hasAccessorys?: boolean;
  accessorysCount?: number;
  isDelete?: boolean;
  deletedAt?: Date | string;
  deletedBy?: string;
  restoredAt?: Date | string;
  restoredBy?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ISubToolFormData {
  name: string;
  code: string;
  subToolType: string;
  assignedTo: string;
  brand: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: string;
  warrantyUntil: string;
  status: string;
  condition: string;
  notes: string;
  quantity: number;
  unitOC: string;
  specifications: ISubToolFormSpecifications;
}

export interface ITransferFormData {
  subToolId: string;
  employeeId: string;
  targetToolId: string;
  condition: string;
  notes: string;
}

export interface IAssignResponse {
  success: boolean;
  message: string;
  data?: ISubTool;
  accessorysUpdated?: number;
  updatedAccessorys?: Array<{
    id: string;
    code: string;
    name: string;
    type: string;
  }>;
  changes?: {
    oldParentTool?: string;
    newParentTool?: string;
    oldEmployee?: string;
    newEmployee?: string;
    transferred?: boolean;
  };
}

export interface ISubToolServiceParams {
  parentToolId?: string;
  subToolTypeId?: string;
  status?: string;
  condition?: string;
  assignedTo?: string;
  departmentId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ISubToolListResponse {
  success: boolean;
  count: number;
  total: number;
  totalPages: number;
  currentPage: number;
  data: ISubTool[];
}

export interface ISubToolResponse {
  success: boolean;
  message?: string;
  data: ISubTool | ISubTool[];
  count?: number;
  parentTool?: {
    _id: string;
    code: string;
    name: string;
  };
}

// Re-export for compatibility
export type ICategorySubTool = ISubToolType;