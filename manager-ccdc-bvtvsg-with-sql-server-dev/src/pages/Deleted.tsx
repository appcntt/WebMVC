/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from "react";
import { Trash2, RotateCcw, Search, X, ChevronDown, Package, List } from "lucide-react";
import { toolService } from '../services/tool.service';
import { employeeService } from '../services/employee.service';
import toast from "react-hot-toast";
import { usePermission } from "../hooks/usePermission";

interface Employee {
    _id: string;
    id: string;
    code: string;
    name: string;
    email?: string;
    position?: {
        name: string;
    };
}

interface DeletedTool {
    id: string;
    code: string;
    name: string;
    type: string;
    typeLabel: string;
    categoryInfo?: {
        name: string;
    };
    unitInfo?: {
        name: string;
        code: string;
    };
    departmentInfo?: {
        name: string;
        code: string;
    };
    assignedToInfo?: {
        name: string;
        email: string;
        code: string;
        positionId?: {
            name: string;
        };
    };
    deletedByInfo?: {
        name: string;
        email: string;
        positionId?: {
            name: string;
        };
    };
    deletedAt?: string;
    childrenCount?: {
        total: number;
        subTools: number;
        accessories: number;
    };
    children?: {
        subTools: SubTool[];
        accessories: Accessory[];
    };
}

interface SubTool {
    _id: string;
    id?: string;
    code: string;
    name: string;
    type: string;
    typeLabel: string;
    children?: Accessory[];
}

interface Accessory {
    _id: string;
    id?: string;
    code: string;
    name: string;
    type: string;
    typeLabel: string;
}

interface DeletedToolsResponse {
    success: boolean;
    data: DeletedTool[];
    total: number;
    totalPages: number;
    currentPage: number;
    count: number;
}

interface EmployeesResponse {
    data: Employee[];
}

interface ChildrenModalProps {
    item: DeletedTool | null;
    onClose: () => void;
    onRestore: (item: DeletedTool | SubTool | Accessory) => void;
    onDelete: (item: DeletedTool | SubTool | Accessory) => void;
    canRestore: boolean;
    canPermanentDelete: boolean;
}


