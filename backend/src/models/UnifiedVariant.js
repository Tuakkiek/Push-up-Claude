// ============================================
// FILE: backend/src/models/UnifiedVariant.js
// ✅ STEP 3: Unified Variant Schema
// Purpose: Single variant model for ALL product types
// Structure: color + versionName (standardized)
// ============================================

import mongoose from "mongoose";

const unifiedVariantSchema = new mongoose.Schema(
  {
    // ============================================
    // CORE FIELDS (Required for all variants)
    // ============================================
    
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UnifiedProduct",
      required: true,
      index: true,
    },

    // ✅ STANDARDIZED: Color (always required)
    color: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // ✅ STANDARDIZED: Version Name (replaces storage/variantName/etc)
    // Examples: "128GB", "256GB WiFi", "M3 16GB 512GB", "Standard", "Pro"
    versionName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // ============================================
    // PRICING & INVENTORY
    // ============================================
    
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    // ============================================
    // MEDIA & IDENTIFICATION
    // ============================================
    
    images: [
      {
        type: String,
        trim: true,
      },
    ],

    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    slug: {
      type: String,
      sparse: true,
      trim: true,
      index: true,
    },

    // ============================================
    // ANALYTICS
    // ============================================
    
    salesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ============================================
    // LEGACY COMPATIBILITY (Migration support)
    // ============================================
    
    // Store old field names for backward compatibility during migration
    legacyFields: {
      type: Map,
      of: String,
      default: new Map(),
    },
    // Examples:
    // - iPhone: { storage: "128GB" }
    // - iPad: { storage: "256GB", connectivity: "WiFi" }
    // - Mac: { cpuGpu: "M3", ram: "16GB", storage: "512GB" }

  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================
// INDEXES FOR PERFORMANCE
// ============================================

unifiedVariantSchema.index({ productId: 1, color: 1, versionName: 1 });
unifiedVariantSchema.index({ sku: 1 }, { unique: true });
unifiedVariantSchema.index({ slug: 1 }, { sparse: true });
unifiedVariantSchema.index({ productId: 1, stock: 1 });
unifiedVariantSchema.index({ salesCount: -1 });

// ============================================
// VIRTUALS
// ============================================

// Full name: "Black 128GB"
unifiedVariantSchema.virtual("fullName").get(function () {
  return `${this.color} ${this.versionName}`;
});

// Discount percentage
unifiedVariantSchema.virtual("discountPercent").get(function () {
  if (!this.originalPrice || this.originalPrice <= this.price) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

// Is in stock
unifiedVariantSchema.virtual("inStock").get(function () {
  return this.stock > 0;
});

// Is low stock (less than 5)
unifiedVariantSchema.virtual("isLowStock").get(function () {
  return this.stock > 0 && this.stock <= 5;
});

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Validation: price cannot exceed originalPrice
unifiedVariantSchema.pre("save", function (next) {
  if (this.price > this.originalPrice) {
    return next(new Error("Giá bán không được lớn hơn giá gốc"));
  }
  next();
});

// Auto-generate slug if not provided
unifiedVariantSchema.pre("save", async function (next) {
  if (!this.slug && this.isNew) {
    // Get product to build slug
    try {
      const UnifiedProduct = mongoose.model("UnifiedProduct");
      const product = await UnifiedProduct.findById(this.productId);
      
      if (product && product.baseSlug) {
        const versionSlug = this.versionName
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");
        this.slug = `${product.baseSlug}-${versionSlug}`;
      }
    } catch (err) {
      console.warn("Could not auto-generate slug:", err.message);
    }
  }
  next();
});

// ============================================
// INSTANCE METHODS
// ============================================

// Increment sales count
unifiedVariantSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity;
  await this.save();
  
  /*
  // Also increment parent product sales - REMOVED as UnifiedProduct doesn't have salesCount yet
  const UnifiedProduct = mongoose.model("UnifiedProduct");
  const product = await UnifiedProduct.findById(this.productId);
  if (product && product.incrementSales) {
    await product.incrementSales(quantity);
  }
  */
  
  return this.salesCount;
};

// Decrement stock
unifiedVariantSchema.methods.decrementStock = async function (quantity = 1) {
  if (this.stock < quantity) {
    throw new Error(`Không đủ hàng trong kho. Còn lại: ${this.stock}`);
  }
  this.stock -= quantity;
  await this.save();
  return this.stock;
};

// Increment stock (for returns/restocks)
unifiedVariantSchema.methods.incrementStock = async function (quantity = 1) {
  this.stock += quantity;
  await this.save();
  return this.stock;
};

// Increment view count
unifiedVariantSchema.methods.incrementViews = async function () {
  this.viewCount += 1;
  await this.save();
  return this.viewCount;
};

// ============================================
// STATIC METHODS (Query Helpers)
// ============================================

// Find all variants for a product
unifiedVariantSchema.statics.findByProduct = function (productId) {
  return this.find({ productId }).sort({ color: 1, versionName: 1 });
};

// Find in-stock variants for a product
unifiedVariantSchema.statics.findInStockByProduct = function (productId) {
  return this.find({ productId, stock: { $gt: 0 } }).sort({
    color: 1,
    versionName: 1,
  });
};

// Get all unique colors for a product
unifiedVariantSchema.statics.getColorsByProduct = async function (productId) {
  const variants = await this.find({ productId }).distinct("color");
  return variants.sort();
};

// Get all unique version names for a product
unifiedVariantSchema.statics.getVersionsByProduct = async function (productId) {
  const variants = await this.find({ productId }).distinct("versionName");
  return variants.sort();
};

// Find variants by color
unifiedVariantSchema.statics.findByColor = function (productId, color) {
  return this.find({ productId, color }).sort({ versionName: 1 });
};

// Find variant by SKU
unifiedVariantSchema.statics.findBySku = function (sku) {
  return this.findOne({ sku });
};

// Find variant by slug
unifiedVariantSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug });
};

// Get low stock variants
unifiedVariantSchema.statics.findLowStock = function (threshold = 5) {
  return this.find({ stock: { $gt: 0, $lte: threshold } }).populate(
    "productId",
    "name model"
  );
};

// Get out of stock variants
unifiedVariantSchema.statics.findOutOfStock = function () {
  return this.find({ stock: 0 }).populate("productId", "name model");
};

// Get top selling variants
unifiedVariantSchema.statics.findTopSelling = function (limit = 10) {
  return this.find({ salesCount: { $gt: 0 } })
    .sort({ salesCount: -1 })
    .limit(limit)
    .populate("productId", "name model");
};

// ============================================
// EXPORT
// ============================================

const UnifiedVariant = mongoose.model("UnifiedVariant", unifiedVariantSchema);

export default UnifiedVariant;
