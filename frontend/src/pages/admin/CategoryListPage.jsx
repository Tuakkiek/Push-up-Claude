// frontend/src/pages/admin/CategoryListPage.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryAPI } from "@/lib/api";
import { toast } from "sonner";
import { Loading } from "@/components/shared/Loading";

const CategoryListPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await categoryAPI.getAll();
      setCategories(res.data.data || []);
    } catch (error) {
      toast.error("Lỗi khi tải danh mục");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa danh mục này?")) return;
    try {
      await categoryAPI.delete(id);
      toast.success("Xóa thành công");
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Xóa thất bại");
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quản lý Danh Mục</h1>
        <Link to="/admin/categories/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Tạo danh mục
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 border-b text-gray-600 font-medium">
            <tr>
              <th className="px-6 py-4">Tên danh mục</th>
              <th className="px-6 py-4">Slug</th>
              <th className="px-6 py-4">Số Fields Specs</th>
              <th className="px-6 py-4">Số Fields Variants</th>
              <th className="px-6 py-4 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat._id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{cat.name}</td>
                <td className="px-6 py-4 text-gray-500">{cat.slug}</td>
                <td className="px-6 py-4">
                  {Object.keys(cat.specSchema || {}).length}
                </td>
                <td className="px-6 py-4">
                  {Object.keys(cat.variantSchema || {}).length}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Link to={`/admin/categories/${cat._id}/edit`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4 text-blue-600" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(cat._id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                  Chưa có danh mục nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CategoryListPage;
