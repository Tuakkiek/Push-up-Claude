// frontend/src/lib/categoryHelpers.js

/**
 * Helper functions để phân biệt và xử lý Fixed vs Dynamic categories
 */

// ✅ DANH SÁCH FIXED CATEGORIES (hardcoded)
export const FIXED_CATEGORIES = [
  "iPhone",
  "iPad",
  "Mac",
  "AirPods",
  "AppleWatch",
  "Accessories",
];

/**
 * Kiểm tra xem category có phải là fixed category không
 */
export const isFixedCategory = (categoryName) => {
  return FIXED_CATEGORIES.includes(categoryName);
};

/**
 * Kiểm tra xem category có phải là dynamic category không
 */
export const isDynamicCategory = (categoryName) => {
  return !FIXED_CATEGORIES.includes(categoryName);
};

/**
 * Lấy category info từ API
 */
export const fetchCategoryInfo = async (categoryNameOrSlug) => {
  try {
    const response = await fetch("/api/categories");
    const data = await response.json();

    if (data.success) {
      // Tìm theo name hoặc slug
      return data.data.categories.find(
        (c) => c.name === categoryNameOrSlug || c.slug === categoryNameOrSlug
      );
    }
  } catch (error) {
    console.error("Error fetching category info:", error);
  }
  return null;
};

/**
 * Lấy tất cả categories
 */
export const fetchAllCategories = async () => {
  try {
    const response = await fetch("/api/categories");
    const data = await response.json();

    if (data.success) {
      return data.data.categories
        .filter((cat) => cat.active)
        .map((cat) => ({
          value: cat.name,
          label: cat.name,
          slug: cat.slug,
          isFixed: FIXED_CATEGORIES.includes(cat.name),
        }));
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
  }
  return [];
};

/**
 * Get variant field structure based on category type
 */
export const getVariantFieldsForCategory = (categoryName) => {
  // Fixed categories have specific structures
  const fixedStructures = {
    iPhone: ["storage"],
    iPad: ["storage", "connectivity"],
    Mac: ["cpuGpu", "ram", "storage"],
    AirPods: ["variantName"],
    AppleWatch: ["variantName", "bandSize"],
    Accessories: ["variantName"],
  };

  if (FIXED_CATEGORIES.includes(categoryName)) {
    return fixedStructures[categoryName] || ["variantName"];
  }

  // Dynamic categories always use variantName + optional specs
  return ["variantName"];
};

/**
 * Check if category needs custom specs
 */
export const needsCustomSpecs = async (categoryName) => {
  if (isFixedCategory(categoryName)) {
    return false; // Fixed categories have hardcoded specs
  }

  // For dynamic categories, check if custom specs are configured
  try {
    const categoryInfo = await fetchCategoryInfo(categoryName);
    if (categoryInfo) {
      const response = await fetch(`/api/custom-specs/${categoryInfo.slug}`);
      const data = await response.json();
      return data?.data?.customSpec?.useCustomSpecs || false;
    }
  } catch (error) {
    console.error("Error checking custom specs:", error);
  }

  return false;
};

export default {
  FIXED_CATEGORIES,
  isFixedCategory,
  isDynamicCategory,
  fetchCategoryInfo,
  fetchAllCategories,
  getVariantFieldsForCategory,
  needsCustomSpecs,
};
