import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Hooks & APIs
import { useCategories } from "@/hooks/useCategories";
import { useProductForm } from "@/hooks/products/useProductForm";
import { useVariantForm } from "@/hooks/products/useVariantForm";
import { useProductAPI } from "@/hooks/products/useProductAPI";
import { productAPI } from "@/lib/api";
import { INSTALLMENT_BADGE_OPTIONS } from "@/lib/productConstants";

// Forms
import UnifiedSpecsForm from "@/components/shared/specs/UnifiedSpecsForm";
import UnifiedVariantsForm from "@/components/shared/variants/UnifiedVariantsForm";

const ProductEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  const { categories, loading: loadingCategories } = useCategories();
  
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [fetchedProduct, setFetchedProduct] = useState(null);
  
  // Selected Category ID/Slug state
  const [selectedCategory, setSelectedCategory] = useState("");

  // Get full category object based on selection
  const activeCategoryObject = useMemo(() => {
    if (!categories.length || !selectedCategory) return null;
    return categories.find(c => c._id === selectedCategory || c.slug === selectedCategory);
  }, [categories, selectedCategory]);

  // Fetch product if editing
  useEffect(() => {
    if (isEdit) {
      setLoadingProduct(true);
      productAPI.getById(id)
        .then((res) => {
          const product = res.data.data;
          setFetchedProduct(product);
          // Set initial category from product
          // Depending on API, product.category might be ID or populated object
          const catId = product.category?._id || product.category;
          setSelectedCategory(catId);
        })
        .catch((err) => {
          console.error("Failed to fetch product", err);
          toast.error("Không thể tải thông tin sản phẩm");
          navigate("/warehouse/products");
        })
        .finally(() => setLoadingProduct(false));
    }
  }, [id, isEdit, navigate]);

  // Hook 1: Product Form Data
  const {
    formData,
    setFormData,
    handleBasicChange,
    handleSpecChange,
    handleColorChange,
    addColor,
    removeColor,
  } = useProductForm(
    true, // open (always true for page)
    isEdit,
    activeCategoryObject || selectedCategory, // Pass object if available
    fetchedProduct
  );

  // Hook 2: Variants
  const {
    addVariant,
    removeVariant,
    handleVariantChange,
    handleVariantImageChange,
    addVariantImage,
    removeVariantImage,
    handleVariantOptionChange,
    addVariantOption,
    removeVariantOption,
  } = useVariantForm(formData, setFormData, activeCategoryObject?.slug || "iphone"); // Fallback slug if needed

  // Hook 3: API Submit
  const { handleSubmit: submitAPI, isSubmitting } = useProductAPI(
    activeCategoryObject, // Pass Full Category Object
    isEdit,
    fetchedProduct,
    () => true, // Skipping complex validation for now
    () => {}, // No onOpenChange logic needed
    () => navigate("/warehouse/products") // Redirect on save
  );

  if (loadingCategories || loadingProduct) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl space-y-8">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEdit ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
            </h1>
            <p className="text-muted-foreground">
              {isEdit ? `ID: ${id}` : "Tạo sản phẩm mới vào kho hàng"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Hủy
          </Button>
          <Button onClick={(e) => submitAPI(e, formData)} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Save className="w-4 h-4 mr-2" />
            Lưu sản phẩm
          </Button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {/* 1. Category Selection (Only if Create) */}
      {!isEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Chọn danh mục sản phẩm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Danh mục *</Label>
                <Select 
                    value={selectedCategory} 
                    onValueChange={setSelectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại sản phẩm..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Chọn đúng danh mục để tải cấu hình thông số kỹ thuật.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FORM CONTENTS (Only show if category is selected or editing) */}
      {(selectedCategory || isEdit) && formData ? (
        <form onSubmit={(e) => submitAPI(e, formData)} className="space-y-8">
          
          {/* 2. Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tên sản phẩm *</Label>
                  <Input
                    value={formData.name || ""}
                    onChange={(e) => handleBasicChange("name", e.target.value)}
                    placeholder="VD: iPhone 15 Pro Max"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Model (SKU Gốc) *</Label>
                  <Input
                    value={formData.model || ""}
                    onChange={(e) => handleBasicChange("model", e.target.value)}
                    placeholder="VD: IPHONE-15-PM"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Thương hiệu</Label>
                  <Input
                    value={formData.brand || ""}
                    onChange={(e) => handleBasicChange("brand", e.target.value)}
                    placeholder="Apple, Samsung..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tình trạng</Label>
                  <Select
                    value={formData.condition || "NEW"}
                    onValueChange={(v) => handleBasicChange("condition", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">Mới 100%</SelectItem>
                      <SelectItem value="LIKE_NEW">Like New (99%)</SelectItem>
                      <SelectItem value="USED">Cũ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Trạng thái hiển thị</Label>
                  <Select
                    value={formData.status || "AVAILABLE"}
                    onValueChange={(v) => handleBasicChange("status", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Đang bán</SelectItem>
                      <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
                      <SelectItem value="DISCONTINUED">Ngừng kinh doanh</SelectItem>
                      <SelectItem value="PRE_ORDER">Đặt trước</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Chương trình trả góp</Label>
                  <Select
                    value={formData.installmentBadge || "NONE"}
                    onValueChange={(v) => handleBasicChange("installmentBadge", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INSTALLMENT_BADGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mô tả chi tiết</Label>
                <Textarea
                  value={formData.description || ""}
                  onChange={(e) => handleBasicChange("description", e.target.value)}
                  placeholder="Mô tả sản phẩm..."
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* 3. Media */}
          <Card>
            <CardHeader>
              <CardTitle>Hình ảnh & Video</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Hình ảnh nổi bật (Featured Images)</Label>
                {(formData.featuredImages || [""]).map((url, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={url}
                      onChange={(e) => {
                        const newImages = [...formData.featuredImages || [""]];
                        newImages[idx] = e.target.value;
                        handleBasicChange("featuredImages", newImages);
                      }}
                      placeholder="https://example.com/image.jpg"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        const newImages = (formData.featuredImages || []).filter((_, i) => i !== idx);
                        handleBasicChange("featuredImages", newImages.length ? newImages : [""]);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    handleBasicChange("featuredImages", [...(formData.featuredImages || []), ""]);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" /> Thêm ảnh
                </Button>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label>Video Review (URL)</Label>
                <Input
                  value={formData.videoUrl || ""}
                  onChange={(e) => handleBasicChange("videoUrl", e.target.value)}
                  placeholder="https://youtube.com/..."
                />
              </div>
            </CardContent>
          </Card>

          {/* 4. Specifications */}
          <Card>
            <CardHeader>
              <CardTitle>Thông số kỹ thuật</CardTitle>
            </CardHeader>
            <CardContent>
              {activeCategoryObject?.specSchema ? (
                <UnifiedSpecsForm
                  schema={activeCategoryObject.specSchema} // Uses schema from loaded category
                  specs={formData.specifications || {}}
                  onChange={handleSpecChange}
                  onColorChange={handleColorChange}
                  onAddColor={addColor}
                  onRemoveColor={removeColor}
                />
              ) : (
                <div className="text-muted-foreground italic">
                  Vui lòng chọn danh mục để tải cấu hình thông số.
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Variants */}
          <Card>
            <CardHeader>
              <CardTitle>Biến thể sản phẩm (SKU & Giá)</CardTitle>
            </CardHeader>
            <CardContent>
              {activeCategoryObject?.variantSchema ? (
                <UnifiedVariantsForm
                  schema={activeCategoryObject.variantSchema}
                  variants={formData.variants || []}
                  onAddVariant={addVariant}
                  onRemoveVariant={removeVariant}
                  onVariantChange={handleVariantChange}
                  onImageChange={handleVariantImageChange}
                  onAddImage={addVariantImage}
                  onRemoveImage={removeVariantImage}
                  onOptionChange={handleVariantOptionChange}
                  onAddOption={addVariantOption}
                  onRemoveOption={removeVariantOption}
                />
              ) : (
                <div className="text-muted-foreground italic">
                  Vui lòng chọn danh mục để tải cấu hình biến thể.
                </div>
              )}
            </CardContent>
          </Card>

        </form>
      ) : (
        <div className="text-center py-20 text-muted-foreground">
          {isEdit ? "Không tìm thấy dữ liệu..." : "Vui lòng chọn danh mục để bắt đầu."}
        </div>
      )}
    </div>
  );
};

export default ProductEditorPage;
