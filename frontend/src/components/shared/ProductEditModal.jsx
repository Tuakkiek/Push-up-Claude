// frontend/src/components/shared/ProductEditModal.jsx

import React, { useState, useEffect, useCallback } from "react";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

// Generic Forms
import UnifiedSpecsForm from "@/components/shared/specs/UnifiedSpecsForm";
import UnifiedVariantsForm from "@/components/shared/variants/UnifiedVariantsForm";

// Hooks & Cons
import { INSTALLMENT_BADGE_OPTIONS } from "@/lib/productConstants";
import { useProductForm } from "@/hooks/products/useProductForm";
import { useVariantForm } from "@/hooks/products/useVariantForm";
import { useProductAPI } from "@/hooks/products/useProductAPI";
// import { useProductValidation } from "@/hooks/products/useProductValidation"; // Todo: make validation dynamic

const ProductEditModal = ({
  open,
  onOpenChange,
  mode = "edit",
  category, // Should be FULL Category Object now
  product,
  onSave = () => {},
}) => {
  const isEdit = mode === "edit";
  const [activeFormTab, setActiveFormTab] = useState("basic");

  // Hook 1: Form Data & Handlers
  const {
    formData,
    setFormData,
    handleBasicChange,
    handleSpecChange,
    handleColorChange,
    addColor,
    removeColor,
  } = useProductForm(open, isEdit, category, product);

  // Hook 2: Variant Handlers
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
  } = useVariantForm(formData, setFormData);

  // Validation Hook Placeholer or Generic
  // For now we skip strict client validation or use a simplified generic one
  const validateForm = () => true; 

  // Hook 3: API Submit
  const { handleSubmit: submitAPI, isSubmitting } = useProductAPI(
    category, // This might need ID or slug depending on API
    isEdit,
    product,
    validateForm,
    onOpenChange,
    onSave
  );

  const handleSubmit = useCallback(
    (e) => submitAPI(e, formData),
    [submitAPI, formData]
  );

  // Loading State
  if (!formData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[90vw] max-w-none max-h-[95vh] overflow-y-auto p-0"
        style={{ width: "60vw", maxWidth: "none" }}
      >
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="text-2xl font-bold">
            {isEdit ? "Cập nhật sản phẩm" : "Tạo sản phẩm mới"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
             Danh mục: {category?.name || "..."}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="basic">Cơ bản</TabsTrigger>
                <TabsTrigger value="specs">Thông số</TabsTrigger>
                <TabsTrigger value="variants">Biến thể</TabsTrigger>
              </TabsList>

              {/* === TAB BASIC === */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tên sản phẩm *</Label>
                    <Input
                      value={formData.name || ""}
                      onChange={(e) => handleBasicChange("name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Model *</Label>
                    <Input
                      value={formData.model || ""}
                      onChange={(e) => handleBasicChange("model", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Thương hiệu</Label>
                    <Input
                      value={formData.brand || ""}
                      onChange={(e) => handleBasicChange("brand", e.target.value)}
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
                        <SelectItem value="LIKE_NEW">Like New</SelectItem>
                        <SelectItem value="USED">Cũ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Trạng thái</Label>
                    <Select
                      value={formData.status || "AVAILABLE"}
                      onValueChange={(v) => handleBasicChange("status", v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Còn hàng</SelectItem>
                        <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
                        <SelectItem value="DISCONTINUED">Ngừng KD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                   <div className="space-y-2">
                    <Label>Trả góp 0%</Label>
                    <Select
                      value={formData.installmentBadge || "NONE"}
                      onValueChange={(value) =>
                        handleBasicChange("installmentBadge", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn chương trình trả góp" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSTALLMENT_BADGE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) => handleBasicChange("description", e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>

                {/* Featured Images */}
                <div className="space-y-2">
                  <Label>Hình ảnh nổi bật (Featured)</Label>
                  {(formData.featuredImages || [""]).map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={url}
                        onChange={(e) => {
                          const newImages = [...formData.featuredImages || [""]];
                          newImages[idx] = e.target.value;
                          handleBasicChange("featuredImages", newImages);
                        }}
                        placeholder="URL hình ảnh..."
                      />
                      <Button
                        type="button" variant="outline" size="sm"
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
                    type="button" variant="outline" size="sm"
                    onClick={() => {
                        handleBasicChange("featuredImages", [...(formData.featuredImages || []), ""]);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Thêm ảnh
                  </Button>
                </div>
                 {/* Video URL */}
                <div className="space-y-2">
                  <Label>Video URL</Label>
                  <Input
                    value={formData.videoUrl || ""}
                    onChange={(e) => handleBasicChange("videoUrl", e.target.value)}
                    placeholder="URL Youtube/MP4"
                  />
                </div>
              </TabsContent>

              {/* === TAB SPECS === */}
              <TabsContent value="specs" className="mt-4">
                <UnifiedSpecsForm 
                    schema={category?.specSchema} 
                    specs={formData.specifications || {}}
                    onChange={handleSpecChange}
                    onColorChange={handleColorChange}
                    onAddColor={addColor}
                    onRemoveColor={removeColor}
                />
              </TabsContent>

              {/* === TAB VARIANTS === */}
              <TabsContent value="variants" className="mt-4">
                <UnifiedVariantsForm
                    schema={category?.variantSchema}
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
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductEditModal;
