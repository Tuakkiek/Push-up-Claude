import { useCallback, useState } from "react";
import { toast } from "sonner";
import { productAPI } from "@/lib/api";

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
      // Get category name for legacy logic (if effectiveCategory is object, use its name)
      const categoryName = typeof effectiveCategory === 'object' 
        ? effectiveCategory?.name 
        : effectiveCategory;
      
      console.log("🧹 Cleaning payload for category:", categoryName);
      const cleaned = { ...data };
      
      // Remove 'specs' to avoid conflict with 'specifications' in backend controller
      // Backend logic: const productSpecs = specs || specifications || {};
      // If 'specs' is {}, it takes precedence over populated 'specifications'
      delete cleaned.specs;

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

              // Map standard fields to Schema Keys if category object is available
              if (typeof effectiveCategory === 'object' && effectiveCategory.variantSchema) {
                 console.log("🔍 Processing variant schema for category:", effectiveCategory.name);
                 console.log("🔍 Variant Schema:", JSON.stringify(effectiveCategory.variantSchema));
                 
                 effectiveCategory.variantSchema.forEach(field => {
                     console.log(`Checking field: "${field.key}"`, { 
                        inOpt: opt[field.key], 
                        inSpecs: data.specifications?.[field.key],
                        specKeys: Object.keys(data.specifications || {}) 
                     });
                     // 1. Direct mapping (Priority) - FIX: Accept key from Schema
                     if (opt[field.key] !== undefined && opt[field.key] !== null && opt[field.key] !== "") {
                         o[field.key] = opt[field.key];
                     }
                     // 1b. Fallback to Specifications (UX Improvement)
                     // If user entered it in Specs but not in Variant, use the Spec value
                     else if (data.specifications && data.specifications[field.key]) {
                         o[field.key] = data.specifications[field.key];
                     }
                     
                     // 2. Fallback mappings (if not already set)
                     if (!o[field.key]) {
                         // Storage mapping
                         if ((field.key === 'Bộ nhớ trong' || field.label === 'Bộ nhớ trong') && opt.storage) {
                             o[field.key] = opt.storage;
                         }
                         // Connectivity mapping
                         if ((field.key === 'Kết nối' || field.label === 'Kết nối') && opt.connectivity) {
                             o[field.key] = opt.connectivity;
                         }
                         // RAM mapping
                         if ((field.key === 'RAM' || field.label === 'RAM') && opt.ram) {
                             o[field.key] = opt.ram;
                         }
                         // CPU/GPU mapping
                         if (field.label.includes('CPU') && opt.cpuGpu) {
                             o[field.key] = opt.cpuGpu;
                         }
                         // Size/Band mapping
                         if ((field.key === 'Kích thước' || field.label === 'Kích thước') && opt.bandSize) {
                             o[field.key] = opt.bandSize;
                         }
                     }
                 });
              }

              // Use category name for variant option building (Legacy/Fallback)
              if (categoryName === "iPhone") {
                // iPhone uses 'storage' which we might have mapped above, but if schema uses English keys:
                if (!o['Bộ nhớ trong'] && !o['storage']) o.storage = opt.storage;
              } else if (categoryName === "iPad") {
                if (!o['Bộ nhớ trong'] && !o['storage']) o.storage = opt.storage;
                if (!o['Kết nối'] && !o['connectivity']) o.connectivity = opt.connectivity || "WIFI";
              } else if (categoryName === "Mac") {
                if (!o['cpuGpu']) o.cpuGpu = opt.cpuGpu;
                if (!o['ram']) o.ram = opt.ram;
                if (!o['storage']) o.storage = opt.storage;
              } else if (
                ["AirPods", "Accessories", "AppleWatch"].includes(categoryName)
              ) {
                o.variantName = opt.variantName;
                if (categoryName === "AppleWatch") {
                  o.bandSize = opt.bandSize || "";
                }
              }

              return o;
            })
            .filter((o) => o.price >= 0 && o.stock >= 0),
        }))
        .filter((v) => v.color && v.options.length > 0);

      cleaned.createdBy = createdBy;
      
      // ✅ GỬI categoryId THAY VÌ OBJECT
      if (cleaned.category && typeof cleaned.category === 'object') {
        cleaned.categoryId = cleaned.category._id;
        delete cleaned.category;
      } else if (cleaned.category && typeof cleaned.category === 'string') {
        cleaned.categoryId = cleaned.category;
        delete cleaned.category;
      }
      
      cleaned.name = cleaned.name.trim();
      cleaned.model = cleaned.model.trim();
      cleaned.description = (cleaned.description || "").trim();

      // ✅ HANDLE SPECIFICATIONS - PRESERVE ALL FIELDS EXCEPT 'colors'
      if (categoryName === "Accessories") {
        if (!Array.isArray(cleaned.specifications)) {
          cleaned.specifications = [];
        }
      } else {
        const currentSpecs = cleaned.specifications || {};
        
        // ✅ ONLY REMOVE 'colors' FIELD - KEEP ALL OTHER SPEC FIELDS
        const { colors, ...validSpecs } = currentSpecs;
        
        console.log("✅ Cleaned specifications (removed 'colors'):", validSpecs);
        cleaned.specifications = validSpecs;
      }

      // Lọc bỏ URLs rỗng VÀ GẮN VÀO PAYLOAD
      cleaned.featuredImages = (cleaned.featuredImages || [])
        .map((url) => url?.trim())
        .filter(Boolean);

      // Chỉ lấy 1 URL đầu tiên nếu là mảng, hoặc trim nếu là string
      cleaned.videoUrl = Array.isArray(cleaned.videoUrl)
        ? cleaned.videoUrl[0]?.trim() || ""
        : cleaned.videoUrl?.trim() || "";

      // ✅ ĐẢM BẢO TRƯỜNG NÀY ĐƯỢC GỬI LÊN
      if (!cleaned.featuredImages) cleaned.featuredImages = [];
      if (!cleaned.videoUrl) cleaned.videoUrl = "";

      console.log("📦 FINAL PAYLOAD:", JSON.stringify(cleaned, null, 2));
      return cleaned;
    },
    [effectiveCategory]
  );

  const handleSubmit = useCallback(
    async (e, formData) => {
      e.preventDefault();

      console.log('\n' + '='.repeat(80));
      console.log('📝 FORM PRODUCT CREATOR - SUBMIT');
      console.log('='.repeat(80));
      console.log('Mode:', isEdit ? 'EDIT' : 'CREATE');
      console.log('Category:', typeof effectiveCategory === 'object' ? effectiveCategory?.name : effectiveCategory);

      if (!validateForm()) {
        console.log('❌ Form validation failed');
        console.log('='.repeat(80) + '\n');
        return;
      }

      console.log('✅ Form validation passed');
      
      setIsSubmitting(true);
      try {
        console.log('\n🧹 Cleaning payload...');
        const payload = cleanPayload(formData);
        
        console.log('\n📤 FINAL PAYLOAD TO API:');
        console.log('  Name:', payload.name);
        console.log('  Slug:', payload.slug);
        console.log('  Model:', payload.model);
        console.log('  Status:', payload.status);
        console.log('  Condition:', payload.condition);
        console.log('  Category ID:', payload.categoryId);
        console.log('  Variants:', payload.variants?.length || 0);
        console.log('  Specifications:', Object.keys(payload.specifications || {}).length, 'fields');
        console.log('  Featured Images:', payload.featuredImages?.length || 0);
        
        let newId = null;

        if (isEdit) {
          console.log('\n📡 Calling productAPI.update()...');
          const startTime = performance.now();
          await productAPI.update(product._id, payload);
          const duration = Math.round(performance.now() - startTime);
          console.log(`✅ Update completed in ${duration}ms`);
          toast.success("Cập nhật sản phẩm thành công!");
        } else {
          console.log('\n📡 Calling productAPI.create()...');
          const startTime = performance.now();
          const res = await productAPI.create(payload);
          const duration = Math.round(performance.now() - startTime);
          console.log(`✅ Create completed in ${duration}ms`);
          
          console.log('\n📦 API RESPONSE:');
          console.log("Full Response:", res.data);
          
          newId =
            res.data?._id ||
            res.data?.data?._id ||
            res.data?.data?.product?._id;
          
          console.log('  Product ID:', newId);
          console.log('  Product Name:', res.data?.data?.name || res.data?.name);
          console.log('  Product Status:', res.data?.data?.status || res.data?.status);
          
          toast.success("Tạo sản phẩm thành công!");
        }

        console.log('\n✅ Operation successful!');
        console.log('='.repeat(80) + '\n');

        onOpenChange(false);
        onSave(newId);
      } catch (error) {
        console.log('\n❌ OPERATION FAILED!');
        console.log('='.repeat(80));
        console.error("Submit error:", error.response?.data || error);
        console.log('Error Message:', error.response?.data?.message || error.message);
        console.log('='.repeat(80) + '\n');
        
        toast.error(error.response?.data?.message || "Lưu thất bại");
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
