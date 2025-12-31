/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import { Search, Plus, Pencil, Trash2, X, Save, ChevronDown, ChevronUp } from "lucide-react";
import { positionService, IPosition, CreatePositionData, UpdatePositionData } from "../services/positionService";
import toast from "react-hot-toast";
import api from "../services/api";

interface Permission {
    value: string;
    label: string;
    category: string;
}

interface Department {
    _id?: string;
    id?: string;
    name: string;
    code?: string;
}

interface FormData {
    name: string;
    code: string;
    order: number | string;
    department: string;
    isActive: boolean;
    permissions: string[];
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface ExpandedCategories {
    [key: string]: boolean;
}

const AVAILABLE_PERMISSIONS: Permission[] = [
    { value: 'view_all_employees', label: '👥 Xem tất cả nhân viên', category: 'Nhân viên' },
    // { value: 'view_employees', label: '👥 Xem nhân viên', category: 'Nhân viên' },
    { value: 'view_department_employees', label: '👥 Xem nhân viên phòng ban', category: 'Nhân viên' },
    { value: 'create_employee', label: '➕ Tạo nhân viên', category: 'Nhân viên' },
    { value: 'update_employee', label: '✏️ Cập nhật nhân viên', category: 'Nhân viên' },
    { value: 'delete_soft_employee', label: '🗑️ Xóa nhân viên (soft)', category: 'Nhân viên' },
    { value: 'restore_employee', label: '🔄 Khôi phục nhân viên', category: 'Nhân viên' },
    { value: 'permanent_delete_employee', label: '❌ Xóa vĩnh viễn', category: 'Nhân viên' },

    { value: 'view_all_tools', label: '🔧 Xem tất cả công cụ', category: 'Công cụ' },
    { value: 'view_department_tools', label: '🔧 Xem công cụ phòng ban', category: 'Công cụ' },
    { value: 'view_assigned_tools', label: '🔧 Xem công cụ được giao', category: 'Công cụ' },
    { value: 'create_tool', label: '➕ Tạo công cụ', category: 'Công cụ' },
    { value: 'update_tool', label: '✏️ Cập nhật công cụ', category: 'Công cụ' },
    { value: 'delete_tool', label: '🗑️ Xóa công cụ', category: 'Công cụ' },
    { value: 'create_category_tool', label: '➕ Tạo danh mục', category: 'Công cụ' },
    { value: 'update_category_tool', label: '✏️ Cập nhật danh mục', category: 'Công cụ' },
    { value: 'delete_category_tool', label: '🗑️ Xóa danh mục', category: 'Công cụ' },
    { value: 'restore_tool', label: '🔄 Khôi phục công cụ', category: 'Công cụ' },
    { value: 'permanent_delete_tool', label: '❌ Xóa vĩnh viễn', category: 'Công cụ' },
    { value: 'assign_tool', label: '📦 Giao công cụ', category: 'Công cụ' },
    { value: 'revoke_tool', label: '📦 Thu hồi công cụ', category: 'Công cụ' },
    { value: 'view_all_history', label: '📜 Xem lịch sử', category: 'Công cụ' },

    { value: 'manage_units', label: '🏢 Quản lý đơn vị', category: 'Đơn vị' },
    { value: 'create_units', label: '➕ Tạo đơn vị', category: 'Đơn vị' },
    { value: 'update_units', label: '✏️ Cập nhật đơn vị', category: 'Đơn vị' },
    { value: 'delete_units', label: '🗑️ Xóa đơn vị', category: 'Đơn vị' },

    { value: 'manage_departments', label: '🏛️ Quản lý phòng ban', category: 'Phòng ban' },
    { value: 'create_departments', label: '➕ Tạo phòng ban', category: 'Phòng ban' },
    { value: 'update_departments', label: '✏️ Cập nhật phòng ban', category: 'Phòng ban' },
    { value: 'delete_departments', label: '🗑️ Xóa phòng ban', category: 'Phòng ban' },

    { value: 'manage_positions', label: '👔 Quản lý chức vụ', category: 'Chức vụ' },
    { value: 'create_position', label: '➕ Tạo chức vụ', category: 'Chức vụ' },
    { value: 'update_position', label: '✏️ Cập nhật chức vụ', category: 'Chức vụ' },
    { value: 'delete_position', label: '🗑️ Xóa chức vụ', category: 'Chức vụ' },

    { value: 'delete_history', label: '🗑️ Xóa lịch sử', category: 'Lịch sử' },
    { value: 'export_data', label: '📤 Xuất dữ liệu', category: 'Báo cáo' },
    { value: 'manage_system', label: '⚙️ Quản trị hệ thống', category: 'Hệ thống' },
];

export default function Positions() {
    const [positions, setPositions] = useState<IPosition[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [showModal, setShowModal] = useState<boolean>(false);
    const [editingPosition, setEditingPosition] = useState<IPosition | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [loadingDepts, setLoadingDepts] = useState<boolean>(false);
    const [expandedCategories, setExpandedCategories] = useState<ExpandedCategories>({});
    const [pagination, setPagination] = useState<Pagination>({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
    });
    const [formData, setFormData] = useState<FormData>({
        name: "",
        code: "",
        order: "",
        department: "",
        isActive: true,
        permissions: [],
    });

    useEffect(() => {
        if (formData.name && !editingPosition) {
            const generated = formData.name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '_')
                .toUpperCase();
            setFormData(prev => ({ ...prev, code: generated }));
        }
    }, [formData.name, editingPosition]);

    useEffect(() => {
        loadDepartments();
    }, []);

    useEffect(() => {
        loadPositions();
    }, [pagination.page]);

    const loadDepartments = async (): Promise<void> => {
        try {
            setLoadingDepts(true);
            const response = await api.get('/departments', {
                params: { limit: 1000 }
            });
            if (response.data && response.data.data) {
                setDepartments(response.data.data || []);
            }
        } catch (error: any) {
            console.error("Error loading departments:", error);
            toast.error("Không thể tải danh sách phòng ban");
        } finally {
            setLoadingDepts(false);
        }
    };

    const loadPositions = async (): Promise<void> => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                limit: pagination.limit,
                sortBy: 'order' as const,
                sortOrder: 'asc' as const
            };
            const res = await positionService.getAll(params);
            if (res.success && res.data) {
                setPositions(res.data);
                if (res.total !== undefined) {
                    setPagination((prev) => ({
                        ...prev,
                        total: res.total!,
                        totalPages: Math.ceil(res.total! / (res.limit || prev.limit)),
                    }));
                }
            }
        } catch (error: any) {
            toast.error("Không thể tải danh sách chức vụ");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredPositions = (): IPosition[] => {
        if (!searchTerm.trim()) return positions;
        return positions.filter((p) =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const handlePageChange = (newPage: number): void => {
        setPagination((prev) => ({ ...prev, page: newPage }));
    };

    const openModal = (position: IPosition | null = null): void => {
        if (position) {
            setEditingPosition(position);
            const deptId = position.departmentId || position.departmentId || "";
            setFormData({
                name: position.name,
                code: position.code,
                order: position.order || '',
                department: deptId,
                isActive: position.isActive !== undefined ? position.isActive : true,
                permissions: position.permissions || [],
            });
        } else {
            setEditingPosition(null);
            setFormData({
                name: "",
                code: "",
                order: "",
                department: "",
                isActive: true,
                permissions: [],
            });
        }
        setShowModal(true);

        const allCategories: ExpandedCategories = {};
        Object.keys(groupedPermissions).forEach(cat => {
            allCategories[cat] = true;
        });
        setExpandedCategories(allCategories);
    };

    const closeModal = (): void => {
        setShowModal(false);
        setEditingPosition(null);
        setFormData({
            name: "",
            code: "",
            order: "",
            department: "",
            isActive: true,
            permissions: [],
        });
        setExpandedCategories({});
    };

    const toggleCategory = (category: string): void => {
        setExpandedCategories(prev => ({
            ...prev,
            [category]: !prev[category]
        }));
    };

    const handlePermissionChange = (permission: string): void => {
        setFormData((prev) => ({
            ...prev,
            permissions: prev.permissions.includes(permission)
                ? prev.permissions.filter((p) => p !== permission)
                : [...prev.permissions, permission],
        }));
    };

    const handleSelectAllPermissions = (): void => {
        setFormData(prev => ({
            ...prev,
            permissions: AVAILABLE_PERMISSIONS.map(p => p.value)
        }));
    };

    const handleClearAllPermissions = (): void => {
        setFormData(prev => ({
            ...prev,
            permissions: []
        }));
    };

    const handleSelectCategoryPermissions = (category: string): void => {
        const categoryPerms = groupedPermissions[category].map(p => p.value);
        const allSelected = categoryPerms.every(p => formData.permissions.includes(p));

        if (allSelected) {
            setFormData(prev => ({
                ...prev,
                permissions: prev.permissions.filter(p => !categoryPerms.includes(p))
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                permissions: [...new Set([...prev.permissions, ...categoryPerms])]
            }));
        }
    };

    const handleSubmit = async (e: FormEvent): Promise<void> => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("Vui lòng nhập tên chức vụ");
            return;
        }

        if (formData.code.trim().length === 0) {
            toast.error("Mã chức vụ không hợp lệ");
            return;
        }

        if (!formData.department) {
            toast.error("Vui lòng chọn phòng ban");
            return;
        }

        try {
            setLoading(true);
            if (editingPosition) {
                const positionId = editingPosition.id || editingPosition._id;
                if (!positionId) {
                    throw new Error('Position ID không tồn tại');
                }

                const updateData: UpdatePositionData = {
                    name: formData.name,
                    code: formData.code,
                    order: formData.order === '' ? undefined : Number(formData.order),
                    department: formData.department,
                    isActive: formData.isActive,
                    permissions: formData.permissions,
                };

                const res = await positionService.update(positionId, updateData);
                if (res.success) {
                    toast.success(res.message || "Cập nhật chức vụ thành công");
                }
            } else {
                const createData: CreatePositionData = {
                    name: formData.name,
                    code: formData.code,
                    order: formData.order === '' ? undefined : Number(formData.order),
                    department: formData.department,
                    isActive: formData.isActive,
                    permissions: formData.permissions,
                };

                const res = await positionService.create(createData);
                if (res.success) {
                    toast.success(res.message || "Thêm chức vụ thành công");
                }
            }
            await loadPositions();
            closeModal();
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || "Có lỗi xảy ra";
            toast.error(errorMsg);
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (position: IPosition): Promise<void> => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa chức vụ "${position.name}"?`)) return;

        try {
            const positionId = position.id || position._id;
            if (!positionId) {
                throw new Error('Position ID không tồn tại');
            }

            const res = await positionService.delete(positionId);
            if (res.success) {
                toast.success(res.message || "Xóa chức vụ thành công");
                await loadPositions();
            }
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || "Không thể xóa chức vụ";
            toast.error(errorMsg);
            console.error(error);
        }
    };

    const filteredPositions = getFilteredPositions();

    const groupedPermissions: Record<string, Permission[]> = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
        if (!acc[perm.category]) {
            acc[perm.category] = [];
        }
        acc[perm.category].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <div className="space-y-4 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Quản lý chức vụ</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Cấu hình phân quyền hệ thống</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Thêm chức vụ
                </button>
            </div>

            <div className="bg-white rounded-lg shadow p-3">
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo tên hoặc mã..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading && positions.length === 0 ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-3 text-sm text-gray-600">Đang tải...</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold">Tên chức vụ</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold">Phòng ban</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold">Trạng thái</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold w-24">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPositions.map((position, idx) => {
                                        const positionId = position.id || position._id;
                                        return (
                                            <tr
                                                key={positionId}
                                                className={`${idx % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-indigo-50 transition-colors`}
                                            >
                                                <td className="px-4 py-3 text-sm text-gray-800 font-medium">{position.name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {position.departmentInfo?.name || 'N/A'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${position.isActive
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {position.isActive ? 'Hoạt động' : 'Không hoạt động'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        <button
                                                            onClick={() => openModal(position)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                            title="Chỉnh sửa"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(position)}
                                                            className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                                            title="Xóa"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredPositions.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="text-center py-8 text-sm text-gray-500">
                                                Không tìm thấy chức vụ nào
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {pagination.totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t bg-gray-50 gap-3">
                                <div className="text-xs text-gray-600">
                                    Hiển thị {(pagination.page - 1) * pagination.limit + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Trước
                                    </button>
                                    {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                                        const page = i + 1;
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => handlePageChange(page)}
                                                className={`px-3 py-1.5 text-xs rounded ${page === pagination.page
                                                    ? "bg-indigo-600 text-white"
                                                    : "border border-gray-300 hover:bg-gray-50"
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Sau
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity opacity-100 transition-all duration-300 animate-fadeIn"></div>
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col transform transition-all opacity-100 scale-100 transform transition-all duration-300 scale-95 animate-slideUp">
                            <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
                                <h2 className="text-xl font-bold text-gray-800">
                                    {editingPosition ? "Sửa chức vụ" : "Thêm chức vụ mới"}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                                <div className="p-4 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Tên chức vụ <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                    setFormData({ ...formData, name: e.target.value })
                                                }
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                placeholder="VD: Giám đốc, Trưởng phòng..."
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Mã chức vụ <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.code}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                                                }
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
                                                placeholder="GIAM_DOC"
                                                disabled={!!editingPosition}
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Phòng ban <span className="text-red-500">*</span>
                                            </label>
                                            {loadingDepts ? (
                                                <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                                                    Đang tải...
                                                </div>
                                            ) : (
                                                <select
                                                    value={formData.department}
                                                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                                        setFormData({ ...formData, department: e.target.value })
                                                    }
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                    required
                                                >
                                                    <option value="">-- Chọn phòng ban --</option>
                                                    {departments.map((dept) => (
                                                        <option key={dept._id || dept.id} value={dept._id || dept.id}>
                                                            {dept.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Thứ tự hiển thị
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.order === 0 ? '' : formData.order}
                                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                                    const value = e.target.value;
                                                    if (value === '') {
                                                        setFormData({ ...formData, order: '' });
                                                    } else if (/^\d+$/.test(value)) {
                                                        setFormData({ ...formData, order: Number(value) });
                                                    }
                                                }}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                placeholder="Nhập số thứ tự"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Trạng thái
                                            </label>
                                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                                <span className={`text-xs font-medium flex-1 ${formData.isActive ? "text-green-700" : "text-gray-600"}`}>
                                                    {formData.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${formData.isActive ? "bg-green-600" : "bg-gray-300"}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all shadow ${formData.isActive ? "translate-x-6" : "translate-x-1"}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t pt-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="text-xs font-medium text-gray-700">
                                                Phân quyền ({formData.permissions.length}/{AVAILABLE_PERMISSIONS.length})
                                            </label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleSelectAllPermissions}
                                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                                >
                                                    ✓ Tất cả
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleClearAllPermissions}
                                                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                                >
                                                    ✗ Bỏ chọn
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 p-2">
                                            {Object.entries(groupedPermissions).map(([category, perms]) => {
                                                const categoryPerms = perms.map(p => p.value);
                                                const selectedCount = categoryPerms.filter(p => formData.permissions.includes(p)).length;
                                                const allSelected = selectedCount === categoryPerms.length;
                                                const isExpanded = expandedCategories[category];

                                                return (
                                                    <div key={category} className="bg-white rounded-lg shadow-sm overflow-hidden">
                                                        <div
                                                            className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 transition-colors"
                                                            onClick={() => toggleCategory(category)}
                                                        >
                                                            <div className="flex items-center gap-2 flex-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleSelectCategoryPermissions(category);
                                                                    }}
                                                                    className="flex-shrink-0"
                                                                >
                                                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${allSelected
                                                                            ? 'bg-indigo-600 border-indigo-600'
                                                                            : selectedCount > 0
                                                                                ? 'bg-indigo-200 border-indigo-400'
                                                                                : 'border-gray-300'
                                                                        }`}>
                                                                        {allSelected && (
                                                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                            </svg>
                                                                        )}
                                                                        {!allSelected && selectedCount > 0 && (
                                                                            <div className="w-2 h-2 bg-indigo-600 rounded-sm" />
                                                                        )}
                                                                    </div>
                                                                </button>
                                                                <span className="text-sm font-semibold text-gray-800">
                                                                    {category}
                                                                </span>
                                                                <span className="text-xs text-gray-500">
                                                                    ({selectedCount}/{categoryPerms.length})
                                                                </span>
                                                            </div>
                                                            {isExpanded ? (
                                                                <ChevronUp className="w-4 h-4 text-gray-400" />
                                                            ) : (
                                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                                            )}
                                                        </div>

                                                        {isExpanded && (
                                                            <div className="p-2 pt-0 border-t border-gray-100">
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                                    {perms.map((perm) => (
                                                                        <label
                                                                            key={perm.value}
                                                                            className="flex items-center gap-2 cursor-pointer hover:bg-indigo-50 p-1.5 rounded transition-colors"
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={formData.permissions.includes(perm.value)}
                                                                                onChange={() => handlePermissionChange(perm.value)}
                                                                                className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                                            />
                                                                            <span className="text-xs text-gray-700">{perm.label}</span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </form>

                            <div className="flex gap-2 p-4 border-t bg-white sticky bottom-0">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    <Save className="w-4 h-4" />
                                    {loading ? "Đang lưu..." : editingPosition ? "Cập nhật" : "Tạo mới"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}