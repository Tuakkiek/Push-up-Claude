// ============================================
// FILE: frontend/src/components/products/ProductFilters.jsx
// ✅ STEP 9: Product Filters
// Purpose: Dynamic filters for product listings
// ============================================

import React from 'react';
import './ProductFilters.css';

const ProductFilters = ({ filters, onChange, productTypeSlug }) => {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const handleReset = () => {
    onChange({
      search: '',
      status: 'AVAILABLE',
      condition: '',
      sortBy: 'newest',
    });
  };

  return (
    <div className="product-filters">
      <div className="filters-row">
        {/* Search */}
        <div className="filter-group">
          <label>Search</label>
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            placeholder="Search products..."
            className="filter-input"
          />
        </div>

        {/* Status */}
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status || 'AVAILABLE'}
            onChange={(e) => handleChange('status', e.target.value)}
            className="filter-select"
          >
            <option value="">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
            <option value="COMING_SOON">Coming Soon</option>
          </select>
        </div>

        {/* Condition */}
        <div className="filter-group">
          <label>Condition</label>
          <select
            value={filters.condition || ''}
            onChange={(e) => handleChange('condition', e.target.value)}
            className="filter-select"
          >
            <option value="">All Conditions</option>
            <option value="NEW">New</option>
            <option value="LIKE_NEW">Like New</option>
            <option value="USED">Used</option>
            <option value="REFURBISHED">Refurbished</option>
          </select>
        </div>

        {/* Sort By */}
        <div className="filter-group">
          <label>Sort By</label>
          <select
            value={filters.sortBy || 'newest'}
            onChange={(e) => handleChange('sortBy', e.target.value)}
            className="filter-select"
          >
            <option value="newest">Newest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>

        {/* Reset Button */}
        <div className="filter-group">
          <label>&nbsp;</label>
          <button onClick={handleReset} className="btn-reset">
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductFilters;
