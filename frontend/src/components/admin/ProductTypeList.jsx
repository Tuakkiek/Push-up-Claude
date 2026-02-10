
import React, { useState } from 'react';
import { deleteProductType } from '../../services/productTypeAPI';
import './ProductTypeList.css';

const ProductTypeList = ({ productTypes, onEdit, onRefresh }) => {
  const [deleting, setDeleting] = useState(null);

  // Handle delete
  const handleDelete = async (type) => {
    if (!window.confirm(`Are you sure you want to delete "${type.name}"?`)) {
      return;
    }

    setDeleting(type._id);
    try {
      await deleteProductType(type._id);
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to delete product type');
    } finally {
      setDeleting(null);
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      ACTIVE: { label: 'Active', className: 'status-active' },
      INACTIVE: { label: 'Inactive', className: 'status-inactive' },
    };
    const badge = badges[status] || badges.ACTIVE;
    return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
  };

  if (productTypes.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📦</div>
        <h3>No Product Types Yet</h3>
        <p>Create your first product type to get started</p>
      </div>
    );
  }

  return (
    <div className="product-type-list">
      <div className="list-header">
        <h2>Product Types ({productTypes.length})</h2>
      </div>

      <div className="type-grid">
        {productTypes.map((type) => (
          <div key={type._id} className="type-card">
            {/* Card Header */}
            <div className="card-header">
              <div className="type-info">
                {type.icon && <span className="type-icon">{type.icon}</span>}
                <div>
                  <h3>{type.name}</h3>
                  <p className="type-slug">/{type.slug}</p>
                </div>
              </div>
              {getStatusBadge(type.status)}
            </div>

            {/* Card Body */}
            <div className="card-body">
              {type.description && (
                <p className="type-description">{type.description}</p>
              )}

              <div className="type-stats">
                <div className="stat">
                  <span className="stat-label">Fields</span>
                  <span className="stat-value">
                    {type.specificationFields?.length || 0}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Products</span>
                  <span className="stat-value">
                    {type.productCount || 0}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Required</span>
                  <span className="stat-value">
                    {type.specificationFields?.filter(f => f.required).length || 0}
                  </span>
                </div>
              </div>

              {/* Specification Fields Preview */}
              {type.specificationFields && type.specificationFields.length > 0 && (
                <div className="fields-preview">
                  <div className="preview-label">Specification Fields:</div>
                  <div className="field-tags">
                    {type.specificationFields.slice(0, 5).map((field) => (
                      <span key={field.name} className="field-tag">
                        {field.label}
                        {field.required && <span className="required-indicator">*</span>}
                      </span>
                    ))}
                    {type.specificationFields.length > 5 && (
                      <span className="field-tag more">
                        +{type.specificationFields.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Card Actions */}
            <div className="card-actions">
              <button
                className="btn-edit"
                onClick={() => onEdit(type)}
                disabled={deleting === type._id}
              >
                Edit
              </button>
              <button
                className="btn-delete"
                onClick={() => handleDelete(type)}
                disabled={deleting === type._id || type.productCount > 0}
                title={type.productCount > 0 ? 'Cannot delete type with products' : ''}
              >
                {deleting === type._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductTypeList;
