// frontend/src/pages/admin/CategoryManagement.jsx
import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Save, X, Settings, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CategoryManagement = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    skuPrefix: "",
  });

  const FIXED_CATEGORIES = [
    "iPhone",
    "iPad",
    "Mac",
    "AirPods",
    "AppleWatch",
    "Accessories",
  ];

  useEffect(() => {
    console.log("🔄 CategoryManagement mounted");
    loadCategories();
  }, []);

  // Debug: Log state changes
  useEffect(() => {
    console.log("📊 State changed:", {
      showAddForm,
      editingId,
      formData,
      categoriesCount: categories.length,
    });
  }, [showAddForm, editingId, formData, categories]);

  const authStorage = JSON.parse(localStorage.getItem("auth-storage"));
  const token = authStorage?.state?.token;

  const loadCategories = async () => {
    console.log("📥 Loading categories...");
    setLoading(true);
    try {
      const response = await fetch("/api/categories");
      console.log("📦 Response status:", response.status);

      const data = await response.json();
      console.log("📦 Response data:", data);

      if (data.success) {
        const categoriesWithFixed = data.data.categories.map((cat) => ({
          ...cat,
          isFixed: FIXED_CATEGORIES.includes(cat.name),
        }));
        console.log("✅ Categories loaded:", categoriesWithFixed);
        setCategories(categoriesWithFixed);
      } else {
        console.error("❌ API returned success: false");
        toast.error("Không thể tải categories");
      }
    } catch (error) {
      console.error("❌ Load categories error:", error);
      toast.error("Lỗi khi tải danh sách category");
    } finally {
      setLoading(false);
    }
  };

  const createSlug = (str) => {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  };

  const handleInputChange = (field, value) => {
    console.log("✏️ Input changed:", field, value);
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === "name") {
        updated.slug = createSlug(value);
        updated.skuPrefix = value
          .toUpperCase()
          .replace(/\s+/g, "")
          .substring(0, 10);
        console.log("🔄 Auto-generated:", {
          slug: updated.slug,
          skuPrefix: updated.skuPrefix,
        });
      }

      return updated;
    });
  };

  const validateForm = () => {
    console.log("🔍 Validating form:", formData);

    if (!formData.name.trim()) {
      console.log("❌ Validation failed: name empty");
      toast.error("Tên category không được để trống");
      return false;
    }
    if (!formData.slug.trim()) {
      console.log("❌ Validation failed: slug empty");
      toast.error("Slug không được để trống");
      return false;
    }

    const duplicate = categories.find(
      (c) => c.slug === formData.slug && c._id !== editingId
    );
    if (duplicate) {
      console.log("❌ Validation failed: duplicate slug", duplicate);
      toast.error("Slug đã tồn tại");
      return false;
    }

    console.log("✅ Validation passed");
    return true;
  };

  const handleCreate = async () => {
    console.log("➕ Create category clicked");
    if (!validateForm()) return;

    try {
      console.log("📤 Sending create request:", formData);
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      console.log("📦 Create response status:", response.status);
      const data = await response.json();
      console.log("📦 Create response data:", data);

      if (data.success) {
        toast.success("Tạo category thành công");
        await loadCategories();
        resetForm();
      } else {
        toast.error(data.message || "Lỗi khi tạo category");
      }
    } catch (error) {
      console.error("❌ Create error:", error);
      toast.error("Lỗi khi tạo category");
    }
  };

  const handleUpdate = async (id) => {
    console.log("📝 Update category clicked:", id);
    if (!validateForm()) return;

    try {
      console.log("📤 Sending update request:", { id, formData });
      const response = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      console.log("📦 Update response status:", response.status);
      const data = await response.json();
      console.log("📦 Update response data:", data);

      if (data.success) {
        toast.success("Cập nhật category thành công");
        await loadCategories();
        resetForm();
      } else {
        toast.error(data.message || "Lỗi khi cập nhật");
      }
    } catch (error) {
      console.error("❌ Update error:", error);
      toast.error("Lỗi khi cập nhật category");
    }
  };

  const handleDelete = async (id) => {
    console.log("🗑️ Delete category clicked:", id);
    if (!confirm("Bạn có chắc chắn muốn xóa category này?")) {
      console.log("❌ Delete cancelled");
      return;
    }

    try {
      console.log("📤 Sending delete request:", id);
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("📦 Delete response status:", response.status);
      const data = await response.json();
      console.log("📦 Delete response data:", data);

      if (data.success) {
        toast.success("Xóa category thành công");
        await loadCategories();
      } else {
        toast.error(data.message || "Lỗi khi xóa");
      }
    } catch (error) {
      console.error("❌ Delete error:", error);
      toast.error("Lỗi khi xóa category");
    }
  };

  const startEdit = (category) => {
    console.log("✏️ Start edit:", category);
    setEditingId(category._id);
    setFormData({
      name: category.name,
      slug: category.slug,
      skuPrefix: category.skuPrefix,
    });
    setShowAddForm(false);
  };

  const resetForm = () => {
    console.log("🔄 Reset form");
    setFormData({ name: "", slug: "", skuPrefix: "" });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleAddButtonClick = () => {
    console.log("➕ Add button clicked - Before state update");
    console.log("Current states:", { showAddForm, editingId });

    // ✅ FIX: Gọi resetForm() TRƯỚC, sau đó mới set showAddForm
    setFormData({ name: "", slug: "", skuPrefix: "" });
    setEditingId(null);
    setShowAddForm(true);

    console.log("➕ Add button clicked - After state update");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quản lý Category</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý danh mục sản phẩm và cấu hình thông số kỹ thuật
          </p>
        </div>
        <Button onClick={handleAddButtonClick} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Thêm Category
        </Button>
      </div>

      {/* Debug Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
        <strong>🐛 Debug:</strong> showAddForm = {String(showAddForm)},
        editingId = {editingId || "null"}
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? "Chỉnh sửa Category" : "Thêm Category Mới"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>
                  Tên Category <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="VD: Apple TV"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Slug <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => handleInputChange("slug", e.target.value)}
                  placeholder="apple-tv"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  SKU Prefix <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formData.skuPrefix}
                  onChange={(e) =>
                    handleInputChange("skuPrefix", e.target.value)
                  }
                  placeholder="APPLETV"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() =>
                  editingId ? handleUpdate(editingId) : handleCreate()
                }
                variant="default"
              >
                <Save className="w-4 h-4 mr-2" />
                {editingId ? "Cập nhật" : "Tạo mới"}
              </Button>
              <Button onClick={resetForm} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card
            key={category._id}
            className={category.isFixed ? "" : "border-primary/20"}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  {category.isFixed && (
                    <span className="inline-block mt-1 text-xs px-2 py-1 bg-muted text-muted-foreground rounded">
                      Fixed Category
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigate(`/admin/custom-specs/${category.slug}`)
                    }
                    title="Cấu hình thông số"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      navigate(`/warehouse/products?category=${category.slug}`)
                    }
                    title="Xem sản phẩm"
                  >
                    <Package className="w-4 h-4" />
                  </Button>
                  {!category.isFixed && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(category)}
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category._id)}
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slug:</span>
                  <span className="font-mono">{category.slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU Prefix:</span>
                  <span className="font-mono">{category.skuPrefix}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trạng thái:</span>
                  <span
                    className={
                      category.active ? "text-green-600" : "text-red-600"
                    }
                  >
                    {category.active ? "Hoạt động" : "Tạm ngưng"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Chưa có category nào</p>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
