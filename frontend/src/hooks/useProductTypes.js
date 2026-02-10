// ============================================
// FILE: frontend/src/hooks/useProductTypes.js
// ✅ STEP 6: useProductTypes Hook
// Purpose: Easy access to product types
// Replaces: CATEGORIES constant usage
// ============================================

import { useContext, useMemo } from "react";
import { ProductTypeContext } from "../contexts/ProductTypeContext";

/**
 * Hook to access product types
 * @returns {Object} Product types and helper functions
 */
export const useProductTypes = () => {
  const context = useContext(ProductTypeContext);

  if (!context) {
    throw new Error("useProductTypes must be used within ProductTypeProvider");
  }

  const {
    productTypes,
    loading,
    error,
    refreshProductTypes,
    getProductTypeBySlug,
    getProductTypeById,
  } = context;

  // ============================================
  // COMPUTED VALUES
  // ============================================

  /**
   * Get product type map (slug -> type)
   */
  const productTypeMap = useMemo(() => {
    return productTypes.reduce((map, type) => {
      map[type.slug] = type;
      return map;
    }, {});
  }, [productTypes]);

  /**
   * Get product type slugs
   */
  const productTypeSlugs = useMemo(() => {
    return productTypes.map((type) => type.slug);
  }, [productTypes]);

  /**
   * Get product type names
   */
  const productTypeNames = useMemo(() => {
    return productTypes.map((type) => type.name);
  }, [productTypes]);

  /**
   * Check if product types are loaded
   */
  const isLoaded = useMemo(() => {
    return !loading && productTypes.length > 0;
  }, [loading, productTypes]);

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  /**
   * Check if product type exists
   * @param {string} slug - Product type slug
   * @returns {boolean} True if exists
   */
  const productTypeExists = (slug) => {
    return productTypeSlugs.includes(slug.toLowerCase());
  };

  /**
   * Get specification fields for a product type
   * @param {string} slugOrId - Product type slug or ID
   * @returns {Array} Specification fields
   */
  const getSpecificationFields = (slugOrId) => {
    const type = slugOrId.match(/^[0-9a-fA-F]{24}$/)
      ? getProductTypeById(slugOrId)
      : getProductTypeBySlug(slugOrId);
    return type?.specificationFields || [];
  };

  /**
   * Get required specification fields
   * @param {string} slugOrId - Product type slug or ID
   * @returns {Array} Required fields
   */
  const getRequiredFields = (slugOrId) => {
    const fields = getSpecificationFields(slugOrId);
    return fields.filter((field) => field.required);
  };

  /**
   * Get display name for product type
   * @param {string} slugOrId - Product type slug or ID
   * @returns {string} Display name
   */
  const getDisplayName = (slugOrId) => {
    const type = slugOrId.match(/^[0-9a-fA-F]{24}$/)
      ? getProductTypeById(slugOrId)
      : getProductTypeBySlug(slugOrId);
    return type?.name || slugOrId;
  };

  /**
   * Get icon for product type
   * @param {string} slugOrId - Product type slug or ID
   * @returns {string} Icon name or URL
   */
  const getIcon = (slugOrId) => {
    const type = slugOrId.match(/^[0-9a-fA-F]{24}$/)
      ? getProductTypeById(slugOrId)
      : getProductTypeBySlug(slugOrId);
    return type?.icon || "";
  };

  // ============================================
  // LEGACY COMPATIBILITY
  // ============================================

  /**
   * Get categories in old format (for gradual migration)
   * @deprecated Use productTypes directly
   * @returns {Array<string>} Category names
   */
  const getLegacyCategories = () => {
    return productTypeNames;
  };

  /**
   * Convert product type to legacy category format
   * @deprecated Use productTypes directly
   * @param {string} slug - Product type slug
   * @returns {string} Category name
   */
  const slugToCategory = (slug) => {
    const type = getProductTypeBySlug(slug);
    return type?.name || slug;
  };

  /**
   * Convert legacy category to product type slug
   * @deprecated Use slugs directly
   * @param {string} category - Legacy category name
   * @returns {string} Product type slug
   */
  const categoryToSlug = (category) => {
    const type = productTypes.find(
      (t) => t.name.toLowerCase() === category.toLowerCase()
    );
    return type?.slug || category.toLowerCase();
  };

  // ============================================
  // RETURN HOOK VALUE
  // ============================================

  return {
    // Core data
    productTypes,
    loading,
    error,
    isLoaded,

    // Computed values
    productTypeMap,
    productTypeSlugs,
    productTypeNames,

    // Lookup functions
    getProductTypeBySlug,
    getProductTypeById,
    productTypeExists,

    // Specification helpers
    getSpecificationFields,
    getRequiredFields,

    // Display helpers
    getDisplayName,
    getIcon,

    // Actions
    refreshProductTypes,

    // Legacy compatibility
    getLegacyCategories,
    slugToCategory,
    categoryToSlug,
  };
};

export default useProductTypes;
