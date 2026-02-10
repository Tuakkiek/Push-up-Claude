// ============================================
// FILE: frontend/src/components/admin/DynamicVariantEditor.jsx
// ✅ STEP 8: Dynamic Variant Editor
// Purpose: Manage product variants (color + version)
// Structure: Unified for all product types
// ============================================

import React from 'react';
import './DynamicVariantEditor.css';

const DynamicVariantEditor = ({ variants, onChange, errors }) => {
  // Add new variant group (color)
  const handleAddVariantGroup = () => {
    onChange([
      ...variants,
      {
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
      },
    ]);
  };

  // Remove variant group
  const handleRemoveVariantGroup = (groupIdx) => {
    if (variants.length === 1) {
      alert('At least one variant group is required');
      return;
    }
    onChange(variants.filter((_, idx) => idx !== groupIdx));
  };

  // Update variant group field
  const handleGroupChange = (groupIdx, field, value) => {
    const newVariants = [...variants];
    newVariants[groupIdx] = {
      ...newVariants[groupIdx],
      [field]: value,
    };
    onChange(newVariants);
  };

  // Add variant option (version)
  const handleAddOption = (groupIdx) => {
    const newVariants = [...variants];
    newVariants[groupIdx].options.push({
      versionName: '',
      originalPrice: '',
      price: '',
      stock: '',
    });
    onChange(newVariants);
  };

  // Remove variant option
  const handleRemoveOption = (groupIdx, optIdx) => {
    const newVariants = [...variants];
    if (newVariants[groupIdx].options.length === 1) {
      alert('At least one version is required per color');
      return;
    }
    newVariants[groupIdx].options = newVariants[groupIdx].options.filter(
      (_, idx) => idx !== optIdx
    );
    onChange(newVariants);
  };

  // Update variant option
  const handleOptionChange = (groupIdx, optIdx, field, value) => {
    const newVariants = [...variants];
    newVariants[groupIdx].options[optIdx] = {
      ...newVariants[groupIdx].options[optIdx],
      [field]: value,
    };
    onChange(newVariants);
  };

  // Add image to variant group
  const handleAddImage = (groupIdx) => {
    const newVariants = [...variants];
    newVariants[groupIdx].images.push('');
    onChange(newVariants);
  };

  // Remove image from variant group
  const handleRemoveImage = (groupIdx, imgIdx) => {
    const newVariants = [...variants];
    if (newVariants[groupIdx].images.length === 1) {
      newVariants[groupIdx].images = [''];
    } else {
      newVariants[groupIdx].images = newVariants[groupIdx].images.filter(
        (_, idx) => idx !== imgIdx
      );
    }
    onChange(newVariants);
  };

  // Update image URL
  const handleImageChange = (groupIdx, imgIdx, value) => {
    const newVariants = [...variants];
    newVariants[groupIdx].images[imgIdx] = value;
    onChange(newVariants);
  };

  return (
    <div className="variant-editor">
      <div className="editor-header">
        <p className="editor-hint">
          Organize variants by <strong>Color</strong>, then add <strong>Versions</strong>{' '}
          (e.g., storage sizes, configurations)
        </p>
      </div>

      {/* Variant Groups */}
      {variants.map((variantGroup, groupIdx) => (
        <div key={groupIdx} className="variant-group">
          {/* Group Header */}
          <div className="group-header">
            <h4>Color {groupIdx + 1}</h4>
            <button
              type="button"
              className="btn-icon btn-remove"
              onClick={() => handleRemoveVariantGroup(groupIdx)}
              title="Remove color group"
            >
              🗑️
            </button>
          </div>

          {/* Color Name */}
          <div className="form-group">
            <label>
              Color Name <span className="required">*</span>
            </label>
            <input
              type="text"
              value={variantGroup.color}
              onChange={(e) =>
                handleGroupChange(groupIdx, 'color', e.target.value)
              }
              placeholder="e.g., Space Black, Natural Titanium"
              className={
                errors[`variant_${groupIdx}_color`] ? 'error' : ''
              }
            />
            {errors[`variant_${groupIdx}_color`] && (
              <span className="error-text">
                {errors[`variant_${groupIdx}_color`]}
              </span>
            )}
          </div>

          {/* Images for this color */}
          <div className="form-group">
            <label>Images (URLs) for this color</label>
            {variantGroup.images.map((img, imgIdx) => (
              <div key={imgIdx} className="image-input-row">
                <input
                  type="url"
                  value={img}
                  onChange={(e) =>
                    handleImageChange(groupIdx, imgIdx, e.target.value)
                  }
                  placeholder="https://example.com/image.jpg"
                />
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => handleRemoveImage(groupIdx, imgIdx)}
                  disabled={variantGroup.images.length === 1}
                >
                  🗑️
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => handleAddImage(groupIdx)}
            >
              + Add Image
            </button>
          </div>

          {/* Versions (Options) */}
          <div className="versions-section">
            <label className="section-label">
              Versions <span className="required">*</span>
            </label>

            {variantGroup.options.map((option, optIdx) => (
              <div key={optIdx} className="version-row">
                <div className="version-header">
                  <span className="version-number">Version {optIdx + 1}</span>
                  <button
                    type="button"
                    className="btn-icon btn-remove"
                    onClick={() => handleRemoveOption(groupIdx, optIdx)}
                    title="Remove version"
                  >
                    🗑️
                  </button>
                </div>

                <div className="version-fields">
                  <div className="form-group">
                    <label>
                      Version Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={option.versionName}
                      onChange={(e) =>
                        handleOptionChange(
                          groupIdx,
                          optIdx,
                          'versionName',
                          e.target.value
                        )
                      }
                      placeholder="e.g., 256GB, M3 Pro 16GB 512GB"
                      className={
                        errors[`variant_${groupIdx}_${optIdx}_versionName`]
                          ? 'error'
                          : ''
                      }
                    />
                    {errors[`variant_${groupIdx}_${optIdx}_versionName`] && (
                      <span className="error-text">
                        {errors[`variant_${groupIdx}_${optIdx}_versionName`]}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Original Price</label>
                    <input
                      type="number"
                      value={option.originalPrice}
                      onChange={(e) =>
                        handleOptionChange(
                          groupIdx,
                          optIdx,
                          'originalPrice',
                          e.target.value
                        )
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      Price <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      value={option.price}
                      onChange={(e) =>
                        handleOptionChange(
                          groupIdx,
                          optIdx,
                          'price',
                          e.target.value
                        )
                      }
                      placeholder="0"
                      className={
                        errors[`variant_${groupIdx}_${optIdx}_price`]
                          ? 'error'
                          : ''
                      }
                    />
                    {errors[`variant_${groupIdx}_${optIdx}_price`] && (
                      <span className="error-text">
                        {errors[`variant_${groupIdx}_${optIdx}_price`]}
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Stock</label>
                    <input
                      type="number"
                      value={option.stock}
                      onChange={(e) =>
                        handleOptionChange(
                          groupIdx,
                          optIdx,
                          'stock',
                          e.target.value
                        )
                      }
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Add Version Button */}
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => handleAddOption(groupIdx)}
            >
              + Add Version
            </button>
          </div>

          {/* Error for this group */}
          {errors[`variant_${groupIdx}_options`] && (
            <div className="error-banner">
              {errors[`variant_${groupIdx}_options`]}
            </div>
          )}
        </div>
      ))}

      {/* Add Color Group Button */}
      <button
        type="button"
        className="btn-primary btn-add-group"
        onClick={handleAddVariantGroup}
      >
        + Add Color Group
      </button>

      {/* General Variant Error */}
      {errors.variants && (
        <div className="error-banner">{errors.variants}</div>
      )}
    </div>
  );
};

export default DynamicVariantEditor;
