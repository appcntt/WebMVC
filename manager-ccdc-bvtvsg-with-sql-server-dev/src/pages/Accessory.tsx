/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Eye, PackageCheck, AlertCircle, TrendingUp, ArrowLeft, UserPlus, UserMinus, X, ArrowRight } from 'lucide-react';
import { accessoryService } from '../services/accessory.service';
import { subToolService } from '../services/subtool.service';
import { toolService } from '../services/tool.service';
import { employeeService } from '../services/employee.service';
import { useNavigate, useParams } from 'react-router-dom';
import { categoryAccessoryService } from '../services/category-accessory.service';
import toast from "react-hot-toast";

const AccessoryManagement = () => {
    const [accessories, setAccessories] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [subToolInfo, setSubToolInfo] = useState<any>(null);
    const navigate = useNavigate();
    const { subToolId, toolId } = useParams();

    const [filter, setFilter] = useState({
        search: '',
        accessoryType: '',
        status: ''
    });
    const [showModal, setShowModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showRevokeModal, setShowRevokeModal] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedAccessory, setSelectedAccessory] = useState<any>(null);
    const [availableSubTools, setAvailableSubTools] = useState<any[]>([]);
    const [loadingSubTools, setLoadingSubTools] = useState(false);
    const [parentToolId, setParentToolId] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        accessoryType: '',
        brand: '',
        model: '',
        serialNumber: '',
        condition: 'Mới',
        purchasePrice: '',
        purchaseDate: '',
        warrantyEndDate: '',
        notes: '',
        parentTool: '',
        code: '',
        quantity: 1,
        unitOC: 'Cái',
        specifications: {},
        slot: '',
        status: 'Đang sử dụng'
    });

    const [categoryAccessoryTypes, setCategoryAccessoryTypes] = useState<any[]>([]);

    const [transferForm, setTransferForm] = useState({
        accessoryId: '',
        employeeId: '',
        targetSubToolId: '',
        condition: 'Mới',
        notes: ''
    });

    const [revokeForm, setRevokeForm] = useState({
        accessoryId: '',
        condition: 'Mới',
        notes: ''
    });

    const statusOptions = ['Khả dụng', 'Đang sử dụng', 'Bảo trì', 'Hỏng', 'Đã nâng cấp', 'Thanh lý'];
    const conditionOptions = ['Mới', 'Cũ', 'Hỏng'];

    const loadAccessoriesBySubTool = useCallback(async () => {
        try {
            setLoading(true);
            if (!subToolId) {
                toast.error('Không tìm thấy SubTool ID');
                return;
            }

            const response = await accessoryService.getBySubTool(subToolId);
            setAccessories(response.data || []);
            setSubToolInfo(response.subTool);

            if (response.data && response.data.length > 0) {
                setParentToolId(response.data[0].parentToolInfo?.id || '');
            }
        } catch (error: any) {
            console.error('Load accessories error:', error);
            toast.error('Không thể tải danh sách linh kiện');
        } finally {
            setLoading(false);
        }
    }, [subToolId]);

    const loadCategoryAccessoryTypes = useCallback(async () => {
        try {
            const response = await categoryAccessoryService.getAll();
            const categories = response || [];

            setCategoryAccessoryTypes(categories);
        } catch (error) {
            console.error('Load category accessory types error:', error);
        }
    }, []);

    const loadEmployees = useCallback(async () => {
        try {
            const response = await employeeService.getAll();
            setEmployees(response.data || []);
        } catch (error) {
            console.error('Load employees error:', error);
        }
    }, []);

    useEffect(() => {
        if (toolId) {
            setParentToolId(toolId);
        }
    }, [toolId]);

    useEffect(() => {
        loadAccessoriesBySubTool();
        loadCategoryAccessoryTypes();
        loadEmployees();
    }, [loadAccessoriesBySubTool, loadCategoryAccessoryTypes, loadEmployees]);

    useEffect(() => {
        if (transferForm.employeeId && selectedAccessory) {
            loadEmployeeSubTools(transferForm.employeeId);
        } else {
            setAvailableSubTools([]);
        }
    }, [transferForm.employeeId, selectedAccessory]);

    const loadEmployeeSubTools = async (employeeId: string) => {
        try {
            setLoadingSubTools(true);

            const toolsResponse = await toolService.getAll({
                assignedTo: employeeId,
                status: 'Đang sử dụng',
                limit: 100
            });

            const employeeTools = toolsResponse.data || [];


            if (employeeTools.length === 0) {
                console.log('⚠️ Nhân viên chưa có Tool nào');
                setAvailableSubTools([]);
                return;
            }

            const subToolPromises = employeeTools.map((tool: any) => {
                const toolId = tool._id || tool.id;
                console.log('📝 Fetching subtools for tool:', toolId, tool.name);
                return subToolService.getByParentTool(toolId);
            });

            const subToolResponses = await Promise.all(subToolPromises);
            const allSubTools = subToolResponses.flatMap(res => res.data || []);


            const compatibleSubTools = allSubTools.filter((subTool: any) => {
                const typeName = subTool.subToolTypeInfo?.name || '';
                const compatibleTypes = ['Thùng máy tính', 'Thùng CPU', 'Case'];
                return compatibleTypes.includes(typeName);
            });


            setAvailableSubTools(compatibleSubTools);
        } catch (error) {
            console.error('❌ Load SubTools error:', error);
            setAvailableSubTools([]);
        } finally {
            setLoadingSubTools(false);
        }
    };

    const filteredAccessories = accessories.filter(acc => {
        if (filter.search &&
            !acc.name?.toLowerCase().includes(filter.search.toLowerCase()) &&
            !acc.code?.toLowerCase().includes(filter.search.toLowerCase()) &&
            !acc.brand?.toLowerCase().includes(filter.search.toLowerCase()) &&
            !acc.model?.toLowerCase().includes(filter.search.toLowerCase())) {
            return false;
        }

        if (filter.accessoryType && acc.accessoryTypeInfo?.id !== filter.accessoryType) {
            return false;
        }

        if (filter.status && acc.status !== filter.status) {
            return false;
        }

        return true;
    });

    const handleCreate = () => {
        setModalMode('create');
        setFormData({
            name: '',
            accessoryType: '',
            brand: '',
            model: '',
            serialNumber: '',
            condition: 'Mới',
            purchasePrice: '',
            purchaseDate: '',
            warrantyEndDate: '',
            notes: '',
            parentTool: parentToolId,
            code: '',
            quantity: 1,
            unitOC: 'Cái',
            specifications: {},
            slot: '',
            status: 'Đang sử dụng'
        });
        setShowModal(true);
    };

    const handleEdit = (accessory: any) => {
        setModalMode('edit');
        setSelectedAccessory(accessory);
        setFormData({
            name: accessory.name || '',
            accessoryType: accessory.accessoryTypeInfo?.id || '',
            brand: accessory.brand || '',
            model: accessory.model || '',
            serialNumber: accessory.serialNumber || '',
            condition: accessory.condition || 'Mới',
            purchasePrice: accessory.purchasePrice || '',
            purchaseDate: accessory.purchaseDate ? new Date(accessory.purchaseDate).toISOString().split('T')[0] : '',
            warrantyEndDate: accessory.warrantyUntil ? new Date(accessory.warrantyUntil).toISOString().split('T')[0] : '',
            notes: accessory.notes || '',
            code: accessory.code || '',
            quantity: accessory.quantity || 1,
            specifications: accessory.specifications || {},
            slot: accessory.slot || '',
            parentTool: parentToolId,
            unitOC: accessory.unitOC || 'Cái',
            status: accessory.status || 'Đang sử dụng'
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {

        if (!id) {
            toast.error('ID không hợp lệ');
            return;
        }

        if (!window.confirm('Bạn có chắc muốn xóa linh kiện này?')) return;

        try {
            await accessoryService.softDeleted(id);
            toast.success('Xóa linh kiện thành công');
            loadAccessoriesBySubTool();
        } catch (error: any) {
            console.error('Delete error:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa linh kiện');
        }
    };

    const openTransferModal = (accessory: any) => {
        setSelectedAccessory(accessory);
        setTransferForm({
            accessoryId: accessory.id,
            employeeId: '',
            targetSubToolId: '',
            condition: accessory.condition || 'Mới',
            notes: ''
        });
        setShowTransferModal(true);
    };

    const closeTransferModal = () => {
        setShowTransferModal(false);
        setSelectedAccessory(null);
        setAvailableSubTools([]);
        setTransferForm({
            accessoryId: '',
            employeeId: '',
            targetSubToolId: '',
            condition: 'Mới',
            notes: ''
        });
    };

    const openRevokeModal = (accessory: any) => {
        setSelectedAccessory(accessory);
        setRevokeForm({
            accessoryId: accessory.id,
            condition: accessory.condition || 'Mới',
            notes: ''
        });
        setShowRevokeModal(true);
    };

    const closeRevokeModal = () => {
        setShowRevokeModal(false);
        setSelectedAccessory(null);
        setRevokeForm({
            accessoryId: '',
            condition: 'Mới',
            notes: ''
        });
    };

    const handleTransfer = async () => {
        if (!transferForm.employeeId) {
            toast.error('Vui lòng chọn nhân viên');
            return;
        }

        if (!transferForm.targetSubToolId) {
            toast.error('Vui lòng chọn SubTool đích');
            return;
        }

        try {
            setLoading(true);
            const response = await accessoryService.assign(transferForm);

            const selectedEmployee = employees.find(e => e.id === transferForm.employeeId);
            const selectedSubTool = availableSubTools.find(s => s.id === transferForm.targetSubToolId);

            if (response.changes?.transferred) {
                toast.success(`Đã chuyển ${selectedAccessory.name} sang ${selectedSubTool?.name} và giao cho ${selectedEmployee?.name}`);
            } else {
                toast.success(`Đã giao ${selectedAccessory.name} cho ${selectedEmployee?.name}`);
            }

            await loadAccessoriesBySubTool();
            closeTransferModal();
        } catch (error: any) {
            console.error('Transfer error:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi chuyển giao');
        } finally {
            setLoading(false);
        }
    };

    const handleRevoke = async () => {
        try {
            setLoading(true);
            await accessoryService.revoke(revokeForm);
            toast.success(`Thu hồi ${selectedAccessory.name} thành công`);
            await loadAccessoriesBySubTool();
            closeRevokeModal();
        } catch (error: any) {
            console.error('Revoke error:', error);
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi thu hồi');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.accessoryType || !parentToolId || !subToolId) {
            toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!guidRegex.test(formData.accessoryType)) {
            toast.error(`❌ Invalid accessoryType GUID: ${formData.accessoryType}`);
            console.error('CategoryAccessoryTypes:', categoryAccessoryTypes);
            return;
        }

        try {
            const dataToSubmit = {
                name: formData.name,
                subToolId: subToolId,
                parentToolId: parentToolId,
                accessoryTypeId: formData.accessoryType,
                code: formData.code || null,
                serialNumber: formData.serialNumber || null,
                model: formData.model || null,
                quantity: formData.quantity || 1,
                brand: formData.brand || null,
                unitOC: formData.unitOC || 'Cái',
                specifications: formData.specifications || {},
                slot: formData.slot || null,
                purchaseDate: formData.purchaseDate || null,
                purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : null,
                warrantyUntil: formData.warrantyEndDate || null,
                status: formData.status || 'Đang sử dụng',
                condition: formData.condition || 'Mới',
                notes: formData.notes || null
            };

            if (modalMode === 'create') {
                const token = localStorage.getItem('accessToken');
                const response = await fetch('http://localhost:3002/api/accessory', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(dataToSubmit)
                }); 

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to create');
                }

                toast.success('Thêm linh kiện thành công');
            } else {
                await accessoryService.update(selectedAccessory.id, dataToSubmit);
                toast.success('Cập nhật linh kiện thành công');
            }

            setShowModal(false);
            loadAccessoriesBySubTool();
        } catch (error: any) {
            console.error('❌ Submit error:', error);
            toast.error(error.message || 'Có lỗi xảy ra');
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'Khả dụng': 'bg-blue-100 text-blue-700',
            'Đang sử dụng': 'bg-green-100 text-green-700',
            'Bảo trì': 'bg-yellow-100 text-yellow-700',
            'Hỏng': 'bg-red-100 text-red-700',
            'Đã nâng cấp': 'bg-purple-100 text-purple-700',
            'Thanh lý': 'bg-gray-100 text-gray-700'
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    const getConditionColor = (condition: string) => {
        const colors: Record<string, string> = {
            'Mới': 'text-green-600',
            'Cũ': 'text-orange-600',
            'Hỏng': 'text-red-600'
        };
        return colors[condition] || 'text-gray-600';
    };

    const getAccessoryTypeName = (accessory: any) => {
        return accessory.accessoryTypeInfo?.name || '-';
    };

    const selectedEmployee = employees.find(e => e.id === transferForm.employeeId);
    const selectedSubTool = availableSubTools.find(s => s.id === transferForm.targetSubToolId);
    const isTransferring = transferForm.targetSubToolId && transferForm.targetSubToolId !== selectedAccessory?.subTool;

    if (loading && accessories.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                    <ArrowLeft size={18} /> Quay lại
                </button>
                <h1 className="text-2xl font-bold text-gray-800 mb-2 mt-6">
                    Quản lý Linh kiện
                    {subToolInfo && ` - ${subToolInfo.name}`}
                </h1>
                <p className="text-gray-600">Quản lý thông tin chi tiết các linh kiện máy tính</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Tổng linh kiện</p>
                            <p className="text-2xl font-bold text-gray-800">{accessories.length}</p>
                        </div>
                        <PackageCheck className="w-10 h-10 text-blue-500 opacity-50" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Đang sử dụng</p>
                            <p className="text-2xl font-bold text-gray-800">
                                {accessories.filter(c => c.status === 'Đang sử dụng').length}
                            </p>
                        </div>
                        <Eye className="w-10 h-10 text-green-500 opacity-50" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Đã nâng cấp</p>
                            <p className="text-2xl font-bold text-gray-800">
                                {accessories.filter(c => c.status === 'Đã nâng cấp').length}
                            </p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-purple-500 opacity-50" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Hỏng</p>
                            <p className="text-2xl font-bold text-gray-800">
                                {accessories.filter(c => c.status === 'Hỏng').length}
                            </p>
                        </div>
                        <AlertCircle className="w-10 h-10 text-red-500 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow mb-6 p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="md:col-span-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên, mã, brand..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={filter.search}
                                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                            />
                        </div>
                    </div>

                    <select
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={filter.accessoryType}
                        onChange={(e) => setFilter({ ...filter, accessoryType: e.target.value })}
                    >
                        <option value="">Tất cả loại</option>
                        {categoryAccessoryTypes.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                        ))}
                    </select>

                    <select
                        className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={filter.status}
                        onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                    >
                        <option value="">Tất cả trạng thái</option>
                        {statusOptions.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Thêm linh kiện
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã</th> */}
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tên linh kiện</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loại</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand/Model</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tình trạng</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trạng thái</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Giá</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredAccessories.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                        Không tìm thấy linh kiện nào
                                    </td>
                                </tr>
                            ) : (
                                filteredAccessories.map((accessory) => (
                                    <tr key={accessory.id} className="hover:bg-gray-50">
                                        {/* <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                                            {accessory.code || '-'}
                                        </td> */}
                                        <td className="px-4 py-3">
                                            <div className="text-sm font-medium text-gray-900">{accessory.name}</div>
                                            {accessory.serialNumber && (
                                                <div className="text-xs text-gray-500">SN: {accessory.serialNumber}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-900">
                                                {getAccessoryTypeName(accessory)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-900">{accessory.brand || '-'}</div>
                                            <div className="text-xs text-gray-500">{accessory.model || '-'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-900">{accessory.quantity || '-'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-sm font-medium ${getConditionColor(accessory.condition)}`}>
                                                {accessory.condition}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(accessory.status)}`}>
                                                {accessory.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {accessory.purchasePrice ?
                                                `${accessory.purchasePrice.toLocaleString('vi-VN')} đ` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {accessory.status === 'Đang sử dụng' && (
                                                    <>
                                                        <button
                                                            onClick={() => openTransferModal(accessory)}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                            title="Chuyển giao"
                                                        >
                                                            <UserPlus className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => openRevokeModal(accessory)}
                                                            className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                                                            title="Thu hồi"
                                                        >
                                                            <UserMinus className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    onClick={() => handleEdit(accessory)}
                                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Sửa"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(accessory.id)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                    title="Xóa"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-bold mb-4">
                                {modalMode === 'create' ? 'Thêm linh kiện mới' : 'Cập nhật linh kiện'}
                            </h2>

                            <form onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tên linh kiện <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Loại linh kiện <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.accessoryType}
                                            onChange={(e) => {
                                                const selectedId = e.target.value;
                                                setFormData({ ...formData, accessoryType: selectedId });
                                            }}
                                        >
                                            <option value="">Chọn loại</option>
                                            {categoryAccessoryTypes.map(type => (
                                                <option key={type.id} value={type.id}>
                                                    {type.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mã linh kiện</label>
                                        <input
                                            disabled
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.code}
                                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.brand}
                                            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.model}
                                            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.quantity}
                                            onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) || 1 })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.serialNumber}
                                            onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tình trạng</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.condition}
                                            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                        >
                                            {conditionOptions.map(cond => (
                                                <option key={cond} value={cond}>{cond}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Giá mua (VNĐ)</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.purchasePrice}
                                            onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày mua</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.purchaseDate}
                                            onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Ngày hết bảo hành</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.warrantyEndDate}
                                            onChange={(e) => setFormData({ ...formData, warrantyEndDate: e.target.value })}
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                                        <textarea
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                    >
                                        {modalMode === 'create' ? 'Thêm' : 'Cập nhật'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {showTransferModal && selectedAccessory && (
                <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50 transition-all duration-300 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 animate-slideUp">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                            <h2 className="text-2xl font-bold text-gray-800">
                                Chuyển giao linh kiện
                            </h2>
                            <button onClick={closeTransferModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-blue-900 mb-2">Thông tin linh kiện</h3>
                                <div className="space-y-1 text-sm">
                                    <p className="text-blue-800">
                                        <span className="font-medium">Tên:</span> {selectedAccessory.name}
                                    </p>
                                    <p className="text-blue-800">
                                        <span className="font-medium">Mã:</span> {selectedAccessory.code}
                                    </p>
                                    <p className="text-blue-800">
                                        <span className="font-medium">Loại:</span> {getAccessoryTypeName(selectedAccessory)}
                                    </p>
                                    <p className="text-blue-800">
                                        <span className="font-medium">Thiết bị hiện tại:</span> {subToolInfo?.name}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nhân viên mới <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={transferForm.employeeId}
                                    onChange={(e) => setTransferForm({ ...transferForm, employeeId: e.target.value, targetSubToolId: '' })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    <option value="">Chọn nhân viên</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.code} - {emp.name} - {emp.positionInfo?.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {transferForm.employeeId && (
                                <div>
                                    <label className="block mt-6 text-sm font-medium text-gray-700 mb-2">
                                        Bộ phận muốn chuyển vào (Thùng máy tính) <span className="text-red-500">*</span>
                                    </label>
                                    {loadingSubTools ? (
                                        <div className="text-center py-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                            <p className="text-sm text-gray-500 mt-2">Đang tải danh sách bộ phận...</p>
                                        </div>
                                    ) : availableSubTools.length === 0 ? (
                                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                            <p className="text-sm text-orange-700">
                                                Nhân viên <strong>{selectedEmployee?.name}</strong> chưa được giao Thùng máy tính nào phù hợp
                                            </p>
                                            <p className="text-xs text-orange-600 mt-1">
                                                Vui lòng giao bộ phận có Thùng máy tính cho nhân viên trước hoặc chọn nhân viên khác.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <select
                                                value={transferForm.targetSubToolId}
                                                onChange={(e) => setTransferForm({ ...transferForm, targetSubToolId: e.target.value })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                            >
                                                <option value="">Chọn thiết bị đích</option>
                                                {availableSubTools.map(subTool => (
                                                    <option key={subTool.id} value={subTool.id}>
                                                        {subTool.name} ({subTool.parentToolInfo?.name})
                                                        {subTool.id === subToolId && ' (Bộ phận hiện tại)'}
                                                    </option>
                                                ))}
                                            </select>

                                            {isTransferring && (
                                                <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-3">
                                                    <div className="flex items-center gap-2 text-sm text-purple-800">
                                                        <ArrowRight className="w-4 h-4" />
                                                        <span>
                                                            Linh kiện sẽ được chuyển từ <strong>{subToolInfo?.name} </strong> sang <strong>{selectedSubTool?.name}</strong>
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tình trạng khi giao
                                </label>
                                <select
                                    value={transferForm.condition}
                                    onChange={(e) => setTransferForm({ ...transferForm, condition: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    {conditionOptions.map(cond => (
                                        <option key={cond} value={cond}>{cond}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Ghi chú
                                </label>
                                <textarea
                                    value={transferForm.notes}
                                    onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    rows={3}
                                    placeholder="Lý do chuyển giao..."
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeTransferModal}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={handleTransfer}
                                    disabled={loading || !transferForm.employeeId || !transferForm.targetSubToolId}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <UserPlus className="w-5 h-5" />
                                    {loading ? 'Đang xử lý...' : 'Chuyển & Giao'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showRevokeModal && selectedAccessory && (
                <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50 transition-all duration-300 animate-fadeIn">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 animate-slideUp">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-800">Thu hồi linh kiện</h2>
                            <button onClick={closeRevokeModal} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Component Info */}
                            <div className="bg-orange-50 p-4 rounded-lg">
                                <h3 className="font-semibold text-orange-900 mb-2">Thông tin Component</h3>
                                <div className="space-y-1 text-sm">
                                    <p className="text-orange-800">
                                        <span className="font-medium">Tên:</span> {selectedAccessory.name}
                                    </p>
                                    <p className="text-orange-800">
                                        <span className="font-medium">Mã:</span> {selectedAccessory.code}
                                    </p>
                                    <p className="text-orange-800">
                                        <span className="font-medium">Loại:</span> {getAccessoryTypeName(selectedAccessory)}
                                    </p>
                                    <p className="text-orange-800">
                                        <span className="font-medium">Thiết bị:</span> {subToolInfo?.name}
                                    </p>
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-yellow-700">
                                            Linh kiện sẽ chuyển sang trạng thái <strong>Dự phòng</strong> sau khi thu hồi.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Condition */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tình trạng khi thu hồi
                                </label>
                                <select
                                    value={revokeForm.condition}
                                    onChange={(e) => setRevokeForm({ ...revokeForm, condition: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                >
                                    {conditionOptions.map(cond => (
                                        <option key={cond} value={cond}>{cond}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Ghi chú
                                </label>
                                <textarea
                                    value={revokeForm.notes}
                                    onChange={(e) => setRevokeForm({ ...revokeForm, notes: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    rows={3}
                                    placeholder="Lý do thu hồi..."
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={closeRevokeModal}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={handleRevoke}
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <UserMinus className="w-5 h-5" />
                                    {loading ? 'Đang thu hồi...' : 'Thu hồi'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccessoryManagement;