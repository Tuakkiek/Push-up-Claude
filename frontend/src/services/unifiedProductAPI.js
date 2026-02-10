// ============================================
// FILE: frontend/src/services/unifiedProductAPI.js
// ✅ STEP 6: Unified Product API Service
// Purpose: Single API for all product types
// Replaces: iPhoneAPI, iPadAPI, macAPI, etc.
// ============================================

import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================
// PRODUCT API
// ============================================

/**
 * Get all products with filters
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.search - Search term
 * @param {string} params.status - Filter by status
 * @param {string} params.productTypeId - Filter by product type ID
 * @param {string} params.productTypeSlug - Filter by product type slug
 * @returns {Promise<Object>} Products and pagination info
 */
export const getAllProducts = async (params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/products`, { params });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching products:", error);
    throw error;
  }
};

/**
 * Get products by product type slug
 * @param {string} typeSlug - Product type slug (e.g., "iphone", "ipad")
 * @param {Object} params - Additional query parameters
 * @returns {Promise<Object>} Products and pagination info
 */
export const getProductsByType = async (typeSlug, params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/products`, {
      params: { ...params, productTypeSlug: typeSlug },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error fetching products by type:", error);
    throw error;
  }
};

/**
 * Get product by ID
 * @param {string} id - Product ID (MongoDB ObjectId)
 * @returns {Promise<Object>} Product details
 */
export const getProductById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/products/${id}`);
    return response.data.data.product;
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    throw error;
  }
};

/**
 * Get product by slug
 * @param {string} slug - Product slug or variant slug
 * @param {string} sku - Optional SKU to select specific variant
 * @returns {Promise<Object>} Product details with selected variant
 */
export const getProductBySlug = async (slug, sku = null) => {
  try {
    const params = sku ? { sku } : {};
    const response = await axios.get(`${API_URL}/products/${slug}`, { params });
    
    // Handle redirect response
    if (response.data.redirect) {
      // Re-fetch with correct slug
      return getProductBySlug(response.data.redirectSlug, response.data.redirectSku);
    }
    
    return response.data.data;
  } catch (error) {
    console.error("Error fetching product by slug:", error);
    throw error;
  }
};

/**
 * Get variants for a product
 * @param {string} productId - Product ID
 * @returns {Promise<Array>} Product variants
 */
export const getProductVariants = async (productId) => {
  try {
    const response = await axios.get(`${API_URL}/products/${productId}/variants`);
    return response.data.data.variants;
  } catch (error) {
    console.error("Error fetching product variants:", error);
    throw error;
  }
};

/**
 * Create product (admin)
 * @param {Object} data - Product data
 * @returns {Promise<Object>} Created product
 */
export const createProduct = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/products`, data);
    return response.data.data.product;
  } catch (error) {
    console.error("Error creating product:", error);
    throw error;
  }
};

/**
 * Update product (admin)
 * @param {string} id - Product ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Updated product
 */
