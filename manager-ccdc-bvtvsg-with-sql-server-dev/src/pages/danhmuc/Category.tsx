/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { Search, Plus, Pencil, Trash2, X, Save } from "lucide-react";
import { categoryService } from "../../services/category.service";
import toast from "react-hot-toast";
import { usePermission } from "../../hooks/usePermission";

interface ICategory {
  id?: string;
  _id?: string;
  name: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface IFormData {
  name: string;
}

export default function Categories() {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showModal, setShowModal] = useState<boolean>(false);
  const [animateModal, setAnimateModal] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<ICategory | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<IFormData>({
    name: "",
  });

  const { hasPermission } = usePermission();

  const canCreate = hasPermission(['create_category_tool']);
  const canEdit = hasPermission(['update_category_tool']);
  const canDelete = hasPermission(['delete_category_tool']);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async (): Promise<void> => {
    try {
      setLoading(true);
      const data = await categoryService.getAll();
      setCategories(data);
    } catch (error: any) {
      console.error('Load categories error:', error);
      toast.error(error.response?.data?.message || "Không thể tải danh sách danh mục");
    } finally {
      setLoading(false);
    }
  };

  const openModal = (category: ICategory | null = null): void => {
    if (category) {
      setEditingCategory(category);
      setFormData({ name: category.name });
    } else {
      setEditingCategory(null);
      setFormData({ name: "" });
    }
    setShowModal(true);
    setTimeout(() => setAnimateModal(true), 10);
  };

  const closeModal = (): void => {
    setAnimateModal(false);
    setTimeout(() => {
      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: "" });
    }, 300);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên danh mục");
      return;
    }

    try {
      setLoading(true);
      if (editingCategory) {
        const categoryId = editingCategory.id || editingCategory._id;
        if (!categoryId) {
          throw new Error('Category ID không tồn tại');
        }
        const response = await categoryService.update(categoryId, formData);
        if (response.success) {
          toast.success(response.message || "Cập nhật danh mục thành công");
        }
      } else {
        const response = await categoryService.create(formData);
        if (response.success) {
          toast.success(response.message || "Thêm danh mục thành công");
        }
      }
      await loadCategories();
      closeModal();
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string): Promise<void> => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${name}"?`)) return;

    try {
      setLoading(true);
      const response = await categoryService.delete(id);
      if (response.success) {
        toast.success(response.message || "Xóa danh mục thành công");
        await loadCategories();
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.message || "Không thể xóa danh mục");
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý danh mục</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tổng số: {filteredCategories.length} danh mục
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => openModal()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Thêm danh mục
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading && categories.length === 0 ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-3 text-sm text-gray-600">Đang tải...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {searchTerm ? "Không tìm thấy danh mục nào" : "Chưa có danh mục nào"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold">STT</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold w-[70%]">Tên danh mục</th>
                  {(canEdit || canDelete) && (
                    <th className="px-6 py-4 text-center text-sm font-semibold w-[30%]">Thao tác</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat, index) => {
                  const categoryId = cat.id || cat._id;
                  return (
                    <tr
                      key={categoryId}
                      className={`${
                        index % 2 === 0 ? "bg-gray-50" : "bg-white"
                      } hover:bg-indigo-50 transition-colors`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">
                        {cat.name}
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-1">
                            {canEdit && (
                              <button
                                onClick={() => openModal(cat)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(categoryId!, cat.name)}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className={`fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-300 ${
              animateModal ? "opacity-100" : "opacity-0"
            }`}
            // onClick={closeModal}
          ></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className={`relative bg-white rounded-xl shadow-2xl w-full max-w-md
              transform transition-all duration-300 ease-out
              ${animateModal ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">
                  {editingCategory ? "Sửa danh mục" : "Thêm danh mục"}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tên danh mục <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Máy tính, Thiết bị văn phòng..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-2 p-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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