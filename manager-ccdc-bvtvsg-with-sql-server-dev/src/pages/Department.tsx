/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, Save, Search, Building2 } from "lucide-react";
import { departmentService } from "../services/department.service";
import { unitService } from "../services/unitService";
import { useAuth } from "../contexts/authContext";
import toast from "react-hot-toast";
import { usePermission } from "../hooks/usePermission";

interface IUnit {
    id?: string;
    _id?: string;
    name: string;
    code: string;
    address?: string;
}

interface IUnitInfo {
    id: string;
    _id: string;
    name: string;
    code: string;
    address?: string;
}

interface IDepartment {
    id: string;
    name: string;
    code: string;
    unitId?: string;
    unitInfo?: IUnitInfo;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

interface IPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface IQueryParams {
    page: number;
    limit: number;
    unitId?: string;
    search?: string;
}

export default function Departments() {
    const { user } = useAuth();
    const [departments, setDepartments] = useState<IDepartment[]>([]);
    const [filterUnit, setFilterUnit] = useState<string>("");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [showModal, setShowModal] = useState<boolean>(false);
    const [units, setUnits] = useState<IUnit[]>([]);
    const [animateModal, setAnimateModal] = useState<boolean>(false);
    const [editingDepartment, setEditingDepartment] = useState<IDepartment | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [pagination, setPagination] = useState<IPagination>({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
    });

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        unitId: "",
        description: "",
    });

    const { hasPermission } = usePermission();

    const canCreate = hasPermission(['create_departments']);
    const canEdit = hasPermission(['update_departments']);
    const canDelete = hasPermission(['delete_departments']);
    const canViewAllUnits = hasPermission(['manage_departments', 'manage_units']);

    useEffect(() => {
        if (formData.name && !editingDepartment) {
            const generated = formData.name
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '_')
                .toUpperCase();
            setFormData(prev => ({ ...prev, code: generated }));
        }
    }, [formData.name, editingDepartment]);

    useEffect(() => {
        loadUnits();
    }, []);

    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [filterUnit, searchTerm]);

    useEffect(() => {
        loadDepartments();
    }, [filterUnit, pagination.page, searchTerm]);

    const loadUnits = async () => {
        try {
            const res = await unitService.getAll();
            setUnits(res?.data || []);
        } catch (err) {
            console.error(err);
            toast.error("Không thể tải danh sách đơn vị");
        }
    };

    const loadDepartments = async () => {
        try {
            setLoading(true);
            const params: IQueryParams = {
                page: pagination.page,
                limit: pagination.limit
            };

            if (filterUnit) {
                params.unitId = filterUnit;
            }

            if (searchTerm.trim()) {
                params.search = searchTerm.trim();
            }

            const response = await departmentService.getAll(params);

            if (response.success) {
                setDepartments(response.data || []);
                if (response.pagination) {
                    setPagination(prev => ({
                        ...prev,
                        total: response.pagination.total,
                        totalPages: response.pagination.totalPages
                    }));
                }
            }
        } catch (error: any) {
            console.error('Load departments error:', error);
            toast.error(error.response?.data?.message || "Không thể tải danh sách phòng ban");
        } finally {
            setLoading(false);
        }
    };

    const openModal = (dept: IDepartment | null = null) => {
        if (dept) {
            setEditingDepartment(dept);
            setFormData({
                name: dept.name || "",
                code: dept.code || "",
                unitId: dept.unitInfo?.id || dept.unitId || "",
                description: dept.description || "",
            });
        } else {
            setEditingDepartment(null);
            const defaultUnitId = !canViewAllUnits
                ? (user?.unit?.id || "")
                : "";

            setFormData({
                name: "",
                code: "",
                unitId: defaultUnitId,
                description: ""
            });
        }

        setShowModal(true);
        setTimeout(() => setAnimateModal(true), 10);
    };

    const closeModal = () => {
        setAnimateModal(false);
        setTimeout(() => {
            setShowModal(false);
            setEditingDepartment(null);
            setFormData({ name: "", code: "", unitId: "", description: "" });
        }, 300);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.code || !formData.unitId) {
            toast.error("Vui lòng nhập đầy đủ thông tin bắt buộc");
            return;
        }

        const payload = {
            name: formData.name.trim(),
            code: formData.code.toUpperCase().trim(),
            unitId: formData.unitId,
            description: formData.description?.trim() || "",
        };

        try {
            setLoading(true);
            if (editingDepartment) {
                const response = await departmentService.update(editingDepartment.id, payload);
                if (response.success) {
                    toast.success(response.message || "Cập nhật phòng ban thành công");
                }
            } else {
                const response = await departmentService.add(payload);
                if (response.success) {
                    toast.success(response.message || "Thêm phòng ban thành công");
                }
            }
            await loadDepartments();
            closeModal();
        } catch (error: any) {
            console.error("Submit error:", error);
            toast.error(error.response?.data?.message || "Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa phòng ban "${name}"?`)) return;

        try {
            setLoading(true);
            const response = await departmentService.remove(id);
            if (response.success) {
                toast.success(response.message || "Xóa phòng ban thành công");
                await loadDepartments();
            }
        } catch (error: any) {
            console.error('Delete error:', error);
            toast.error(error.response?.data?.message || "Không thể xóa phòng ban");
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    return (
        <div className="space-y-4 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Quản lý phòng ban</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Tổng số: {pagination.total} phòng ban</p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => openModal()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" /> Thêm phòng ban
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg shadow p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Search */}
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

                    {/* Unit Filter */}
                    <select
                        value={filterUnit}
                        onChange={(e) => setFilterUnit(e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="">Tất cả đơn vị</option>
                        {units?.map((unit) => (
                            <option key={unit.id || unit._id} value={unit.id || unit._id}>
                                {unit.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-3 text-sm text-gray-600">Đang tải...</p>
                    </div>
                ) : departments.length === 0 ? (
                    <div className="text-center py-12">
                        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">
                            {searchTerm || filterUnit ? "Không tìm thấy phòng ban nào" : "Chưa có phòng ban nào"}
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold">STT</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold">Mã</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold">Tên phòng ban</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold">Đơn vị</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold hidden lg:table-cell">Mô tả</th>
                                        {(canEdit || canDelete) && (
                                            <th className="px-4 py-3 text-center text-xs font-semibold w-24">Thao tác</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {departments.map((dept, idx) => (
                                        <tr
                                            key={dept.id}
                                            className={`${idx % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-indigo-50 transition-colors`}
                                        >
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {(pagination.page - 1) * pagination.limit + idx + 1}
                                            </td>
                                            <td className="px-4 py-3 text-gray-800 font-mono text-xs">
                                                {dept.code}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-800">
                                                {dept.name}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                                                    {dept.unitInfo?.name || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600 text-xs hidden lg:table-cell max-w-xs truncate">
                                                {dept.description || "-"}
                                            </td>
                                            {(canEdit || canDelete) && (
                                                <td className="px-4 py-3">
                                                    <div className="flex justify-center gap-1">
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => openModal(dept)}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                                                title="Chỉnh sửa"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleDelete(dept.id, dept.name)}
                                                                className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                                                title="Xóa"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
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

                        {pagination.totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t bg-gray-50 gap-3">
                                <div className="text-xs text-gray-600">
                                    Trang {pagination.page} / {pagination.totalPages} ({pagination.total} phòng ban)
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handlePageChange(1)}
                                        disabled={pagination.page === 1}
                                        className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ««
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        «
                                    </button>

                                    {[...Array(pagination.totalPages)].map((_, idx) => {
                                        const page = idx + 1;
                                        if (
                                            page === 1 ||
                                            page === pagination.totalPages ||
                                            (page >= pagination.page - 1 && page <= pagination.page + 1)
                                        ) {
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => handlePageChange(page)}
                                                    className={`px-2 py-1 text-xs border rounded ${pagination.page === page
                                                        ? "bg-indigo-600 text-white"
                                                        : "hover:bg-gray-100"
                                                        }`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        } else if (page === pagination.page - 2 || page === pagination.page + 2) {
                                            return <span key={page} className="px-1 text-xs">...</span>;
                                        }
                                        return null;
                                    })}

                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        »
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination.totalPages)}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="px-2 py-1 text-xs border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        »»
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div
                        className={`fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300 ${animateModal ? "opacity-100" : "opacity-0"
                            }`}
                    ></div>
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div
                            className={`relative bg-white rounded-xl shadow-2xl w-full max-w-lg
                                transform transition-all duration-300 ease-out
                                ${animateModal ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
                        >
                            <div className="flex justify-between items-center p-4 border-b border-gray-200">
                                <h2 className="text-xl font-bold text-gray-800">
                                    {editingDepartment ? "Sửa phòng ban" : "Thêm phòng ban"}
                                </h2>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>


                            <div className="p-4 space-y-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Tên phòng ban <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        placeholder="VD: Nhân sự hành chính, Tài chính kế toán..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Mã phòng ban <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                                        placeholder="Tự động tạo từ tên"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Mã sẽ tự động tạo từ tên phòng ban</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Đơn vị <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={formData.unitId}
                                        onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        disabled={!canViewAllUnits}
                                    >
                                        <option value="">-- Chọn đơn vị --</option>
                                        {units
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map((unit) => (
                                                <option key={unit.id || unit._id} value={unit.id || unit._id}>
                                                    {unit.name}
                                                </option>
                                            ))}
                                    </select>
                                    {!canViewAllUnits && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Bạn chỉ có thể tạo phòng ban trong đơn vị của mình
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Mô tả
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                        placeholder="Nhập mô tả về phòng ban..."
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 p-4 border-t border-gray-200">
                                <button
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                >
                                    <Save className="w-4 h-4" />
                                    {loading ? "Đang lưu..." : "Lưu"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}