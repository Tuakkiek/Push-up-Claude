/**
 * Variant Model
 * Represents SKU-level sellable items (extracted from embedded Product.variants).
 * The totalStock field is cached and MUST only be updated via WMS services.
 * Part of the Catalog module.
 */

import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    // Reference to parent product
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },

    // Unique SKU (globally unique)
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Pricing
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    originalPrice: {
      type: Number,
      min: [0, "Original price cannot be negative"],
    },

    // Cost for margin calculation
    costPrice: {
      type: Number,
      min: [0, "Cost price cannot be negative"],
    },

    // Dynamic attributes (e.g., { color: "Red", storage: "128GB", ram: "8GB" })
    attributes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Images for this variant
    images: [{ type: String, trim: true }],

    // ============================================
    // STOCK MANAGEMENT (WMS-controlled)
    // ============================================

    // Total stock across all warehouse locations (cached, updated by WMS)
    totalStock: {
      type: Number,
      default: 0,
      min: [0, "Total stock cannot be negative"],
    },

    // Reserved stock for pending orders
    reservedStock: {
      type: Number,
      default: 0,
      min: [0, "Reserved stock cannot be negative"],
    },

    // Low stock threshold for alerts
    lowStockThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },

    // ============================================
    // STATUS & VISIBILITY
    // ============================================

    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE", "OUT_OF_STOCK", "DISCONTINUED"],
        message: "{VALUE} is not a valid variant status",
      },
      default: "ACTIVE",
    },

    // Hide from customer-facing pages
    isHidden: {
      type: Boolean,
      default: false,
    },

    // ============================================
    // STATS
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

    // Last sale date for velocity tracking
    lastSaleAt: { type: Date },

    // ============================================
    // PHYSICAL PROPERTIES (optional)
    // ============================================

    weight: { type: Number, min: 0 }, // grams
    dimensions: {
      length: { type: Number, min: 0 }, // cm
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
    },

    // Barcode/UPC
    barcode: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Unique SKU
variantSchema.index({ sku: 1 }, { unique: true });

// Product lookup
variantSchema.index({ productId: 1 });

// Status filtering
variantSchema.index({ status: 1 });

// Stock queries
variantSchema.index({ totalStock: 1 });

// Low stock alerts
variantSchema.index({ totalStock: 1, lowStockThreshold: 1 });

// Barcode lookup
variantSchema.index({ barcode: 1 }, { sparse: true });

// Dynamic attribute filtering (wildcard index)
variantSchema.index({ "attributes.$**": 1 });

// Sales velocity
variantSchema.index({ salesCount: -1 });

// ============================================
// VIRTUALS
// ============================================

// Available stock (total - reserved)
variantSchema.virtual("availableStock").get(function () {
  return Math.max(0, this.totalStock - this.reservedStock);
});

// Is in stock
variantSchema.virtual("inStock").get(function () {
  return this.availableStock > 0;
});

// Is low stock
variantSchema.virtual("isLowStock").get(function () {
  return this.totalStock > 0 && this.totalStock <= this.lowStockThreshold;
});

// Discount percentage
variantSchema.virtual("discountPercentage").get(function () {
  if (!this.originalPrice || this.originalPrice <= this.price) return 0;
  return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
});

// Profit margin
variantSchema.virtual("profitMargin").get(function () {
  if (!this.costPrice || this.costPrice <= 0) return null;
  return Math.round(((this.price - this.costPrice) / this.price) * 100);
});

// Variant display name from attributes
variantSchema.virtual("displayName").get(function () {
  if (!this.attributes || Object.keys(this.attributes).length === 0) {
    return this.sku;
  }
  return Object.values(this.attributes).join(" / ");
});

// Ensure virtuals are included
variantSchema.set("toJSON", { virtuals: true });
variantSchema.set("toObject", { virtuals: true });

// ============================================
// PRE-SAVE HOOKS
// ============================================

// Auto-update status based on stock
variantSchema.pre("save", function (next) {
  if (this.isModified("totalStock") || this.isModified("reservedStock")) {
    if (this.availableStock <= 0 && this.status === "ACTIVE") {
      this.status = "OUT_OF_STOCK";
    } else if (this.availableStock > 0 && this.status === "OUT_OF_STOCK") {
      this.status = "ACTIVE";
    }
  }
  next();
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * Recalculate totalStock from Inventory collection
 * MUST be called after any inventory changes
 */
variantSchema.statics.recalculateTotalStock = async function (variantId, session) {
  const Inventory = mongoose.model("Inventory");

  const result = await Inventory.aggregate([
    { $match: { variantId: new mongoose.Types.ObjectId(variantId) } },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: "$quantity" },
        totalReserved: { $sum: "$reservedQuantity" },
      },
    },
  ]).session(session);

  const totalStock = result.length > 0 ? result[0].totalQuantity : 0;
  const reservedStock = result.length > 0 ? result[0].totalReserved : 0;

  return this.findByIdAndUpdate(
    variantId,
    { totalStock, reservedStock },
    { new: true, session }
  );
};

/**
 * Get low stock variants
 */
variantSchema.statics.getLowStock = function () {
  return this.find({
    status: { $ne: "DISCONTINUED" },
    $expr: { $lte: ["$totalStock", "$lowStockThreshold"] },
    totalStock: { $gt: 0 },
  })
    .populate("productId", "name slug brand")
    .sort({ totalStock: 1 });
};

/**
 * Get out of stock variants
 */
variantSchema.statics.getOutOfStock = function () {
  return this.find({
    status: "OUT_OF_STOCK",
    totalStock: 0,
  })
    .populate("productId", "name slug brand")
    .sort({ lastSaleAt: -1 });
};

/**
 * Find by barcode
 */
variantSchema.statics.findByBarcode = function (barcode) {
  return this.findOne({ barcode }).populate("productId", "name slug brand category");
};

/**
 * Get variants for a product with stock info
 */
variantSchema.statics.getByProduct = async function (productId) {
  return this.find({ productId, status: { $ne: "DISCONTINUED" } }).sort({
    "attributes.storage": 1,
    "attributes.color": 1,
  });
};

/**
 * Increment sales count
 */
variantSchema.statics.incrementSales = async function (variantId, quantity = 1, session) {
  return this.findByIdAndUpdate(
    variantId,
    {
      $inc: { salesCount: quantity },
      $set: { lastSaleAt: new Date() },
    },
    { new: true, session }
  );
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if requested quantity is available
 */
variantSchema.methods.checkAvailability = function (quantity) {
  return {
    available: this.availableStock >= quantity,
    requested: quantity,
    available: this.availableStock,
    shortfall: Math.max(0, quantity - this.availableStock),
  };
};

const Variant = mongoose.model("Variant", variantSchema);

export default Variant;
