// ============================================
// FILE: backend/src/models/UnifiedProduct.js
// ✅ STEP 2: Unified Product Model
// Purpose: Single flexible schema for ALL product types
// Replaces: IPhone, IPad, Mac, AirPods, AppleWatch, Accessory models
// ============================================

import mongoose from "mongoose";

const unifiedProductSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, "Tên sản phẩm là bắt buộc"],
      trim: true,
      index: true,
    },
    model: {
      type: String,
      required: [true, "Model là bắt buộc"],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    baseSlug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Product Type Reference (KEY CHANGE)
    productTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductType",
      required: [true, "ProductType là bắt buộc"],
      index: true,
    },

    // Dynamic Specifications (KEY CHANGE)
    // Stores type-specific data based on ProductType schema
    specifications: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Product Condition
    condition: {
      type: String,
      enum: ["NEW", "LIKE_NEW", "USED", "REFURBISHED"],
      default: "NEW",
      index: true,
    },

    // Brand
    brand: {
      type: String,
      default: "Apple",
      trim: true,
      index: true,
    },

    // Status
    status: {
      type: String,
      enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "COMING_SOON"],
      default: "AVAILABLE",
      index: true,
    },

    // Installment Badge
    installmentBadge: {
      type: String,
      enum: ["NONE", "0_PERCENT", "SPECIAL_OFFER"],
      default: "NONE",
    },

    // Media
    featuredImages: {
      type: [String],
      default: [],
    },
    videoUrl: {
      type: String,
      trim: true,
      default: "",
    },

    // Variant References
    variants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "UnifiedVariant",
      },
    ],

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

    // Migration support (temporary)
    legacyCategory: {
      type: String,
      enum: ["iPhone", "iPad", "Mac", "AirPods", "Apple Watch", "Accessory", null],
      default: null,
      select: false,
    },
    legacyId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      select: false,
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

unifiedProductSchema.index({ name: 1, productTypeId: 1 });
unifiedProductSchema.index({ model: 1 });
unifiedProductSchema.index({ slug: 1 });
unifiedProductSchema.index({ baseSlug: 1 });
unifiedProductSchema.index({ productTypeId: 1, status: 1 });
unifiedProductSchema.index({ createdAt: -1 });
unifiedProductSchema.index({ brand: 1, condition: 1 });

// Text search index
unifiedProductSchema.index({
  name: "text",
  model: "text",
  description: "text",
});

// ============================================
// VIRTUALS
// ============================================

/**
 * Get minimum price from variants
 */
unifiedProductSchema.virtual("minPrice").get(async function () {
  if (!this.populated("variants") || this.variants.length === 0) {
    return 0;
  }
  return Math.min(...this.variants.map((v) => v.price || 0));
});

/**
 * Get maximum price from variants
 */
unifiedProductSchema.virtual("maxPrice").get(async function () {
  if (!this.populated("variants") || this.variants.length === 0) {
    return 0;
  }
  return Math.max(...this.variants.map((v) => v.price || 0));
});

/**
 * Get price range string
 */
unifiedProductSchema.virtual("priceRange").get(async function () {
  if (!this.populated("variants") || this.variants.length === 0) {
    return "Liên hệ";
  }

  const prices = this.variants.map((v) => v.price || 0).filter((p) => p > 0);
  if (prices.length === 0) return "Liên hệ";

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (min === max) {
    return `${min.toLocaleString()}₫`;
  }

  return `${min.toLocaleString()}₫ - ${max.toLocaleString()}₫`;
});

/**
 * Check if product has stock
 */
unifiedProductSchema.virtual("hasStock").get(function () {
  if (!this.populated("variants") || this.variants.length === 0) {
    return false;
  }
  return this.variants.some((v) => v.stock > 0);
});

/**
 * Get total stock across all variants
 */
