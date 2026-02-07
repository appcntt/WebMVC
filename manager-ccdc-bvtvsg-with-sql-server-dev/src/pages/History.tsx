/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Clock, Package, User, ChevronDown, FileText, Search, Filter, Calendar, Trash2, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, ArrowRightLeft } from 'lucide-react';
import { toolHistoryService } from '../services/history.service';
import { employeeService } from '../services/employee.service';
import { usePermission } from "../hooks/usePermission";
import toast from 'react-hot-toast';
import { createPortal } from 'react-dom';

interface HistoryFilterParams {
    page: number;
    limit: number;
    toolId?: string;
    employeeId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
}

interface StatsFilterParams {
    startDate?: string;
    endDate?: string;
}

interface Employee {
    id: string;
    code: string;
    name: string;
    email?: string;
    positionId?: {
        name: string;
    };
}

interface ToolInfo {
    code: string;
    name: string;
    categoryId?: {
        name: string;
    };
    unit?: {
        name: string;
        code: string;
    };
}

interface HistoryItem {
    id: string;
    action: string;
    condition?: string;
    notes?: string;
    description?: string;
    createdAt: string;
    updatedAt?: string;
    toolInfo?: ToolInfo;
    subToolInfo?: {
        code: string;
        name: string;
    };
    accessoryInfo?: {
        code: string;
        name: string;
    };
    employeeInfo?: Employee;
    previousEmployeeInfo?: Employee;
    performedByInfo?: {
        name: string;
        email?: string;
    };
}

interface StatsData {
    total: number;
    byAction?: Array<{
        action: string;
        count: number;
    }>;
}

