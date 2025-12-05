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

// Unified Forms (MỚI)
import UnifiedSpecsForm from "@/components/shared/specs/UnifiedSpecsForm";
import UnifiedVariantsForm from "@/components/shared/variants/UnifiedVariantsForm";

// Spec Forms (Chỉ giữ lại cho AirPods, AppleWatch, Accessories)
import AirPodsSpecsForm from "@/components/shared/specs/AirPodsSpecsForm";
import AppleWatchSpecsForm from "@/components/shared/specs/AppleWatchSpecsForm";
import AccessoriesSpecsForm from "@/components/shared/specs/AccessoriesSpecsForm";
import DynamicSpecsForm from "@/components/shared/specs/DynamicSpecsForm";

// Variant Forms (Chỉ giữ lại cho AirPods, AppleWatch, Accessories)
import AirPodsVariantsForm from "@/components/shared/variants/AirPodsVariantsForm";
import AppleWatchVariantsForm from "@/components/shared/variants/AppleWatchVariantsForm";
import AccessoriesVariantsForm from "@/components/shared/variants/AccessoriesVariantsForm";

// Constants & Hooks
import { INSTALLMENT_BADGE_OPTIONS } from "@/lib/productConstants";
import { useProductForm } from "@/hooks/products/useProductForm";
import { useVariantForm } from "@/hooks/products/useVariantForm";
import { useProductValidation } from "@/hooks/products/useProductValidation";
import { useProductAPI } from "@/hooks/products/useProductAPI";
import { Plus, Trash2 } from "lucide-react";

