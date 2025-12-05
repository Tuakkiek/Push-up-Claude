// backend/src/models/Category.js
import mongoose from "mongoose";

const fieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true }, // e.g. storage, screenSize
    label: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["string", "number", "boolean", "enum", "array", "object"],
      default: "string",
    },
    required: { type: Boolean, default: false },
    options: [{ type: String, trim: true }], // for enum/array types
    default: { type: mongoose.Schema.Types.Mixed, default: undefined },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
    pattern: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    skuPrefix: { type: String, trim: true, default: "PRODUCT" },
    active: { type: Boolean, default: true },

    productFields: { type: [fieldSchema], default: [] },
    variantFields: { type: [fieldSchema], default: [] },

    // Backward-compat mapping (optional)
    legacyNames: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

categorySchema.pre("save", function (next) {
  try {
    if (!this.slug && this.name) {
      this.slug = String(this.name)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
    next();
  } catch (err) {
    console.error("Category pre-save error:", err);
    next(err);
  }
});

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ name: 1 }, { unique: true });
categorySchema.index({ active: 1 });

const Category = mongoose.model("Category", categorySchema);
export default Category;