export default function History() {
    const [histories, setHistories] = useState<HistoryItem[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);

    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectAll, setSelectAll] = useState(false);

    const [filterTool, setFilterTool] = useState('');
    const [filterEmployee, setFilterEmployee] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    // const limit = 10;

    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState(false);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

    const employeeDropdownRef = useRef<HTMLDivElement>(null);

    const actions = [
        'Giao', 'Thu hồi', 'Chuyển giao', 'Cập nhật', 'Xóa',
        'Thêm thiết bị', 'Chuyển thiết bị', 'Gỡ thiết bị',
        'Thêm linh kiện', 'Gỡ linh kiện', 'Nâng cấp linh kiện',
        'Sửa chữa linh kiện', 'Bảo dưỡng'
    ];

    const { hasPermission } = usePermission();
    const canDelete = hasPermission(['delete_history']);

    const ModalPortal = ({ children }: { children: React.ReactNode }) => {
        return createPortal(children, document.body);
    };

    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target)) {
                setEmployeeDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        loadHistories();
        loadEmployees();
        loadStats();
    }, [currentPage, itemsPerPage, filterTool, filterEmployee, filterAction, startDate, endDate]);

    useEffect(() => {
        setSelectedIds([]);
        setSelectAll(false);
    }, [currentPage, filterTool, filterEmployee, filterAction, startDate, endDate]);

    const loadHistories = async () => {
        try {
            setLoading(true);
            const params: HistoryFilterParams = {
                page: currentPage,
                limit: itemsPerPage,
            };

            if (filterTool) params.toolId = filterTool;
            if (filterEmployee) params.employeeId = filterEmployee;
            if (filterAction) params.action = filterAction;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const response = await toolHistoryService.getAll(params);
            setHistories(response.data || []);
            setTotal(response.pagination?.total || 0);
            setTotalPages(response.pagination?.totalPages || 1);
        } catch (error) {
            console.error('Load histories error:', error);
            toast.error('Không thể tải lịch sử');
        } finally {
            setLoading(false);
        }
    };

    const loadEmployees = async () => {
        try {
            const response = await employeeService.getAll();
            setEmployees(response.data || []);
        } catch (error) {
            console.error('Load employees error:', error);
        }
    };

    const loadStats = async () => {
        try {
            const params: StatsFilterParams = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const response = await toolHistoryService.getStats(params);
            setStats(response.data);
        } catch (error) {
            console.error('Load stats error:', error);
        }
    };

    const selectedEmployeeLabel = filterEmployee
        ? employees.find(e => e.id === filterEmployee)
        : null;

    const filteredHistories = histories.filter(history => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            history.toolInfo?.code?.toLowerCase().includes(search) ||
            history.toolInfo?.name?.toLowerCase().includes(search) ||
            history.employeeInfo?.name?.toLowerCase().includes(search) ||
            history.notes?.toLowerCase().includes(search)
        );
    });

    const filteredEmployees = employees.filter(emp =>
        emp.code?.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
        emp.name?.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
        emp.positionId?.name?.toLowerCase().includes(employeeSearchTerm.toLowerCase())
    );

    const handleSelectAll = useCallback(() => {
        if (selectAll) {
            setSelectedIds([]);
            setSelectAll(false);
        } else {
            const allIds = filteredHistories.map(h => h.id);
            setSelectedIds(allIds);
            setSelectAll(true);
        }
    }, [selectAll, filteredHistories]);

    const handleSelectOne = useCallback((id: string) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                setSelectAll(false);
                return prev.filter(selectedId => selectedId !== id);
            } else {
                const newSelected = [...prev, id];
                if (newSelected.length === filteredHistories.length) {
                    setSelectAll(true);
                }
                return newSelected;
            }
        });
    }, [filteredHistories.length]);

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa lịch sử này?')) return;

        try {
            await toolHistoryService.delete(id);
            toast.success('Xóa lịch sử thành công');
            setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
            await loadHistories();
            await loadStats();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Không thể xóa lịch sử');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) {
            toast.error('Vui lòng chọn ít nhất một lịch sử để xóa');
            return;
        }

        if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} lịch sử đã chọn?`)) return;

        try {
            setLoading(true);
            await Promise.all(selectedIds.map(id => toolHistoryService.delete(id)));
            toast.success(`Đã xóa ${selectedIds.length} lịch sử thành công`);
            setSelectedIds([]);
            setSelectAll(false);
            await loadHistories();
            await loadStats();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa');
        } finally {
            setLoading(false);
        }
    };

    const openDetailModal = (history: any) => {
        setSelectedHistory(history);
        setShowDetailModal(true);
    };

    const closeDetailModal = () => {
        setShowDetailModal(false);
        setSelectedHistory(null);
    };

    const getActionColor = (action: string) => {
        const colors: Record<string, string> = {
            'Giao': 'bg-green-100 text-green-700',
            'Thu hồi': 'bg-orange-100 text-orange-700',
            'Chuyển giao': 'bg-purple-100 text-purple-700',
            'Cập nhật': 'bg-blue-100 text-blue-700',
            'Xóa': 'bg-red-100 text-red-700',
            'Thêm thiết bị': 'bg-cyan-100 text-cyan-700',
            'Chuyển thiết bị': 'bg-indigo-100 text-indigo-700',
            'Gỡ thiết bị': 'bg-pink-100 text-pink-700',
            'Thêm linh kiện': 'bg-teal-100 text-teal-700',
            'Gỡ linh kiện': 'bg-amber-100 text-amber-700',
            'Nâng cấp linh kiện': 'bg-violet-100 text-violet-700',
        };
        return colors[action] || 'bg-gray-100 text-gray-700';
    };

    const getConditionColor = (condition: string) => {
        const colors: Record<string, string> = {
            'Mới': 'text-green-600',
            'Tốt': 'text-blue-600',
            'Cũ': 'text-orange-600',
            'Hỏng': 'text-red-600'
        };
        return colors[condition] || 'text-gray-600';
    };

    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const resetFilters = () => {
        setFilterTool('');
        setFilterEmployee('');
        setFilterAction('');
        setStartDate('');
        setEndDate('');
        setSearchTerm('');
        setCurrentPage(1);
    };

    const getActionIcon = (action: string): React.ReactElement => {
        const icons: Record<string, React.ReactElement> = {
            'Giao': <Package className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />,
            'Thu hồi': <Package className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />,
            'Chuyển giao': <ArrowRightLeft className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />,
            'Cập nhật': <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />,
            'Xóa': <Trash2 className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
        };
        return icons[action] || <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" />;
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
                        Lịch sử công cụ
                    </h1>
                    <p className="text-gray-500 mt-0.5 text-xs sm:text-sm">
                        Tổng số: {total} bản ghi
                        {selectedIds.length > 0 && (
                            <span className="ml-2 text-indigo-600 font-semibold">
                                ({selectedIds.length} đã chọn)
                            </span>
                        )}
                    </p>
                </div>
                {canDelete && selectedIds.length > 0 && (
                    <button
                        onClick={handleDeleteSelected}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg flex items-center gap-2 transition-all shadow-lg disabled:opacity-50 text-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Xóa {selectedIds.length} mục</span>
                        <span className="sm:hidden">{selectedIds.length}</span>
                    </button>
                )}
            </div>

            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                    <div className="bg-white rounded-xl shadow-md p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[10px] sm:text-xs text-gray-600">Tổng số</p>
                                <p className="text-lg sm:text-2xl font-bold text-gray-800">{stats.total || 0}</p>
                            </div>
                            <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600" />
                        </div>
                    </div>

                    {stats.byAction?.map(item => (
                        <div key={item.action} className="bg-white rounded-xl shadow-md p-3 sm:p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] sm:text-xs text-gray-600 truncate">{item.action}</p>
                                    <p className="text-lg sm:text-2xl font-bold text-gray-800">{item.count}</p>
                                </div>
                                {getActionIcon(item.action)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-md p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <Filter className="w-4 h-4 text-gray-600" />
                    <h3 className="text-sm sm:text-base font-semibold text-gray-800">Bộ lọc</h3>
                    <button
                        onClick={resetFilters}
                        className="ml-auto text-xs sm:text-sm text-indigo-600 hover:text-indigo-800"
                    >
                        Đặt lại
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
                    <div className="relative col-span-2 sm:col-span-1">
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                        />
                    </div>

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

                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                        className="px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                    >
                        <option value="">Hành động</option>
                        {actions.map(action => (
                            <option key={action} value={action}>{action}</option>
                        ))}
                    </select>

                    <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full pl-8 pr-2 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                            placeholder="Từ ngày"
                        />
                    </div>

                    <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full pl-8 pr-2 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-xs sm:text-sm"
                            placeholder="Đến ngày"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {loading ? (
                    <div className="p-8 sm:p-12 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-3 sm:mt-4 text-gray-600 text-sm">Đang tải...</p>
                    </div>
                ) : filteredHistories.length === 0 ? (
                    <div className="text-center py-8 sm:py-12">
                        <Clock className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                        <p className="text-gray-500 text-sm">Chưa có lịch sử nào</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                                    <tr>
                                        {canDelete && (
                                            <th className="px-2 sm:px-3 py-2 text-left">
                                                <input
                                                    type="checkbox"
                                                    checked={selectAll}
                                                    onChange={handleSelectAll}
                                                    className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                />
                                            </th>
                                        )}
                                        <th className="px-2 sm:px-3 py-2 text-left font-medium uppercase tracking-wider">
                                            Thời gian
                                        </th>
                                        <th className="px-2 sm:px-3 py-2 text-left font-medium uppercase tracking-wider">
                                            Công cụ
                                        </th>
                                        <th className="px-2 sm:px-3 py-2 text-left font-medium uppercase tracking-wider">
                                            Người giao
                                        </th>
                                        <th className="px-2 sm:px-3 py-2 text-left font-medium uppercase tracking-wider">
                                            Hành động
                                        </th>
                                        <th className="px-2 sm:px-3 py-2 text-left font-medium uppercase tracking-wider">
                                            Người nhận
                                        </th>
                                        <th className="px-2 sm:px-3 py-2 text-left font-medium uppercase tracking-wider">
                                            Tình trạng
                                        </th>
                                        <th className="px-2 sm:px-3 py-2 text-left font-medium uppercase tracking-wider">
                                            Thực hiện
                                        </th>
                                        <th className="px-2 sm:px-3 py-2 text-right font-medium uppercase tracking-wider">
                                            Thao tác
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredHistories.map((history) => (
                                        <tr key={history.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(history.id) ? 'bg-indigo-50' : ''}`}>
                                            {canDelete && (
                                                <td className="px-2 sm:px-3 py-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(history.id)}
                                                        onChange={() => handleSelectOne(history.id)}
                                                        className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </td>
                                            )}
                                            <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-gray-400" />
                                                    <span className="text-gray-900">
                                                        {formatDate(history.createdAt)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-2 sm:px-3 py-2">
                                                <div>
                                                    {history.accessoryInfo ? (
                                                        <>
                                                            <div className="flex items-center gap-1">
                                                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-medium rounded whitespace-nowrap">
                                                                    Linh phụ kiện
                                                                </span>
                                                                <div>
                                                                    <div className="font-medium text-gray-900 max-w-[100px] truncate">
                                                                        {history.accessoryInfo.name}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500">
                                                                        {history.accessoryInfo.code}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {history.toolInfo && (
                                                                <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[150px]">
                                                                    ← {history.toolInfo.name}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : history.subToolInfo ? (
                                                        <>
                                                            <div className="flex items-center gap-1">
                                                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-medium rounded whitespace-nowrap">
                                                                    Loại thiết bị
                                                                </span>
                                                                <div>
                                                                    <div className="font-medium text-gray-900 max-w-[100px] truncate">
                                                                        {history.subToolInfo.name}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500">
                                                                        {history.subToolInfo.code}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {history.toolInfo && (
                                                                <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[150px]">
                                                                    ← {history.toolInfo.name}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-center gap-1">
                                                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-medium rounded whitespace-nowrap">
                                                                    Nhóm thiết bị
                                                                </span>
                                                                <div>
                                                                    <div className="font-medium text-gray-900 max-w-[120px] truncate">
                                                                        {history.toolInfo?.name || 'N/A'}
                                                                    </div>
                                                                    <div className="text-[10px] text-gray-500">
                                                                        {history.toolInfo?.code || 'N/A'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 sm:px-3 py-2">
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3 h-3 text-gray-400" />
                                                    <div>
                                                        <div className="font-medium text-gray-900 max-w-[150px] truncate">
                                                            {history.previousEmployeeInfo?.name || '-'}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 max-w-[120px] truncate">
                                                            {history.previousEmployeeInfo?.positionId?.name || ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-semibold rounded-full ${getActionColor(history.action)}`}>
                                                    {history.action}
                                                </span>
                                            </td>
                                            <td className="px-2 sm:px-3 py-2">
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3 h-3 text-gray-400" />
                                                    <div>
                                                        <div className="font-medium text-gray-900 max-w-[150px] truncate">
                                                            {history.employeeInfo?.name || '-'}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 max-w-[120px] truncate">
                                                            {history.employeeInfo?.positionId?.name || ''}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                                                <span className={`font-medium ${getConditionColor(history.condition || '')}`}>
                                                    {history.condition || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-2 sm:px-3 py-2 whitespace-nowrap">
                                                <span className="text-gray-600 max-w-[200px] truncate block">
                                                    {history.performedByInfo?.name || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-2 sm:px-3 py-2 whitespace-nowrap text-right">
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <button
                                                        onClick={() => openDetailModal(history)}
                                                        className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded transition-colors"
                                                        title="Xem chi tiết"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDelete(history.id)}
                                                            className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors"
                                                            title="Xóa"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 sm:px-6">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-700">Hiển thị</span>
                                    <select
                                        value={itemsPerPage === total ? 'all' : itemsPerPage}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === 'all') {
                                                setItemsPerPage(total);
                                            } else {
                                                setItemsPerPage(Number(value));
                                            }
                                            setCurrentPage(1);
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
                                        {itemsPerPage === total ? `(${total} mục)` : `trên tổng ${total}`}
                                    </span>
                                </div>

                                <div className="text-sm text-gray-700">
                                    {itemsPerPage === total
                                        ? `Hiển thị tất cả ${total} mục`
                                        : `Trang ${currentPage} / ${totalPages}`
                                    }
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => goToPage(1)}
                                        disabled={currentPage === 1}
                                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronsLeft className="w-4 h-4" />
                                    </button>
                                    {itemsPerPage !== total && (
                                        <>
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
                                        </>
                                    )}

                                    <button
                                        onClick={() => goToPage(totalPages)}
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

            {showDetailModal && selectedHistory && (
                <ModalPortal>
                    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-2 sm:p-4 z-50 transition-all duration-300 animate-fadeIn">
                        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 animate-slideUp">
                            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Chi tiết lịch sử</h2>
                                <button onClick={closeDetailModal} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                            </div>

                            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                                <div className="flex items-center justify-center mb-4 sm:mb-6">
                                    <span className={`px-4 sm:px-6 py-1.5 sm:py-2 text-base sm:text-lg font-semibold rounded-full ${getActionColor(selectedHistory.action)}`}>
                                        {selectedHistory.action}
                                    </span>
                                </div>

                                <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
                                    <h3 className="text-xs sm:text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                                        <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        Thông tin công cụ
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                        <div>
                                            <p className="text-xs text-blue-700">Mã công cụ</p>
                                            <p className="text-sm font-semibold text-blue-900">{selectedHistory.toolInfo?.code || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-blue-700">Tên công cụ</p>
                                            <p className="text-sm font-semibold text-blue-900">{selectedHistory.toolInfo?.name || 'N/A'}</p>
                                        </div>
                                        {selectedHistory.toolInfo?.categoryId?.name && (
                                            <div>
                                                <p className="text-xs text-blue-700">Danh mục</p>
                                                <p className="text-sm font-semibold text-blue-900">
                                                    {selectedHistory.toolInfo.categoryId.name}
                                                </p>
                                            </div>
                                        )}
                                        {selectedHistory.toolInfo?.unit?.name && (
                                            <div>
                                                <p className="text-xs text-blue-700">Đơn vị</p>
                                                <p className="text-sm font-semibold text-blue-900">{selectedHistory.toolInfo.unit.name}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {(selectedHistory.action === 'Chuyển giao' || selectedHistory.previousEmployeeInfo) ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4 sm:gap-4">
                                        {selectedHistory.previousEmployeeInfo && (
                                            <div className="bg-orange-50 p-3 sm:p-4 rounded-lg border-2 border-orange-200">
                                                <h3 className="text-xs sm:text-sm font-medium text-orange-900 mb-2 flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    Nhân viên cũ (Bàn giao)
                                                </h3>
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-xs text-orange-700">Tên nhân viên</p>
                                                        <p className="text-sm font-semibold text-orange-900">
                                                            {selectedHistory.previousEmployeeInfo.name || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-orange-700">Mã nhân viên</p>
                                                        <p className="text-sm font-semibold text-orange-900">
                                                            {selectedHistory.previousEmployeeInfo.code || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-orange-700">Chức vụ</p>
                                                        <p className="text-sm font-semibold text-orange-900">
                                                            {selectedHistory.previousEmployeeInfo.positionId?.name || 'N/A'}
                                                        </p>
                                                    </div>
                                                    {selectedHistory.previousEmployeeInfo.email && (
                                                        <div>
                                                            <p className="text-xs text-orange-700">Email</p>
                                                            <p className="text-sm font-semibold text-orange-900 truncate">
                                                                {selectedHistory.previousEmployeeInfo.email}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {selectedHistory.employeeInfo && (
                                            <div className="bg-green-50 p-3 sm:p-4 rounded-lg border-2 border-green-200">
                                                <h3 className="text-xs sm:text-sm font-medium text-green-900 mb-2 flex items-center gap-2">
                                                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                    Nhân viên mới (Người nhận)
                                                </h3>
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-xs text-green-700">Tên nhân viên</p>
                                                        <p className="text-sm font-semibold text-green-900">
                                                            {selectedHistory.employeeInfo.name || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-green-700">Mã nhân viên</p>
                                                        <p className="text-sm font-semibold text-green-900">
                                                            {selectedHistory.employeeInfo.code || 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-green-700">Chức vụ</p>
                                                        <p className="text-sm font-semibold text-green-900">
                                                            {selectedHistory.employeeInfo.positionId?.name || 'N/A'}
                                                        </p>
                                                    </div>
                                                    {selectedHistory.employeeInfo.email && (
                                                        <div>
                                                            <p className="text-xs text-green-700">Email</p>
                                                            <p className="text-sm font-semibold text-green-900 truncate">
                                                                {selectedHistory.employeeInfo.email}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    selectedHistory.employeeInfo && (
                                        <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
                                            <h3 className="text-xs sm:text-sm font-medium text-green-900 mb-2 flex items-center gap-2">
                                                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                Thông tin nhân viên
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                                <div>
                                                    <p className="text-xs text-green-700">Tên nhân viên</p>
                                                    <p className="text-sm font-semibold text-green-900">{selectedHistory.employeeInfo.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-green-700">Mã nhân viên</p>
                                                    <p className="text-sm font-semibold text-green-900">{selectedHistory.employeeInfo.code || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-green-700">Chức vụ</p>
                                                    <p className="text-sm font-semibold text-green-900">{selectedHistory.employeeInfo.positionId?.name}</p>
                                                </div>
                                                {selectedHistory.employeeInfo.email && (
                                                    <div>
                                                        <p className="text-xs text-green-700">Email</p>
                                                        <p className="text-sm font-semibold text-green-900 truncate">{selectedHistory.employeeInfo.email}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Tình trạng</p>
                                        <p className={`text-sm font-medium ${getConditionColor(selectedHistory.condition || '')}`}>
                                            {selectedHistory.condition || 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Thời gian</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatDate(selectedHistory.createdAt)}
                                        </p>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <p className="text-xs text-gray-500 mb-2">Người thực hiện</p>
                                        <p className="text-sm font-medium text-gray-900">
                                            {selectedHistory.performedByInfo?.name || 'N/A'}
                                            {selectedHistory.performedByInfo?.email && ` (${selectedHistory.performedByInfo.email})`}
                                        </p>
                                    </div>
                                </div>

                                {selectedHistory.description && (
                                    <div>
                                        <p className="text-xs text-gray-700 mb-2">Mô tả</p>
                                        <div className="bg-gray-50 border border-gray-200 p-3 sm:p-4 rounded-lg">
                                            <p className="text-sm text-gray-700">{selectedHistory.description}</p>
                                        </div>
                                    </div>
                                )}

                                {selectedHistory.notes && (
                                    <div>
                                        <p className="text-xs text-gray-700 mb-2">Ghi chú</p>
                                        <div className="bg-yellow-50 border border-yellow-200 p-3 sm:p-4 rounded-lg">
                                            <p className="text-sm text-gray-700">{selectedHistory.notes}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end pt-4 border-t">
                                    <button
                                        onClick={closeDetailModal}
                                        className="px-4 sm:px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base"
                                    >
                                        Đóng
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}
        </div>
    );
}