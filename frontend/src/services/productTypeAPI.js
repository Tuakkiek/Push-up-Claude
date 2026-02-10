// ============================================
// FILE: frontend/src/services/productTypeAPI.js
// ✅ STEP 6: ProductType API Service
// Purpose: Fetch product types from database
// Replaces: Hard-coded CATEGORIES array
// ============================================

import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ============================================
// PRODUCT TYPE API
// ============================================

/**
 * Get all active product types
 * @returns {Promise<Array>} List of active product types
 */
export const getActiveProductTypes = async () => {
  try {
    const response = await axios.get(`${API_URL}/product-types/active`);
    return response.data.data.types || [];
  } catch (error) {
    console.error("Error fetching active product types:", error);
    throw error;
  }
};

/**
 * Get all product types (admin)
 * @param {Object} params - Query parameters
 * @returns {Promise<Array>} List of all product types
 */
export const getAllProductTypes = async (params = {}) => {
  try {
    const response = await axios.get(`${API_URL}/product-types`, { params });
    return response.data.data.productTypes || [];
  } catch (error) {
    console.error("Error fetching all product types:", error);
    throw error;
  }
};

/**
 * Get product type by ID
 * @param {string} id - Product type ID
 * @returns {Promise<Object>} Product type details
 */
export const getProductTypeById = async (id) => {
  try {
    const response = await axios.get(`${API_URL}/product-types/${id}`);
    return response.data.data.productType;
  } catch (error) {
    console.error("Error fetching product type by ID:", error);
    throw error;
  }
};

/**
 * Get product type by slug
 * @param {string} slug - Product type slug
 * @returns {Promise<Object>} Product type details
 */
export const getProductTypeBySlug = async (slug) => {
  try {
    const response = await axios.get(`${API_URL}/product-types/slug/${slug}`);
    return response.data.data.productType;
  } catch (error) {
    console.error("Error fetching product type by slug:", error);
    throw error;
  }
};

/**
 * Create product type (admin)
 * @param {Object} data - Product type data
 * @returns {Promise<Object>} Created product type
 */
export const createProductType = async (data) => {
  try {
    const response = await axios.post(`${API_URL}/product-types`, data);
    return response.data.data.productType;
  } catch (error) {
    console.error("Error creating product type:", error);
    throw error;
  }
};

/**
 * Update product type (admin)
 * @param {string} id - Product type ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>} Updated product type
 */
export const updateProductType = async (id, data) => {
  try {
    const response = await axios.put(`${API_URL}/product-types/${id}`, data);
    return response.data.data.productType;
  } catch (error) {
    console.error("Error updating product type:", error);
    throw error;
  }
};

/**
 * Delete product type (admin)
 * @param {string} id - Product type ID
 * @returns {Promise<void>}
 */
export const deleteProductType = async (id) => {
  try {
    await axios.delete(`${API_URL}/product-types/${id}`);
  } catch (error) {
    console.error("Error deleting product type:", error);
    throw error;
  }
};

/**
 * Add specification field to product type (admin)
 * @param {string} id - Product type ID
 * @param {Object} field - Specification field
 * @returns {Promise<Object>} Updated product type
 */
export const addSpecificationField = async (id, field) => {
  try {
    const response = await axios.post(
      `${API_URL}/product-types/${id}/fields`,
      field
    );
    return response.data.data.productType;
  } catch (error) {
    console.error("Error adding specification field:", error);
    throw error;
  }
};

/**
 * Update specification field (admin)
 * @param {string} id - Product type ID
 * @param {string} fieldName - Field name
 * @param {Object} updates - Field updates
 * @returns {Promise<Object>} Updated product type
 */
export const updateSpecificationField = async (id, fieldName, updates) => {
  try {
    const response = await axios.put(
      `${API_URL}/product-types/${id}/fields/${fieldName}`,
      updates
    );
    return response.data.data.productType;
  } catch (error) {
    console.error("Error updating specification field:", error);
    throw error;
  }
};

/**
 * Remove specification field (admin)
 * @param {string} id - Product type ID
 * @param {string} fieldName - Field name
 * @returns {Promise<Object>} Updated product type
 */
export const removeSpecificationField = async (id, fieldName) => {
  try {
    const response = await axios.delete(
      `${API_URL}/product-types/${id}/fields/${fieldName}`
    );
    return response.data.data.productType;
  } catch (error) {
    console.error("Error removing specification field:", error);
    throw error;
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get product type map (slug -> type object)
 * @returns {Promise<Object>} Map of slug to product type
 */
export const getProductTypeMap = async () => {
  const types = await getActiveProductTypes();
  return types.reduce((map, type) => {
    map[type.slug] = type;
    return map;
  }, {});
};

/**
 * Get specification fields for a product type
 * @param {string} slugOrId - Product type slug or ID
 * @returns {Promise<Array>} Specification fields
 */
export const getSpecificationFields = async (slugOrId) => {
  try {
    const type = slugOrId.match(/^[0-9a-fA-F]{24}$/)
      ? await getProductTypeById(slugOrId)
      : await getProductTypeBySlug(slugOrId);
    return type.specificationFields || [];
  } catch (error) {
    console.error("Error fetching specification fields:", error);
    return [];
  }
};

/**
 * Check if product type exists
 * @param {string} slug - Product type slug
 * @returns {Promise<boolean>} True if exists
 */
export const productTypeExists = async (slug) => {
  try {
    await getProductTypeBySlug(slug);
    return true;
  } catch (error) {
    return false;
  }
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  getActiveProductTypes,
  getAllProductTypes,
  getProductTypeById,
  getProductTypeBySlug,
  createProductType,
  updateProductType,
  deleteProductType,
  addSpecificationField,
  updateSpecificationField,
  removeSpecificationField,
  getProductTypeMap,
  getSpecificationFields,
  productTypeExists,
};
