// ============================================
// FILE: frontend/src/components/admin/DynamicProductForm.jsx
// ✅ STEP 8: Dynamic Product Form
// Purpose: Auto-generated form based on ProductType
// Replaces: Category-specific forms
// ============================================

import React, { useState, useEffect } from 'react';
import { useProductTypes } from '../../hooks/useProductTypes';
import { createProduct, updateProduct } from '../../services/unifiedProductAPI';
import DynamicSpecificationFields from './DynamicSpecificationFields';
import DynamicVariantEditor from './DynamicVariantEditor';
import './DynamicProductForm.css';

const DynamicProductForm = ({
  open,
  onOpenChange,
  mode = 'create', // 'create' or 'edit'
  productTypeSlug,
  product = null,
  onSuccess,
}) => {
  const { getProductTypeBySlug, getSpecificationFields } = useProductTypes();
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const productType = getProductTypeBySlug(productTypeSlug);
  const specFields = getSpecificationFields(productTypeSlug);

  // Initialize form data
  useEffect(() => {
    if (!open || !productType) return;

    if (mode === 'edit' && product) {
      // Edit mode - populate with existing data
      setFormData({
        name: product.name || '',
        model: product.model || '',
        description: product.description || '',
        specifications: product.specifications || {},
        condition: product.condition || 'NEW',
        brand: product.brand || 'Apple',
        status: product.status || 'AVAILABLE',
        installmentBadge: product.installmentBadge || 'NONE',
        featuredImages: product.featuredImages || [''],
        videoUrl: product.videoUrl || '',
        createVariants: formatVariantsForEdit(product.variants || []),
      });
    } else {
      // Create mode - empty form
      setFormData({
        name: '',
        model: '',
        description: '',
        specifications: getEmptySpecifications(specFields),
        condition: 'NEW',
        brand: 'Apple',
        status: 'AVAILABLE',
        installmentBadge: 'NONE',
        featuredImages: [''],
        videoUrl: '',
        createVariants: [getEmptyVariantGroup()],
      });
    }
  }, [open, mode, product, productType, specFields]);

  // Handle basic field change
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle specification change
  const handleSpecChange = (fieldName, value) => {
    setFormData((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [fieldName]: value,
      },
    }));
  };

  // Handle variant change
  const handleVariantChange = (variants) => {
    setFormData((prev) => ({
      ...prev,
      createVariants: variants,
    }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Validate basic fields
    if (!formData.name?.trim()) {
      newErrors.name = 'Product name is required';
    }
    if (!formData.model?.trim()) {
      newErrors.model = 'Model is required';
    }

    // Validate specifications
    specFields.forEach((field) => {
      if (field.required && !formData.specifications[field.name]) {
        newErrors[`spec_${field.name}`] = `${field.label} is required`;
      }

      // Type-specific validation
      if (formData.specifications[field.name]) {
        const value = formData.specifications[field.name];

        if (field.type === 'number' && isNaN(Number(value))) {
          newErrors[`spec_${field.name}`] = `${field.label} must be a number`;
        }

        if (field.type === 'select' && field.options && !field.options.includes(value)) {
          newErrors[`spec_${field.name}`] = `${field.label} must be one of: ${field.options.join(', ')}`;
        }
      }
    });

    // Validate variants
    if (!formData.createVariants || formData.createVariants.length === 0) {
      newErrors.variants = 'At least one variant is required';
    } else {
      formData.createVariants.forEach((variantGroup, groupIdx) => {
        if (!variantGroup.color?.trim()) {
          newErrors[`variant_${groupIdx}_color`] = 'Color is required';
        }
        if (!variantGroup.options || variantGroup.options.length === 0) {
          newErrors[`variant_${groupIdx}_options`] = 'At least one version is required';
        } else {
          variantGroup.options.forEach((option, optIdx) => {
            if (!option.versionName?.trim()) {
              newErrors[`variant_${groupIdx}_${optIdx}_versionName`] = 'Version name is required';
            }
            if (!option.price || Number(option.price) <= 0) {
              newErrors[`variant_${groupIdx}_${optIdx}_price`] = 'Valid price is required';
            }
          });
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      // Switch to tab with error
      if (Object.keys(errors).some((key) => key.startsWith('spec_'))) {
        setActiveTab('specifications');
      } else if (Object.keys(errors).some((key) => key.startsWith('variant_'))) {
        setActiveTab('variants');
      } else {
        setActiveTab('basic');
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        model: formData.model.trim(),
        description: formData.description?.trim() || '',
        productTypeId: productType._id,
        specifications: formData.specifications,
        condition: formData.condition,
        brand: formData.brand,
        status: formData.status,
        installmentBadge: formData.installmentBadge,
        featuredImages: formData.featuredImages.filter((img) => img.trim()),
        videoUrl: formData.videoUrl?.trim() || '',
        createVariants: formData.createVariants,
        createdBy: localStorage.getItem('userId'), // Replace with actual user ID
      };

      let result;
      if (mode === 'edit') {
        result = await updateProduct(product._id, payload);
      } else {
        result = await createProduct(payload);
      }

      // Success
      onSuccess?.(result);
      onOpenChange(false);
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({
        submit: error.message || 'Failed to save product',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open || !productType || !formData) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={() => onOpenChange(false)}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2>{mode === 'edit' ? 'Edit Product' : 'Create Product'}</h2>
            <p className="modal-subtitle">
              {productType.icon} {productType.name}
            </p>
          </div>
          <button
            className="btn-close"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-body">
          {/* Tabs */}
          <div className="tabs">
            <button
              type="button"
              className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
              onClick={() => setActiveTab('basic')}
            >
              Basic Info
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'specifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('specifications')}
            >
              Specifications
            </button>
            <button
              type="button"
              className={`tab ${activeTab === 'variants' ? 'active' : ''}`}
              onClick={() => setActiveTab('variants')}
            >
              Variants
            </button>
          </div>

          {/* Tab: Basic Info */}
          {activeTab === 'basic' && (
            <div className="tab-content">
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    Product Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className={errors.name ? 'error' : ''}
                  />
                  {errors.name && <span className="error-text">{errors.name}</span>}
                </div>

                <div className="form-group">
                  <label>
                    Model <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => handleChange('model', e.target.value)}
                    className={errors.model ? 'error' : ''}
                  />
                  {errors.model && <span className="error-text">{errors.model}</span>}
                </div>

                <div className="form-group">
                  <label>Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => handleChange('condition', e.target.value)}
                  >
                    <option value="NEW">New</option>
                    <option value="LIKE_NEW">Like New</option>
                    <option value="USED">Used</option>
                    <option value="REFURBISHED">Refurbished</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value)}
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                    <option value="DISCONTINUED">Discontinued</option>
                    <option value="COMING_SOON">Coming Soon</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="form-group full-width">
                  <label>Featured Images (URLs)</label>
                  {formData.featuredImages.map((url, idx) => (
                    <div key={idx} className="image-input-row">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => {
                          const newImages = [...formData.featuredImages];
                          newImages[idx] = e.target.value;
                          handleChange('featuredImages', newImages);
                        }}
                        placeholder="https://example.com/image.jpg"
                      />
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => {
                          const newImages = formData.featuredImages.filter(
                            (_, i) => i !== idx
                          );
                          handleChange(
                            'featuredImages',
                            newImages.length ? newImages : ['']
                          );
                        }}
                        disabled={formData.featuredImages.length === 1}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      handleChange('featuredImages', [
                        ...formData.featuredImages,
                        '',
                      ]);
                    }}
                  >
                    + Add Image URL
                  </button>
                </div>

                <div className="form-group full-width">
                  <label>Video URL</label>
                  <input
                    type="url"
                    value={formData.videoUrl}
                    onChange={(e) => handleChange('videoUrl', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tab: Specifications */}
          {activeTab === 'specifications' && (
            <div className="tab-content">
              <DynamicSpecificationFields
                fields={specFields}
                values={formData.specifications}
                onChange={handleSpecChange}
                errors={errors}
              />
            </div>
          )}

          {/* Tab: Variants */}
          {activeTab === 'variants' && (
            <div className="tab-content">
              <DynamicVariantEditor
                variants={formData.createVariants}
                onChange={handleVariantChange}
                errors={errors}
              />
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="error-banner">
              <span className="error-icon">⚠️</span>
              <span>{errors.submit}</span>
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Saving...'
                : mode === 'edit'
                ? 'Update Product'
                : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get empty specifications based on fields
function getEmptySpecifications(fields) {
  const specs = {};
  fields.forEach((field) => {
    specs[field.name] = '';
  });
  return specs;
}

// Get empty variant group
function getEmptyVariantGroup() {
  return {
    color: '',
    images: [''],
    options: [
      {
        versionName: '',
        originalPrice: '',
        price: '',
        stock: '',
      },
    ],
  };
}

// Format variants for edit mode
function formatVariantsForEdit(variants) {
  const groups = {};

  variants.forEach((variant) => {
    const colorKey = variant.color.toLowerCase();
    if (!groups[colorKey]) {
      groups[colorKey] = {
        color: variant.color,
        images: variant.images || [''],
        options: [],
      };
    }

    groups[colorKey].options.push({
      versionName: variant.versionName,
      originalPrice: String(variant.originalPrice),
      price: String(variant.price),
      stock: String(variant.stock),
    });
  });

  return Object.values(groups);
}

export default DynamicProductForm;