export const updateProduct = async (id, data) => {
  try {
    const response = await axios.put(`${API_URL}/products/${id}`, data);
    return response.data.data.product;
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
};

/**
 * Delete product (admin)
 * @param {string} id - Product ID
 * @returns {Promise<void>}
 */
export const deleteProduct = async (id) => {
  try {
    await axios.delete(`${API_URL}/products/${id}`);
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

/**
 * Search products
 * @param {string} searchTerm - Search term
 * @param {Object} params - Additional filters
 * @returns {Promise<Object>} Search results
 */
export const searchProducts = async (searchTerm, params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/products`, {
      params: { ...params, search: searchTerm },
    });
    return response.data.data;
  } catch (error) {
    console.error("Error searching products:", error);
    throw error;
  }
};

// ============================================
// COMPATIBILITY LAYER (for gradual migration)
// ============================================

/**
 * Legacy API compatibility - get products by category
 * Maps old category names to new product type slugs
 * @deprecated Use getProductsByType instead
 */
const CATEGORY_TO_SLUG_MAP = {
  iPhone: "iphone",
  iPad: "ipad",
  Mac: "mac",
  AirPods: "airpods",
  "Apple Watch": "apple-watch",
  Accessory: "accessory",
};

/**
 * Get products by legacy category name
 * @deprecated Use getProductsByType with slug instead
 * @param {string} category - Old category name
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Products
 */
export const getProductsByCategory = async (category, params = {}) => {
  const slug = CATEGORY_TO_SLUG_MAP[category] || category.toLowerCase();
  return getProductsByType(slug, params);
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format product for display
 * Ensures consistent structure across all product types
 * @param {Object} product - Raw product from API
 * @returns {Object} Formatted product
 */
export const formatProduct = (product) => {
  return {
    ...product,
    // Ensure variants is always an array
    variants: product.variants || [],
    // Ensure specifications is always an object
    specifications: product.specifications || {},
    // Ensure images is always an array
    featuredImages: product.featuredImages || [],
    // Add computed fields
    hasVariants: (product.variants || []).length > 0,
    hasImages: (product.featuredImages || []).length > 0,
  };
};

/**
 * Get price range for product
 * @param {Object} product - Product with populated variants
 * @returns {Object} Price range {min, max, display}
 */
export const getProductPriceRange = (product) => {
  if (!product.variants || product.variants.length === 0) {
    return { min: 0, max: 0, display: "Liên hệ" };
  }

  const prices = product.variants
    .map((v) => v.price)
    .filter((p) => p > 0);

  if (prices.length === 0) {
    return { min: 0, max: 0, display: "Liên hệ" };
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  const display =
    min === max
      ? `${min.toLocaleString("vi-VN")}₫`
      : `${min.toLocaleString("vi-VN")}₫ - ${max.toLocaleString("vi-VN")}₫`;

  return { min, max, display };
};

/**
 * Check if product has stock
 * @param {Object} product - Product with populated variants
 * @returns {boolean} True if any variant has stock
 */
export const hasStock = (product) => {
  if (!product.variants || product.variants.length === 0) return false;
  return product.variants.some((v) => v.stock > 0);
};

/**
 * Get available colors for product
 * @param {Object} product - Product with populated variants
 * @returns {Array<string>} Unique colors
 */
export const getAvailableColors = (product) => {
  if (!product.variants || product.variants.length === 0) return [];
  const colors = product.variants.map((v) => v.color);
  return [...new Set(colors)];
};

/**
 * Get available versions for product
 * @param {Object} product - Product with populated variants
 * @returns {Array<string>} Unique version names
 */
export const getAvailableVersions = (product) => {
  if (!product.variants || product.variants.length === 0) return [];
  const versions = product.variants.map((v) => v.versionName);
  return [...new Set(versions)];
};

/**
 * Get variant by color and version
 * @param {Object} product - Product with populated variants
 * @param {string} color - Color name
 * @param {string} versionName - Version name
 * @returns {Object|null} Matching variant or null
 */
export const getVariantByColorAndVersion = (product, color, versionName) => {
  if (!product.variants || product.variants.length === 0) return null;
  return (
    product.variants.find(
      (v) => v.color === color && v.versionName === versionName
    ) || null
  );
};

/**
 * Get variant by SKU
 * @param {Object} product - Product with populated variants
 * @param {string} sku - Variant SKU
 * @returns {Object|null} Matching variant or null
 */
export const getVariantBySku = (product, sku) => {
  if (!product.variants || product.variants.length === 0) return null;
  return product.variants.find((v) => v.sku === sku) || null;
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  getAllProducts,
  getProductsByType,
  getProductById,
  getProductBySlug,
  getProductVariants,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  // Legacy compatibility
  getProductsByCategory,
  // Helpers
  formatProduct,
  getProductPriceRange,
  hasStock,
  getAvailableColors,
  getAvailableVersions,
  getVariantByColorAndVersion,
  getVariantBySku,
};
