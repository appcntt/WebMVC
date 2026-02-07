/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Save, Package, UserPlus, UserMinus, Search, ChevronDown, Eye, ChevronLeft, ChevronsLeft , ChevronRight, ChevronsRight} from 'lucide-react';
import { toolService } from '../services/tool.service';
import { employeeService } from '../services/employee.service';
import { unitService } from '../services/unitService';
import { departmentService } from '../services/department.service';
import { categoryService } from '../services/category.service';
import { useAuth } from '../contexts/authContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { usePermission } from "../hooks/usePermission";
import { createPortal } from 'react-dom';
import { getImageUrl } from '../utils/imageHelper';

interface ITool {
    id: string;
    name: string;
    code?: string;
    assignedTo?: string;
    assignedDate?: Date;
    unitId?: string;
    departmentId?: string;
    categoryId?: string;
    assignedToInfo?: {
        _id: string;
        name: string;
        code: string;
        email: string;
        positionId?: {
            name: string;
        };
    };
    unitInfo?: {
        _id: string;
        name: string;
        code: string;
    };
    departmentInfo?: {
        _id: string;
        name: string;
        code: string;
    };
    categoryInfo?: {
        _id: string;
        name: string;
    };
    status?: string;
    condition?: string;
    quantity?: number;
    unitOC?: string;
    purchasePrice?: number;
    purchaseDate?: Date;
    warrantyUntil?: Date;
    dateOfReceipt?: Date;
    notes?: string;
    description?: string;
    isDelete?: boolean;
    isUnderWarranty?: boolean;
    images?: string[];
}

const ModalPortal = ({ children }: { children: React.ReactNode }) => {
    return createPortal(children, document.body);
};


