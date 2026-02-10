
import React, { useState, useEffect } from 'react';
import { createProductType, updateProductType } from '../../services/productTypeAPI';
import SpecificationFieldEditor from './SpecificationFieldEditor';
import './ProductTypeForm.css';

const ProductTypeForm = ({ productType, onClose, onSuccess }) => {
  const isEditing = !!productType;

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    status: 'ACTIVE',
    displayOrder: 0,
    specificationFields: [],
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(true);

  // Load existing data when editing
  useEffect(() => {
    if (productType) {
      setFormData({
        name: productType.name || '',
        slug: productType.slug || '',
        description: productType.description || '',
        icon: productType.icon || '',
        status: productType.status || 'ACTIVE',
        displayOrder: productType.displayOrder || 0,
        specificationFields: productType.specificationFields || [],
      });
      setAutoSlug(false);
    }
  }, [productType]);

  // Auto-generate slug from name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Handle field change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Auto-generate slug when name changes
    if (name === 'name' && autoSlug) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(value),
      }));
    }

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle slug manual edit
  const handleSlugChange = (e) => {
    setAutoSlug(false);
    handleChange(e);
  };

  // Handle specification fields change
  const handleFieldsChange = (fields) => {
    setFormData((prev) => ({
      ...prev,
      specificationFields: fields,
    }));
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim(),
        icon: formData.icon.trim(),
        status: formData.status,
        displayOrder: parseInt(formData.displayOrder) || 0,
        specificationFields: formData.specificationFields,
      };

      if (isEditing) {
        await updateProductType(productType._id, data);
      } else {
        await createProductType(data);
      }

      onSuccess();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to save product type';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="product-type-form">
      {/* Header */}
      <div className="form-header">
        <h2>{isEditing ? 'Edit Product Type' : 'Create Product Type'}</h2>
        <button className="close-btn" onClick={onClose} disabled={saving}>
          ✕
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="form-body">
          {/* Basic Info Section */}
          <div className="form-section">
            <h3>Basic Information</h3>

            {/* Name */}
            <div className="form-group">
              <label htmlFor="name">
                Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Smart Speaker, Gaming Console"
                className={errors.name ? 'error' : ''}
                disabled={saving}
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            {/* Slug */}
            <div className="form-group">
              <label htmlFor="slug">
                Slug <span className="required">*</span>
                <span className="hint">
                  (URL-friendly identifier)
                </span>
              </label>
              <input
                type="text"
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleSlugChange}
                placeholder="e.g., smart-speaker"
                className={errors.slug ? 'error' : ''}
                disabled={saving}
              />
              {errors.slug && <span className="error-message">{errors.slug}</span>}
              <span className="hint">
                Will be used in URLs: /products/{formData.slug || 'slug'}
              </span>
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Brief description of this product type..."
                rows={3}
                disabled={saving}
              />
            </div>

            {/* Icon */}
            <div className="form-group">
              <label htmlFor="icon">
                Icon
                <span className="hint">(Emoji or icon name)</span>
              </label>
              <input
                type="text"
                id="icon"
                name="icon"
                value={formData.icon}
                onChange={handleChange}
                placeholder="e.g., 🔊 or speaker"
                disabled={saving}
              />
            </div>

            {/* Status */}
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            {/* Display Order */}
            <div className="form-group">
              <label htmlFor="displayOrder">
                Display Order
                <span className="hint">(Lower numbers appear first)</span>
              </label>
              <input
                type="number"
                id="displayOrder"
                name="displayOrder"
                value={formData.displayOrder}
                onChange={handleChange}
                min="0"
                disabled={saving}
              />
            </div>
          </div>

          {/* Specification Fields Section */}
          <div className="form-section">
            <h3>Specification Fields</h3>
            <p className="section-description">
              Define custom fields for this product type. These fields will be required
              when creating products of this type.
            </p>

            <SpecificationFieldEditor
              fields={formData.specificationFields}
              onChange={handleFieldsChange}
              disabled={saving}
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={saving}
          >
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductTypeForm;
