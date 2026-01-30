/**
 * Inventory Model
 * Maps variant stock to physical warehouse locations.
 * This is the source of truth for stock quantities.
 * Part of the WMS (Warehouse Management System) module.
 */

import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
  {
    // Reference to the variant (SKU)
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: [true, "Variant ID is required"],
    },

    // Reference to physical location
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: [true, "Location ID is required"],
    },

    // Stock quantity at this location
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },

    // Reserved quantity (for pending orders)
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, "Reserved quantity cannot be negative"],
    },

    // Batch/Lot tracking (optional)
    lotNumber: { type: String, trim: true },

    // For products with expiry (optional)
    expiryDate: { type: Date },

    // When this stock was received (for FIFO)
    receivedAt: { type: Date, default: Date.now },

    // Cost tracking (optional)
    unitCost: { type: Number, min: 0 },

    // Last count verification
    lastCountedAt: { type: Date },
    lastCountedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Compound unique index - one record per variant per location
inventorySchema.index({ variantId: 1, locationId: 1 }, { unique: true });

// Quick lookup by variant (find all locations for a SKU)
inventorySchema.index({ variantId: 1 });

// Quick lookup by location (find all SKUs at a location)
inventorySchema.index({ locationId: 1 });

// FIFO ordering
inventorySchema.index({ variantId: 1, receivedAt: 1 });

// Expiry tracking
inventorySchema.index({ expiryDate: 1 }, { sparse: true });

// Lot number lookup
inventorySchema.index({ lotNumber: 1 }, { sparse: true });

// ============================================
// VIRTUALS
// ============================================

// Available quantity (total - reserved)
inventorySchema.virtual("availableQuantity").get(function () {
  return Math.max(0, this.quantity - this.reservedQuantity);
});

// Total value at this location
inventorySchema.virtual("totalValue").get(function () {
  if (!this.unitCost) return null;
  return this.quantity * this.unitCost;
});

// Ensure virtuals are included
inventorySchema.set("toJSON", { virtuals: true });
inventorySchema.set("toObject", { virtuals: true });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get total stock for a variant across all locations
 */
inventorySchema.statics.getTotalStock = async function (variantId) {
  const result = await this.aggregate([
    { $match: { variantId: new mongoose.Types.ObjectId(variantId) } },
    {
      $group: {
        _id: null,
        totalQuantity: { $sum: "$quantity" },
        totalReserved: { $sum: "$reservedQuantity" },
      },
    },
  ]);

  if (result.length === 0) {
    return { totalQuantity: 0, totalReserved: 0, availableQuantity: 0 };
  }

  return {
    totalQuantity: result[0].totalQuantity,
    totalReserved: result[0].totalReserved,
    availableQuantity: result[0].totalQuantity - result[0].totalReserved,
  };
};

/**
 * Get stock by location with variant details
 */
inventorySchema.statics.getByLocation = async function (locationId) {
  return this.find({ locationId, quantity: { $gt: 0 } })
    .populate({
      path: "variantId",
      select: "sku productId price attributes images",
      populate: {
        path: "productId",
        select: "name slug brand",
      },
    })
    .sort({ receivedAt: 1 });
};

/**
 * Get stock by variant with location details
 */
inventorySchema.statics.getByVariant = async function (variantId) {
  return this.find({ variantId, quantity: { $gt: 0 } })
    .populate({
      path: "locationId",
      select: "code zone aisle shelf bin type warehouseId",
      populate: {
        path: "warehouseId",
        select: "code name",
      },
    })
    .sort({ receivedAt: 1 });
};

/**
 * Reserve stock for an order
 * Returns false if insufficient stock
 */
inventorySchema.statics.reserveStock = async function (variantId, quantity, session) {
  const stockInfo = await this.getTotalStock(variantId);

  if (stockInfo.availableQuantity < quantity) {
    return { success: false, shortfall: quantity - stockInfo.availableQuantity };
  }

  // Reserve from oldest stock first (FIFO)
  const inventories = await this.find({
    variantId,
    $expr: { $gt: [{ $subtract: ["$quantity", "$reservedQuantity"] }, 0] },
  })
    .sort({ receivedAt: 1 })
    .session(session);

  let remaining = quantity;

  for (const inv of inventories) {
    if (remaining <= 0) break;

    const available = inv.quantity - inv.reservedQuantity;
    const toReserve = Math.min(remaining, available);

    inv.reservedQuantity += toReserve;
    await inv.save({ session });

    remaining -= toReserve;
  }

  return { success: true, reserved: quantity };
};

/**
 * Release reserved stock (order cancelled or fulfilled)
 */
inventorySchema.statics.releaseReservation = async function (variantId, quantity, session) {
  const inventories = await this.find({
    variantId,
    reservedQuantity: { $gt: 0 },
  })
    .sort({ receivedAt: -1 }) // Release from newest first
    .session(session);

  let remaining = quantity;

  for (const inv of inventories) {
    if (remaining <= 0) break;

    const toRelease = Math.min(remaining, inv.reservedQuantity);
    inv.reservedQuantity -= toRelease;
    await inv.save({ session });

    remaining -= toRelease;
  }

  return remaining <= 0;
};

/**
 * Find or create inventory record for a variant at a location
 */
inventorySchema.statics.findOrCreate = async function (variantId, locationId, session) {
  let inventory = await this.findOne({ variantId, locationId }).session(session);

  if (!inventory) {
    inventory = new this({
      variantId,
      locationId,
      quantity: 0,
      reservedQuantity: 0,
      receivedAt: new Date(),
    });
    await inventory.save({ session });
  }

  return inventory;
};

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory;