function ChildrenModal({ item, onClose, onRestore, onDelete, canRestore, canPermanentDelete }: ChildrenModalProps) {
    if (!item) return null;

    const { children, childrenCount } = item;

    const getTypeBadge = (type: string, typeLabel: string) => {
        const colors: Record<string, string> = {
            Tool: 'bg-blue-100 text-blue-800',
            SubTool: 'bg-purple-100 text-purple-800',
            Accessory: 'bg-green-100 text-green-800'
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
                {typeLabel}
            </span>
        );
    };

    return (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-2 sm:p-4 z-50 transition-all duration-300 animate-fadeIn overflow-y-auto">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl my-4 max-h-[95vh] overflow-y-auto transform transition-all duration-300 scale-95 animate-slideUp">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-indigo-600 to-blue-600 text-white flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Chi tiết: {item.name}
                        </h2>
                        <p className="text-sm mt-1 text-indigo-100">
                            Mã: {item.code} | {item.typeLabel}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-700 mb-2">Tổng quan</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-gray-600">Tổng số con:</span>
                                <span className="ml-2 font-semibold text-indigo-600">
                                    {childrenCount?.total || 0}
                                </span>
                            </div>
                            {childrenCount && childrenCount.subTools > 0 && (
                                <div>
                                    <span className="text-gray-600">Loại thiết bị:</span>
                                    <span className="ml-2 font-semibold text-purple-600">
                                        {childrenCount.subTools}
                                    </span>
                                </div>
                            )}
                            {childrenCount && childrenCount.accessories > 0 && (
                                <div>
                                    <span className="text-gray-600">Linh phụ kiện:</span>
                                    <span className="ml-2 font-semibold text-green-600">
                                        {childrenCount.accessories}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {children?.subTools && children.subTools.length > 0 && (
                        <div className="mb-6">
                            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <div className="w-1 h-5 bg-purple-500 rounded"></div>
                                Loại thiết bị ({children.subTools.length})
                            </h3>
                            <div className="space-y-3">
                                {children.subTools.map((subTool: any) => (
                                    <div key={subTool._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {getTypeBadge(subTool.type, subTool.typeLabel)}
                                                    <span className="font-semibold text-gray-800">{subTool.name}</span>
                                                </div>
                                                <p className="text-xs text-gray-500">Mã: {subTool.code || '—'}</p>
                                                {subTool.children && subTool.children.length > 0 && (
                                                    <p className="text-xs text-green-600 mt-1">
                                                        ↳ {subTool.children.length} linh kiện
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                {canRestore && (
                                                    <button
                                                        onClick={() => onRestore(subTool)}
                                                        className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                                                        title="Khôi phục"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {canPermanentDelete && (
                                                    <button
                                                        onClick={() => onDelete(subTool)}
                                                        className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                                        title="Xoá vĩnh viễn"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {subTool.children && subTool.children.length > 0 && (
                                            <div className="mt-3 ml-4 pl-4 border-l-2 border-green-200 space-y-2">
                                                {subTool.children.map((acc: any) => (
                                                    <div key={acc._id} className="bg-green-50 rounded p-3 text-xs">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    {getTypeBadge(acc.type, acc.typeLabel)}
                                                                    <span className="font-semibold">{acc.name}</span>
                                                                </div>
                                                                <p className="text-gray-500">Mã: {acc.code || '—'}</p>
                                                            </div>
                                                            <div className="flex gap-1">
                                                                {canRestore && (
                                                                    <button
                                                                        onClick={() => onRestore(acc)}
                                                                        className="p-1 text-green-600 hover:bg-green-200 rounded transition-colors"
                                                                        title="Khôi phục"
                                                                    >
                                                                        <RotateCcw className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                                {canPermanentDelete && (
                                                                    <button
                                                                        onClick={() => onDelete(acc)}
                                                                        className="p-1 text-red-600 hover:bg-red-200 rounded transition-colors"
                                                                        title="Xoá vĩnh viễn"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {children?.accessories && children.accessories.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                <div className="w-1 h-5 bg-green-500 rounded"></div>
                                Linh phụ kiện ({children.accessories.length})
                            </h3>
                            <div className="space-y-2">
                                {children.accessories.map((acc: any) => (
                                    <div key={acc._id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    {getTypeBadge(acc.type, acc.typeLabel)}
                                                    <span className="font-semibold text-gray-800">{acc.name}</span>
                                                </div>
                                                <p className="text-xs text-gray-500">Mã: {acc.code || '—'}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                {canRestore && (
                                                    <button
                                                        onClick={() => onRestore(acc)}
                                                        className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                                                        title="Khôi phục"
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {canPermanentDelete && (
                                                    <button
                                                        onClick={() => onDelete(acc)}
                                                        className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                                        title="Xoá vĩnh viễn"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {childrenCount?.total === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            Không có items con nào
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function DeletedToolsPage() {
    const [tools, setTools] = useState<DeletedTool[]>([]);
    const [page, setPage] = useState<number>(1);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [search, setSearch] = useState<string>("");
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [filterEmployee, setFilterEmployee] = useState<string>('');
    const [employeeDropdownOpen, setEmployeeDropdownOpen] = useState<boolean>(false);
    const [employeeSearchTerm, setEmployeeSearchTerm] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<DeletedTool | null>(null);
    const [showChildrenModal, setShowChildrenModal] = useState<boolean>(false);

    const employeeDropdownRef = useRef<HTMLDivElement>(null);

    const { hasPermission } = usePermission();
    const canRestore = hasPermission(['restore_tool']);
    const canPermanentDelete = hasPermission(['permanent_delete_tool']);

    useEffect(() => {
        fetchDeletedTools();
    }, [page, filterEmployee]);

    useEffect(() => {
        loadEmployees();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(event.target as Node)) {
                setEmployeeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchDeletedTools = async (): Promise<void> => {
        try {
            setLoading(true);
            const params: Record<string, string | number> = { page, limit: 10 };
            if (filterEmployee) params.employeeId = filterEmployee;
            const res: DeletedToolsResponse = await toolService.getDeleted(params);
            setTools(res.data || []);
            setTotal(res.total || 0);
            setTotalPages(res.totalPages || 1);
        } catch (err) {
            console.error("Load deleted tools error:", err);
            toast.error("Không thể tải danh sách công cụ đã xoá");
        } finally {
            setLoading(false);
        }
    };

    const selectedEmployeeLabel = filterEmployee ? employees.find(e => e._id === filterEmployee || e.id === filterEmployee) : null;

    const loadEmployees = async (): Promise<void> => {
        try {
            const response: EmployeesResponse = await employeeService.getAll();
            setEmployees(response.data || []);
        } catch (error) {
            console.error('Load employees error:', error);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.code?.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
        emp.name?.toLowerCase().includes(employeeSearchTerm.toLowerCase()) ||
        emp.position?.name.toLowerCase().includes(employeeSearchTerm.toLowerCase())
    );

    const handleRestore = async (item: DeletedTool | SubTool | Accessory): Promise<void> => {
        const itemId = (item as DeletedTool).id;
        const itemType = item.type as 'Tool' | 'SubTool' | 'Accessory';
        const itemTypeLabel = item.typeLabel;

        if (!window.confirm(`Bạn có chắc muốn khôi phục ${itemTypeLabel} "${item.name}"?`)) return;
        try {
            const response = await toolService.restore(itemId, itemType);
            let message = "Đã khôi phục thành công!";
            if (response.restoreInfo) {
                const { subTools, accessories } = response.restoreInfo;
                if (subTools > 0 || accessories > 0) {
                    message += `\n- ${subTools || 0} công cụ con\n- ${accessories || 0} phụ kiện`;
                }
            }
            toast.success(message);
            fetchDeletedTools();
            setShowChildrenModal(false);
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || "Lỗi khi khôi phục");
        }
    };

    const handlePermanentDelete = async (item: DeletedTool | SubTool | Accessory): Promise<void> => {
        const itemId = (item as DeletedTool).id;
        const itemType = item.type as 'Tool' | 'SubTool' | 'Accessory';
        const itemTypeLabel = item.typeLabel;

        if (!window.confirm(`⚠️ CẢNH BÁO: Bạn chắc chắn muốn xoá vĩnh viễn ${itemTypeLabel} "${item.name}"?\n\nHành động này KHÔNG THỂ HOÀN TÁC!`)) return;
        try {
            await toolService.permanentDelete(itemId, itemType);
            toast.success('Đã xoá vĩnh viễn thành công');
            fetchDeletedTools();
            setShowChildrenModal(false);
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.message || "Lỗi khi xoá");
        }
    };

    const filteredTools = tools.filter(t =>
        t.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.code?.toLowerCase().includes(search.toLowerCase())
    );



    const handleShowChildren = (item: DeletedTool) => {
        setSelectedItem(item);
        setShowChildrenModal(true);
    };

    return (
        <div className="p-3 sm:p-4 space-y-4">
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                        Công cụ đã xóa
                        {total > 0 && (
                            <span className="ml-2 px-2.5 py-0.5 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
                                {total}
                            </span>
                        )}
                    </h1>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm công cụ..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative w-full sm:w-64" ref={employeeDropdownRef}>
                        <div
                            onClick={() => setEmployeeDropdownOpen(!employeeDropdownOpen)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 cursor-pointer bg-white flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className={`truncate text-xs ${selectedEmployeeLabel ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {selectedEmployeeLabel ? `${selectedEmployeeLabel.code} - ${selectedEmployeeLabel.name}` : 'Lọc theo nhân viên'}
                                </span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ml-2 ${employeeDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {employeeDropdownOpen && (
                            <div className="absolute z-20 mt-1 w-full min-w-[200px] bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
                                <div className="p-2 border-b border-gray-200 bg-gray-50">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                                        <input
                                            type="text"
                                            value={employeeSearchTerm}
                                            onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                                            placeholder="Tìm theo mã, tên..."
                                            className="w-full pl-8 pr-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                                        <div className="px-3 py-2 text-xs text-gray-500 text-center">Không tìm thấy</div>
                                    ) : (
                                        filteredEmployees.map(emp => (
                                            <div
                                                key={emp._id || emp.id}
                                                onClick={() => {
                                                    setFilterEmployee(emp._id || emp.id);
                                                    setEmployeeSearchTerm('');
                                                    setEmployeeDropdownOpen(false);
                                                }}
                                                className={`px-3 py-2 hover:bg-indigo-50 cursor-pointer text-xs ${filterEmployee === (emp._id || emp.id) ? 'bg-indigo-100 text-indigo-900 font-medium' : 'text-gray-700'}`}
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
                {filterEmployee && selectedEmployeeLabel && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-600">Bộ lọc:</span>
                        <div className="inline-flex items-center gap-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                            <span className="font-medium">{selectedEmployeeLabel.code} - {selectedEmployeeLabel.name}</span>
                            <button onClick={() => setFilterEmployee('')} className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white mt-4 rounded-lg shadow overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-gray-700">
                        <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                            <tr>
                                <th className="px-3 py-2 text-left">Mã</th>
                                <th className="px-3 py-2 text-left">Tên công cụ</th>
                                <th className="px-3 py-2 text-left hidden md:table-cell">Danh mục</th>
                                <th className="px-3 py-2 text-left hidden md:table-cell">Đơn vị</th>
                                <th className="px-3 py-2 text-left hidden lg:table-cell">Phòng ban</th>
                                <th className="px-3 py-2 text-left">Người giữ</th>
                                <th className="px-3 py-2 text-center">Công cụ con</th>
                                <th className="px-3 py-2 text-left hidden xl:table-cell">Xóa bởi</th>
                                <th className="px-3 py-2 text-left hidden sm:table-cell">Ngày xóa</th>
                                {(canRestore || canPermanentDelete) && (
                                    <th className="px-3 py-2 text-center">Thao tác</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-8">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                            <span className="text-xs">Đang tải...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTools.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-6 text-xs text-gray-500">Không có công cụ nào đã xóa.</td>
                                </tr>
                            ) : (
                                filteredTools.map((tool) => (
                                    <tr key={tool.id} className="border-t hover:bg-gray-50 transition-all">
                                        <td className="px-3 py-2 font-medium">{tool.code || '—'}</td>
                                        <td className="px-3 py-2 font-semibold">
                                            <div className="max-w-xs truncate" title={tool.name}>{tool.name}</div>
                                        </td>
                                        <td className="px-3 py-2 hidden md:table-cell">{tool.categoryInfo?.name || "—"}</td>
                                        <td className="px-3 py-2 hidden md:table-cell">{tool.unitInfo?.name || "—"}</td>
                                        <td className="px-3 py-2 hidden lg:table-cell">{tool.departmentInfo?.name || "—"}</td>
                                        <td className="px-3 py-2">
                                            <div>
                                                <div className="font-medium truncate max-w-xs">{tool.assignedToInfo?.name || "—"}</div>
                                                {tool.assignedToInfo?.positionId?.name && (
                                                    <div className="text-xs text-gray-500 truncate">{tool.assignedToInfo.positionId.name}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {tool.childrenCount && tool.childrenCount.total > 0 ? (
                                                <button
                                                    onClick={() => handleShowChildren(tool)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors"
                                                    title="Xem chi tiết items con"
                                                >
                                                    <List className="w-3 h-3" />
                                                    <span className="font-semibold">{tool.childrenCount.total}</span>
                                                </button>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 hidden xl:table-cell">
                                            <div className="truncate max-w-xs text-orange-600 font-medium">{tool.deletedByInfo?.name || "—"}</div>
                                            {tool.deletedByInfo?.positionId && (
                                                <span className="inline-block px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs mt-1">
                                                    {tool.deletedByInfo.positionId.name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 hidden sm:table-cell">
                                            {tool.deletedAt ? new Date(tool.deletedAt).toLocaleString("vi-VN", {
                                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                            }) : "—"}
                                        </td>
                                        {(canRestore || canPermanentDelete) && (
                                            <td className="px-3 py-2">
                                                <div className="flex justify-center gap-1">
                                                    {canRestore && (
                                                        <button
                                                            onClick={() => handleRestore(tool)}
                                                            className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                                                            title="Khôi phục"
                                                        >
                                                            <RotateCcw className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canPermanentDelete && (
                                                        <button
                                                            onClick={() => handlePermanentDelete(tool)}
                                                            className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                                                            title="Xoá vĩnh viễn"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 py-3 border-t">
                        <button
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 border rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                            ← Trước
                        </button>
                        <span className="text-xs text-gray-600 font-medium">Trang {page} / {totalPages}</span>
                        <button
                            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                            disabled={page === totalPages}
                            className="px-3 py-1.5 border rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                        >
                            Sau →
                        </button>
                    </div>
                )}

                {showChildrenModal && selectedItem && (
                    <ChildrenModal
                        item={selectedItem}
                        onClose={() => {
                            setShowChildrenModal(false);
                            setSelectedItem(null);
                        }}
                        onRestore={handleRestore}
                        onDelete={handlePermanentDelete}
                        canRestore={canRestore}
                        canPermanentDelete={canPermanentDelete}
                    />
                )}

            </div>
        </div>
    );
}