unifiedProductSchema.virtual("totalStock").get(function () {
  if (!this.populated("variants") || this.variants.length === 0) {
    return 0;
  }
  return this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Get minimum price (async version for when variants aren't populated)
 */
unifiedProductSchema.methods.getMinPrice = async function () {
  const UnifiedVariant = mongoose.model("UnifiedVariant");
  const variants = await UnifiedVariant.find({ productId: this._id });
  if (variants.length === 0) return 0;
  return Math.min(...variants.map((v) => v.price || 0));
};

/**
 * Get maximum price (async version)
 */
unifiedProductSchema.methods.getMaxPrice = async function () {
  const UnifiedVariant = mongoose.model("UnifiedVariant");
  const variants = await UnifiedVariant.find({ productId: this._id });
  if (variants.length === 0) return 0;
  return Math.max(...variants.map((v) => v.price || 0));
};

/**
 * Get price range (async version)
 */
unifiedProductSchema.methods.getPriceRange = async function () {
  const UnifiedVariant = mongoose.model("UnifiedVariant");
  const variants = await UnifiedVariant.find({ productId: this._id });

  if (variants.length === 0) return "Liên hệ";

  const prices = variants.map((v) => v.price || 0).filter((p) => p > 0);
  if (prices.length === 0) return "Liên hệ";

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (min === max) {
    return `${min.toLocaleString()}₫`;
  }

  return `${min.toLocaleString()}₫ - ${max.toLocaleString()}₫`;
};

/**
 * Get total stock (async version)
 */
unifiedProductSchema.methods.getTotalStock = async function () {
  const UnifiedVariant = mongoose.model("UnifiedVariant");
  const variants = await UnifiedVariant.find({ productId: this._id });
  return variants.reduce((sum, v) => sum + (v.stock || 0), 0);
};

/**
 * Check if has stock (async version)
 */
unifiedProductSchema.methods.checkStock = async function () {
  const UnifiedVariant = mongoose.model("UnifiedVariant");
  const count = await UnifiedVariant.countDocuments({
    productId: this._id,
    stock: { $gt: 0 },
  });
  return count > 0;
};

/**
 * Get available colors
 */
unifiedProductSchema.methods.getAvailableColors = async function () {
  const UnifiedVariant = mongoose.model("UnifiedVariant");
  const variants = await UnifiedVariant.find({ productId: this._id });
  return [...new Set(variants.map((v) => v.color))];
};

/**
 * Get available versions
 */
unifiedProductSchema.methods.getAvailableVersions = async function () {
  const UnifiedVariant = mongoose.model("UnifiedVariant");
  const variants = await UnifiedVariant.find({ productId: this._id });
  return [...new Set(variants.map((v) => v.versionName))];
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find by product type
 */
unifiedProductSchema.statics.findByType = function (productTypeId) {
  return this.find({ productTypeId })
    .populate("variants")
    .populate("productTypeId")
    .sort({ createdAt: -1 });
};

/**
 * Find by slug
 */
unifiedProductSchema.statics.findBySlug = function (slug) {
  return this.findOne({ $or: [{ slug }, { baseSlug: slug }] })
    .populate("variants")
    .populate("productTypeId");
};

/**
 * Search products
 */
unifiedProductSchema.statics.search = function (searchTerm, options = {}) {
  const query = {
    $or: [
      { name: { $regex: searchTerm, $options: "i" } },
      { model: { $regex: searchTerm, $options: "i" } },
      { description: { $regex: searchTerm, $options: "i" } },
    ],
  };

  if (options.productTypeId) {
    query.productTypeId = options.productTypeId;
  }

  if (options.status) {
    query.status = options.status;
  }

  return this.find(query)
    .populate("variants")
    .populate("productTypeId")
    .sort({ createdAt: -1 })
    .limit(options.limit || 20);
};

/**
 * Get products with low stock
 */
unifiedProductSchema.statics.findLowStock = async function (threshold = 5) {
  const UnifiedVariant = mongoose.model("UnifiedVariant");

  // Get products with low stock variants
  const lowStockVariants = await UnifiedVariant.find({
    stock: { $gt: 0, $lte: threshold },
  }).distinct("productId");

  return this.find({ _id: { $in: lowStockVariants } })
    .populate("variants")
    .populate("productTypeId");
};

/**
 * Get out of stock products
 */
unifiedProductSchema.statics.findOutOfStock = async function () {
  return this.find({ status: "OUT_OF_STOCK" })
    .populate("variants")
    .populate("productTypeId");
};

// ============================================
// PRE-SAVE HOOKS
// ============================================

// Auto-generate slug from model if not provided
unifiedProductSchema.pre("save", function (next) {
  if (!this.baseSlug && this.model) {
    this.baseSlug = this.model
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-")
      .replace(/^-+/, "")
      .replace(/-+$/, "");
  }

  if (!this.slug) {
    this.slug = this.baseSlug;
  }

  next();
});

// ============================================
// EXPORT MODEL
// ============================================

const UnifiedProduct = mongoose.model("UnifiedProduct", unifiedProductSchema);

export default UnifiedProduct;
