/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, FormEvent, ChangeEvent } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Building2,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { unitService, IUnit, CreateUnitData, UpdateUnitData } from "../services/unitService";
import toast from "react-hot-toast";
import { usePermission } from "../hooks/usePermission";
import { createPortal } from 'react-dom';

interface FormData {
  code: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  type: string;
  isActive: boolean;
  description?: string;
}

  const ModalPortal = ({ children }: { children: React.ReactNode }) => {
    return createPortal(children, document.body);
  };

export default function Units() {
  const [units, setUnits] = useState<IUnit[]>([]);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingUnit, setEditingUnit] = useState<IUnit | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    code: "",
    name: "",
    address: "",
    phone: "",
    email: "",
    type: "branch",
    isActive: true,
    description: "",
  });

  const { hasPermission } = usePermission();



  const canCreate = hasPermission(['manage_units']);
  const canEdit = hasPermission(['manage_units']);
  const canDelete = hasPermission(['manage_units']);

  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await unitService.getAll();

      if (response.success && response.data) {
        setUnits(response.data);
      } else {
        setUnits([]);
      }
    } catch (error: any) {
      console.error('Load units error:', error);
      toast.error(error.response?.data?.message || "Không thể tải danh sách đơn vị");
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (unit: IUnit | null = null): void => {
    if (unit) {
      setEditingUnit(unit);
      setFormData({
        code: unit.code || "",
        name: unit.name || "",
        address: unit.address || "",
        phone: unit.phone || "",
        email: unit.email || "",
        type: unit.type || "branch",
        isActive: unit.isActive ?? true,
        description: unit.description || "",
      });
    } else {
      setEditingUnit(null);
      setFormData({
        code: "",
        name: "",
        address: "",
        phone: "",
        email: "",
        type: "branch",
        isActive: true,
        description: "",
      });
    }
    setShowModal(true);
  };

  const closeModal = (): void => {
    setShowModal(false);
    setEditingUnit(null);
  };

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e?: FormEvent): Promise<void> => {
    if (e) e.preventDefault();

    if (!formData.code || !formData.name || !formData.type) {
      toast.error("Vui lòng điền đầy đủ thông tin bắt buộc (Mã, Tên, Loại)");
      return;
    }

    try {
      setLoading(true);

      if (editingUnit) {
        const updateData: UpdateUnitData = {
          name: formData.name,
          type: formData.type,
          phone: formData.phone,
          address: formData.address,
          email: formData.email,
          description: formData.description,
          isActive: formData.isActive,
        };

        const unitId = editingUnit.id || editingUnit._id;
        if (!unitId) {
          throw new Error('Unit ID không tồn tại');
        }

        await unitService.update(unitId, updateData);
        toast.success("Cập nhật đơn vị thành công");
      } else {
        const createData: CreateUnitData = {
          code: formData.code.toUpperCase(),
          name: formData.name,
          type: formData.type,
          phone: formData.phone,
          address: formData.address,
          email: formData.email,
          description: formData.description,
          isActive: formData.isActive,
        };

        await unitService.create(createData);
        toast.success("Thêm đơn vị thành công");
      }

      await loadUnits();
      closeModal();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (unit: IUnit): Promise<void> => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa đơn vị này?")) return;

    try {
      const unitId = unit.id || unit._id;
      if (!unitId) {
        throw new Error('Unit ID không tồn tại');
      }

      await unitService.delete(unitId);
      toast.success("Xóa đơn vị thành công");
      await loadUnits();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || "Không thể xóa đơn vị");
    }
  };

  const getUnitTypeLabel = (type: string): string => {
    switch (type) {
      case 'head_office':
        return 'Văn phòng';
      case 'branch':
        return 'Chi nhánh';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Quản lý đơn vị
          </h1>
          <p className="text-gray-500 mt-1">
            Tổng số: {units.length} đơn vị
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => openModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Thêm đơn vị
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && units.length === 0 ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      ) : units.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {units.map((unit) => {
            const unitId = unit.id || unit._id;
            return (
              <div
                key={unitId}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden"
              >
                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-3 rounded-lg">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm opacity-90">
                          {getUnitTypeLabel(unit.type)}
                        </p>
                        <h3 className="text-xl font-bold">{unit.code}</h3>
                      </div>
                    </div>
                    {(canEdit || canDelete) && (
                      <div className="flex gap-2">
                        {canEdit && (
                          <button
                            onClick={() => openModal(unit)}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                            title="Sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(unit)}
                            className="p-2 bg-white/20 hover:bg-red-500 rounded-lg transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <h4 className="text-lg font-bold text-gray-800">
                    {unit.name}
                  </h4>

                  <div className="space-y-2 text-sm">
                    {unit.address && (
                      <div className="flex items-start gap-2 text-gray-600">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{unit.address}</span>
                      </div>
                    )}

                    {unit.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{unit.phone}</span>
                      </div>
                    )}

                    {unit.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span>{unit.email}</span>
                      </div>
                    )}
                  </div>

                  <div
                    className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${unit.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                      }`}
                  >
                    {unit.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-md">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Chưa có đơn vị nào</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ModalPortal>
          <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50 transition-all duration-300 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 scale-95 animate-slideUp">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingUnit ? "Sửa thông tin đơn vị" : "Thêm đơn vị mới"}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mã đơn vị <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase"
                      placeholder="VD: CNHN, CNCT"
                      disabled={!!editingUnit}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tên đơn vị <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="Chi nhánh ...."
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loại đơn vị <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="branch">Chi nhánh</option>
                      <option value="head_office">Văn phòng</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Địa chỉ
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows={2}
                    placeholder="123 Đường ABC, Quận XYZ"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số điện thoại
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="024-12345678"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      placeholder="branch@company.com"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mô tả
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                      rows={2}
                      placeholder="Mô tả về đơn vị..."
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Trạng thái hoạt động
                    </label>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${formData.isActive ? "text-green-700" : "text-gray-600"
                            }`}
                        >
                          {formData.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, isActive: !formData.isActive })
                        }
                        className={`relative inline-flex h-7 w-14 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 shadow-inner ${formData.isActive
                          ? "bg-gradient-to-r from-green-500 to-green-600"
                          : "bg-gray-300"
                          }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-all duration-200 shadow-md ${formData.isActive ? "translate-x-8" : "translate-x-1"
                            }`}
                        >
                          {formData.isActive && (
                            <svg
                              className="h-5 w-5 text-green-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}