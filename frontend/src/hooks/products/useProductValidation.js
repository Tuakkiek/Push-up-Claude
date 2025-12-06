// frontend/src/hooks/products/useProductValidation.js
import { useCallback } from "react";
import { toast } from "sonner";

// ✅ FIXED CATEGORIES
const FIXED_CATEGORIES = [
  "iPhone",
  "iPad",
  "Mac",
  "AirPods",
  "AppleWatch",
  "Accessories",
];

export const useProductValidation = (
  formData,
  effectiveCategory,
  setActiveFormTab
) => {
  const validateForm = useCallback(() => {
    if (!formData) return false;

    if (!formData.name?.trim()) {
      toast.error("Vui lòng nhập tên sản phẩm");
      setActiveFormTab("basic");
      return false;
    }
    if (!formData.model?.trim()) {
      toast.error("Vui lòng nhập model sản phẩm");
      setActiveFormTab("basic");
      return false;
    }
    if (!formData.variants?.length) {
      toast.error("Vui lòng thêm ít nhất một biến thể");
      setActiveFormTab("variants");
      return false;
    }

    const isFixedCategory = FIXED_CATEGORIES.includes(effectiveCategory);

    for (let i = 0; i < formData.variants.length; i++) {
      const variant = formData.variants[i];
      if (!variant.color?.trim()) {
        toast.error(`Vui lòng nhập màu sắc cho biến thể ${i + 1}`);
        setActiveFormTab("variants");
        return false;
      }
      if (!variant.options?.length) {
        toast.error(
          `Vui lòng thêm ít nhất một phiên bản cho biến thể ${i + 1}`
        );
        setActiveFormTab("variants");
        return false;
      }

      for (let j = 0; j < variant.options.length; j++) {
        const option = variant.options[j];

        // ✅ VALIDATION FOR FIXED CATEGORIES
        if (isFixedCategory) {
          if (effectiveCategory === "iPhone" && !option.storage?.trim()) {
            toast.error(
              `Vui lòng chọn bộ nhớ cho phiên bản ${j + 1} của biến thể ${
                i + 1
              }`
            );
            setActiveFormTab("variants");
            return false;
          }

          if (effectiveCategory === "iPad") {
            if (!option.storage?.trim()) {
              toast.error(
                `Vui lòng chọn bộ nhớ cho phiên bản ${j + 1} của biến thể ${
                  i + 1
                }`
              );
              setActiveFormTab("variants");
              return false;
            }
            if (!option.connectivity?.trim()) {
              toast.error(
                `Vui lòng chọn kết nối cho phiên bản ${j + 1} của biến thể ${
                  i + 1
                }`
              );
              setActiveFormTab("variants");
              return false;
            }
          }

          if (effectiveCategory === "Mac") {
            if (
              !option.cpuGpu?.trim() ||
              !option.ram?.trim() ||
              !option.storage?.trim()
            ) {
              toast.error(
                `Vui lòng nhập đầy đủ CPU-GPU, RAM và Storage cho phiên bản ${
                  j + 1
                } của biến thể ${i + 1}`
              );
              setActiveFormTab("variants");
              return false;
            }
          }

          if (
            ["AirPods", "AppleWatch", "Accessories"].includes(effectiveCategory)
          ) {
            if (!option.variantName?.trim()) {
              toast.error(
                `Vui lòng nhập tên biến thể cho phiên bản ${
                  j + 1
                } của biến thể ${i + 1}`
              );
              setActiveFormTab("variants");
              return false;
            }
          }
        } else {
          // ✅ VALIDATION FOR DYNAMIC CATEGORIES - Just need variantName
          if (!option.variantName?.trim()) {
            toast.error(
              `Vui lòng nhập tên biến thể cho phiên bản ${j + 1} của biến thể ${
                i + 1
              }`
            );
            setActiveFormTab("variants");
            return false;
          }
        }

        // ✅ PRICE VALIDATION (COMMON FOR ALL)
        const price = Number(option.price);
        const originalPrice = Number(option.originalPrice);

        if (!option.price?.trim() || isNaN(price) || price < 0) {
          toast.error(
            `Vui lòng nhập giá bán hợp lệ cho phiên bản ${j + 1} của biến thể ${
              i + 1
            }`
          );
          setActiveFormTab("variants");
          return false;
        }
        if (
          !option.originalPrice?.trim() ||
          isNaN(originalPrice) ||
          originalPrice < 0
        ) {
          toast.error(
            `Vui lòng nhập giá gốc hợp lệ cho phiên bản ${j + 1} của biến thể ${
              i + 1
            }`
          );
          setActiveFormTab("variants");
          return false;
        }

        if (price > originalPrice && originalPrice > 0) {
          toast.error(
            `Giá bán không được lớn hơn giá gốc tại phiên bản ${
              j + 1
            } của biến thể ${i + 1}`
          );
          setActiveFormTab("variants");
          return false;
        }
      }
    }

    return true;
  }, [formData, effectiveCategory, setActiveFormTab]);

  return { validateForm };
};
