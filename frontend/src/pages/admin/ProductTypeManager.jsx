
import React, { useState } from 'react';
import { useProductTypes } from '../../hooks/useProductTypes';
import ProductTypeList from '../../components/admin/ProductTypeList';
import ProductTypeForm from '../../components/admin/ProductTypeForm';
import './ProductTypeManager.css';

const ProductTypeManager = () => {
  const { productTypes, loading, error, refreshProductTypes } = useProductTypes();
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState(null);

  // Handle create new
  const handleCreate = () => {
    setEditingType(null);
    setShowForm(true);
  };

  // Handle edit existing
  const handleEdit = (type) => {
    setEditingType(type);
    setShowForm(true);
  };

  // Handle form close
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingType(null);
  };

  // Handle form success
  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingType(null);
    refreshProductTypes();
  };

  return (
    <div className="product-type-manager">
      {/* Header */}
      <div className="manager-header">
        <div className="header-content">
          <h1>Product Type Management</h1>
          <p className="subtitle">
            Create and manage product types. Define custom specifications for each type.
          </p>
        </div>
        <button 
          className="btn-primary"
          onClick={handleCreate}
        >
          + Create Product Type
        </button>
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <div className="banner-icon">ℹ️</div>
        <div className="banner-content">
          <strong>Dynamic Product Types</strong>
          <p>
            Product types are stored in the database. You can create unlimited types
            without modifying code. Each type can have custom specification fields.
          </p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading product types...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-banner">
          <div className="banner-icon">⚠️</div>
          <div className="banner-content">
            <strong>Error Loading Product Types</strong>
            <p>{error}</p>
          </div>
          <button 
            className="btn-secondary"
            onClick={refreshProductTypes}
          >
            Retry
          </button>
        </div>
      )}

      {/* Product Type List */}
      {!loading && !error && (
        <ProductTypeList
          productTypes={productTypes}
          onEdit={handleEdit}
          onRefresh={refreshProductTypes}
        />
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-container">
            <ProductTypeForm
              productType={editingType}
              onClose={handleCloseForm}
              onSuccess={handleFormSuccess}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductTypeManager;
