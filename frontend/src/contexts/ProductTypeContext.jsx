// ============================================
// FILE: frontend/src/contexts/ProductTypeContext.jsx
// ✅ STEP 6: ProductType Context
// Purpose: Provide product types globally
// Replaces: Hard-coded CATEGORIES constant
// ============================================

import React, { createContext, useState, useEffect, useCallback } from "react";
import { getActiveProductTypes } from "../services/productTypeAPI";

// ============================================
// CREATE CONTEXT
// ============================================

export const ProductTypeContext = createContext({
  productTypes: [],
  loading: true,
  error: null,
  refreshProductTypes: () => {},
  getProductTypeBySlug: () => null,
  getProductTypeById: () => null,
});

// ============================================
// PROVIDER COMPONENT
// ============================================

export const ProductTypeProvider = ({ children }) => {
  const [productTypes, setProductTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch product types from API
   */
  const fetchProductTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const types = await getActiveProductTypes();
      setProductTypes(types);
      
      // Store in localStorage for offline access
      localStorage.setItem("productTypes", JSON.stringify(types));
      localStorage.setItem("productTypesTimestamp", Date.now().toString());
    } catch (err) {
      console.error("Error fetching product types:", err);
      setError(err.message || "Failed to fetch product types");
      
      // Try to load from localStorage if API fails
      const cached = localStorage.getItem("productTypes");
      if (cached) {
        try {
          setProductTypes(JSON.parse(cached));
          console.log("Loaded product types from cache");
        } catch (parseError) {
          console.error("Error parsing cached product types:", parseError);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh product types (force reload)
   */
  const refreshProductTypes = useCallback(() => {
    fetchProductTypes();
  }, [fetchProductTypes]);

  /**
   * Get product type by slug
   */
  const getProductTypeBySlug = useCallback(
    (slug) => {
      if (!slug) return null;
      return productTypes.find((type) => type.slug === slug.toLowerCase()) || null;
    },
    [productTypes]
  );

  /**
   * Get product type by ID
   */
  const getProductTypeById = useCallback(
    (id) => {
      if (!id) return null;
      return productTypes.find((type) => type._id === id) || null;
    },
    [productTypes]
  );

  /**
   * Load product types on mount
   */
  useEffect(() => {
    fetchProductTypes();
  }, [fetchProductTypes]);

  /**
   * Refresh product types every 5 minutes
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const timestamp = localStorage.getItem("productTypesTimestamp");
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (!timestamp || now - parseInt(timestamp) > fiveMinutes) {
        fetchProductTypes();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [fetchProductTypes]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value = {
    productTypes,
    loading,
    error,
    refreshProductTypes,
    getProductTypeBySlug,
    getProductTypeById,
  };

  return (
    <ProductTypeContext.Provider value={value}>
      {children}
    </ProductTypeContext.Provider>
  );
};

// ============================================
// EXPORT
// ============================================

export default ProductTypeContext;
