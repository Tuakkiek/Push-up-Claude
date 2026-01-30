import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true }, // db field name (e.g., "storage")
    label: { type: String, required: true, trim: true }, // UI label (e.g., "Dung lượng")
    type: {
      type: String,
      required: true,
      enum: ["text", "number", "select", "boolean", "multiselect"],
    },
    validation: {
      required: { type: Boolean, default: false },
      min: { type: Number }, // For numbers or string length
      max: { type: Number },
      pattern: { type: String }, // Regex for text
      options: [{ type: String }], // For select/multiselect
    },
    ui: {
      group: { type: String, default: "General" }, // Grouping in UI
      order: { type: Number, default: 0 },
      unit: { type: String }, // e.g., "GB", "inch", "mAh"
      widget: { type: String }, // e.g., "color-picker", "slider"
      placeholder: { type: String },
    },
    flags: {
      isSearchable: { type: Boolean, default: true },
      isFilterable: { type: Boolean, default: true },
      isComparable: { type: Boolean, default: true },
    },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    
    // Schema Versioning
    version: { type: Number, default: 1 },
    
    // Dynamic Schema Definitions
    specSchema: [fieldSchema], // Defines structure for Product.specs
    variantSchema: [fieldSchema], // Defines structure for Product.variants.attributes

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// Indexes
categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1 });

const Category = mongoose.model("Category", categorySchema);

export default Category;