export default function Tools() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const [tools, setTools] = useState<ITool[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [filteredDepartments, setFilteredDepartments] = useState<any[]>([]);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterDepartment, setFilterDepartment] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');
    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
    const employeeDropdownRef = useRef<HTMLDivElement>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedToolDetail, setSelectedToolDetail] = useState<ITool | null>(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showRevokeModal, setShowRevokeModal] = useState(false);
    const [editingTool, setEditingTool] = useState<ITool | null>(null);
    const [selectedTool, setSelectedTool] = useState<ITool | null>(null);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);

    const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
    const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState('');

    const [toolForm, setToolForm] = useState({
        code: '',
        name: '',
        category: '',
        purchaseDate: '',
        purchasePrice: '',
        warrantyUntil: '',
        status: 'Dự phòng',
        condition: 'Mới',
        unitId: '',
        departmentId: '',
        assignedTo: '',
        notes: '',
        description: '',
        quantity: 1,
        unitOC: 'Cái',
        dateOfReceipt: ''
    });

    const [employeeModalDropdownOpen, setEmployeeModalDropdownOpen] = useState(false);
    const [employeeModalSearchTerm, setEmployeeModalSearchTerm] = useState('');
    const [filteredModalEmployees, setFilteredModalEmployees] = useState<any[]>([]);
    const employeeModalDropdownRef = useRef<HTMLDivElement>(null);

    const selectedModalEmployeeLabel = employees.find(emp => emp.id === toolForm.assignedTo);

    const [assignForm, setAssignForm] = useState({
        toolId: '',
        employeeId: '',
        condition: 'Mới',
        notes: '',
        description: '',
    });

    const [revokeForm, setRevokeForm] = useState({
        toolId: '',
        condition: 'Mới',
        notes: '',
        description: ''
    });

    const statuses = ['Dự phòng', 'Đang sử dụng', 'Hỏng', 'Thanh lý'];
    const conditions = ['Mới', 'Cũ', 'Hỏng'];

    const { hasPermission } = usePermission();

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const newFiles = Array.from(files);
        const validFiles = newFiles.filter(file => {
            const isImage = file.type.startsWith('image/');
            const isValidSize = file.size <= 5 * 1024 * 1024;

            if (!isImage) {
                toast.error(`${file.name} không phải là file ảnh`);
            }
            if (!isValidSize) {
                toast.error(`${file.name} vượt quá 5MB`);
            }
            return isImage && isValidSize;
        });

        if (validFiles.length > 0) {
            setNewImageFiles(prev => {
                const updated = [...prev, ...validFiles];
                return updated;
            });

            const previewPromises = validFiles.map(file => {
                return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                });
            });

            Promise.all(previewPromises).then(previews => {
                setNewImagePreviews(prev => {
                    const updated = [...prev, ...previews];
                    return updated;
                });
            });

            toast.success(`Đã chọn ${validFiles.length} ảnh`);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const removeImage = async (index: number) => {
        const totalExisting = existingImageUrls.length;

        if (index < totalExisting) {
            if (window.confirm('Bạn có chắc muốn xóa ảnh này?')) {
                setExistingImageUrls(prev => prev.filter((_, i) => i !== index));
                toast.success('Đã đánh dấu xóa ảnh. Nhấn "Lưu" để hoàn tất.');
            }
        } else {
            const newIndex = index - totalExisting;
            setNewImagePreviews(prev => prev.filter((_, i) => i !== newIndex));
            setNewImageFiles(prev => prev.filter((_, i) => i !== newIndex));
            toast.success('Đã xóa ảnh');
        }
    };

    const openImageModal = (imageUrl: string) => {
        setSelectedImageUrl(imageUrl);
        setShowImageModal(true);
    }

    const closeImageModal = () => {
        setShowImageModal(false);
        setSelectedImageUrl('');
    }

    const openDetailModal = (tool: ITool) => {
        setSelectedToolDetail(tool);
        setShowDetailModal(true);
    };

    const closeDetailModal = () => {
        setShowDetailModal(false);
        setSelectedToolDetail(null);
    };

    const canCreate = hasPermission(['create_tool']);
    const canEdit = hasPermission(['update_tool']);
    const canDelete = hasPermission(['delete_tool']);

    useEffect(() => {
        loadDepartments();
        loadEmployees();
        loadUnits();
        loadCategories();
    }, []);

    const loadDepartments = async () => {
        try {
            const data = await departmentService.getAll();
            setDepartments(data.data || []);
        } catch (error) {
            console.error('Load departments error:', error);
            setDepartments([]);
        }
    };

    const loadTools = useCallback(async () => {
        try {
            setLoading(true);
            const params: any = {
                page: currentPage,
                limit: itemsPerPage,
                sortBy: 'createdAt',
                sortOrder: 'desc'
            };

            if (filterStatus) params.status = filterStatus;
            if (filterCategory) params.categoryId = filterCategory;
            if (filterDepartment) params.departmentId = filterDepartment;
            if (filterEmployee) params.assignedTo = filterEmployee;

            const response = await toolService.getAll(params);

            setTools(response.data || []);
            setTotalPages(response.totalPages || 1);
            setTotalItems(response.total || 0);
            setCurrentPage(response.currentPage || 1);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể tải danh sách công cụ');
            setTools([]);
            setTotalPages(1);
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, filterStatus, filterCategory, filterDepartment, filterEmployee]);

    useEffect(() => {
        loadTools();
    }, [loadTools]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterStatus, filterCategory, filterDepartment, filterEmployee]);

    useEffect(() => {
        if (toolForm.unitId) {
            const filtered = departments.filter(
                dept => dept.unitId?.id === toolForm.unitId || dept.unitId === toolForm.unitId
            );
            setFilteredDepartments(filtered);
        } else {
            setFilteredDepartments([]);
        }
    }, [toolForm.unitId, departments]);

    useEffect(() => {
        if (toolForm.departmentId) {
            const filtered = employees.filter(emp =>
                emp.departmentId?.id === toolForm.departmentId ||
                emp.departmentId === toolForm.departmentId
            );
            setFilteredModalEmployees(filtered);
        } else if (toolForm.unitId) {
            const filtered = employees.filter(emp =>
                emp.unitId?.id === toolForm.unitId ||
                emp.unitId === toolForm.unitId
            );
            setFilteredModalEmployees(filtered);
        } else {
            setFilteredModalEmployees(employees);
        }
    }, [toolForm.unitId, toolForm.departmentId, employees]);

    useEffect(() => {
        if (!employeeModalSearchTerm) {
            setFilteredModalEmployees(employees);
        } else {
            const term = employeeModalSearchTerm.toLowerCase();
            const filtered = employees.filter(emp =>
                emp.name?.toLowerCase().includes(term) ||
                emp.code?.toLowerCase().includes(term)
            );
            setFilteredModalEmployees(filtered);
        }
    }, [employeeModalSearchTerm, employees]);

    useEffect(() => {
        const handleClickOutSide = (event: MouseEvent) => {
            if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
                setEmployeeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutSide);
        return () => document.removeEventListener('mousedown', handleClickOutSide);
    }, []);

    const filteredEmployees = employees.filter(emp =>
        emp.code?.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
        emp.name?.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
        emp.positionId?.name?.toLowerCase().includes(employeeSearchTerm.toLowerCase())
    );

    const selectedEmployeeLabel = filterEmployee
        ? employees.find(e => e.id === filterEmployee)
        : null;

    const loadCategories = async () => {
        try {
            const data = await categoryService.getAll();
            setCategories(data);
        } catch (error) {
            console.error('Load category error:', error);
            setCategories([]);
        }
    };

    const loadEmployees = async () => {
        try {
            const data = await employeeService.getAll();
            setEmployees(data.data || []);
        } catch (error) {
            console.error('Load employees error:', error);
            setEmployees([]);
        }
    };

    const loadUnits = async () => {
        try {
            const data = await unitService.getAll();
            setUnits(data.data || []);
        } catch (error) {
            console.error('Load units error:', error);
        }
    };

    const openModal = (tool: ITool | null = null) => {
        if (tool) {
            setEditingTool(tool);
            setToolForm({
                code: tool.code || '',
                name: tool.name || '',
                category: tool.categoryId || tool.categoryInfo?._id || '',
                assignedTo: tool.assignedTo || tool.assignedToInfo?._id || '',
                purchaseDate: tool.purchaseDate ? new Date(tool.purchaseDate).toISOString().split('T')[0] : '',
                purchasePrice: tool.purchasePrice?.toString() || '',
                warrantyUntil: tool.warrantyUntil ? new Date(tool.warrantyUntil).toISOString().split('T')[0] : '',
                status: tool.status || 'Dự phòng',
                condition: tool.condition || 'Mới',
                unitId: tool.unitId || tool.unitInfo?._id || '',
                departmentId: tool.departmentId || tool.departmentInfo?._id || '',
                notes: tool.notes || '',
                quantity: tool.quantity || 1,
                unitOC: tool.unitOC || 'Cái',
                description: tool.description || '',
                dateOfReceipt: tool.dateOfReceipt ? new Date(tool.dateOfReceipt).toISOString().split('T')[0] : '',
            });

            const images = tool.images || [];

            const processedImages = images.map(img => getImageUrl(img));

            setExistingImageUrls(processedImages);
            setNewImagePreviews([]);
            setNewImageFiles([]);
        } else {
            const canViewAllTools = hasPermission(['view_all_tools']);
            const canViewDepartmentTools = hasPermission(['view_department_tools']);

            const userUnit = user?.unit;
            const userDept = user?.department;

            const defaultUnitId = !canViewAllTools
                ? (typeof userUnit === 'string' ? userUnit : userUnit?.id || '')
                : '';

            const defaultDepartmentId = canViewDepartmentTools && !canViewAllTools
                ? (typeof userDept === 'string' ? userDept : userDept?.id || '')
                : '';

            setToolForm({
                code: '',
                name: '',
                category: '',
                purchaseDate: '',
                purchasePrice: '',
                warrantyUntil: '',
                status: 'Dự phòng',
                condition: 'Mới',
                unitId: defaultUnitId,
                departmentId: defaultDepartmentId,
                assignedTo: '',
                notes: '',
                quantity: 1,
                unitOC: 'Cái',
                description: '',
                dateOfReceipt: ''
            });

            setExistingImageUrls([]);
            setNewImagePreviews([]);
            setNewImageFiles([]);

            if (defaultUnitId) {
                const filtered = departments.filter(
                    dept => dept.unitId?.id === defaultUnitId || dept.unitId === defaultUnitId
                );
                setFilteredDepartments(filtered);
            }
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTool(null);
    };

    const handleSubmit = async () => {
        if (!toolForm.name?.trim() || !toolForm.assignedTo?.trim() || !toolForm.category?.trim()) {
            toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        try {
            setLoading(true);

            let finalImageUrls = [...existingImageUrls];

            if (newImageFiles.length > 0) {
                try {
                    const uploadResult = await toolService.uploadImages(newImageFiles);
                    if (uploadResult.success && uploadResult.data) {
                        finalImageUrls = [...finalImageUrls, ...uploadResult.data];
                    }
                } catch (uploadError: any) {
                    toast.error(uploadError.response?.data?.message || 'Lỗi khi upload ảnh');
                    setLoading(false);
                    return;
                }
            }

            const submitData = {
                name: toolForm.name,
                code: toolForm.code?.trim() || '',
                assignedTo: toolForm.assignedTo,
                category: toolForm.category,
                assignedDate: new Date().toISOString(),
                quantity: toolForm.quantity || 1,
                status: toolForm.status || 'Dự phòng',
                condition: toolForm.condition || 'Mới',
                notes: toolForm.notes || '',
                purchasePrice: toolForm.purchasePrice ? parseFloat(toolForm.purchasePrice) : undefined,
                purchaseDate: toolForm.purchaseDate || undefined,
                warrantyUntil: toolForm.warrantyUntil || undefined,
                unitOC: toolForm.unitOC || 'Cái',
                description: toolForm.description || '',
                dateOfReceipt: toolForm.dateOfReceipt || undefined,
                images: finalImageUrls,
            };

            if (editingTool) {
                await toolService.update(editingTool.id, submitData);
                toast.success('Cập nhật công cụ thành công');
            } else {
                await toolService.create(submitData);
                toast.success('Thêm công cụ thành công');
            }

            await loadTools();
            closeModal();
        } catch (error: any) {
            console.error('Submit error:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa công cụ này?')) return;

        try {
            await toolService.softDelete(id);
            toast.success('Xóa công cụ thành công');
            await loadTools();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể xóa công cụ');
        }
    };

    const openAssignModal = (tool: ITool) => {
        setSelectedTool(tool);
        setAssignForm({
            toolId: tool.id,
            employeeId: '',
            condition: tool.condition || 'Mới',
            notes: '',
            description: ''
        });
        setShowAssignModal(true);
    };

    const closeAssignModal = () => {
        setShowAssignModal(false);
        setSelectedTool(null);
    };

    const handleAssign = async () => {
        if (!assignForm.employeeId) {
            toast.error('Vui lòng chọn nhân viên');
            return;
        }

        try {
            setLoading(true);

            const response = await toolService.assign({
                toolId: assignForm.toolId,
                employeeId: assignForm.employeeId,
                condition: assignForm.condition,
                notes: assignForm.notes,
                description: assignForm.description,
            });

            if (response.subToolsInfo?.updated > 0) {
                toast.success(
                    `${response.message}\n✓ ${response.subToolsInfo.updated} thiết bị đã cập nhật`,
                    { duration: 4000 }
                );
            } else {
                toast.success(response.message);
            }

            await loadTools();
            closeAssignModal();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const openRevokeModal = (tool: ITool) => {
        setSelectedTool(tool);
        setRevokeForm({
            toolId: tool.id,
            condition: tool.condition || 'Mới',
            notes: '',
            description: "",
        });
        setShowRevokeModal(true);
    };

    const closeRevokeModal = () => {
        setShowRevokeModal(false);
        setSelectedTool(null);
    };

    const handleRevoke = async () => {
        try {
            setLoading(true);
            await toolService.revoke(revokeForm);
            toast.success('Thu hồi công cụ thành công');
            await loadTools();
            closeRevokeModal();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'Dự phòng': return 'bg-green-100 text-green-700';
            case 'Đang sử dụng': return 'bg-blue-100 text-blue-700';
            case 'Hỏng': return 'bg-red-100 text-red-700';
            case 'Thanh lý': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getConditionColor = (condition?: string) => {
        switch (condition) {
            case 'Mới': return 'text-blue-600';
            case 'Cũ': return 'text-orange-600';
            case 'Hỏng': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    const filteredTools = tools.filter(tool => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            tool.code?.toLowerCase().includes(search) ||
            tool.name?.toLowerCase().includes(search)
        );
    });

    const sortedAndGroupedTools = filteredTools.sort((a, b) => {
        const deptA = a.departmentInfo?.name || 'Chưa có phòng ban';
        const deptB = b.departmentInfo?.name || 'Chưa có phòng ban';

        if (deptA !== deptB) {
            return deptA.localeCompare(deptB, 'vi');
        }

        const empA = a.assignedToInfo?.name || 'Chưa giao';
        const empB = b.assignedToInfo?.name || 'Chưa giao';

        if (empA !== empB) {
            return empA.localeCompare(empB, 'vi');
        }

        return (a.name || '').localeCompare(b.name || '', 'vi');
    });

    const goToPage = (pageNumber: number) => {
        setCurrentPage(Math.max(1, Math.min(pageNumber, totalPages)));
    };

    const renderPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }

        return pages;
    };

    return (
        <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
                        Quản lý công cụ/thiết bị
                    </h1>
                    <p className="text-gray-500 mt-0.5 text-xs sm:text-sm">
                        Tổng số: {filteredTools.length} công cụ
                    </p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => openModal()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg flex items-center gap-2 transition-all shadow-lg text-sm whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">Thêm công cụ</span>
                        <span className="sm:hidden">Thêm</span>
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 lg:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                    <div className="relative col-span-2 sm:col-span-3 lg:col-span-1">
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs sm:text-sm"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs sm:text-sm"
                    >
                        <option value="">Trạng thái</option>
                        {statuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>

                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs sm:text-sm"
                    >
                        <option value="">Danh mục</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>

                    <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs sm:text-sm"
                    >
                        <option value="">Phòng ban</option>
                        {departments.map(department => (
                            <option key={department.id} value={department.id}>{department.name}</option>
                        ))}
                    </select>

                    <div className="relative col-span-2 sm:col-span-1" ref={employeeDropdownRef}>
                        <div
                            onClick={() => setEmployeeDropdownOpen(!employeeDropdownOpen)}
                            className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 cursor-pointer bg-white flex items-center justify-between text-xs sm:text-sm"
                        >
                            <span className={`truncate ${selectedEmployeeLabel ? 'text-gray-900' : 'text-gray-500'}`}>
                                {selectedEmployeeLabel
                                    ? `${selectedEmployeeLabel.code} - ${selectedEmployeeLabel.name}`
                                    : 'Nhân viên'
                                }
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${employeeDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {employeeDropdownOpen && (
                            <div className="absolute z-20 mt-1 w-full min-w-[250px] bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                                <div className="p-2 border-b border-gray-200">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                                        <input
                                            type="text"
                                            value={employeeSearchTerm}
                                            onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                                            placeholder="Tìm theo mã, tên..."
                                            className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    <div
                                        onClick={() => {
                                            setFilterEmployee('');
                                            setEmployeeSearchTerm('');
                                            setEmployeeDropdownOpen(false);
                                        }}
                                        className="px-3 py-2 hover:bg-indigo-50 cursor-pointer text-xs text-gray-700"
                                    >
                                        Tất cả nhân viên
                                    </div>
                                    {filteredEmployees.length === 0 ? (
                                        <div className="px-3 py-2 text-xs text-gray-500 text-center">
                                            Không tìm thấy
                                        </div>
                                    ) : (
                                        filteredEmployees.map(emp => (
                                            <div
                                                key={emp.id}
                                                onClick={() => {
                                                    setFilterEmployee(emp.id);
                                                    setEmployeeSearchTerm('');
                                                    setEmployeeDropdownOpen(false);
                                                }}
                                                className={`px-3 py-2 hover:bg-indigo-50 cursor-pointer text-xs ${filterEmployee === emp.id ? 'bg-indigo-100 text-indigo-900 font-medium' : 'text-gray-700'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-indigo-600">{emp.code}</span>
                                                    <span>-</span>
                                                    <span className="truncate">{emp.name}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white mt-6 rounded-xl sm:rounded-2xl shadow-md overflow-hidden border border-gray-200">
                {loading ? (
                    <div className="p-8 sm:p-12 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-3 sm:mt-4 text-gray-600 text-sm">Đang tải...</p>
                    </div>
                ) : filteredTools.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                        <Package className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                        <p className="text-gray-500 text-sm">Chưa có công cụ nào</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="min-w-full border-collapse">
                                <thead>
                                    <tr className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                                        {[
                                            'Tên công cụ',
                                            'Danh mục',
                                            'SL',
                                            'Trạng thái',
                                            'Tình trạng',
                                            'Phòng ban',
                                            'Người sử dụng',
                                            ...(canEdit ? ['Thao tác'] : []),
                                        ].map((header, i, arr) => (
                                            <th
                                                key={i}
                                                className={`px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-center whitespace-nowrap ${i === 0 ? 'rounded-tl-xl' : ''} ${i === arr.length - 1 ? 'rounded-tr-xl' : ''}`}
                                            >
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {sortedAndGroupedTools.map((tool) => (
                                        <tr key={tool.id} className="hover:bg-indigo-50 transition-all duration-150">
                                            <td className="px-2 sm:px-3 py-2 text-xs text-gray-800 text-center cursor-pointer hover:text-indigo-600 transition-colors max-w-[150px] truncate">
                                                {tool.name}
                                            </td>
                                            <td className="px-2 sm:px-3 py-2 text-xs text-gray-600 text-center whitespace-nowrap">
                                                {tool.categoryInfo?.name}
                                            </td>
                                            <td className="px-2 sm:px-3 py-2 text-xs text-gray-600 text-center font-mono">
                                                {tool.quantity}
                                            </td>
                                            <td className="px-2 sm:px-3 py-2 text-center">
                                                <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 inline-flex text-[10px] sm:text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(tool.status)}`}>
                                                    {tool.status}
                                                </span>
                                            </td>
                                            <td className="px-2 sm:px-3 py-2 text-xs text-center font-medium">
                                                <span className={getConditionColor(tool.condition)}>{tool.condition}</span>
                                            </td>
                                            <td className="px-2 sm:px-3 py-2 text-xs text-gray-600 text-center whitespace-nowrap max-w-[120px] truncate">
                                                {tool.departmentInfo?.name}
                                            </td>
                                            <td className="px-2 sm:px-3 py-2">
                                                {tool.assignedToInfo ? (
                                                    <div className="whitespace-nowrap">
                                                        <div className="text-xs font-medium text-center text-gray-900 truncate">
                                                            {tool.assignedToInfo.name}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 text-center truncate">
                                                            {tool.assignedToInfo.positionId?.name}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">Chưa giao</span>
                                                )}
                                            </td>
                                            {canEdit && (
                                                <td className="px-2 sm:px-3 py-2 text-center">
                                                    <div className="flex justify-center items-center gap-0.5 sm:gap-1">
                                                        <button
                                                            onClick={() => openDetailModal(tool)}
                                                            className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded transition-colors"
                                                            title="Xem chi tiết"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleDelete(tool.id)}
                                                                className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Xóa"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="lg:hidden divide-y divide-gray-200">
                            {sortedAndGroupedTools.map((tool) => (
                                <div key={tool.id} className="p-4 hover:bg-indigo-50 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1 min-w-0">
                                            <h3
                                                onClick={() => navigate(`/tools/${tool.id}/subtools`)}
                                                className="text-base font-medium text-gray-800 cursor-pointer hover:text-indigo-600 transition-colors"
                                            >
                                                {tool.name}
                                            </h3>
                                        </div>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ml-2 flex-shrink-0 ${getStatusColor(tool.status)}`}>
                                            {tool.status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                        <div>
                                            <span className="text-gray-500 text-xs">Danh mục:</span>
                                            <div className="text-gray-900 font-medium">{tool.categoryInfo?.name || '-'}</div>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs">Tình trạng:</span>
                                            <div className={`font-medium ${getConditionColor(tool.condition)}`}>
                                                {tool.condition}
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs">Phòng ban:</span>
                                            {tool.departmentInfo ? (
                                                <div className="text-gray-900 truncate">{tool.departmentInfo.name}</div>
                                            ) : (
                                                <div className="text-gray-400">Chưa giao</div>
                                            )}
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-500 text-xs">Số lượng:</span>
                                            <div className="text-gray-900 font-mono text-xs truncate">
                                                {tool.quantity || '-'} {tool.unitOC}
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-gray-500 text-xs">Người sử dụng:</span>
                                            {tool.assignedToInfo ? (
                                                <div>
                                                    <div className="text-gray-900 font-medium">{tool.assignedToInfo.name}</div>
                                                    <div className="text-xs text-gray-500">{tool.assignedToInfo.positionId?.name}</div>
                                                </div>
                                            ) : (
                                                <div className="text-gray-400">Chưa giao</div>
                                            )}
                                        </div>
                                    </div>

                                    {canEdit && (
                                        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                                            <button
                                                onClick={() => openDetailModal(tool)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Xem chi tiết
                                            </button>
                                            {(tool.status === 'Dự phòng' || tool.status === 'Đang sử dụng') && (
                                                <button
                                                    onClick={() => openAssignModal(tool)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                    {tool.status === 'Đang sử dụng' ? 'Chuyển giao' : 'Giao'}
                                                </button>
                                            )}
                                            {tool.status === 'Đang sử dụng' && tool.assignedToInfo && (
                                                <button
                                                    onClick={() => openRevokeModal(tool)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                                                >
                                                    <UserMinus className="w-4 h-4" />
                                                    Thu hồi
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openModal(tool)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                                            >
                                                <Pencil className="w-4 h-4" />
                                                Sửa
                                            </button>
                                            <button
                                                onClick={() => navigate(`/tools/${tool.id}/subtools`)}
                                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                                            >
                                                <Package className="w-4 h-4" />
                                                Thiết bị
                                            </button>
                                            {canDelete && (
                                                <button
                                                    onClick={() => handleDelete(tool.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Xóa
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-700">Hiển thị</span>
                                    <select
                                        value={itemsPerPage === totalItems ? 'all' : itemsPerPage}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === 'all') {
                                                setItemsPerPage(totalItems);
                                            } else {
                                                setItemsPerPage(Number(value));
                                            }
                                        }}
                                        className="border border-gray-300 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                        <option value="all">Tất cả</option>
                                    </select>
                                    <span className="text-gray-700">
                                        {itemsPerPage === totalItems ? `(${totalItems} mục)` : `trên tổng ${totalItems}`}
                                    </span>
                                </div>

                                <div className="text-sm text-gray-700">
                                    {itemsPerPage === totalItems
                                        ? `Hiển thị tất cả ${totalItems} mục`
                                        : `Trang ${currentPage} / ${totalPages}`
                                    }
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => goToPage(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronsLeft className="w-4 h-4" />
                                    </button>
                                    {itemsPerPage !== totalItems && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => goToPage(currentPage - 1)}
                                                disabled={currentPage === 1}
                                                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                            <div className="hidden sm:flex items-center gap-1">
                                                {renderPageNumbers().map((page, index) => (
                                                    page === '...' ? (
                                                        <span key={`ellipsis-${index}`} className="px-3 py-1 text-gray-500">
                                                            ...
                                                        </span>
                                                    ) : (
                                                        <button
                                                            key={page}
                                                            onClick={() => goToPage(page as number)}
                                                            className={`px-3 py-1 rounded-lg transition-colors ${currentPage === page
                                                                ? 'bg-indigo-600 text-white font-semibold'
                                                                : 'border border-gray-300 hover:bg-gray-100 text-gray-700'
                                                                }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    )
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => goToPage(currentPage + 1)}
                                                disabled={currentPage === totalPages}
                                                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        onClick={() => goToPage(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronsRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {showModal && (
                <ModalPortal>
                    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-[9998] transition-all duration-300 animate-fadeIn">
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 animate-slideUp">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {editingTool ? 'Sửa thông tin công cụ' : 'Thêm công cụ mới'}
                                </h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2block text-sm font-medium text-gray-700 mb-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 disabled:opacity-60">
                                            Mã công cụ (để trống sẽ tự sinh)
                                        </label>
                                        <input
                                            type="text"
                                            value={toolForm.code}
                                            onChange={(e) => setToolForm({ ...toolForm, code: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 disabled:opacity-60"
                                            disabled
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tên công cụ <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={toolForm.name}
                                            onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Danh mục <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={toolForm.category}
                                            onChange={(e) => setToolForm({ ...toolForm, category: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Chọn danh mục</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Đơn vị <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={toolForm.unitId}
                                            onChange={(e) => {
                                                setToolForm({
                                                    ...toolForm,
                                                    unitId: e.target.value,
                                                    departmentId: '',
                                                    assignedTo: ''
                                                });
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                                            disabled={!hasPermission(['view_all_tools'])}
                                        >
                                            <option value="">-- Chọn đơn vị --</option>
                                            {units.map(unit => (
                                                <option key={unit.id} value={unit.id}>{unit.name}</option>
                                            ))}
                                        </select>
                                        {!hasPermission(['view_all_tools']) && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                Bạn chỉ có thể tạo công cụ trong đơn vị của mình
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Phòng ban <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={toolForm.departmentId}
                                            onChange={(e) => {
                                                setToolForm({
                                                    ...toolForm,
                                                    departmentId: e.target.value,
                                                    assignedTo: ''
                                                });
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            disabled={!toolForm.unitId}
                                        >
                                            <option value="">
                                                {toolForm.unitId ? '-- Chọn phòng ban --' : 'Vui lòng chọn đơn vị trước'}
                                            </option>
                                            {filteredDepartments.map(dept => (
                                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                                            ))}
                                        </select>
                                        {!toolForm.unitId && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                * Chọn đơn vị để hiển thị phòng ban
                                            </p>
                                        )}
                                    </div>

                                    <div className="col-span-2 relative" ref={employeeModalDropdownRef}>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Người quản lý / Nhân viên <span className="text-red-500">*</span>
                                        </label>

                                        <div
                                            onClick={() => {
                                                if (toolForm.departmentId) {
                                                    setEmployeeModalDropdownOpen(!employeeModalDropdownOpen);
                                                }
                                            }}
                                            className={`px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white flex items-center justify-between ${!toolForm.departmentId ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'
                                                }`}
                                        >
                                            <span className={selectedModalEmployeeLabel ? 'text-gray-900 truncate' : 'text-gray-500'}>
                                                {selectedModalEmployeeLabel
                                                    ? `${selectedModalEmployeeLabel.code} - ${selectedModalEmployeeLabel.name} (${selectedModalEmployeeLabel.positionId?.name || 'N/A'})`
                                                    : toolForm.departmentId
                                                        ? 'Chọn nhân viên'
                                                        : 'Chọn phòng ban trước'}
                                            </span>
                                            <ChevronDown
                                                className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${employeeModalDropdownOpen ? 'rotate-180' : ''}`}
                                            />
                                        </div>

                                        {employeeModalDropdownOpen && toolForm.departmentId && (
                                            <div className="absolute z-[10000] mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-hidden">
                                                <div className="p-2 border-b border-gray-200">
                                                    <div className="relative">
                                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                                        <input
                                                            type="text"
                                                            value={employeeModalSearchTerm}
                                                            onChange={(e) => setEmployeeModalSearchTerm(e.target.value)}
                                                            placeholder="Tìm theo mã, tên, chức vụ..."
                                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="max-h-48 overflow-y-auto">
                                                    {filteredModalEmployees.length === 0 ? (
                                                        <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                            {toolForm.departmentId
                                                                ? 'Không tìm thấy nhân viên trong phòng ban này'
                                                                : 'Không tìm thấy nhân viên trong đơn vị này'}
                                                        </div>
                                                    ) : (
                                                        filteredModalEmployees.map(emp => (
                                                            <div
                                                                key={emp.id}
                                                                onClick={() => {
                                                                    setToolForm({ ...toolForm, assignedTo: emp.id });
                                                                    setEmployeeModalSearchTerm('');
                                                                    setEmployeeModalDropdownOpen(false);
                                                                }}
                                                                className={`px-4 py-2 hover:bg-indigo-50 cursor-pointer text-sm border-b border-gray-50 ${toolForm.assignedTo === emp.id
                                                                    ? 'bg-indigo-100 text-indigo-900'
                                                                    : 'text-gray-700'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`font-semibold ${toolForm.assignedTo === emp.id ? 'text-indigo-700' : 'text-indigo-600'
                                                                            }`}>
                                                                            {emp.code}
                                                                        </span>
                                                                        <span>-</span>
                                                                        <span className={toolForm.assignedTo === emp.id ? 'font-semibold' : ''}>
                                                                            {emp.name}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                                                    {emp.positionId?.name && (
                                                                        <>
                                                                            <span className="inline-block w-1 h-1 bg-gray-400 rounded-full"></span>
                                                                            <span>{emp.positionId.name}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Trạng thái
                                        </label>
                                        <select
                                            value={toolForm.status}
                                            onChange={(e) => setToolForm({ ...toolForm, status: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {statuses.map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tình trạng
                                        </label>
                                        <select
                                            value={toolForm.condition}
                                            onChange={(e) => setToolForm({ ...toolForm, condition: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {conditions.map(condition => (
                                                <option key={condition} value={condition}>{condition}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Số lượng
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={toolForm.quantity}
                                            onChange={(e) => setToolForm({ ...toolForm, quantity: parseInt(e.target.value) || 1 })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Đơn vị tính
                                        </label>
                                        <select
                                            value={toolForm.unitOC}
                                            onChange={(e) => setToolForm({ ...toolForm, unitOC: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="Cái">Cái</option>
                                            <option value="Bộ">Bộ</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Giá mua
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={toolForm.purchasePrice}
                                            onChange={(e) => setToolForm({ ...toolForm, purchasePrice: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="VNĐ"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Ngày mua
                                        </label>
                                        <input
                                            type="date"
                                            value={toolForm.purchaseDate}
                                            onChange={(e) => setToolForm({ ...toolForm, purchaseDate: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Ngày nhận
                                        </label>
                                        <input
                                            type="date"
                                            value={toolForm.dateOfReceipt}
                                            onChange={(e) => setToolForm({ ...toolForm, dateOfReceipt: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Bảo hành đến
                                        </label>
                                        <input
                                            type="date"
                                            value={toolForm.warrantyUntil}
                                            onChange={(e) => setToolForm({ ...toolForm, warrantyUntil: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Mô tả
                                    </label>
                                    <textarea
                                        value={toolForm.description}
                                        onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Mô tả chi tiết về công cụ..."
                                    />
                                </div>

                                {/* <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ghi chú
                                    </label>
                                    <textarea
                                        value={toolForm.notes}
                                        onChange={(e) => setToolForm({ ...toolForm, notes: e.target.value })}
                                        rows={2}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Ghi chú thêm..."
                                    />
                                </div> */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Hình ảnh công cụ
                                    </label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handleImageSelect}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition-colors text-sm text-gray-600 hover:text-indigo-600 flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Thêm hình ảnh (tối đa 5MB/ảnh)
                                    </button>

                                    {(existingImageUrls.length > 0 || newImagePreviews.length > 0) && (
                                        <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
                                            {existingImageUrls.map((url, index) => (
                                                <div key={`existing-${index}`} className="relative group">
                                                    <div className="absolute top-1 left-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded z-10">
                                                        Đã lưu
                                                    </div>
                                                    <img
                                                        src={url}
                                                        alt={`Existing ${index + 1}`}
                                                        className="w-full h-24 object-cover rounded-lg border-2 border-green-200 cursor-pointer hover:opacity-75 transition-opacity"
                                                        onClick={() => openImageModal(url)}
                                                        onError={(e) => {
                                                            console.error('Image load error:', url);
                                                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EError%3C/text%3E%3C/svg%3E';
                                                        }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index)}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}

                                            {newImagePreviews.map((preview, index) => (
                                                <div key={`new-${index}`} className="relative group">
                                                    <div className="absolute top-1 left-1 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded z-10">
                                                        Chưa lưu
                                                    </div>
                                                    <img
                                                        src={preview}
                                                        alt={`New ${index + 1}`}
                                                        className="w-full h-24 object-cover rounded-lg border-2 border-blue-300 cursor-pointer hover:opacity-75 transition-opacity"
                                                        onClick={() => openImageModal(preview)}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(existingImageUrls.length + index)}
                                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-2 text-xs text-gray-500">
                                        Ảnh cũ: {existingImageUrls.length} | Ảnh mới: {newImagePreviews.length}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                                <button
                                    onClick={closeModal}
                                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                    disabled={loading}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Đang xử lý...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5" />
                                            <span>{editingTool ? 'Cập nhật' : 'Thêm mới'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {showDetailModal && selectedToolDetail && (
                <ModalPortal>
                    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-[9998] transition-all duration-300 animate-fadeIn overflow-y-auto">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-4 max-h-[95vh] overflow-y-auto transform transition-all duration-300 scale-95 animate-slideUp z-[9999]">
                            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                                    <Package className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                                    Chi tiết công cụ
                                </h2>
                                <button
                                    onClick={closeDetailModal}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                            </div>

                            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                                {/* Tool Info Card */}
                                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 p-4 sm:p-6 rounded-xl">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                                                    {selectedToolDetail.code}
                                                </span>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedToolDetail.status)}`}>
                                                    {selectedToolDetail.status}
                                                </span>
                                            </div>
                                            <h3 className="text-xl sm:text-2xl font-bold text-indigo-900 mb-2">
                                                {selectedToolDetail.name}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {selectedToolDetail.categoryInfo?.name || 'Chưa phân loại'}
                                            </p>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <p className="text-xs text-gray-600 mb-1">Giá trị</p>
                                            <p className="text-2xl font-bold text-indigo-700">
                                                {selectedToolDetail.purchasePrice?.toLocaleString() || '0'} đ
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Basic Info */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            📋 Thông tin cơ bản
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Số lượng:</span>
                                                <span className="font-medium text-gray-900">
                                                    {selectedToolDetail.quantity} {selectedToolDetail.unitOC || 'Cái'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Tình trạng:</span>
                                                <span className={`font-medium ${getConditionColor(selectedToolDetail.condition)}`}>
                                                    {selectedToolDetail.condition}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            📅 Thông tin thời gian
                                        </h4>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Ngày mua:</span>
                                                <span className="font-medium text-gray-900">
                                                    {selectedToolDetail.purchaseDate
                                                        ? new Date(selectedToolDetail.purchaseDate).toLocaleDateString('vi-VN')
                                                        : '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Ngày nhận:</span>
                                                <span className="font-medium text-gray-900">
                                                    {selectedToolDetail.dateOfReceipt
                                                        ? new Date(selectedToolDetail.dateOfReceipt).toLocaleDateString('vi-VN')
                                                        : '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Bảo hành đến:</span>
                                                <span className="font-medium text-gray-900">
                                                    {selectedToolDetail.warrantyUntil
                                                        ? new Date(selectedToolDetail.warrantyUntil).toLocaleDateString('vi-VN')
                                                        : '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Còn bảo hành:</span>
                                                <span className="font-medium">
                                                    {selectedToolDetail.warrantyUntil && new Date(selectedToolDetail.warrantyUntil) > new Date()
                                                        ? <span className="text-green-600">✓ Còn hạn</span>
                                                        : <span className="text-red-600">✗ Hết hạn</span>
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Location Info */}
                                <div className="bg-white border border-gray-200 rounded-lg p-4">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                        📍 Vị trí & Phân bổ
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-600">Đơn vị:</span>
                                            <div className="mt-1">
                                                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                                    {selectedToolDetail.unitInfo?.name || '-'}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-gray-600">Phòng ban:</span>
                                            <div className="mt-1">
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                                    {selectedToolDetail.departmentInfo?.name || '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {selectedToolDetail.assignedToInfo ? (
                                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                                        <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                                            👤 Người sử dụng hiện tại
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <span className="text-green-700">Tên nhân viên:</span>
                                                <p className="font-semibold text-green-900 mt-1">
                                                    {selectedToolDetail.assignedToInfo?.name || 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-green-700">Mã nhân viên:</span>
                                                <p className="font-semibold text-green-900 mt-1">
                                                    {selectedToolDetail.assignedToInfo?.code || '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-green-700">Chức vụ:</span>
                                                <p className="font-semibold text-green-900 mt-1">
                                                    {selectedToolDetail.assignedToInfo.positionId?.name || '-'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-green-700">Ngày giao:</span>
                                                <p className="font-semibold text-green-900 mt-1">
                                                    {selectedToolDetail.assignedDate
                                                        ? new Date(selectedToolDetail.assignedDate).toLocaleDateString('vi-VN')
                                                        : '-'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                                        <p className="text-sm text-gray-500">
                                            Công cụ này chưa được giao cho nhân viên nào
                                        </p>
                                    </div>
                                )}

                                {selectedToolDetail.notes && (
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                            📝 Ghi chú
                                        </h4>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                            {selectedToolDetail.notes}
                                        </p>
                                    </div>
                                )}
                                {selectedToolDetail.description && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <h4 className="text-sm font-semibold text-blue-900 mb-2">
                                            📄 Mô tả chi tiết
                                        </h4>
                                        <p className="text-sm text-blue-900 whitespace-pre-wrap">
                                            {selectedToolDetail.description}
                                        </p>
                                    </div>
                                )}

                                {selectedToolDetail.images && selectedToolDetail.images.length > 0 && (
                                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            🖼️ Hình ảnh
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {selectedToolDetail.images.map((img, index) => {
                                                // Xử lý URL ảnh
                                                const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
                                                const baseURL = apiURL.replace(/\/api$/, '');
                                                const imageUrl = img.startsWith('http') ? img : `${baseURL}${img}`;

                                                return (
                                                    <div key={index} className="relative group">
                                                        <img
                                                            src={imageUrl}
                                                            alt={`Tool image ${index + 1}`}
                                                            className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-75 transition-opacity"
                                                            onClick={() => openImageModal(imageUrl)}
                                                            onError={(e) => {
                                                                console.error('Image load error:', imageUrl);
                                                                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ELỗi ảnh%3C/text%3E%3C/svg%3E';
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2 pt-4 border-t">
                                    {canEdit && (
                                        <>
                                            {(selectedToolDetail.status === 'Dự phòng' || selectedToolDetail.status === 'Đang sử dụng') && (
                                                <button
                                                    onClick={() => {
                                                        closeDetailModal();
                                                        openAssignModal(selectedToolDetail);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                    {selectedToolDetail.status === 'Đang sử dụng' ? 'Chuyển giao' : 'Giao công cụ'}
                                                </button>
                                            )}
                                            {selectedToolDetail.status === 'Đang sử dụng' && selectedToolDetail.assignedTo && (
                                                <button
                                                    onClick={() => {
                                                        closeDetailModal();
                                                        openRevokeModal(selectedToolDetail);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                                                >
                                                    <UserMinus className="w-4 h-4" />
                                                    Thu hồi
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    closeDetailModal();
                                                    openModal(selectedToolDetail);
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                                            >
                                                <Pencil className="w-4 h-4" />
                                                Chỉnh sửa
                                            </button>
                                            <button
                                                onClick={() => {
                                                    closeDetailModal();
                                                    navigate(`/tools/${selectedToolDetail.id}/subtools`);
                                                }}
                                                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm"
                                            >
                                                <Package className="w-4 h-4" />
                                                Quản lý thiết bị
                                            </button>
                                        </>
                                    )}
                                    <button
                                        onClick={closeDetailModal}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm ml-auto"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {showImageModal && (
                <ModalPortal>
                    <div
                        className="fixed inset-0 backdrop-blur-sm bg-black/80 flex items-center justify-center p-4 z-[10000]"
                        onClick={closeImageModal}
                    >
                        <div className="relative max-w-4xl max-h-[90vh] w-full">
                            <button
                                onClick={closeImageModal}
                                className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
                            >
                                <X className="w-8 h-8" />
                            </button>
                            <img
                                src={selectedImageUrl}
                                alt="Preview"
                                className="w-full h-full object-contain rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Modal Giao công cụ */}
            {showAssignModal && selectedTool && (
                <ModalPortal>
                    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-[9998] transition-all duration-300 animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl transform transition-all duration-300 scale-95 animate-slideUp z-[9999]">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {selectedTool.status === 'Đang sử dụng' ? 'Chuyển giao công cụ' : 'Giao công cụ'}
                                </h2>
                                <button onClick={closeAssignModal} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm font-medium text-gray-700">
                                        Công cụ: <span className="font-bold text-gray-900">{selectedTool.name}</span>
                                    </p>
                                    {selectedTool.assignedToInfo && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            Hiện tại: <span className="font-semibold">{selectedTool.assignedToInfo.name}</span>
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Chọn nhân viên <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={assignForm.employeeId}
                                        onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">-- Chọn nhân viên --</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.code} - {emp.name} ({emp.positionInfo?.name || 'N/A'})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tình trạng
                                    </label>
                                    <select
                                        value={assignForm.condition}
                                        onChange={(e) => setAssignForm({ ...assignForm, condition: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {conditions.map(condition => (
                                            <option key={condition} value={condition}>{condition}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ghi chú
                                    </label>
                                    <textarea
                                        value={assignForm.notes}
                                        onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Ghi chú về việc giao công cụ..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                                <button
                                    onClick={closeAssignModal}
                                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                    disabled={loading}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleAssign}
                                    disabled={loading || !assignForm.employeeId}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Đang xử lý...</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-5 h-5" />
                                            <span>{selectedTool.status === 'Đang sử dụng' ? 'Chuyển giao' : 'Giao'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {/* Modal Thu hồi công cụ */}
            {showRevokeModal && selectedTool && (
                <ModalPortal>
                    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-[9998] transition-all duration-300 animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl transform transition-all duration-300 scale-95 animate-slideUp z-[9999]">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <h2 className="text-2xl font-bold text-gray-800">Thu hồi công cụ</h2>
                                <button onClick={closeRevokeModal} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                    <p className="text-sm font-medium text-gray-700">
                                        Công cụ: <span className="font-bold text-gray-900">{selectedTool.name}</span>
                                    </p>
                                    {selectedTool.assignedToInfo && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            Thu hồi từ: <span className="font-semibold">{selectedTool.assignedToInfo.name}</span>
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tình trạng khi thu hồi
                                    </label>
                                    <select
                                        value={revokeForm.condition}
                                        onChange={(e) => setRevokeForm({ ...revokeForm, condition: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    >
                                        {conditions.map(condition => (
                                            <option key={condition} value={condition}>{condition}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Ghi chú
                                    </label>
                                    <textarea
                                        value={revokeForm.notes}
                                        onChange={(e) => setRevokeForm({ ...revokeForm, notes: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Lý do thu hồi hoặc ghi chú khác..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                                <button
                                    onClick={closeRevokeModal}
                                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                                    disabled={loading}
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleRevoke}
                                    disabled={loading}
                                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Đang xử lý...</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserMinus className="w-5 h-5" />
                                            <span>Thu hồi</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}