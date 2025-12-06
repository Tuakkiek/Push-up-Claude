// frontend/src/hooks/products/useProductAPI.js
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";

// ✅ FIXED CATEGORIES API MAP
const FIXED_API_MAP = {
  iPhone: iPhoneAPI,
  iPad: iPadAPI,
  Mac: macAPI,
  AirPods: airPodsAPI,
  AppleWatch: appleWatchAPI,
  Accessories: accessoryAPI,
};

// ✅ FIXED CATEGORIES LIST
const FIXED_CATEGORIES = [
  "iPhone",
  "iPad",
  "Mac",
  "AirPods",
  "AppleWatch",
  "Accessories",
];

// ✅ DYNAMIC API GENERATOR
const createDynamicAPI = (categorySlug) => {
  const BASE_URL = import.meta.env.VITE_API_URL || "/api";
  const getToken = () => {
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        return state?.token;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  return {
    create: async (data) => {
      const response = await fetch(
        `${BASE_URL}/categories/${categorySlug}/products`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(data),
        }
      );
      return response.json();
    },
    update: async (id, data) => {
      const response = await fetch(
        `${BASE_URL}/categories/${categorySlug}/products/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(data),
        }
      );
      return response.json();
    },
  };
};

// ✅ GET API HELPER - HANDLES BOTH FIXED AND DYNAMIC CATEGORIES
const getAPIForCategory = async (effectiveCategory) => {
  console.log("🔍 Getting API for category:", effectiveCategory);

  // Check if it's a fixed category
  if (FIXED_CATEGORIES.includes(effectiveCategory)) {
    console.log("✅ Using FIXED API for:", effectiveCategory);
    return FIXED_API_MAP[effectiveCategory];
  }

  // It's a dynamic category - need to get slug
  console.log("🔄 Using DYNAMIC API for:", effectiveCategory);

  // Fetch category info to get slug
  try {
    const response = await fetch("/api/categories");
    const data = await response.json();

    if (data.success) {
      const category = data.data.categories.find(
        (c) => c.name === effectiveCategory
      );
      if (category) {
        console.log(
          "✅ Found category:",
          category.name,
          "slug:",
          category.slug
        );
        return createDynamicAPI(category.slug);
      }
    }
  } catch (error) {
    console.error("❌ Error fetching categories:", error);
  }

  throw new Error(`Cannot find API for category: ${effectiveCategory}`);
};

export const useProductAPI = (
  effectiveCategory,
  isEdit,
  product,
  validateForm,
  onOpenChange,
  onSave
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cleanPayload = useCallback(
    (data) => {
      console.log("Cleaning payload for:", effectiveCategory);

      const cleaned = { ...data };
      const authStorage = localStorage.getItem("auth-storage");
      let createdBy = null;
      if (authStorage) {
        try {
          const { state } = JSON.parse(authStorage);
          createdBy = state?.user?._id || state?.user?.id;
        } catch (e) {
          console.warn("Lỗi parse auth-storage:", e);
        }
      }

      // TẠO SLUG TỪ MODEL
      const slug = cleaned.model
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

      cleaned.slug = slug;

      cleaned.variants = (data.variants || [])
        .map((variant) => ({
          color: String(variant.color || "").trim(),
          images: (variant.images || []).filter((img) => img.trim()),
          options: (variant.options || [])
            .map((opt) => {
              const o = {
                originalPrice: Number(opt.originalPrice || 0),
                price: Number(opt.price || 0),
                stock: Number(opt.stock || 0),
              };

              // ✅ HANDLE FIELDS BASED ON CATEGORY TYPE
              if (FIXED_CATEGORIES.includes(effectiveCategory)) {
                // Fixed categories have specific fields
                if (effectiveCategory === "iPhone") {
                  o.storage = opt.storage;
                } else if (effectiveCategory === "iPad") {
                  o.storage = opt.storage;
                  o.connectivity = opt.connectivity || "WIFI";
                } else if (effectiveCategory === "Mac") {
                  o.cpuGpu = opt.cpuGpu;
                  o.ram = opt.ram;
                  o.storage = opt.storage;
                } else if (
                  ["AirPods", "Accessories", "AppleWatch"].includes(
                    effectiveCategory
                  )
                ) {
                  o.variantName = opt.variantName;
                  if (effectiveCategory === "AppleWatch") {
                    o.bandSize = opt.bandSize || "";
                  }
                }
              } else {
                // ✅ DYNAMIC CATEGORIES: Always use variantName
                o.variantName = opt.variantName || opt.storage || opt.ram || "";

                // Preserve any additional fields as specs
                Object.keys(opt).forEach((key) => {
                  if (
                    ![
                      "originalPrice",
                      "price",
                      "stock",
                      "variantName",
                      "sku",
                      "images",
                    ].includes(key)
                  ) {
                    if (!o.specs) o.specs = {};
                    o.specs[key] = opt[key];
                  }
                });
              }

              return o;
            })
            .filter((o) => o.price >= 0 && o.stock >= 0),
        }))
        .filter((v) => v.color && v.options.length > 0);

      cleaned.createdBy = createdBy;
      cleaned.category = effectiveCategory;
      cleaned.name = cleaned.name.trim();
      cleaned.model = cleaned.model.trim();
      cleaned.description = (cleaned.description || "").trim();

      // HANDLE SPECIFICATIONS
      if (effectiveCategory === "Accessories") {
        if (!Array.isArray(cleaned.specifications)) {
          cleaned.specifications = [];
        }
      } else {
        if (Array.isArray(cleaned.specifications)) {
          // ✅ Keep as array for dynamic categories with custom specs
          if (!FIXED_CATEGORIES.includes(effectiveCategory)) {
            // It's already an array, keep it
          } else {
            cleaned.specifications = {};
          }
        } else {
          // It's an object
          if (
            FIXED_CATEGORIES.includes(effectiveCategory) &&
            effectiveCategory !== "Accessories"
          ) {
            cleaned.specifications = {
              ...cleaned.specifications,
              colors: Array.isArray(cleaned.specifications.colors)
                ? cleaned.specifications.colors
                    .map((c) => String(c).trim())
                    .filter(Boolean)
                : [],
            };
          }
        }
      }

      // Featured images and video
      cleaned.featuredImages = (cleaned.featuredImages || [])
        .map((url) => url?.trim())
        .filter(Boolean);

      cleaned.videoUrl = Array.isArray(cleaned.videoUrl)
        ? cleaned.videoUrl[0]?.trim() || ""
        : cleaned.videoUrl?.trim() || "";

      if (!cleaned.featuredImages) cleaned.featuredImages = [];
      if (!cleaned.videoUrl) cleaned.videoUrl = "";

      console.log("📦 PAYLOAD GỬI LÊN:", JSON.stringify(cleaned, null, 2));
      return cleaned;
    },
    [effectiveCategory]
  );

  const handleSubmit = useCallback(
    async (e, formData) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);
      try {
        // ✅ GET API DYNAMICALLY
        const api = await getAPIForCategory(effectiveCategory);

        if (!api) {
          throw new Error(`API not found for ${effectiveCategory}`);
        }

        const payload = cleanPayload(formData);
        let newId = null;

        if (isEdit) {
          const response = await api.update(product._id, payload);
          console.log("✅ Update response:", response);
          toast.success("Cập nhật sản phẩm thành công!");
        } else {
          const response = await api.create(payload);
          console.log("✅ Create response:", response);
          newId =
            response.data?._id ||
            response.data?.data?._id ||
            response.data?.data?.product?._id;
          toast.success("Tạo sản phẩm thành công!");
        }

        onOpenChange(false);
        onSave(newId);
      } catch (error) {
        console.error("❌ Submit error:", error);
        toast.error(error.message || "Lưu thất bại");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      effectiveCategory,
      isEdit,
      product,
      validateForm,
      cleanPayload,
      onOpenChange,
      onSave,
    ]
  );

  return { handleSubmit, isSubmitting };
};
