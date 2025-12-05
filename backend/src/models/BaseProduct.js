// ============================================
// FILE: backend/src/models/BaseProduct.js
// ✅ CONVERTED TO SCHEMA FACTORY - NO MODELS EXPORTED
// ============================================

import mongoose from "mongoose";

// ============================================
// BASE VARIANT SCHEMA FACTORY
// ============================================
export const createBaseVariantSchema = () => {
  const schema = new mongoose.Schema(
    {
      color: { type: String, required: true, trim: true },
      originalPrice: { type: Number, required: true, min: 0 },
      price: { type: Number, required: true, min: 0 },
      stock: { type: Number, required: true, min: 0, default: 0 },
      images: [{ type: String, trim: true }],
      sku: { type: String, required: true, unique: true, trim: true },
      slug: { type: String, required: true, sparse: true, trim: true },
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true,
      },
      salesCount: { type: Number, default: 0, min: 0 },
    },
    {
      timestamps: true,
      // discriminatorKey removed — each variant type will have its own collection
    }
  );

  // Validation: giá bán <= giá gốc
  schema.pre("save", function (next) {
    if (this.price > this.originalPrice) {
      return next(new Error("Giá bán không được lớn hơn giá gốc"));
    }
    next();
  });

  // Method: Tăng lượt bán cho variant
  schema.methods.incrementSales = async function (quantity = 1) {
    this.salesCount += quantity;
    await this.save();
    return this.salesCount;
  };

  return schema;
};

// ============================================
// BASE PRODUCT SCHEMA FACTORY
// ============================================
export const createBaseProductSchema = () => {
  const schema = new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      model: { type: String, required: true, trim: true },

      baseSlug: {
        type: String,
        required: true,
        unique: true,
        sparse: true,
        trim: true,
      },

      slug: { type: String, sparse: true, trim: true },

      description: { type: String, trim: true, default: "" },

      // ADD NEW FIELDS
      featuredImages: [{ type: String, trim: true }],
      videoUrl: { type: String, trim: true, default: "" },

      // Specifications - will be overridden by each product type
      specifications: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },

      variants: [
        { type: mongoose.Schema.Types.ObjectId, refPath: "variantModel" },
      ],

      // Track which variant model/collection to populate from
      variantModel: { type: String, required: true },

      condition: {
        type: String,
        enum: ["NEW", "LIKE_NEW"],
        default: "NEW",
        required: true,
      },

      brand: { type: String, default: "Apple", trim: true },

      // ✅ THÊM CÁI NÀY
      productType: {
        type: String,
        required: true,
        trim: true,
      },

      category: {
        type: String,
        required: true,
        trim: true,
      },

      status: {
        type: String,
        enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "PRE_ORDER"],
        default: "AVAILABLE",
      },

      installmentBadge: {
        type: String,
        enum: ["NONE", "Trả góp 0%", "Trả góp 0%, trả trước 0đ"],
        default: "NONE",
      },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      averageRating: { type: Number, default: 0, min: 0, max: 5 },
      totalReviews: { type: Number, default: 0, min: 0 },
      salesCount: { type: Number, default: 0, min: 0 },
    },
    {
      timestamps: true,
      // discriminatorKey removed
    }
  );

  // ============================================
  // HOOKS
  // ============================================
  schema.pre("save", function (next) {
    try {
      if (this.baseSlug && !this.slug) {
        this.slug = this.baseSlug;
      }
      if (!this.category && this.productType) {
        // Fallback: set category from productType for backward compatibility
        this.category = this.productType;
      }
      next();
    } catch (err) {
      console.error("BaseProduct pre-save error:", err);
      next(err);
    }
  });

  // ============================================
  // METHODS
  // ============================================
  schema.methods.incrementSales = async function (quantity = 1) {
    this.salesCount += quantity;
    await this.save();
    return this.salesCount;
  };

  schema.methods.getMinPrice = async function () {
    if (!this.variants || this.variants.length === 0) return 0;

    await this.populate("variants");
    const prices = this.variants.map((v) => v.price).filter((p) => p > 0);
    return prices.length > 0 ? Math.min(...prices) : 0;
  };

  // ============================================
  // INDEXES
  // ============================================
  schema.index({ name: "text", model: "text", description: "text" });
  schema.index({ status: 1 });
  schema.index({ createdAt: -1 });
  schema.index({ salesCount: -1 });
  schema.index({ category: 1, salesCount: -1 });
  // Optional reference to dynamic Category collection (not enforced by schema to keep compatibility)
  // Use virtuals or external validation against Category model in controllers.

  return schema;
};

// ============================================
// EXPORT ONLY SCHEMA FACTORIES
// ============================================
export default {
  createBaseProductSchema,
  createBaseVariantSchema,
};
