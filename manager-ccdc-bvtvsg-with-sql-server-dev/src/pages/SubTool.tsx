/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, X, Save, Package, Eye, ArrowLeft, Monitor, Keyboard, Mouse, Speaker, UserPlus, ArrowRight } from 'lucide-react';
import { subToolService } from '../services/subtool.service';
import { toolService } from '../services/tool.service';
import { categorySubToolService, type ICategorySubTool } from '../services/category-subtool.service';
import { employeeService } from '../services/employee.service';
import toast from 'react-hot-toast';
import { usePermission } from "../hooks/usePermission";
import type { ISubTool, ITool, IEmployee } from '../types/subtool.types';
import { createPortal } from 'react-dom';
import { getImageUrl } from '@/utils/imageHelper';

const ModalPortal = ({ children }: { children: React.ReactNode }) => {
    return createPortal(children, document.body);
};

export default function SubToolManagement() {
    const { toolId } = useParams<{ toolId: string }>();
    const navigate = useNavigate();

    const [parentTool, setParentTool] = useState<ITool | null>(null);
    const [categorySubTools, setCategorySubTools] = useState<ICategorySubTool[]>([]);
    const [selectedCategoryName, setSelectedCategoryName] = useState<string>('');
    const [subTools, setSubTools] = useState<ISubTool[]>([]);
    const [employees, setEmployees] = useState<IEmployee[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [showModal, setShowModal] = useState<boolean>(false);
    const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
    const [editingSubTool, setEditingSubTool] = useState<ISubTool | null>(null);
    const [selectedSubTool, setSelectedSubTool] = useState<ISubTool | null>(null);

    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedSubToolDetail, setSelectedSubToolDetail] = useState<ISubTool | null>(null);

    const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
    const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImageUrl, setSelectedImageUrl] = useState('');

    const [subToolForm, setSubToolForm] = useState({
        code: '',
        name: '',
        subToolType: '',
        assignedTo: '',
        brand: '',
        model: '',
        serialNumber: '',
        purchaseDate: '',
        purchasePrice: '',
        warrantyUntil: '',
        status: 'Đang sử dụng',
        condition: 'Mới',
        notes: '',
        quantity: 1,
        unitOC: 'Cái',
        specifications: {
            screenSize: '',
            resolution: '',
            refreshRate: '',
            panelType: '',
            connectionType: '',
            dpi: '',
            switchType: ''
        }
    });

    const [transferForm, setTransferForm] = useState({
        subToolId: '',
        employeeId: '',
        targetToolId: '',
        condition: 'Mới',
        notes: ''
    });

    const [availableTools, setAvailableTools] = useState<ITool[]>([]);
    const [loadingTools, setLoadingTools] = useState(false);

    const statuses = ['Khả dụng', 'Đang sử dụng', 'Hỏng', 'Thanh lý', 'Dự phòng'];
    const conditions = ['Mới', 'Cũ', 'Hỏng'];

    const { hasPermission } = usePermission();

    const canCreate = hasPermission(['create_tool']);
    const canEdit = hasPermission(['update_tool']);
    const canDelete = hasPermission(['delete_tool']);


    useEffect(() => {
        if (toolId) {
            loadData();
            loadEmployees();
        }
    }, [toolId]);

    useEffect(() => {
        if (transferForm.employeeId && selectedSubTool) {
            loadEmployeeTools(transferForm.employeeId);
        } else {
            setAvailableTools([]);
        }
    }, [transferForm.employeeId]);

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
            const imageUrl = existingImageUrls[index];

            const filename = imageUrl.split('/').pop();

            if (filename && window.confirm('Bạn có chắc muốn xóa ảnh này?')) {
                try {
                    await subToolService.deleteImage(filename);

                    setExistingImageUrls(prev => prev.filter((_, i) => i !== index));

                    toast.success('Đã xóa ảnh');
                } catch (error: any) {
                    console.error('Delete image error:', error);
                    toast.error(error?.response?.data?.message || 'Không thể xóa ảnh');
                }
            }
        }
        else {
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

    const openDetailModal = (subtool: ISubTool) => {
        setSelectedSubToolDetail(subtool);
        setShowDetailModal(true);
    };

    const closeDetailModal = () => {
        setShowDetailModal(false);
        setSelectedSubToolDetail(null);
    };

    const loadData = async () => {
        if (!toolId) return;

        try {
            setLoading(true);
            const [toolRes, subToolsRes, categorySubToolsRes] = await Promise.all([
                toolService.getById(toolId),
                subToolService.getByParentTool(toolId),
                categorySubToolService.getAll()
            ]);

            setParentTool(toolRes.data);
            setSubTools(subToolsRes.data || []);

            setCategorySubTools(categorySubToolsRes.data || []);
        } catch (error) {
            toast.error('Không thể tải dữ liệu');
            console.error(error);
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

    const loadEmployeeTools = async (employeeId: string) => {
        try {
            setLoadingTools(true);

            const response = await toolService.getAll({
                assignedTo: employeeId,
                status: 'Đang sử dụng'
            });

            const parentCategoryId = parentTool?.categoryId ||
                (typeof parentTool?.category === 'object' ? parentTool?.category?.id : parentTool?.category);


            if (!parentCategoryId) {
                console.error('❌ Parent tool has no valid categoryId');
                setAvailableTools([]);
                return;
            }

            const compatibleTools = (response.data || []).filter((tool: any) => {
                const toolCategoryId = tool.categoryId ||
                    (typeof tool.category === 'object' ? tool.category?._id : tool.category);

                return toolCategoryId && toolCategoryId === parentCategoryId;
            });

            setAvailableTools(compatibleTools);
        } catch (error) {
            console.error('❌ Load tools error:', error);
            setAvailableTools([]);
        } finally {
            setLoadingTools(false);
        }
    };

    const openTransferModal = (subTool: ISubTool) => {
        setSelectedSubTool(subTool);
        setTransferForm({
            subToolId: subTool.id,
            employeeId: '',
            targetToolId: '',
            condition: subTool.condition || 'Mới',
            notes: ''
        });
        setShowTransferModal(true);
    };

    const openModal = (subTool: ISubTool | null = null) => {
        if (subTool) {
            setEditingSubTool(subTool);

            const subToolTypeObj = typeof subTool.subToolType === 'object' ? subTool.subToolType : null;
            const subToolTypeId = subToolTypeObj?._id || subTool.subToolTypeId || '';
            const selectedCat = categorySubTools.find((cat: ICategorySubTool) => cat._id === subToolTypeId);
            setSelectedCategoryName(selectedCat?.name || '');

            const assignedToId = typeof subTool.assignedTo === 'object'
                ? subTool.assignedTo.id
                : subTool.assignedTo || '';

            setSubToolForm({
                name: subTool.name || '',
                code: subTool.code || '',
                subToolType: subToolTypeId,
                assignedTo: assignedToId,
                brand: subTool.brand || '',
                model: subTool.model || '',
                serialNumber: subTool.serialNumber || '',
                purchaseDate: subTool.purchaseDate ? new Date(subTool.purchaseDate).toISOString().split('T')[0] : '',
                purchasePrice: subTool.purchasePrice?.toString() || '',
                warrantyUntil: subTool.warrantyUntil ? new Date(subTool.warrantyUntil).toISOString().split('T')[0] : '',
                status: subTool.status || 'Đang sử dụng',
                condition: subTool.condition || 'Mới',
                notes: subTool.notes || '',
                quantity: subTool.quantity || 1,
                unitOC: subTool.unitOC || 'Cái',
                specifications: {
                    screenSize: subTool.specifications?.screenSize || '',
                    resolution: subTool.specifications?.resolution || '',
                    refreshRate: subTool.specifications?.refreshRate || '',
                    panelType: subTool.specifications?.panelType || '',
                    connectionType: subTool.specifications?.connectionType || '',
                    dpi: subTool.specifications?.dpi || '',
                    switchType: subTool.specifications?.switchType || ''
                }
            });

            const images = subTool.images || [];

            const processImages = images.map(img => getImageUrl(img));

            setExistingImageUrls(processImages);
            setNewImagePreviews([]);
            setNewImageFiles([]);
        } else {
            setEditingSubTool(null);
            setSelectedCategoryName('');
            setSubToolForm({
                name: '',
                code: '',
                subToolType: '',
                assignedTo: '',
                brand: '',
                model: '',
                serialNumber: '',
                purchaseDate: '',
                purchasePrice: '',
                warrantyUntil: '',
                status: 'Đang sử dụng',
                condition: 'Mới',
                notes: '',
                quantity: 1,
                unitOC: 'Cái',
                specifications: {
                    screenSize: '',
                    resolution: '',
                    refreshRate: '',
                    panelType: '',
                    connectionType: '',
                    dpi: '',
                    switchType: ''
                }
            });


            setExistingImageUrls([]);
            setNewImagePreviews([]);
            setNewImageFiles([]);
        }
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingSubTool(null);
        setSelectedCategoryName('');
    };

    const closeTransferModal = () => {
        setShowTransferModal(false);
        setSelectedSubTool(null);
        setAvailableTools([]);
        setTransferForm({
            subToolId: '',
            employeeId: '',
            targetToolId: '',
            condition: 'Mới',
            notes: ''
        });
    };

    const handleSubmit = async () => {
        if (!toolId) {
            toast.error('Không tìm thấy ID thiết bị');
            return;
        }

        if (!subToolForm.name || !subToolForm.subToolType) {
            toast.error('Vui lòng điền đầy đủ thông tin bắt buộc (Tên và Loại thiết bị)');
            return;
        }

        try {
            setLoading(true);

            let finalImageUrls = [...existingImageUrls];

            if (newImageFiles.length > 0) {
                try {
                    const uploadResult = await subToolService.uploadImages(newImageFiles);
                    if (uploadResult.success && uploadResult.data) {
                        finalImageUrls = [...finalImageUrls, ...uploadResult.data];
                    }
                } catch (uploadError: any) {
                    toast.error(uploadError.response?.data?.message || 'Lỗi khi upload ảnh');
                    setLoading(false);
                    return;
                }
            }

            const data: any = {
                name: subToolForm.name,
                parentToolId: toolId,
                subToolTypeId: subToolForm.subToolType,
                brand: subToolForm.brand || undefined,
                model: subToolForm.model || undefined,
                serialNumber: subToolForm.serialNumber || undefined,
                quantity: subToolForm.quantity || 1,
                specifications: subToolForm.specifications,
                purchaseDate: subToolForm.purchaseDate || undefined,
                purchasePrice: subToolForm.purchasePrice ? parseFloat(subToolForm.purchasePrice) : undefined,
                warrantyUntil: subToolForm.warrantyUntil || undefined,
                status: subToolForm.status || 'Đang sử dụng',
                condition: subToolForm.condition || 'Mới',
                notes: subToolForm.notes || undefined,
                unitOC: subToolForm.unitOC || 'Cái',
                images: finalImageUrls,
            };

            Object.keys(data).forEach((key: string) => {
                if (data[key] === undefined) delete data[key];
            });

            if (editingSubTool) {
                await subToolService.update(editingSubTool.id, data);
                toast.success('Cập nhật bộ phận của thiết bị thành công');
            } else {
                await subToolService.create(data);
                toast.success('Thêm bộ phận của thiết bị thành công');
            }

            await loadData();
            closeModal();
        } catch (error: any) {
            console.error('Submit error:', error);
            toast.error(error?.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setLoading(false);
        }
    };

    const handleTransfer = async () => {
        if (!selectedSubTool) {
            toast.error('Không tìm thấy thông tin bộ phận');
            return;
        }

        if (!transferForm.employeeId) {
            toast.error('Vui lòng chọn nhân viên');
            return;
        }

        if (!transferForm.targetToolId) {
            toast.error('Vui lòng chọn thiết bị đích');
            return;
        }

        try {
            setLoading(true);
            const response = await subToolService.assign(transferForm);

            const selectedEmployee = employees.find(e => e.id === transferForm.employeeId);
            const selectedTool = availableTools.find(t => t.id === transferForm.targetToolId);

            if (response.data?.changes?.transferred) {
                toast.success(`Đã chuyển ${selectedSubTool.name} sang ${selectedTool?.name} và giao cho ${selectedEmployee?.name}`);
            } else {
                toast.success(`Đã giao ${selectedSubTool.name} cho ${selectedEmployee?.name}`);
            }

            if (response.accessorysUpdated && response.accessorysUpdated > 0) {
                toast.success(`Đã cập nhật ${response.accessorysUpdated} linh kiện theo bộ phận`);
            }

            await loadData();
            closeTransferModal();
        } catch (error: any) {
            console.error('Transfer error:', error);
            toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi chuyển giao');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa bộ phận này không?')) return;

        try {
            setLoading(true);
            const response = await subToolService.softDelete(id);
            if (response.success) {
                toast.success(response.message || 'Xóa bộ phận thành công');
                await loadData();
            }
        } catch (error: any) {
            console.error('Delete error:', error);
            toast.error(error?.response?.data?.message || 'Không thể xóa bộ phận');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string | undefined): string => {
        switch (status) {
            case 'Khả dụng': return 'bg-green-100 text-green-700';
            case 'Đang sử dụng': return 'bg-blue-100 text-blue-700';
            case 'Bảo trì': return 'bg-yellow-100 text-yellow-700';
            case 'Hỏng': return 'bg-red-100 text-red-700';
            case 'Thanh lý': return 'bg-gray-100 text-gray-700';
            case 'Dự phòng': return 'bg-purple-100 text-purple-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const getConditionColor = (condition: string | undefined): string => {
        switch (condition) {
            case 'Mới': return 'text-green-600';
            case 'Cũ': return 'text-orange-600';
            case 'Hỏng': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    const getIconByType = (typeName: string | undefined) => {
        if (!typeName) return Package;

        switch (typeName.toLowerCase()) {
            case 'màn hình': return Monitor;
            case 'bàn phím': return Keyboard;
            case 'chuột': return Mouse;
            case 'loa': return Speaker;
            default: return Package;
        }
    };

    const selectedEmployee = employees.find(e => e.id === transferForm.employeeId);
    const selectedTool = availableTools.find(t => t.id === transferForm.targetToolId);
    const isTransferring = transferForm.targetToolId && transferForm.targetToolId !== toolId;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="mb-6 mt-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                        <ArrowLeft size={18} /> Quay lại
                    </button>
                    <h1 className="text-3xl font-bold text-gray-800 mt-6">
                        Quản lý bộ phận của thiết bị
                    </h1>
                    {parentTool && (
                        <p className="text-gray-500 mt-1">
                            Thiết bị: {parentTool.name} | Tổng: {subTools.length} bộ phận
                        </p>
                    )}
                </div>
                {canCreate && (
                    <button
                        onClick={() => openModal()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all shadow-lg"
                    >
                        <Plus className="w-5 h-5" />
                        Thêm bộ phận
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-3 p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="mt-4 text-gray-600">Đang tải...</p>
                    </div>
                ) : subTools.length === 0 ? (
                    <div className="col-span-3 text-center py-12">
                        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">Chưa có bộ phận nào</p>
                    </div>
                ) : (
                    subTools.map((subTool: ISubTool) => {
                        const subToolTypeObj = typeof subTool.subToolType === 'object' ? subTool.subToolType : null;
                        const typeName = subToolTypeObj?.name || subTool.subToolTypeInfo?.name || '';
                        const Icon = getIconByType(typeName);

                        return (
                            <div
                                key={subTool.id}
                                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden"
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-100 p-3 rounded-lg">
                                                <Icon className="w-6 h-6 text-indigo-600" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-800">
                                                    {subTool.name}
                                                </h3>
                                                {/* {subTool.code && (
                                                    <p className="text-xs text-gray-500">{subTool.code}</p>
                                                )} */}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Loại:</span>
                                            <span className="font-semibold">
                                                {typeName || 'N/A'}
                                            </span>
                                        </div>
                                        {subTool.brand && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Thương hiệu:</span>
                                                <span className="font-semibold">{subTool.brand}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Trạng thái:</span>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(subTool.status)}`}>
                                                {subTool.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Tình trạng:</span>
                                            <span className={`font-semibold ${getConditionColor(subTool.condition)}`}>
                                                {subTool.condition}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Số lượng:</span>
                                            <span className="font-semibold">
                                                {subTool.quantity || 1} {subTool.unitOC || 'Cái'}
                                            </span>
                                        </div>
                                        {subTool.assignedTo && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Người dùng:</span>
                                                <span className="font-semibold text-indigo-600">
                                                    {typeof subTool.assignedTo === 'object'
                                                        ? subTool.assignedTo.name
                                                        : subTool.assignedToInfo?.name || 'N/A'}
                                                </span>
                                            </div>
                                        )}
                                        {(subTool.hasAccessorys || (subTool.accessorysCount ?? 0) > 0) && (
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-600">Linh kiện:</span>
                                                <span className="font-semibold text-purple-600">
                                                    {subTool.accessorysCount ?? 0} linh kiện
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-4 border-t">
                                        <button
                                            onClick={() => {
                                                if (subTool.id && toolId) {
                                                    navigate(`/subtool/${subTool.id}/${toolId}/accessories`);
                                                } else {
                                                    console.log('Missing values:', {
                                                        subToolId: subTool.id,
                                                        toolId
                                                    });
                                                }
                                            }}
                                            className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                        >
                                            Xem linh kiện
                                        </button>
                                        <button
                                            onClick={() => openDetailModal(subTool)}
                                            className="px-4 py-2 bg-green-50 text-blue-600 rounded-lg hover:bg-green-100 transition-colors"
                                            title="Xem chi tiết"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        {canEdit && (
                                            <>
                                                <button
                                                    onClick={() => openTransferModal(subTool)}
                                                    className="px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                                    title="Chuyển giao"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openModal(subTool)}
                                                    className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                                    title="Sửa"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                        {canDelete && (
                                            <button
                                                onClick={() => handleDelete(subTool.id)}
                                                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Xóa"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {showModal && (
                <ModalPortal>
                    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50 transition-all duration-300 animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 animate-slideUp">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {editingSubTool ? 'Sửa thông tin bộ phận' : 'Thêm bộ phận mới'}
                                </h2>
                                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {editingSubTool && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Mã bộ phận
                                            </label>
                                            <input
                                                type="text"
                                                value={subToolForm.code}
                                                disabled
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                                            />
                                        </div>
                                    )}

                                    <div className={editingSubTool ? '' : 'col-span-2'}>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Tên bộ phận <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={subToolForm.name}
                                            onChange={(e) => setSubToolForm({ ...subToolForm, name: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Loại bộ phận <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={subToolForm.subToolType}
                                            onChange={(e) => {
                                                const selectedId = e.target.value;
                                                const selectedCat = categorySubTools.find(cat => {
                                                    const catId = cat._id || cat.id;
                                                    return catId === selectedId;
                                                });
                                                setSelectedCategoryName(selectedCat?.name || '');
                                                setSubToolForm({ ...subToolForm, subToolType: selectedId });
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Chọn loại bộ phận</option>
                                            {categorySubTools.map((cat: ICategorySubTool) => {
                                                const catId = cat._id || cat.id;
                                                return (
                                                    <option key={catId} value={catId}>
                                                        {cat.name}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Đơn vị tính</label>
                                        <select
                                            value={subToolForm.unitOC}
                                            onChange={(e) => setSubToolForm({ ...subToolForm, unitOC: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="Cái">Cái</option>
                                            <option value="Bộ">Bộ</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Thương hiệu</label>
                                        <input
                                            type="text"
                                            value={subToolForm.brand}
                                            onChange={(e) => setSubToolForm({ ...subToolForm, brand: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Dell, HP, Logitech..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                                        <input
                                            type="text"
                                            value={subToolForm.model}
                                            onChange={(e) => setSubToolForm({ ...subToolForm, model: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number</label>
                                        <input
                                            type="text"
                                            value={subToolForm.serialNumber}
                                            onChange={(e) => setSubToolForm({ ...subToolForm, serialNumber: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={subToolForm.quantity}
                                            onChange={(e) => setSubToolForm({ ...subToolForm, quantity: parseInt(e.target.value) || 1 })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Ngày mua</label>
                                        <input
                                            type="date"
                                            value={subToolForm.purchaseDate}
                                            onChange={(e) => setSubToolForm({ ...subToolForm, purchaseDate: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Giá mua (VNĐ)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            value={subToolForm.purchasePrice}
                                            onChange={(e) => setSubToolForm({ ...subToolForm, purchasePrice: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Bảo hành đến</label>
                                        <input
                                            type="date"
                                            value={subToolForm.warrantyUntil}
                                            onChange={(e) => setSubToolForm({ ...subToolForm, warrantyUntil: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                                        <select
                                            value={subToolForm.status}
                                            onChange={(e) => setSubToolForm({ ...subToolForm, status: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {statuses.map((status: string) => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Tình trạng</label>
                                        <select
                                            value={subToolForm.condition}
                                            onChange={(e) => setSubToolForm({ ...subToolForm, condition: e.target.value })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {conditions.map((cond: string) => (
                                                <option key={cond} value={cond}>{cond}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {selectedCategoryName === 'Màn hình' && (
                                    <div className="border-t pt-4 mt-4">
                                        <h3 className="font-semibold mb-3 text-gray-800">Thông số màn hình</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Kích thước</label>
                                                <input
                                                    type="text"
                                                    value={subToolForm.specifications.screenSize}
                                                    onChange={(e) => setSubToolForm({
                                                        ...subToolForm,
                                                        specifications: { ...subToolForm.specifications, screenSize: e.target.value }
                                                    })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Độ phân giải</label>
                                                <input
                                                    type="text"
                                                    value={subToolForm.specifications.resolution}
                                                    onChange={(e) => setSubToolForm({
                                                        ...subToolForm,
                                                        specifications: { ...subToolForm.specifications, resolution: e.target.value }
                                                    })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Tần số quét</label>
                                                <input
                                                    type="text"
                                                    value={subToolForm.specifications.refreshRate}
                                                    onChange={(e) => setSubToolForm({
                                                        ...subToolForm,
                                                        specifications: { ...subToolForm.specifications, refreshRate: e.target.value }
                                                    })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Loại tấm nền</label>
                                                <input
                                                    type="text"
                                                    value={subToolForm.specifications.panelType}
                                                    onChange={(e) => setSubToolForm({
                                                        ...subToolForm,
                                                        specifications: { ...subToolForm.specifications, panelType: e.target.value }
                                                    })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {(selectedCategoryName === 'Bàn phím' || selectedCategoryName === 'Chuột') && (
                                    <div className="border-t pt-4 mt-4">
                                        <h3 className="font-semibold mb-3 text-gray-800">Thông số kết nối</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Kiểu kết nối</label>
                                                <input
                                                    type="text"
                                                    value={subToolForm.specifications.connectionType}
                                                    onChange={(e) => setSubToolForm({
                                                        ...subToolForm,
                                                        specifications: { ...subToolForm.specifications, connectionType: e.target.value }
                                                    })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="USB, Wireless, Bluetooth"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú</label>
                                    <textarea
                                        value={subToolForm.notes}
                                        onChange={(e) => setSubToolForm({ ...subToolForm, notes: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        rows={3}
                                        placeholder="Ghi chú thêm..."
                                    />
                                </div>

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

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Save className="w-5 h-5" />
                                        {loading ? 'Đang lưu...' : 'Lưu'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </ModalPortal>
            )}


            {showDetailModal && selectedSubToolDetail && (
                <ModalPortal>
                    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-[9998] ttransition-all duration-300 animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto transform transition-all duration-300 scale-95 animate-slideUp">
                            <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-4 rounded-t-2xl">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white/20 p-2 rounded-lg">
                                            {(() => {
                                                const typeName = typeof selectedSubToolDetail.subToolType === 'object'
                                                    ? selectedSubToolDetail.subToolType.name
                                                    : selectedSubToolDetail.subToolTypeInfo?.name || '';
                                                const Icon = getIconByType(typeName);
                                                return <Icon className="w-6 h-6" />;
                                            })()}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold">Chi tiết bộ phận thiết bị</h2>
                                            <p className="text-indigo-100 text-sm">
                                                {typeof selectedSubToolDetail.subToolType === 'object'
                                                    ? selectedSubToolDetail.subToolType.name
                                                    : selectedSubToolDetail.subToolTypeInfo?.name}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={closeDetailModal}
                                        className="text-white/80 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 p-6 rounded-xl">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                {selectedSubToolDetail.code && (
                                                    <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm font-semibold">
                                                        {selectedSubToolDetail.code}
                                                    </span>
                                                )}
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedSubToolDetail.status)}`}>
                                                    {selectedSubToolDetail.status}
                                                </span>
                                            </div>
                                            <h3 className="text-2xl font-bold text-indigo-900 mb-2">
                                                {selectedSubToolDetail.name}
                                            </h3>
                                            <div className="flex flex-wrap gap-2 text-sm text-indigo-700">
                                                {selectedSubToolDetail.brand && (
                                                    <span className="bg-white/60 px-2 py-1 rounded">
                                                        {selectedSubToolDetail.brand}
                                                    </span>
                                                )}
                                                {selectedSubToolDetail.model && (
                                                    <span className="bg-white/60 px-2 py-1 rounded">
                                                        {selectedSubToolDetail.model}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {selectedSubToolDetail.purchasePrice && (
                                            <div className="text-left sm:text-right">
                                                <p className="text-xs text-indigo-600 mb-1">Giá trị</p>
                                                <p className="text-2xl font-bold text-indigo-700">
                                                    {selectedSubToolDetail.purchasePrice.toLocaleString('vi-VN')} đ
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Basic Info */}
                                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                        <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                                            📋 Thông tin cơ bản
                                        </h4>
                                        <div className="space-y-3">
                                            {selectedSubToolDetail.serialNumber && (
                                                <div className="flex justify-between items-start">
                                                    <span className="text-sm text-gray-600">Serial Number:</span>
                                                    <span className="text-sm font-medium text-gray-900 font-mono">
                                                        {selectedSubToolDetail.serialNumber}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm text-gray-600">Số lượng:</span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {selectedSubToolDetail.quantity || 1} {selectedSubToolDetail.unitOC || 'Cái'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm text-gray-600">Tình trạng:</span>
                                                <span className={`text-sm font-semibold ${getConditionColor(selectedSubToolDetail.condition)}`}>
                                                    {selectedSubToolDetail.condition}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm text-gray-600">Thuộc thiết bị:</span>
                                                <span className="text-sm font-medium text-indigo-600">
                                                    {parentTool?.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                        <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                                            📅 Thông tin thời gian
                                        </h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm text-gray-600">Ngày mua:</span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {selectedSubToolDetail.purchaseDate
                                                        ? new Date(selectedSubToolDetail.purchaseDate).toLocaleDateString('vi-VN')
                                                        : '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm text-gray-600">Bảo hành đến:</span>
                                                <span className="text-sm font-medium text-gray-900">
                                                    {selectedSubToolDetail.warrantyUntil
                                                        ? new Date(selectedSubToolDetail.warrantyUntil).toLocaleDateString('vi-VN')
                                                        : '-'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm text-gray-600">Còn bảo hành:</span>
                                                <span className="text-sm font-medium">
                                                    {selectedSubToolDetail.warrantyUntil && new Date(selectedSubToolDetail.warrantyUntil) > new Date()
                                                        ? <span className="text-green-600 flex items-center gap-1">
                                                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                                            Còn hạn
                                                        </span>
                                                        : <span className="text-red-600 flex items-center gap-1">
                                                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                                            Hết hạn
                                                        </span>
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {selectedSubToolDetail.specifications && Object.values(selectedSubToolDetail.specifications).some(v => v) && (
                                    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                        <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                                            ⚙️ Thông số kỹ thuật
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {selectedSubToolDetail.specifications.screenSize && (
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-xs text-gray-600 mb-1">Kích thước</p>
                                                    <p className="text-sm font-semibold text-gray-900">{selectedSubToolDetail.specifications.screenSize}</p>
                                                </div>
                                            )}
                                            {selectedSubToolDetail.specifications.resolution && (
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-xs text-gray-600 mb-1">Độ phân giải</p>
                                                    <p className="text-sm font-semibold text-gray-900">{selectedSubToolDetail.specifications.resolution}</p>
                                                </div>
                                            )}
                                            {selectedSubToolDetail.specifications.refreshRate && (
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-xs text-gray-600 mb-1">Tần số quét</p>
                                                    <p className="text-sm font-semibold text-gray-900">{selectedSubToolDetail.specifications.refreshRate}</p>
                                                </div>
                                            )}
                                            {selectedSubToolDetail.specifications.panelType && (
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-xs text-gray-600 mb-1">Loại tấm nền</p>
                                                    <p className="text-sm font-semibold text-gray-900">{selectedSubToolDetail.specifications.panelType}</p>
                                                </div>
                                            )}
                                            {selectedSubToolDetail.specifications.connectionType && (
                                                <div className="bg-gray-50 p-3 rounded-lg">
                                                    <p className="text-xs text-gray-600 mb-1">Kết nối</p>
                                                    <p className="text-sm font-semibold text-gray-900">{selectedSubToolDetail.specifications.connectionType}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Assigned User */}
                                {selectedSubToolDetail.assignedTo ? (
                                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5 shadow-sm">
                                        <h4 className="text-base font-semibold text-green-900 mb-4 flex items-center gap-2 border-b border-green-200 pb-2">
                                            👤 Người sử dụng hiện tại
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <span className="text-xs text-green-700">Tên nhân viên:</span>
                                                <p className="text-sm font-semibold text-green-900 mt-1">
                                                    {typeof selectedSubToolDetail.assignedTo === 'object'
                                                        ? selectedSubToolDetail.assignedTo.name
                                                        : selectedSubToolDetail.assignedToInfo?.name}
                                                </p>
                                            </div>
                                            {selectedSubToolDetail.assignedToInfo?.code && (
                                                <div>
                                                    <span className="text-xs text-green-700">Mã nhân viên:</span>
                                                    <p className="text-sm font-semibold text-green-900 mt-1">
                                                        {selectedSubToolDetail.assignedToInfo.code}
                                                    </p>
                                                </div>
                                            )}
                                            {(typeof selectedSubToolDetail.assignedTo === 'object' && selectedSubToolDetail.assignedTo.positionInfo) && (
                                                <div>
                                                    <span className="text-xs text-green-700">Chức vụ:</span>
                                                    <p className="text-sm font-semibold text-green-900 mt-1">
                                                        {typeof selectedSubToolDetail.assignedTo.positionInfo === 'object'
                                                            ? selectedSubToolDetail.assignedTo.positionInfo?.name
                                                            : '-'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                                        <p className="text-sm text-gray-500">
                                            Bộ phận này chưa được giao cho nhân viên nào
                                        </p>
                                    </div>
                                )}

                                {/* Accessories Count */}
                                {(selectedSubToolDetail.accessorysCount ?? 0) > 0 && (
                                    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-purple-500 text-white p-2 rounded-lg">
                                                    <Package className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-purple-900">
                                                        Linh kiện đi kèm
                                                    </p>
                                                    <p className="text-xs text-purple-700">
                                                        Bộ phận này có {selectedSubToolDetail.accessorysCount} linh kiện
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (selectedSubToolDetail.id && toolId) {
                                                        navigate(`/subtool/${selectedSubToolDetail.id}/${toolId}/accessories`);
                                                    }
                                                }}
                                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                            >
                                                Xem chi tiết
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {selectedSubToolDetail.images && selectedSubToolDetail.images.length > 0 && (
                                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                            🖼️ Hình ảnh
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {selectedSubToolDetail.images.map((img, index) => {
                                                // Xử lý URL ảnh
                                                const apiURL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
                                                const baseURL = apiURL.replace(/\/api$/, '');
                                                const imageUrl = img.startsWith('http') ? img : `${baseURL}${img}`;

                                                return (
                                                    <div key={index} className="relative group">
                                                        <img
                                                            src={imageUrl}
                                                            alt={`SubTool image ${index + 1}`}
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

                                {selectedSubToolDetail.notes && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
                                        <h4 className="text-base font-semibold text-amber-900 mb-3 flex items-center gap-2">
                                            📝 Ghi chú
                                        </h4>
                                        <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">
                                            {selectedSubToolDetail.notes}
                                        </p>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex flex-wrap gap-3 pt-4 border-t">
                                    {canEdit && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    closeDetailModal();
                                                    openTransferModal(selectedSubToolDetail);
                                                }}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
                                            >
                                                <UserPlus className="w-4 h-4" />
                                                Chuyển giao
                                            </button>
                                            <button
                                                onClick={() => {
                                                    closeDetailModal();
                                                    openModal(selectedSubToolDetail);
                                                }}
                                                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
                                            >
                                                <Pencil className="w-4 h-4" />
                                                Chỉnh sửa
                                            </button>
                                        </>
                                    )}
                                    {/* <button
                                        onClick={() => {
                                            if (selectedSubToolDetail.id && toolId) {
                                                navigate(`/subtool/${selectedSubToolDetail.id}/${toolId}/accessories`);
                                            }
                                        }}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium shadow-sm"
                                    >
                                        <Package className="w-4 h-4" />
                                        Quản lý linh kiện
                                    </button> */}
                                    <button
                                        onClick={closeDetailModal}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium shadow-sm ml-auto"
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

            {showTransferModal && selectedSubTool && (
                <ModalPortal>
                    <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50 transition-all duration-300 animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-95 animate-slideUp">
                            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                                <h2 className="text-2xl font-bold text-gray-800">
                                    Chuyển giao bộ phận
                                </h2>
                                <button onClick={closeTransferModal} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h3 className="font-semibold text-blue-900 mb-2">Thông tin bộ phận</h3>
                                    <div className="space-y-1 text-sm">
                                        <p className="text-blue-800">
                                            <span className="font-medium">Tên:</span> {selectedSubTool.name}
                                        </p>
                                        <p className="text-blue-800">
                                            <span className="font-medium">Loại:</span> {typeof selectedSubTool.subToolType === 'object'
                                                ? selectedSubTool.subToolType.name
                                                : selectedSubTool.subToolTypeInfo?.name || 'N/A'}
                                        </p>
                                        <p className="text-blue-800">
                                            <span className="font-medium">Thiết bị hiện tại:</span> {parentTool?.name}
                                        </p>
                                        {selectedSubTool.assignedTo && (
                                            <p className="text-blue-800">
                                                <span className="font-medium">Đang giao cho:</span> {typeof selectedSubTool.assignedTo === 'object'
                                                    ? selectedSubTool.assignedTo.name
                                                    : selectedSubTool.assignedToInfo?.name || 'N/A'}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nhân viên muốn giao <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={transferForm.employeeId}
                                        onChange={(e) => setTransferForm({
                                            ...transferForm,
                                            employeeId: e.target.value,
                                            targetToolId: ''
                                        })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    >
                                        <option value="">Chọn nhân viên</option>
                                        {employees
                                            .filter((emp: IEmployee) => {
                                                const assignedToId = typeof selectedSubTool.assignedTo === 'object'
                                                    ? selectedSubTool.assignedTo.id
                                                    : selectedSubTool.assignedTo;
                                                return emp.id !== assignedToId;
                                            })
                                            .map((emp: IEmployee) => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.code} - {emp.name} - {emp.positionInfo?.name || 'N/A'}
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                {transferForm.employeeId && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Thiết bị đích <span className="text-red-500">*</span>
                                        </label>
                                        {loadingTools ? (
                                            <div className="text-center py-4">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                                <p className="text-sm text-gray-500 mt-2">Đang tải danh sách thiết bị...</p>
                                            </div>
                                        ) : availableTools.length === 0 ? (
                                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                                <p className="text-sm text-orange-700">
                                                    Nhân viên <strong>{selectedEmployee?.name}</strong> chưa được giao thiết bị nào phù hợp cùng danh mục.
                                                </p>
                                                <p className="text-xs text-orange-600 mt-1">
                                                    Vui lòng giao thiết bị cho nhân viên trước hoặc chọn nhân viên khác.
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <select
                                                    value={transferForm.targetToolId}
                                                    onChange={(e) => setTransferForm({ ...transferForm, targetToolId: e.target.value })}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                >
                                                    <option value="">Chọn thiết bị đích</option>
                                                    {availableTools.map((tool: ITool) => (
                                                        <option key={tool.id} value={tool.id}>
                                                            {tool.name}
                                                            {tool.id === toolId && ' (Thiết bị hiện tại)'}
                                                        </option>
                                                    ))}
                                                </select>

                                                {isTransferring && (
                                                    <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-3">
                                                        <div className="flex items-center gap-2 text-sm text-purple-800">
                                                            <ArrowRight className="w-4 h-4" />
                                                            <span>
                                                                <strong>{selectedSubTool.name}</strong> sẽ được chuyển từ <strong>{parentTool?.name}</strong> sang <strong>{selectedTool?.name}</strong> của <strong>{selectedEmployee?.name}</strong>
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
                                        {conditions.map(cond => (
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
                                        placeholder={isTransferring ? "Lý do chuyển thiết bị..." : "Ghi chú khi giao..."}
                                    />
                                </div>

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
                                        disabled={loading || !transferForm.employeeId || !transferForm.targetToolId}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <UserPlus className="w-5 h-5" />
                                        {loading ? 'Đang xử lý...' : (isTransferring ? 'Chuyển & Giao' : 'Giao bộ phận')}
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