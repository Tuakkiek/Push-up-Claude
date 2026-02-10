// ============================================
// FILE: backend/src/models/ProductType.js
// ✅ STEP 1: ProductType Model
// Purpose: Database-driven product type definitions
// Replaces: Hard-coded CATEGORIES array
// ============================================

import mongoose from "mongoose";

const specificationFieldSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "number", "select", "multiselect", "textarea"],
      required: true,
    },
    options: [String], // For select/multiselect types
    required: {
      type: Boolean,
      default: false,
    },
    placeholder: String,
    helpText: String,
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const productTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tên loại sản phẩm là bắt buộc"],
      unique: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    icon: {
      type: String,
      trim: true,
      default: "",
    },
    // Dynamic specification fields for this product type
    specificationFields: {
      type: [specificationFieldSchema],
      default: [],
    },
    // Status
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },
    // Display order in UI
    displayOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    // Metadata
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES
// ============================================

productTypeSchema.index({ name: 1 });
productTypeSchema.index({ slug: 1 });
productTypeSchema.index({ status: 1 });
productTypeSchema.index({ displayOrder: 1 });

// ============================================
// VIRTUALS
// ============================================

// Product count for this type
productTypeSchema.virtual("productCount", {
  ref: "UnifiedProduct",
  localField: "_id",
  foreignField: "productTypeId",
  count: true,
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find active product types
 */
productTypeSchema.statics.findActive = function () {
  return this.find({ status: "ACTIVE" }).sort({ displayOrder: 1, name: 1 });
};

/**
 * Find by slug
 */
productTypeSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug: slug.toLowerCase() });
};

/**
 * Get all with product counts
 */
productTypeSchema.statics.findWithCounts = async function () {
  return this.find().populate("productCount").sort({ displayOrder: 1 });
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Add specification field
 */
productTypeSchema.methods.addSpecificationField = function (field) {
  this.specificationFields.push(field);
  return this.save();
};

/**
 * Remove specification field
 */
productTypeSchema.methods.removeSpecificationField = function (fieldName) {
  this.specificationFields = this.specificationFields.filter(
    (f) => f.name !== fieldName
  );
  return this.save();
};

/**
 * Update specification field
 */
productTypeSchema.methods.updateSpecificationField = function (
  fieldName,
  updates
) {
  const field = this.specificationFields.find((f) => f.name === fieldName);
  if (field) {
    Object.assign(field, updates);
    return this.save();
  }
  throw new Error(`Field ${fieldName} not found`);
};

/**
 * Get required specification fields
 */
productTypeSchema.methods.getRequiredFields = function () {
  return this.specificationFields.filter((f) => f.required);
};

/**
 * Validate specifications object
 */
productTypeSchema.methods.validateSpecifications = function (specifications) {
  const errors = [];

  // Check required fields
  const requiredFields = this.getRequiredFields();
  for (const field of requiredFields) {
    if (!specifications || !specifications[field.name]) {
      errors.push(`${field.label} là bắt buộc`);
    }
  }

  // Validate field types and options
  for (const field of this.specificationFields) {
    const value = specifications?.[field.name];
    if (!value) continue;

    switch (field.type) {
      case "number":
        if (isNaN(Number(value))) {
          errors.push(`${field.label} phải là số`);
        }
        break;
      case "select":
        if (field.options && !field.options.includes(value)) {
          errors.push(
            `${field.label} phải là một trong: ${field.options.join(", ")}`
          );
        }
        break;
      case "multiselect":
        if (field.options && Array.isArray(value)) {
          const invalid = value.filter((v) => !field.options.includes(v));
          if (invalid.length > 0) {
            errors.push(
              `${field.label} chứa giá trị không hợp lệ: ${invalid.join(", ")}`
            );
          }
        }
        break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ============================================
// PRE-SAVE HOOKS
// ============================================

// Auto-generate slug from name if not provided
productTypeSchema.pre("save", function (next) {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  }
  next();
});

// ============================================
// EXPORT MODEL
// ============================================

const ProductType = mongoose.model("ProductType", productTypeSchema);

export default ProductType;
