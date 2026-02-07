/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";
import { Search, Plus, Pencil, Trash2, X, Save, Clock, Eye, ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from "lucide-react";
import { toolService } from "../services/tool.service";
import { employeeService } from "../services/employee.service";
import { unitService } from "../services/unitService";
import { useAuth } from "../contexts/authContext";
import { departmentService } from "../services/department.service";
import toast from "react-hot-toast";
import { positionService } from "../services/positionService";
import { accessoryService } from '../services/accessory.service';
import { usePermission } from "../hooks/usePermission";
import { createPortal } from 'react-dom';

interface IEmployee {
    id: string;
    code: string;
    name: string;
    email: string;
    username: string;
    phone?: string;
    status: string;
    address?: string;
    joinDate?: string;
    dateOfBirth?: string;
    unitInfo?: {
        id: string;
        name: string;
    };
    departmentInfo?: {
        id: string;
        name: string;
    };
    positionInfo?: {
        id: string;
        name: string;
    };
}

interface IUnit {
    id?: string;
    name: string;
    code: string;
}

interface IDepartment {
    id: string;
    name: string;
    code: string;
}

interface IPosition {
    id?: string;
    name: string;
    code: string;
}


const ModalPortal = ({ children }: { children: React.ReactNode }) => {
    return createPortal(children, document.body);
};


export default function Employees() {
    const { user } = useAuth();

    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [selectedToolConfig, setSelectedToolConfig] = useState<any>(null);
    const [loadingConfig, setLoadingConfig] = useState(false);

    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [employees, setEmployees] = useState<IEmployee[]>([]);
    const [units, setUnits] = useState<IUnit[]>([]);
    const [positions, setPositions] = useState<IPosition[]>([]);
    const [departments, setDepartments] = useState<IDepartment[]>([]);
    const [modalDepartments, setModalDepartments] = useState<IDepartment[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDept, setFilterDept] = useState("");
    const [filterStatus, setFilterStatus] = useState("active");
    const [showModal, setShowModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<IEmployee | null>(null);
    const [loading, setLoading] = useState(false);
    const [toolModalVisible, setToolModalVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState("Tất cả");
    const [selectedEmployeeTools, setSelectedEmployeeTools] = useState<any[]>([]);
    const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
    const [loadingTools, setLoadingTools] = useState(false);

    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [limit] = useState(10);

    const [formData, setFormData] = useState({
        code: "",
        name: "",
        email: "",
        username: "",
        password: "",
        phone: "",
        unitId: "",
        departmentId: "",
        positionId: "",
        address: "",
        joinDate: new Date().toISOString().split('T')[0],
        dateOfBirth: "",
    });


    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    const { hasPermission } = usePermission();

    const canCreate = hasPermission(['create_employee']);
    const canEdit = hasPermission(['update_employee']);
    const canDelete = hasPermission(['delete_soft_employee']);
    const canPermanentDelete = hasPermission(['permanent_delete_employee']);
    const canRestore = hasPermission(['restore_employee']);

    const loadDepartment = useCallback(async () => {
        try {
            const data = await departmentService.getAll();
            setDepartments(data.data || []);
            setModalDepartments(data.data || []);
        } catch (error) {
            console.error("Load department error:", error);
        }
    }, [])

    const loadUnits = useCallback(async () => {
        try {
            const data = await unitService.getAll();
            setUnits(data.data || []);
        } catch (error) {
            console.error("Load units error:", error);
        }
    }, []);

    const loadEmployees = useCallback(async () => {
        try {
            setLoading(true);
            const params: any = {
                page: currentPage,
                limit: itemsPerPage,
            };

            if (filterDept) params.departmentId = filterDept;
            if (filterStatus) params.status = filterStatus;

            const response = await employeeService.getAll(params);
            setEmployees(response.data || []);
            setTotal(response.total || 0);
            setTotalItems(response.total || 0);
            setTotalPages(response.totalPages || 1);
            setCurrentPage(response.currentPage || 1);
        } catch (error: any) {
            console.error("Load employees error:", error);
            toast.error(error.response?.data?.message || "Không thể tải danh sách nhân viên");
            setTotalItems(0);
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, filterDept, filterStatus]);


    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setSelectedIds([]);
        setSelectAll(false);
        setCurrentPage(1);
    }, [filterDept, filterStatus]);

    useEffect(() => {
        loadEmployees();
    }, [loadEmployees]);

    useEffect(() => {
        loadDepartment();
    }, [loadDepartment]);

    useEffect(() => {
        loadUnits();
    }, [loadUnits]);

    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (searchTerm.trim() === "") {
                setCurrentPage(1);
                try {
                    setLoading(true);
                    const params: any = {
                        page: 1,
                        limit: itemsPerPage,
                    };
                    if (filterDept) params.departmentId = filterDept;
                    if (filterStatus) params.status = filterStatus;

                    const response = await employeeService.getAll(params);
                    setEmployees(response.data || []);
                    setTotal(response.total || 0);
                    setTotalPages(response.totalPages || 1);
                    setCurrentPage(response.currentPage || 1);
                } catch (error: any) {
                    console.error("Load employees error:", error);
                    toast.error(error.response?.data?.message || "Không thể tải danh sách nhân viên");
                } finally {
                    setLoading(false);
                }
            } else {
                try {
                    setLoading(true);
                    const params: any = {};
                    if (filterDept) params.departmentId = filterDept;

                    const data = await employeeService.search(searchTerm, params);
                    setEmployees(data.data || []);
                    setTotal(data.count || 0);
                    setTotalPages(1);
                    setCurrentPage(1);
                } catch (error: any) {
                    console.error("Search error:", error);
                    toast.error(error.response?.data?.message || "Lỗi tìm kiếm");
                } finally {
                    setLoading(false);
                }
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchTerm, filterDept, limit, filterStatus, itemsPerPage, currentPage]);

    useEffect(() => {
        if (formData.unitId) {
            loadDepartmentsByUnit(formData.unitId);
        } else {
            setModalDepartments([]);
            setPositions([]);
        }
    }, [formData.unitId]);

    useEffect(() => {
        if (formData.departmentId) {
            loadPositionsByDepartment(formData.departmentId);
        } else {
            setPositions([]);
        }
    }, [formData.departmentId]);

    const openToolModal = async (employee: IEmployee) => {
        try {
            setLoadingTools(true);
            const employeeId = employee.id;
            setSelectedEmployeeName(employee.name);
            const data = await toolService.getByEmployee(employeeId);
            setSelectedEmployeeTools(data.data || []);
            setToolModalVisible(true);
        } catch (error) {
            console.error(error);
            toast.error("Không thể tải công cụ của nhân viên");
        } finally {
            setLoadingTools(false);
        }
    };

    const openConfigModal = async (toolId: string) => {
        try {
            setLoadingConfig(true);
            const res = await accessoryService.getFullConfiguration(toolId);
            if (res.data?.success === false) {
                toast.error("Không tìm thấy công cụ hoặc đã bị xoá");
                return;
            }
            setSelectedToolConfig(res.data);
            setConfigModalVisible(true);
        } catch (error: any) {
            console.error("Load full config error:", error);
            if (error.response && error.response.status === 404) {
                toast.error("Công cụ này đã bị xoá hoặc không còn tồn tại");
                setConfigModalVisible(false);
                setSelectedToolConfig(null);
            } else {
                toast.error("Không thể tải cấu hình chi tiết");
            }
        } finally {
            setLoadingConfig(false);
        }
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedIds([]);
            setSelectAll(false);
        } else {
            const allIds = employees.map((emp) => emp.id);
            setSelectedIds(allIds);
            setSelectAll(true);
        }
    };

    const handleSelectOne = (id: string) => {
        if (selectedIds.includes(id)) {
            const newSelected = selectedIds.filter((selectedId) => selectedId !== id);
            setSelectedIds(newSelected);
            setSelectAll(false);
        } else {
            const newSelected = [...selectedIds, id];
            setSelectedIds(newSelected);
            if (newSelected.length === employees.length) {
                setSelectAll(true);
            }
        }
    };

    const uniqueCategories = [
        "Tất cả",
        ...new Set(
            selectedEmployeeTools.map((tool) => tool.category?.name || "Khác")
        ),
    ];

    const loadDepartmentsByUnit = async (unitId: string) => {
        try {
            const res = await departmentService.getAll({ unitId });
            setModalDepartments(res?.data || []);
        } catch (error) {
            console.error("Load departments by unit error:", error);
            toast.error("Không thể tải danh sách phòng ban");
        }
    };

    const loadPositionsByDepartment = async (departmentId: string) => {
        try {
            const res = await positionService.getAll({ department: departmentId });
            setPositions(res?.data || []);
        } catch (error) {
            console.error("Load positions by department error:", error);
            toast.error("Không thể tải danh sách chức vụ");
        }
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            loadEmployees();
            return;
        }

        try {
            setLoading(true);
            const params: any = {};
            if (filterDept) params.departmentId = filterDept;

            const data = await employeeService.search(searchTerm, params);
            setEmployees(data.data || []);
            setTotal(data.count || 0);
            setTotalPages(1);
            setCurrentPage(1);
        } catch (error: any) {
            console.error("Search error:", error);
            toast.error(error.response?.data?.message || "Lỗi tìm kiếm");
        } finally {
            setLoading(false);
        }
    };

    const openModal = async (employee: IEmployee | null = null) => {
        if (employee) {
            setEditingEmployee(employee);

            const unitId = employee.unitInfo?.id || "";
            const departmentId = employee.departmentInfo?.id || "";
            const positionId = employee.positionInfo?.id || "";

            if (unitId) {
                await loadDepartmentsByUnit(unitId);
            }
            if (departmentId) {
                await loadPositionsByDepartment(departmentId);
            }

            setFormData({
                code: employee.code || "",
                name: employee.name || "",
                email: employee.email || "",
                username: employee.username || "",
                password: "",
                phone: employee.phone || "",
                unitId: unitId,
                departmentId: departmentId,
                positionId: positionId,
                address: employee.address || "",
                joinDate: employee.joinDate ? employee.joinDate.split('T')[0] : "",
                dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split('T')[0] : "",
            });
        } else {
            setEditingEmployee(null);
            setModalDepartments([]);
            setPositions([]);

            const canViewAllEmployees = hasPermission(['view_all_employees']);
            const defaultUnitId = !canViewAllEmployees ? (user?.unit?.id || "") : "";

            setFormData({
                code: "",
                name: "",
                email: "",
                username: "",
                password: "",
                phone: "",
                unitId: defaultUnitId,
                departmentId: "",
                positionId: "",
                address: "",
                joinDate: new Date().toISOString().split('T')[0],
                dateOfBirth: "",
            });

            if (defaultUnitId) {
                await loadDepartmentsByUnit(defaultUnitId);
            }
        }
        setShowModal(true);
    };

    const closeModal = useCallback(() => {
        setShowModal(false);
        setEditingEmployee(null);
        setModalDepartments([]);
        setPositions([]);
        setFormData({
            code: "",
            name: "",
            email: "",
            username: "",
            password: "",
            phone: "",
            unitId: "",
            departmentId: "",
            positionId: "",
            address: "",
            joinDate: "",
            dateOfBirth: "",
        });
    }, []);

    const handleSubmit = async () => {
        const requiredFields = editingEmployee
            ? ['code', 'name', 'username', 'unitId', 'departmentId', 'positionId', 'address', 'joinDate', 'dateOfBirth']
            : ['code', 'name', 'email', 'username', 'password', 'unitId', 'departmentId', 'positionId', 'address', 'joinDate', 'dateOfBirth'];

        const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);

        if (missingFields.length > 0) {
            toast.error("Vui lòng điền đầy đủ thông tin bắt buộc");
            return;
        }

        try {
            setLoading(true);

            const submitData: any = { ...formData };

            if (editingEmployee) {
                delete submitData.email;

                if (!formData.password || formData.password.trim() === "") {
                    delete submitData.password;
                }
            }

            if (editingEmployee) {
                await employeeService.update(editingEmployee.id, submitData);
                toast.success("Cập nhật nhân viên thành công");
            } else {
                await employeeService.create(submitData);
                toast.success("Thêm nhân viên thành công");
            }

            await loadEmployees();
            closeModal();
        } catch (error: any) {
            console.error("Submit error:", error);
            toast.error(error.response?.data?.message || "Có lỗi xảy ra");
        } finally {
            setLoading(false);
        }
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const form = new FormData();
        form.append("file", file);

        try {
            setLoading(true);
            await employeeService.importExcel(form);
            toast.success("Nhập excel thành công");
            await loadEmployees();
        } catch (error: any) {
            console.error("Import excel error:", error);
            toast.error(error.response?.data?.message || "Nhập Excel thất bại");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!canDelete) {
            toast.error("Bạn không có quyền xóa nhân viên");
            return;
        }

        if (!confirm("Bạn có chắc chắn muốn kết thúc hợp đồng lao động với nhân viên này?")) return;

        try {
            setLoading(true);
            await employeeService.delete(id);
            toast.success("Xóa nhân viên thành công");
            await loadEmployees();
        } catch (error: any) {
            console.error("Delete error:", error);
            toast.error(error.response?.data?.message || "Không thể xóa nhân viên");
        } finally {
            setLoading(false);
        }
    };

    const handlePermanentDelete = async (id: string) => {
        if (!canPermanentDelete) {
            toast.error("Chỉ Super Admin có quyền xóa vĩnh viễn");
            return;
        }

        if (!confirm("Bạn có chắc chắn muốn XÓA VĨNH VIỄN nhân viên này? Hành động này không thể hoàn tác!")) return;

        try {
            setLoading(true);
            await employeeService.permanentDelete(id);
            toast.success("Xóa vĩnh viễn nhân viên thành công");
            await loadEmployees();
        } catch (error: any) {
            console.error("Permanent delete error:", error);
            toast.error(error.response?.data?.message || "Không thể xóa vĩnh viễn nhân viên");
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (id: string) => {
        if (!canRestore) {
            toast.error("Bạn không có quyền khôi phục nhân viên");
            return;
        }

        if (!confirm("Bạn có chắc chắn muốn khôi phục nhân viên này?")) return;

        try {
            setLoading(true);
            await employeeService.restore(id);
            toast.success("Khôi phục nhân viên thành công");
            await loadEmployees();
        } catch (error: any) {
            console.error("Restore error:", error);
            toast.error(error.response?.data?.message || "Không thể khôi phục nhân viên");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (!canDelete) {
            toast.error("Bạn không có quyền xóa nhân viên");
            return;
        }

        if (selectedIds.length === 0) {
            toast.error("Vui lòng chọn ít nhất một nhân viên để xóa");
            return;
        }

        if (!confirm(`Bạn có chắc chắn xóa ${selectedIds.length} nhân viên đã chọn?`)) return;

        try {
            setLoading(true);
            for (const id of selectedIds) {
                await employeeService.delete(id);
            }
            toast.success(`Đã xóa ${selectedIds.length} nhân viên thành công`);
            setSelectedIds([]);
            setSelectAll(false);
            await loadEmployees();
        } catch (error: any) {
            console.error("Delete selected error:", error);
            toast.error(error.response?.data?.message || "Có lỗi xảy ra khi xóa");
        } finally {
            setLoading(false);
        }
    };

    // const handlePageChange = (newPage: number) => {
    //     if (newPage >= 1 && newPage <= totalPages) {
    //         setCurrentPage(newPage);
    //     }
    // };

    const getModalWidth = () => {
        if (windowWidth > 1024) return "900px";
        if (windowWidth > 768) return "700px";
        return "95%";
    };

    const getToolModalWidth = () => {
        if (windowWidth > 1024) return "95%";
        return "98%";
    };

    const getToolModalHeight = () => {
        if (windowWidth > 1024) return "90vh";
        return "85vh";
    };


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
                        Quản lý nhân viên
                    </h1>
                    <p className="text-gray-500 mt-4 text-xs sm:text-sm">
                        Tổng số: {total} nhân viên
                    </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                    {canCreate && (
                        <button
                            onClick={() => openModal()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg flex items-center gap-2 transition-all shadow-lg text-sm"
                        >
                            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">Thêm nhân viên</span>
                            <span className="sm:hidden">Thêm</span>
                        </button>
                    )}

                    <label className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg shadow-md cursor-pointer flex items-center gap-2 text-sm">
                        <span className="hidden sm:inline">Nhập Excel</span>
                        <span className="sm:hidden">Excel</span>
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleImportExcel}
                            className="hidden"
                        />
                    </label>

                    {canDelete && selectedIds.length > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            disabled={loading}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg disabled:opacity-50 text-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Xóa {selectedIds.length}</span>
                            <span className="sm:hidden">{selectedIds.length}</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 lg:p-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2 sm:gap-3">
                    <div className="md:col-span-2 relative">
                        <Search className="w-4 h-4 absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSearchTerm(value);
                                if (value.trim() === "") {
                                    setCurrentPage(1);
                                    loadEmployees();
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    setCurrentPage(1);
                                    handleSearch();
                                }
                            }}
                            className="w-full pl-8 pr-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                        />
                    </div>

                    <select
                        value={filterDept}
                        onChange={(e) => {
                            setFilterDept(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                    >
                        <option value="">Tất cả phòng ban</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => {
                            setFilterStatus(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="active">Đang làm</option>
                        <option value="inactive">Đã nghỉ</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {loading ? (
                    <div className="p-8 sm:p-12 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-3 sm:mt-4 text-gray-600 text-sm">Đang tải...</p>
                    </div>
                ) : employees.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                        <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                        <p className="text-gray-500 text-sm">Chưa có nhân viên nào</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="min-w-full text-xs border-collapse">
                                <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                                    <tr>
                                        {canDelete && (
                                            <th className="px-3 py-2 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectAll}
                                                    onChange={handleSelectAll}
                                                    className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                />
                                            </th>
                                        )}
                                        <th className="px-3 py-2 text-center font-semibold">Mã NV</th>
                                        <th className="px-3 py-2 text-center font-semibold">Họ tên</th>
                                        <th className="px-3 py-2 text-left font-semibold">Tài khoản</th>
                                        <th className="px-3 py-2 text-left font-semibold">Chức vụ</th>
                                        <th className="px-3 py-2 text-left font-semibold">Đơn vị</th>
                                        <th className="px-3 py-2 text-left font-semibold">Phòng ban</th>
                                        <th className="px-3 py-2 text-center font-semibold">TT</th>
                                        {(canEdit || canDelete || canPermanentDelete || canRestore) && (
                                            <th className="px-3 py-2 text-center font-semibold">Thao tác</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {employees.map((emp, idx) => (
                                        <tr
                                            key={emp.id}
                                            className={`${idx % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-indigo-50 transition-colors`}
                                        >
                                            {canDelete && (
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(emp.id)}
                                                        onChange={() => handleSelectOne(emp.id)}
                                                        className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-2 py-2 font-medium text-gray-800 text-center">
                                                {emp.code}
                                            </td>
                                            <td
                                                onClick={() => openToolModal(emp)}
                                                className="px-2 py-2 font-medium text-gray-800 text-center cursor-pointer hover:text-indigo-600 transition-colors max-w-[120px] truncate"
                                            >
                                                {emp.name}
                                            </td>
                                            <td className="px-2 py-2 text-gray-600 max-w-[100px] truncate">
                                                {emp.username}
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[10px] font-medium whitespace-nowrap">
                                                    {emp.positionInfo?.name || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-medium whitespace-nowrap">
                                                    {emp.unitInfo?.name || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 max-w-[120px] truncate">
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
                                                    {emp.departmentInfo?.name || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${emp.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                                                >
                                                    {emp.status === "active" ? "Đang làm" : "Đã Nghỉ"}
                                                </span>
                                            </td>
                                            {(canEdit || canDelete || canPermanentDelete || canRestore) && (
                                                <td className="px-2 py-2">
                                                    <div className="flex justify-center gap-0.5">
                                                        <button
                                                            onClick={() => openToolModal(emp)}
                                                            className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded transition-colors"
                                                            title="Xem chi tiết"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        {canEdit && emp.status === "active" && (
                                                            <button
                                                                onClick={() => openModal(emp)}
                                                                className="p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                                title="Sửa"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {canDelete && emp.status === "active" && (
                                                            <button
                                                                onClick={() => handleDelete(emp.id)}
                                                                className="p-1 text-orange-600 hover:bg-orange-100 rounded-lg transition-colors"
                                                                title="Xóa"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {canRestore && emp.status === "inactive" && (
                                                            <button
                                                                onClick={() => handleRestore(emp.id)}
                                                                className="p-1 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                                                title="Khôi phục"
                                                            >
                                                                <Save className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        {canPermanentDelete && emp.status === "inactive" && (
                                                            <button
                                                                onClick={() => handlePermanentDelete(emp.id)}
                                                                className="p-1 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                                title="Xóa vĩnh viễn"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
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
                        {/* Mobile view */}
                        <div className="lg:hidden space-y-3 p-3">
                            {employees.map((emp) => (
                                <div
                                    key={emp.id}
                                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3 flex-1">
                                            {canDelete && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(emp.id)}
                                                    onChange={() => handleSelectOne(emp.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h3
                                                    onClick={() => openToolModal(emp)}
                                                    className="text-base font-semibold text-gray-800 cursor-pointer hover:text-indigo-600 transition-colors truncate"
                                                >
                                                    {emp.name}
                                                </h3>
                                                <p className="text-sm text-gray-500 mt-0.5">
                                                    {emp.code}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 ml-2 ${emp.status === "active"
                                                ? "bg-green-100 text-green-700"
                                                : "bg-red-100 text-red-700"
                                                }`}
                                        >
                                            {emp.status === "active" ? "Đang làm" : "Đã nghỉ"}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                                        <div>
                                            <span className="text-gray-500 text-xs block mb-1">Tài khoản:</span>
                                            <span className="text-gray-900 font-medium truncate block">
                                                {emp.username}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs block mb-1">Chức vụ:</span>
                                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium inline-block">
                                                {emp.positionInfo?.name || "N/A"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs block mb-1">Đơn vị:</span>
                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium inline-block truncate max-w-full">
                                                {emp.unitInfo?.name || "N/A"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 text-xs block mb-1">Phòng ban:</span>
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium inline-block truncate max-w-full">
                                                {emp.departmentInfo?.name || "N/A"}
                                            </span>
                                        </div>
                                    </div>

                                    {(canEdit || canDelete || canPermanentDelete || canRestore) && (
                                        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                                            {canEdit && emp.status === "active" && (
                                                <button
                                                    onClick={() => openModal(emp)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                    Sửa
                                                </button>
                                            )}
                                            {canDelete && emp.status === "active" && (
                                                <button
                                                    onClick={() => handleDelete(emp.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Xóa
                                                </button>
                                            )}
                                            {canRestore && emp.status === "inactive" && (
                                                <button
                                                    onClick={() => handleRestore(emp.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                                                >
                                                    <Save className="w-3.5 h-3.5" />
                                                    Khôi phục
                                                </button>
                                            )}
                                            {canPermanentDelete && emp.status === "inactive" && (
                                                <button
                                                    onClick={() => handlePermanentDelete(emp.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    Xóa vĩnh viễn
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

            {toolModalVisible && (
                <ModalPortal>
                    <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-50 backdrop-blur-sm bg-white/30 transition-all duration-300 animate-fadeIn">
                        <div
                            style={{ width: getToolModalWidth(), height: getToolModalHeight() }}
                            className="bg-white rounded-xl shadow-2xl overflow-y-auto p-4 sm:p-8 transform transition-all duration-300 scale-95 animate-slideUp"
                        >
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                                <h2 className="text-lg sm:text-xl font-bold">
                                    Công cụ của {selectedEmployeeName}
                                </h2>
                                <button
                                    onClick={() => setToolModalVisible(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                            </div>

                            {loadingTools ? (
                                <div className="text-center py-6">
                                    <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-indigo-600 mx-auto"></div>
                                </div>
                            ) : selectedEmployeeTools.length === 0 ? (
                                <p className="text-gray-500 text-sm">Nhân viên này chưa sở hữu công cụ nào.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <label htmlFor="categoryFilter" className="text-xs sm:text-sm text-gray-600">
                                                Danh mục:
                                            </label>
                                            <select
                                                id="categoryFilter"
                                                value={selectedCategory}
                                                onChange={(e) => setSelectedCategory(e.target.value)}
                                                className="border border-gray-300 rounded-lg px-2 py-1 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none"
                                            >
                                                {uniqueCategories.map((cat) => (
                                                    <option key={cat} value={cat}>
                                                        {cat}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <table className="w-full table-auto border border-gray-200 text-[10px] sm:text-xs">
                                        <thead className="bg-indigo-100 text-gray-700">
                                            <tr>
                                                <th className="px-2 py-1.5 border-b">Mã</th>
                                                <th className="px-2 py-1.5 border-b">Tên</th>
                                                <th className="px-2 py-1.5 border-b">Danh mục</th>
                                                <th className="px-2 py-1.5 border-b">Hãng</th>
                                                <th className="px-2 py-1.5 border-b">Ngày mua</th>
                                                <th className="px-2 py-1.5 border-b">Giá</th>
                                                <th className="px-2 py-1.5 border-b">BH</th>
                                                <th className="px-2 py-1.5 border-b">TT</th>
                                                <th className="px-2 py-1.5 border-b">Tình trạng</th>
                                                <th className="px-2 py-1.5 border-b">Chi nhánh</th>
                                                <th className="px-2 py-1.5 border-b">Ngày giao</th>
                                                <th className="px-2 py-1.5 border-b">Ghi chú</th>
                                                <th className="px-2 py-1.5 border-b">BH còn</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...selectedEmployeeTools]
                                                .filter(
                                                    (tool) =>
                                                        selectedCategory === "Tất cả" ||
                                                        (tool.category?.name || "Khác") === selectedCategory
                                                )
                                                .sort((a, b) =>
                                                    (a.category?.name || "").localeCompare(b.category?.name || "")
                                                )
                                                .map((tool) => (
                                                    <tr key={tool.id} className="hover:bg-indigo-50 transition-colors">
                                                        <td className="px-1.5 text-center py-1 border-b">{tool.code}</td>
                                                        <td
                                                            onClick={() => openConfigModal(tool.id)}
                                                            className="px-1.5 text-center py-1 border-b text-indigo-600 cursor-pointer hover:underline max-w-[120px] truncate"
                                                        >
                                                            {tool.name}
                                                        </td>
                                                        <td className="px-1.5 text-center py-1 border-b">{tool.category?.name || "-"}</td>
                                                        <td className="px-1.5 text-center py-1 border-b">{tool.brand || "-"}</td>
                                                        <td className="px-1.5 text-center py-1 border-b whitespace-nowrap">
                                                            {tool.purchaseDate
                                                                ? new Date(tool.purchaseDate).toLocaleDateString("vi-VN")
                                                                : "-"}
                                                        </td>
                                                        <td className="px-1.5 text-center py-1 border-b whitespace-nowrap">
                                                            {tool.purchasePrice ? tool.purchasePrice.toLocaleString() + " đ" : "-"}
                                                        </td>
                                                        <td className="px-1.5 text-center py-1 border-b whitespace-nowrap">
                                                            {tool.warrantyUntil
                                                                ? new Date(tool.warrantyUntil).toLocaleDateString("vi-VN")
                                                                : "-"}
                                                        </td>
                                                        <td className="px-1.5 text-center py-1 border-b">{tool.status}</td>
                                                        <td className="px-1.5 text-center py-1 border-b">{tool.condition}</td>
                                                        <td className="px-1.5 text-center py-1 border-b">{tool.unitId?.name || "-"}</td>
                                                        <td className="px-1.5 text-center py-1 border-b whitespace-nowrap">
                                                            {tool.assignedDate
                                                                ? new Date(tool.assignedDate).toLocaleDateString("vi-VN")
                                                                : new Date(tool.dateOfReceipt).toLocaleDateString("vi-VN")}
                                                        </td>
                                                        <td className="px-1.5 text-center py-1 border-b max-w-[100px] truncate">
                                                            {tool.description || "-"}
                                                        </td>
                                                        <td className="px-1.5 py-1 border-b text-center">
                                                            {tool.isUnderWarranty ? "✅" : "❌"}
                                                        </td>
                                                    </tr>
                                                ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </ModalPortal>
            )}

            {configModalVisible && (
                <ModalPortal>
                    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-md bg-gradient-to-br from-black/50 to-black/30 transition-all duration-300 animate-fadeIn">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col animate-fadeIn border border-gray-100 transform transition-all duration-300 scale-95 animate-slideUp">
                            <div className="flex items-center justify-between px-8 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                                <div>
                                    <h2 className="text-3xl font-bold tracking-tight">
                                        Cấu hình chi tiết công cụ
                                    </h2>
                                    <p className="text-indigo-100 text-sm mt-1">
                                        Xem thông tin đầy đủ về thành phần và linh kiện
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        setConfigModalVisible(false);
                                        setSelectedToolConfig(null);
                                    }}
                                    className="text-white/90 hover:text-white hover:bg-white/20 rounded-full p-2 transition-all duration-200"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-8 flex-1">
                                {loadingConfig ? (
                                    <div className="text-center py-20">
                                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
                                        <p className="text-gray-500 mt-4 font-medium">
                                            Đang tải cấu hình...
                                        </p>
                                    </div>
                                ) : selectedToolConfig ? (
                                    <div className="space-y-8">
                                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="text-2xl font-bold text-indigo-900 mb-3 flex items-center gap-2">
                                                        <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                                                            {selectedToolConfig.tool.code}
                                                        </span>
                                                        {selectedToolConfig.tool.name}
                                                    </h3>
                                                    <div className="grid grid-cols-2 gap-4 text-gray-700">
                                                        <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                                                            <p className="text-sm text-gray-600 font-medium mb-1">
                                                                👤 Người giữ
                                                            </p>
                                                            <p className="font-semibold text-gray-900">
                                                                {selectedToolConfig.tool.assignedTo?.name ||
                                                                    "Chưa có"}
                                                            </p>
                                                            <p className="text-sm text-indigo-600">
                                                                {selectedToolConfig.tool.assignedTo?.position
                                                                    ?.name || ""}
                                                            </p>
                                                        </div>
                                                        <div className="bg-white/60 rounded-xl p-4 backdrop-blur-sm">
                                                            <p className="text-sm text-gray-600 font-medium mb-1">
                                                                💰 Giá mua
                                                            </p>
                                                            <p className="text-2xl font-bold text-indigo-700">
                                                                {selectedToolConfig.tool.purchasePrice?.toLocaleString()}{" "}
                                                                đ
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex items-center justify-between mb-4 mt-5">
                                                <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                                                    <span className="text-3xl">🔧</span>
                                                    Danh sách bộ phận
                                                </h3>
                                                <span className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-md">
                                                    {selectedToolConfig.summary.totalSubTools} bộ phận
                                                </span>
                                            </div>

                                            <div className="space-y-4">
                                                {selectedToolConfig.configuration.map((item: any, idx: any) => (
                                                    <div
                                                        key={idx}
                                                        className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:border-indigo-300"
                                                    >
                                                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 text-white">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <p className="font-bold text-xl">
                                                                            {item.subTool.name}
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex gap-4 text-sm text-indigo-100">
                                                                    </div>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm text-indigo-100 mb-1">
                                                                        Giá trị
                                                                    </p>
                                                                    <p className="text-2xl font-bold bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                                                                        {item.subTool.purchasePrice?.toLocaleString()}{" "}
                                                                        đ
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {item.accessories.length > 0 ? (
                                                            <div className="overflow-x-auto">
                                                                <table className="w-full text-sm">
                                                                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                                                        <tr>
                                                                            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-indigo-200">
                                                                                ⚙️ Tên linh kiện
                                                                            </th>
                                                                            <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-indigo-200">
                                                                                ✅ Tình trạng
                                                                            </th>
                                                                            <th className="px-4 py-3 text-right font-semibold text-gray-700 border-b-2 border-indigo-200">
                                                                                💵 Giá
                                                                            </th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-200">
                                                                        {item.accessories.map((comp: any) => (
                                                                            <tr
                                                                                key={comp.id}
                                                                                className="hover:bg-indigo-50/50 transition-colors duration-150"
                                                                            >
                                                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                                                    {comp.name}
                                                                                </td>
                                                                                <td className="px-4 py-3">
                                                                                    <span
                                                                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${comp.condition === "Tốt"
                                                                                            ? "bg-green-100 text-green-700"
                                                                                            : comp.condition === "Khá"
                                                                                                ? "bg-blue-100 text-blue-700"
                                                                                                : comp.condition === "Trung bình"
                                                                                                    ? "bg-yellow-100 text-yellow-700"
                                                                                                    : "bg-red-100 text-red-700"
                                                                                            }`}
                                                                                    >
                                                                                        {comp.condition}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-right font-semibold text-indigo-700">
                                                                                    {comp.purchasePrice?.toLocaleString()} đ
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        ) : (
                                                            <div className="text-center py-8 bg-gray-50">
                                                                <p className="text-gray-400 text-sm italic flex items-center justify-center gap-2">
                                                                    <span className="text-2xl">📭</span>
                                                                    Không có linh kiện nào
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 rounded-2xl p-6 shadow-lg mt-6">
                                            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                                <span className="text-3xl">📊</span>
                                                Tổng kết
                                            </h3>

                                            <div className="grid grid-cols-3 gap-4 mb-6">
                                                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow duration-200">
                                                    <p className="text-gray-600 text-sm font-medium mb-1">
                                                        Bộ phận
                                                    </p>
                                                    <p className="text-3xl font-bold text-indigo-600">
                                                        {selectedToolConfig.summary.totalSubTools}
                                                    </p>
                                                </div>
                                                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow duration-200">
                                                    <p className="text-gray-600 text-sm font-medium mb-1">
                                                        Linh kiện
                                                    </p>
                                                    <p className="text-3xl font-bold text-purple-600">
                                                        {selectedToolConfig.summary.totalAccessorys}
                                                    </p>
                                                </div>
                                                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center shadow-sm hover:shadow-md transition-shadow duration-200">
                                                    <p className="text-gray-600 text-sm font-medium mb-1">
                                                        Tổng giá trị
                                                    </p>
                                                    <p className="text-2xl font-bold text-pink-600">
                                                        {selectedToolConfig.tool.purchasePrice?.toLocaleString()}{" "}
                                                        đ
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-5 space-y-3">
                                                <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                    <span>💎</span>
                                                    Chi tiết giá trị
                                                </h4>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors duration-200">
                                                        <span className="text-gray-700 font-medium flex items-center gap-2">
                                                            <span className="text-xl">🧩</span>
                                                            CCDC
                                                        </span>
                                                        <span className="font-bold text-indigo-700 text-lg">
                                                            {selectedToolConfig.summary.breakdown.tool.toLocaleString()}{" "}
                                                            đ
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200">
                                                        <span className="text-gray-700 font-medium flex items-center gap-2">
                                                            <span className="text-xl">🧱</span>
                                                            Thành phần
                                                        </span>
                                                        <span className="font-bold text-purple-700 text-lg">
                                                            {selectedToolConfig.summary.breakdown.subTools.toLocaleString()}{" "}
                                                            đ
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center p-3 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors duration-200">
                                                        <span className="text-gray-700 font-medium flex items-center gap-2">
                                                            <span className="text-xl">⚙️</span>
                                                            Linh kiện
                                                        </span>
                                                        <span className="font-bold text-pink-700 text-lg">
                                                            {selectedToolConfig.summary.breakdown.accessories.toLocaleString()}{" "}
                                                            đ
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-20">
                                        <span className="text-6xl mb-4 block">📭</span>
                                        <p className="text-gray-500 text-lg">
                                            Không có dữ liệu cấu hình
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}

            {
                showModal && (
                    <ModalPortal>
                        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm bg-white/30 transition-all duration-300 animate-fadeIn">
                            <div style={{ width: getModalWidth(), maxHeight: "90vh" }} className="bg-white rounded-2xl shadow-2xl overflow-y-auto transform transition-all duration-300 scale-95 animate-slideUp">
                                <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                                    <h2 className="text-2xl font-bold text-gray-800">{editingEmployee ? "Sửa thông tin nhân viên" : "Thêm nhân viên mới"}</h2>
                                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-6 h-6" /></button>
                                </div>

                                <div className="p-6 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Mã nhân viên <span className="text-red-500">*</span></label>
                                            <input type="text" disabled={!!editingEmployee} value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="Nhập mã nhân viên" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Họ tên <span className="text-red-500">*</span></label>
                                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Nhập họ tên" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Tên đăng nhập <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.username}
                                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                placeholder="Nhập tên đăng nhập"
                                            />
                                            {editingEmployee && (
                                                <p className="text-xs text-amber-600 mt-1">
                                                    ⚠️ Thay đổi tên đăng nhập sẽ ảnh hưởng đến đăng nhập của nhân viên
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Mật khẩu {editingEmployee ? "" : <span className="text-red-500">*</span>}
                                            </label>
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                placeholder={editingEmployee ? "Để trống nếu không đổi mật khẩu" : "Nhập mật khẩu"}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Đơn vị <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={formData.unitId}
                                                onChange={(e) => {
                                                    const newUnit = e.target.value;
                                                    setFormData({
                                                        ...formData,
                                                        unitId: newUnit,
                                                        departmentId: "",
                                                        positionId: ""
                                                    });
                                                    setPositions([]);
                                                    setModalDepartments([]);
                                                    if (newUnit) {
                                                        loadDepartmentsByUnit(newUnit);
                                                    }
                                                }}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500"
                                                disabled={!hasPermission(['view_all_employees'])}
                                            >
                                                <option value="">-- Chọn đơn vị --</option>
                                                {units.map(u => (
                                                    <option key={u.id} value={u.id}>
                                                        {u.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {!hasPermission(['view_all_employees']) && (
                                                <p className="text-xs text-amber-600 mt-1">
                                                    ℹ️ Đơn vị được gán tự động theo tài khoản của bạn
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Phòng ban <span className="text-red-500">*</span></label>
                                            <select
                                                value={formData.departmentId}
                                                onChange={(e) => {
                                                    const newDept = e.target.value;
                                                    setFormData({ ...formData, departmentId: newDept, positionId: "" });
                                                }}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                disabled={!formData.unitId}
                                            >
                                                <option value="">{formData.unitId ? "-- Chọn phòng ban --" : "Vui lòng chọn đơn vị trước"}</option>
                                                {modalDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Chức vụ <span className="text-red-500">*</span></label>
                                            <select value={formData.positionId} onChange={(e) => setFormData({ ...formData, positionId: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" disabled={!formData.departmentId}>
                                                <option value="">{formData.departmentId ? "-- Chọn chức vụ --" : "Vui lòng chọn phòng ban trước"}</option>
                                                {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Điện thoại</label>
                                            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Nhập số điện thoại" />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email {!editingEmployee && <span className="text-red-500">*</span>}
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                                placeholder="Nhập email"
                                                disabled={!!editingEmployee}
                                            />
                                            {editingEmployee && (
                                                <p className="text-xs text-gray-500 mt-1">Email không thể thay đổi</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Ngày sinh
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.dateOfBirth}
                                                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Ngày vào làm
                                            </label>
                                            <input
                                                type="date"
                                                value={formData.joinDate}
                                                onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>

                                        <div className="sm:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Địa chỉ</label>
                                            <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Nhập địa chỉ" />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4 border-t">
                                        <button type="button" onClick={closeModal} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Hủy</button>
                                        <button type="button" onClick={handleSubmit} disabled={loading} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                            <Save className="w-5 h-5" /> {loading ? "Đang lưu..." : "Lưu"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ModalPortal>
                )
            }
        </div >
    );
}