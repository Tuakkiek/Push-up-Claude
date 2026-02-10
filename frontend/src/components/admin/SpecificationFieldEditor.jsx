
import React, { useState } from 'react';
import './SpecificationFieldEditor.css';

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: '📝' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'select', label: 'Select (Single)', icon: '📋' },
  { value: 'multiselect', label: 'Multi-Select', icon: '☑️' },
  { value: 'textarea', label: 'Text Area', icon: '📄' },
];

const SpecificationFieldEditor = ({ fields = [], onChange, disabled }) => {
  const [editingIndex, setEditingIndex] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New field template
  const emptyField = {
    name: '',
    label: '',
    type: 'text',
    required: false,
    options: [],
    placeholder: '',
    helpText: '',
    order: fields.length,
  };

  const [newField, setNewField] = useState(emptyField);

  // Handle add field
  const handleAddField = () => {
    if (!newField.name.trim() || !newField.label.trim()) {
      alert('Name and Label are required');
      return;
    }

    // Check for duplicate name
    if (fields.some((f) => f.name === newField.name)) {
      alert('Field name already exists');
      return;
    }

    const field = {
      ...newField,
      name: newField.name.trim(),
      label: newField.label.trim(),
      order: fields.length,
    };

    onChange([...fields, field]);
    setNewField(emptyField);
    setShowAddForm(false);
  };

  // Handle edit field
  const handleEditField = (index) => {
    setEditingIndex(index);
  };

  // Handle save edited field
  const handleSaveEdit = (index, updatedField) => {
    const newFields = [...fields];
    newFields[index] = updatedField;
    onChange(newFields);
    setEditingIndex(null);
  };

  // Handle delete field
  const handleDeleteField = (index) => {
    if (!window.confirm('Are you sure you want to delete this field?')) {
      return;
    }
    const newFields = fields.filter((_, i) => i !== index);
    onChange(newFields);
  };

  // Handle move field
  const handleMoveField = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === fields.length - 1)
    ) {
      return;
    }

    const newFields = [...fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    
    // Update order property
    newFields.forEach((field, i) => {
      field.order = i;
    });

    onChange(newFields);
  };

  return (
    <div className="specification-field-editor">
      {/* Existing Fields */}
      {fields.length > 0 && (
        <div className="fields-list">
          {fields.map((field, index) => (
            <FieldRow
              key={index}
              field={field}
              index={index}
              isEditing={editingIndex === index}
              onEdit={() => handleEditField(index)}
              onSave={(updatedField) => handleSaveEdit(index, updatedField)}
              onDelete={() => handleDeleteField(index)}
              onMove={handleMoveField}
              canMoveUp={index > 0}
              canMoveDown={index < fields.length - 1}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {/* Add New Field */}
      {!showAddForm && (
        <button
          type="button"
          className="btn-add-field"
          onClick={() => setShowAddForm(true)}
          disabled={disabled}
        >
          + Add Specification Field
        </button>
      )}

      {showAddForm && (
        <div className="add-field-form">
          <h4>Add New Field</h4>
          <FieldForm
            field={newField}
            onChange={setNewField}
            onSave={handleAddField}
            onCancel={() => {
              setShowAddForm(false);
              setNewField(emptyField);
            }}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};

// ============================================
// FIELD ROW COMPONENT
// ============================================

const FieldRow = ({
  field,
  index,
  isEditing,
  onEdit,
  onSave,
  onDelete,
  onMove,
  canMoveUp,
  canMoveDown,
  disabled,
}) => {
  const [editedField, setEditedField] = useState(field);

  const fieldType = FIELD_TYPES.find((t) => t.value === field.type);

  if (isEditing) {
    return (
      <div className="field-row editing">
        <FieldForm
          field={editedField}
          onChange={setEditedField}
          onSave={() => onSave(editedField)}
          onCancel={onEdit}
          disabled={disabled}
        />
      </div>
    );
  }

  return (
    <div className="field-row">
      <div className="field-drag-handle">⋮⋮</div>
      
      <div className="field-info">
        <div className="field-header">
          <span className="field-type-icon">{fieldType?.icon}</span>
          <strong>{field.label}</strong>
          {field.required && <span className="required-badge">Required</span>}
        </div>
        <div className="field-details">
          <span className="field-name">{field.name}</span>
          <span className="field-type-label">{fieldType?.label}</span>
          {field.options && field.options.length > 0 && (
            <span className="field-options">
              Options: {field.options.join(', ')}
            </span>
          )}
        </div>
      </div>

      <div className="field-actions">
        <button
          type="button"
          className="btn-icon"
          onClick={() => onMove(index, 'up')}
          disabled={!canMoveUp || disabled}
          title="Move up"
        >
          ↑
        </button>
        <button
          type="button"
          className="btn-icon"
          onClick={() => onMove(index, 'down')}
          disabled={!canMoveDown || disabled}
          title="Move down"
        >
          ↓
        </button>
        <button
          type="button"
          className="btn-icon"
          onClick={onEdit}
          disabled={disabled}
          title="Edit"
        >
          ✏️
        </button>
        <button
          type="button"
          className="btn-icon btn-delete"
          onClick={onDelete}
          disabled={disabled}
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

// ============================================
// FIELD FORM COMPONENT
// ============================================

const FieldForm = ({ field, onChange, onSave, onCancel, disabled }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onChange({
      ...field,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleOptionsChange = (e) => {
    const options = e.target.value
      .split('\n')
      .map((opt) => opt.trim())
      .filter(Boolean);
    onChange({ ...field, options });
  };

  const showOptions = field.type === 'select' || field.type === 'multiselect';

  return (
    <div className="field-form">
      <div className="form-row">
        <div className="form-group">
          <label>Field Name (Code) *</label>
          <input
            type="text"
            name="name"
            value={field.name}
            onChange={handleChange}
            placeholder="e.g., chipset"
            pattern="[a-zA-Z0-9_]+"
            disabled={disabled}
          />
          <span className="hint">Lowercase, no spaces (use camelCase)</span>
        </div>

        <div className="form-group">
          <label>Label (Display) *</label>
          <input
            type="text"
            name="label"
            value={field.label}
            onChange={handleChange}
            placeholder="e.g., Chipset"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Field Type</label>
          <select
            name="type"
            value={field.type}
            onChange={handleChange}
            disabled={disabled}
          >
            {FIELD_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="required"
              checked={field.required}
              onChange={handleChange}
              disabled={disabled}
            />
            Required field
          </label>
        </div>
      </div>

      {showOptions && (
        <div className="form-group">
          <label>Options (one per line)</label>
          <textarea
            value={field.options?.join('\n') || ''}
            onChange={handleOptionsChange}
            placeholder="Option 1&#10;Option 2&#10;Option 3"
            rows={4}
            disabled={disabled}
          />
        </div>
      )}

      <div className="form-group">
        <label>Placeholder Text</label>
        <input
          type="text"
          name="placeholder"
          value={field.placeholder || ''}
          onChange={handleChange}
          placeholder="e.g., Enter chipset model"
          disabled={disabled}
        />
      </div>

      <div className="form-group">
        <label>Help Text</label>
        <input
          type="text"
          name="helpText"
          value={field.helpText || ''}
          onChange={handleChange}
          placeholder="Additional information for this field"
          disabled={disabled}
        />
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn-cancel"
          onClick={onCancel}
          disabled={disabled}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn-save"
          onClick={onSave}
          disabled={disabled}
        >
          Save Field
        </button>
      </div>
    </div>
  );
};

export default SpecificationFieldEditor;