const ProductEditModal = ({
  open,
  onOpenChange,
  mode = "edit",
  category,
  product,
  onSave = () => {},
}) => {
  const isEdit = mode === "edit";
  const effectiveCategory = isEdit ? product?.category : category;

  const [activeFormTab, setActiveFormTab] = useState("basic");
  const [customSpecConfig, setCustomSpecConfig] = useState(null); // ✅ NEW
  const [isLoadingConfig, setIsLoadingConfig] = useState(false); // ✅ NEW

  // 1. Hook quản lý State và Basic Handlers
  const {
    formData,
    setFormData,
    handleBasicChange,
    handleSpecChange,
    handleColorChange,
    addColor,
    removeColor,
    handleCustomSpecChange,
    addCustomSpec,
    removeCustomSpec,
  } = useProductForm(open, isEdit, effectiveCategory, product);

  // 2. Hook quản lý Variant Handlers
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
  } = useVariantForm(formData, setFormData, effectiveCategory);

  // 3. Hook quản lý Validation
  const { validateForm } = useProductValidation(
    formData,
    effectiveCategory,
    setActiveFormTab
  );

  // 4. Hook quản lý API Submit
  const { handleSubmit: submitAPI, isSubmitting } = useProductAPI(
    effectiveCategory,
    isEdit,
    product,
    validateForm,
    onOpenChange,
    onSave
  );

  // Gắn formData vào handleSubmit
  const handleSubmit = useCallback(
    (e) => submitAPI(e, formData),
    [submitAPI, formData]
  );

  // === RENDER SPECS FORM (CẬP NHẬT) ===
  const renderSpecsForm = useCallback(() => {
    if (!formData || isLoadingConfig) {
      return (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Đang tải cấu hình...</p>
        </div>
      );
    }

    // ✅ Nếu category bật useCustomSpecs → dùng DynamicSpecsForm
    if (customSpecConfig?.useCustomSpecs) {
      return (
        <DynamicSpecsForm
          fields={customSpecConfig.fields}
          specs={formData.specifications || {}}
          onChange={handleSpecChange}
        />
      );
    }

    // ✅ Ngược lại → dùng form cũ (iPhone/iPad/Mac/...)
    const props = {
      specs: formData.specifications || {},
      onChange: handleSpecChange,
      onColorChange: handleColorChange,
      onAddColor: addColor,
      onRemoveColor: removeColor,
    };

    const customProps = {
      customSpecs: Array.isArray(formData.specifications)
        ? formData.specifications
        : [],
      onChange: handleCustomSpecChange,
      onAdd: addCustomSpec,
      onRemove: removeCustomSpec,
    };

    // DÙNG UNIFIED FORM CHO iPhone/iPad/Mac
    if (["iPhone", "iPad", "Mac"].includes(effectiveCategory)) {
      return <UnifiedSpecsForm category={effectiveCategory} {...props} />;
    }

    // GIỮ NGUYÊN FORM RIÊNG CHO CÁC LOẠI KHÁC
    switch (effectiveCategory) {
      case "AirPods":
        return <AirPodsSpecsForm {...props} />;
      case "AppleWatch":
        return <AppleWatchSpecsForm {...props} />;
      case "Accessories":
        return <AccessoriesSpecsForm {...customProps} />;
      default:
        return null;
    }
  }, [
    formData,
    effectiveCategory,
    customSpecConfig,
    isLoadingConfig,
    handleSpecChange,
    handleColorChange,
    addColor,
    removeColor,
    handleCustomSpecChange,
    addCustomSpec,
    removeCustomSpec,
  ]);

  // === RENDER VARIANTS FORM (CẬP NHẬT) ===
  const renderVariantsForm = useCallback(() => {
    if (!formData) return null;

    const props = {
      variants: formData.variants || [],
      onAddVariant: addVariant,
      onRemoveVariant: removeVariant,
      onVariantChange: handleVariantChange,
      onImageChange: handleVariantImageChange,
      onAddImage: addVariantImage,
      onRemoveImage: removeVariantImage,
      onOptionChange: handleVariantOptionChange,
      onAddOption: addVariantOption,
      onRemoveOption: removeVariantOption,
      model: formData.model,
    };

    // DÙNG UNIFIED FORM CHO iPhone/iPad/Mac
    if (["iPhone", "iPad", "Mac"].includes(effectiveCategory)) {
      return <UnifiedVariantsForm category={effectiveCategory} {...props} />;
    }

    // GIỮ NGUYÊN FORM RIÊNG CHO CÁC LOẠI KHÁC
    switch (effectiveCategory) {
      case "AirPods":
        return <AirPodsVariantsForm {...props} />;
      case "AppleWatch":
        return <AppleWatchVariantsForm {...props} />;
      case "Accessories":
        return <AccessoriesVariantsForm {...props} />;
      default:
        return null;
    }
  }, [
    formData,
    effectiveCategory,
    addVariant,
    removeVariant,
    handleVariantChange,
    handleVariantImageChange,
    addVariantImage,
    removeVariantImage,
    handleVariantOptionChange,
    addVariantOption,
    removeVariantOption,
  ]);

  useEffect(() => {
    if (!open || !effectiveCategory) return;

    const fetchCustomConfig = async () => {
      setIsLoadingConfig(true);
      try {
        const response = await customSpecAPI.getByCategory(effectiveCategory);
        setCustomSpecConfig(response.data.data.customSpec);
      } catch (error) {
        console.error("Failed to fetch custom spec config:", error);
        setCustomSpecConfig(null);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    fetchCustomConfig();
  }, [open, effectiveCategory]);

  // === RENDER LOADING STATE ===
  if (!formData || !effectiveCategory) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="w-[90vw] max-w-none max-h-[95vh] overflow-y-auto p-0"
          style={{ width: "50vw" }}
        >
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-2xl font-bold">
              Đang tải...
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Đang tải dữ liệu...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // === RENDER MAIN MODAL ===
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[90vw] max-w-none max-h-[95vh] overflow-y-auto p-0"
        style={{ width: "50vw", maxWidth: "none" }}
      >
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="text-2xl font-bold">
            {`${
              isEdit ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"
            } - ${effectiveCategory}`}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {`${
              isEdit ? "Chỉnh sửa thông tin sản phẩm" : "Tạo sản phẩm mới"
            } trong danh mục ${effectiveCategory}`}
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

              {/* TAB CƠ BẢN */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Tên sản phẩm <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.name || ""}
                      onChange={(e) =>
                        handleBasicChange("name", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Model <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formData.model || ""}
                      onChange={(e) =>
                        handleBasicChange("model", e.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tình trạng</Label>
                    <Select
                      value={formData.condition || "NEW"}
                      onValueChange={(value) =>
                        handleBasicChange("condition", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">Mới 100%</SelectItem>
                        <SelectItem value="LIKE_NEW">Like new</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Trạng thái</Label>
                    <Select
                      value={formData.status || "AVAILABLE"}
                      onValueChange={(value) =>
                        handleBasicChange("status", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Còn hàng</SelectItem>
                        <SelectItem value="OUT_OF_STOCK">Hết hàng</SelectItem>
                        <SelectItem value="DISCONTINUED">
                          Ngừng kinh doanh
                        </SelectItem>
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
                    <p className="text-xs text-muted-foreground">
                      Badge này chỉ hiển thị khi sản phẩm không thuộc top "Mới"
                      hoặc "Bán chạy"
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      handleBasicChange("description", e.target.value)
                    }
                    rows={4}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Nhập mô tả sản phẩm..."
                  />
                </div>

                {/* Featured Images URLs - MULTIPLE */}
                <div className="space-y-2">
                  <Label>URL Ảnh Nổi Bật (Featured Images)</Label>
                  {(formData.featuredImages || [""]).map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={url}
                        onChange={(e) => {
                          const newImages = [
                            ...(formData.featuredImages || [""]),
                          ];
                          newImages[idx] = e.target.value;
                          handleBasicChange("featuredImages", newImages);
                        }}
                        placeholder="https://example.com/featured-image.jpg"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newImages = (
                            formData.featuredImages || [""]
                          ).filter((_, i) => i !== idx);
                          handleBasicChange(
                            "featuredImages",
                            newImages.length ? newImages : [""]
                          );
                        }}
                        disabled={
                          (formData.featuredImages || [""]).length === 1
                        }
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
                      const newImages = [
                        ...(formData.featuredImages || [""]),
                        "",
                      ];
                      handleBasicChange("featuredImages", newImages);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Thêm URL ảnh
                  </Button>
                  <p className="text-xs text-gray-500">
                    Các ảnh này sẽ hiển thị nổi bật trên trang sản phẩm
                  </p>
                </div>

                {/* Video URLs - MULTIPLE */}
                {/* <div className="space-y-2">
                  <Label>URL Video Giới Thiệu</Label>
                  {(formData.videoUrls || [""]).map((url, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={url}
                        onChange={(e) => {
                          const newVideos = [...(formData.videoUrls || [""])];
                          newVideos[idx] = e.target.value;
                          handleBasicChange("videoUrls", newVideos);
                        }}
                        placeholder="https://youtube.com/watch?v=... hoặc https://example.com/video.mp4"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newVideos = (formData.videoUrls || [""]).filter(
                            (_, i) => i !== idx
                          );
                          handleBasicChange(
                            "videoUrls",
                            newVideos.length ? newVideos : [""]
                          );
                        }}
                        disabled={(formData.videoUrls || [""]).length === 1}
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
                      const newVideos = [...(formData.videoUrls || [""]), ""];
                      handleBasicChange("videoUrls", newVideos);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Thêm URL video
                  </Button>
                  <p className="text-xs text-gray-500">
                    URL YouTube hoặc video trực tiếp (MP4)
                  </p>
                </div> */}

                {/* Video URL */}
                <div className="space-y-2">
                  <Label>URL Video Giới Thiệu</Label>
                  <Input
                    value={formData.videoUrl || ""}
                    onChange={(e) =>
                      handleBasicChange("videoUrl", e.target.value)
                    }
                    placeholder="https://youtube.com/watch?v=... hoặc https://example.com/video.mp4"
                  />
                  <p className="text-xs text-gray-500">
                    URL YouTube hoặc video trực tiếp (MP4)
                  </p>
                </div>
              </TabsContent>

              {/* TAB THÔNG SỐ */}
              <TabsContent value="specs" className="mt-4">
                {renderSpecsForm()}
              </TabsContent>

              {/* TAB BIẾN THỂ */}
              <TabsContent value="variants" className="mt-4">
                {renderVariantsForm()}
              </TabsContent>
            </Tabs>

            {/* BUTTONS */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
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
