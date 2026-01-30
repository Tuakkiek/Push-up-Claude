// frontend/src/hooks/products/useProductForm.js

import { useState, useEffect, useCallback } from "react";
import { getEmptyFormData } from "@/lib/productConstants";

/**
 * Hook quản lý state và các handler cơ bản cho ProductEditModal
 * @param {boolean} open - Modal có mở không
 * @param {boolean} isEdit - Chế độ chỉnh sửa hay tạo mới
 * @param {object|string} category - Category Object (với schema) hoặc category slug (legacy)
 * @param {object} product - Dữ liệu sản phẩm (nếu ở chế độ edit)
 */
export const useProductForm = (open, isEdit, category, product) => {
  const [formData, setFormData] = useState(null);

  // Helper to get effective category object if it's passed as object, or try to find it?
  // Actually, we assume the parent component passes the full Category Object if possible.
  // If 'category' is just a string (ID or slug), we might lack schema info here unless we fetch it.
  // For now, let's assume 'category' PROP is the Full Category Object when available.
  
  // Initialize Form Data
  useEffect(() => {
    if (!open) return;

    if (isEdit && product) {
      console.log("✅ Initializing EDIT form for:", product.name);
      
      // Deep copy specs
      let specs = { ...product.specifications };
      if (!specs.colors || !Array.isArray(specs.colors)) {
        specs.colors = [];
      }

      // Populate variants
      // We don't need complex mapping if we trust the data structure matches the IO.
      // But we need to ensure 'colorGroups' logic if the UI expects grouped variants by color.
      // The UnifiedVariantsForm expects array of { color, images, options: [...] }
      
      // If the backend stores variants flattened, we might need to group them by color for the UI.
      // Let's assume backend returns embedded variants array.
      
      // Grouping logic (similar to before, but generic)
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

        // Copy all variant fields
        // We exclude specific UI fields like 'images' and 'color' from options to avoid duplication
        const { images, color, _id, ...rest } = variant;
        const option = { ...rest };
        
        // Ensure strings for inputs
        Object.keys(option).forEach(key => {
            if(option[key] === null || option[key] === undefined) option[key] = "";
        });

        colorGroups[colorKey].options.push(option);
      });

      const populatedVariants =
        Object.values(colorGroups).length > 0
          ? Object.values(colorGroups)
          : [];

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
        category: product.category, // store Category ID
      });
    } else {
      console.log("✅ Creating NEW product form");
      // New Product
      const catId = typeof category === 'object' ? category?._id : category;
      setFormData({
        ...getEmptyFormData(),
        category: catId,
        installmentBadge: "NONE",
        // Initialize one empty variant group
        variants: [{
            color: "",
            images: [""],
            options: [{
                sku: "",
                price: "",
                originalPrice: "",
                stock: ""
                // dynamic fields added by Form Component based on Schema
            }]
        }]
      });
    }
  }, [open, isEdit, product, category]);

  // Handler for Basic Fields
  const handleBasicChange = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Handler for Specifications
  const handleSpecChange = useCallback((key, value) => {
    setFormData((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, [key]: value },
    }));
  }, []);

  // Handler for Colors (Spec level)
  const handleColorChange = useCallback((idx, value) => {
      setFormData((prev) => {
        const colors = [...(prev.specifications.colors || [""])];
        colors[idx] = value;
        return {
            ...prev,
            specifications: { ...prev.specifications, colors }
        };
      });
    }, []);

  const addColor = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, colors: [...(prev.specifications.colors || [""]), ""] },
    }));
  }, []);

  const removeColor = useCallback((idx) => {
      setFormData((prev) => ({
        ...prev,
        specifications: { 
            ...prev.specifications, 
            colors: (prev.specifications.colors || []).filter((_, i) => i !== idx) 
        },
      }));
    }, []);

  return {
    formData,
    setFormData,
    handleBasicChange,
    handleSpecChange,
    handleColorChange,
    addColor,
    removeColor,
  };
};
