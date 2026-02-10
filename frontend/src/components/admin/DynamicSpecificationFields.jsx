// ============================================
// FILE: frontend/src/components/admin/DynamicSpecificationFields.jsx
// ✅ STEP 8: Dynamic Specification Fields
// Purpose: Render specification fields based on ProductType
// Replaces: Hard-coded spec forms
// ============================================

import React from 'react';
import './DynamicSpecificationFields.css';

const DynamicSpecificationFields = ({ fields, values, onChange, errors }) => {
  if (!fields || fields.length === 0) {
    return (
      <div className="empty-state">
        <p>No specification fields defined for this product type.</p>
        <p className="hint">
          You can add specification fields in the Product Type Manager.
        </p>
      </div>
    );
  }

  return (
    <div className="specification-fields">
      <div className="form-grid">
        {fields.map((field) => (
          <div
            key={field.name}
            className={`form-group ${
              field.type === 'textarea' ? 'full-width' : ''
            }`}
          >
            <label>
              {field.label}
              {field.required && <span className="required"> *</span>}
            </label>

            {/* Render field based on type */}
            {renderField(field, values[field.name] || '', onChange, errors)}

            {/* Help text */}
            {field.helpText && (
              <p className="help-text">{field.helpText}</p>
            )}

            {/* Error message */}
            {errors[`spec_${field.name}`] && (
              <span className="error-text">{errors[`spec_${field.name}`]}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// FIELD RENDERERS
// ============================================

function renderField(field, value, onChange, errors) {
  const hasError = errors[`spec_${field.name}`];

  switch (field.type) {
    case 'text':
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
          className={hasError ? 'error' : ''}
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder || '0'}
          className={hasError ? 'error' : ''}
        />
      );

    case 'select':
      return (
        <select
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={hasError ? 'error' : ''}
        >
          <option value="">-- Select {field.label} --</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );

    case 'multiselect':
      return (
        <div className="multiselect-field">
          {field.options?.map((option) => (
            <label key={option} className="checkbox-label">
              <input
                type="checkbox"
                checked={
                  Array.isArray(value) ? value.includes(option) : false
                }
                onChange={(e) => {
                  const currentValue = Array.isArray(value) ? value : [];
                  const newValue = e.target.checked
                    ? [...currentValue, option]
                    : currentValue.filter((v) => v !== option);
                  onChange(field.name, newValue);
                }}
              />
              {option}
            </label>
          ))}
        </div>
      );

    case 'textarea':
      return (
        <textarea
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
          rows={4}
          className={hasError ? 'error' : ''}
        />
      );

    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(field.name, e.target.value)}
          className={hasError ? 'error' : ''}
        />
      );
  }
}

export default DynamicSpecificationFields;
