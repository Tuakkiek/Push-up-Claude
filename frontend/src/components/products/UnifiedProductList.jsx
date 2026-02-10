// ============================================
// FILE: frontend/src/components/products/UnifiedProductList.jsx
// ✅ STEP 9: Unified Product List
// Purpose: Display products with filters and pagination
// Works for: ANY product type
// ============================================

import React, { useState, useEffect } from 'react';
import { useProductTypes } from '../../hooks/useProductTypes';
import { getProductsByType, getAllProducts } from '../../services/unifiedProductAPI';
import UnifiedProductCard from './UnifiedProductCard';
import ProductFilters from './ProductFilters';
import './UnifiedProductList.css';

const UnifiedProductList = ({ 
  productTypeSlug = null, // If null, show all types
  initialFilters = {} 
}) => {
  const { getDisplayName } = useProductTypes();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: 'AVAILABLE',
    condition: '',
    sortBy: 'newest',
    ...initialFilters
  });

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, [productTypeSlug, currentPage, filters]);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page: currentPage,
        limit: 12,
        search: filters.search || undefined,
        status: filters.status || undefined,
      };

      let response;
      if (productTypeSlug) {
        response = await getProductsByType(productTypeSlug, params);
      } else {
        response = await getAllProducts(params);
      }

      setProducts(response.products);
      setTotalPages(response.totalPages);
      setTotal(response.total);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Handle filter change
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Get page title
  const getTitle = () => {
    if (productTypeSlug) {
      return getDisplayName(productTypeSlug);
    }
    return 'All Products';
  };

  return (
    <div className="product-list-container">
      {/* Header */}
      <div className="list-header">
        <div className="header-content">
          <h1>{getTitle()}</h1>
          {total > 0 && (
            <p className="product-count">{total} products found</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <ProductFilters 
        filters={filters} 
        onChange={handleFilterChange}
        productTypeSlug={productTypeSlug}
      />

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading products...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchProducts} className="btn-retry">
            Retry
          </button>
        </div>
      )}

      {/* Products Grid */}
      {!loading && !error && (
        <>
          {products.length > 0 ? (
            <div className="products-grid">
              {products.map((product) => (
                <UnifiedProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <span className="empty-icon">📦</span>
              <h3>No products found</h3>
              <p>Try adjusting your filters or search term</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="btn-page"
              >
                ← Previous
              </button>

              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`btn-page ${
                        page === currentPage ? 'active' : ''
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="btn-page"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UnifiedProductList;
