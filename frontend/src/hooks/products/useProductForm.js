// frontend/src/hooks/products/useProductForm.js

import { useState, useEffect, useCallback } from "react";
import { getEmptyFormData, emptyVariant } from "@/lib/productConstants";

/**
 * Hook quản lý state và các handler cơ bản cho ProductEditModal
 */
export const useProductForm = (open, isEdit, effectiveCategory, product) => {
  const [formData, setFormData] = useState(null);

  // LOG để debug
  useEffect(() => {
    console.log("🔍 useProductForm mounted:", {
      open,
      isEdit,
      effectiveCategory,
      productName: product?.name,
    });
  }, [open, isEdit, effectiveCategory, product]);

  // Khởi tạo/Tải dữ liệu form
  useEffect(() => {
    if (!open || !effectiveCategory) {
      return;
    }

    console.log("✅ Initializing form data for:", effectiveCategory);

    if (isEdit && product) {
      let specs = { ...product.specifications };

      // ✅ CHỈ XỬ LÝ COLORS CHO FIXED CATEGORIES
      const fixedCategories = [
        "iPhone",
        "iPad",
        "Mac",
        "AirPods",
        "AppleWatch",
      ];
      if (fixedCategories.includes(effectiveCategory)) {
        if (!specs.colors || !Array.isArray(specs.colors)) {
          specs.colors = [];
        }
      }

      const colorGroups = {};
      const variants = Array.isArray(product.variants) ? product.variants : [];

      variants.forEach((variant) => {
        const colorKey = variant.color?.trim().toLowerCase() || "unknown";
        if (!colorGroups[colorKey]) {
          colorGroups[colorKey] = {
            color: variant.color || "",
            images: Array.isArray(variant.images)
              ? variant.images.map((img) => String(img || ""))
              : [""],
            options: [],
          };
        }

        const option = {
          sku: String(variant.sku || ""),
          originalPrice: String(variant.originalPrice || ""),
          price: String(variant.price || ""),
          stock: String(variant.stock || ""),
        };

        // ✅ THÊM FIELD PHÙ HỢP THEO CATEGORY
        if (effectiveCategory === "iPhone") {
          option.storage = String(variant.storage || "");
        } else if (effectiveCategory === "iPad") {
          option.storage = String(variant.storage || "");
          option.connectivity = String(variant.connectivity || "WIFI");
        } else if (effectiveCategory === "Mac") {
          option.cpuGpu = String(variant.cpuGpu || "");
          option.ram = String(variant.ram || "");
          option.storage = String(variant.storage || "");
        } else {
          // ✅ DYNAMIC CATEGORIES: chỉ cần variantName
          option.variantName = String(variant.variantName || "");
        }

        colorGroups[colorKey].options.push(option);
      });

      const populatedVariants =
        Object.values(colorGroups).length > 0
          ? Object.values(colorGroups)
          : [emptyVariant(effectiveCategory)];

      setFormData({
        name: String(product.name || ""),
        model: String(product.model || ""),
        condition: product.condition || "NEW",
        description: product.description || "",
        status: product.status || "AVAILABLE",
        installmentBadge: product.installmentBadge || "NONE",
        specifications: specs,
        variants: populatedVariants,
        featuredImages: Array.isArray(product.featuredImages)
          ? product.featuredImages
          : product.featuredImage
          ? [product.featuredImage]
          : [""],
        videoUrl: product.videoUrl || "",
      });
    } else {
      console.log("✅ Creating new product form");
      setFormData({
        ...getEmptyFormData(effectiveCategory),
        installmentBadge: "NONE",
      });
    }
  }, [open, isEdit, effectiveCategory, product]);

  // BASIC HANDLERS
  const handleBasicChange = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // SPEC HANDLERS
  const handleSpecChange = useCallback(
    (key, value) => {
      if (effectiveCategory === "Accessories") return;
      setFormData((prev) => ({
        ...prev,
        specifications: { ...prev.specifications, [key]: value },
      }));
    },
    [effectiveCategory]
  );

  const handleColorChange = useCallback(
    (idx, value) => {
      const colors = [...(formData.specifications.colors || [""])];
      colors[idx] = value;
      setFormData((prev) => ({
        ...prev,
        specifications: { ...prev.specifications, colors },
      }));
    },
    [formData]
  );

  const addColor = useCallback(() => {
    const colors = [...(formData.specifications.colors || [""]), ""];
    setFormData((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, colors },
    }));
  }, [formData]);

  const removeColor = useCallback(
    (idx) => {
      const colors = (formData.specifications.colors || [""]).filter(
        (_, i) => i !== idx
      );
      setFormData((prev) => ({
        ...prev,
        specifications: { ...prev.specifications, colors },
      }));
    },
    [formData]
  );

  // CUSTOM SPEC HANDLERS (Dành cho Accessories)
  const handleCustomSpecChange = useCallback(
    (idx, field, value) => {
      const specs = [...(formData.specifications || [])];
      specs[idx] = { ...specs[idx], [field]: value };
      setFormData((prev) => ({ ...prev, specifications: specs }));
    },
    [formData]
  );

  const addCustomSpec = useCallback(() => {
    const specs = [...(formData.specifications || []), { key: "", value: "" }];
    setFormData((prev) => ({ ...prev, specifications: specs }));
  }, [formData]);

  const removeCustomSpec = useCallback(
    (idx) => {
      const specs = (formData.specifications || []).filter((_, i) => i !== idx);
      setFormData((prev) => ({ ...prev, specifications: specs }));
    },
    [formData]
  );

  return {
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
  };
};
