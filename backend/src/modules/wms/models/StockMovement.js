/**
 * StockMovement Model
 * Critical audit log for all stock changes.
 * Every stock operation MUST create a movement record.
 * Part of the WMS (Warehouse Management System) module.
 */

import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema(
  {
    // Movement type
    type: {
      type: String,
      required: [true, "Movement type is required"],
      enum: {
        values: ["INBOUND", "OUTBOUND", "TRANSFER", "ADJUSTMENT", "RETURN", "RESERVE", "RELEASE"],
        message: "{VALUE} is not a valid movement type",
      },
    },

    // Variant reference
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: [true, "Variant ID is required"],
    },

    // Denormalized SKU for quick lookup and reporting
    sku: {
      type: String,
      required: [true, "SKU is required"],
      trim: true,
    },

    // Location references (one or both depending on type)
    fromLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    toLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },

    // Denormalized location codes for readability
    fromLocationCode: { type: String, trim: true },
    toLocationCode: { type: String, trim: true },

    // Quantity moved
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
    },

    // Reference document (PO, Order, Inventory Count, etc.)
    referenceType: {
      type: String,
      enum: {
        values: [
          "PURCHASE_ORDER",
          "SALES_ORDER",
          "INVENTORY_COUNT",
          "MANUAL",
          "RETURN_ORDER",
          "TRANSFER_ORDER",
          "SYSTEM",
        ],
        message: "{VALUE} is not a valid reference type",
      },
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    referenceNumber: { type: String, trim: true }, // Human-readable (PO-2026-0001, ORD250129001)

    // Audit trail
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Performer ID is required"],
    },
    performedByName: { type: String, trim: true }, // Denormalized for reports

    // Notes and reason
    notes: { type: String, trim: true },
    reason: { type: String, trim: true }, // For adjustments

    // Pre/Post snapshot for audit
    previousQuantity: { type: Number },
    newQuantity: { type: Number },

    // Cost tracking (optional)
    unitCost: { type: Number, min: 0 },
    totalCost: { type: Number, min: 0 },

    // Batch/Lot (if applicable)
    lotNumber: { type: String, trim: true },

    // Status for async operations
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED"],
      default: "COMPLETED",
    },
    errorMessage: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Type and date for filtering movements
stockMovementSchema.index({ type: 1, createdAt: -1 });

// Variant history
stockMovementSchema.index({ variantId: 1, createdAt: -1 });

// SKU lookup (for reports)
stockMovementSchema.index({ sku: 1, createdAt: -1 });

// Reference lookup
stockMovementSchema.index({ referenceType: 1, referenceId: 1 });
stockMovementSchema.index({ referenceNumber: 1 });

// Performer audit
stockMovementSchema.index({ performedBy: 1, createdAt: -1 });

// Location history
stockMovementSchema.index({ fromLocationId: 1, createdAt: -1 });
stockMovementSchema.index({ toLocationId: 1, createdAt: -1 });

// Date range queries
stockMovementSchema.index({ createdAt: -1 });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Create an inbound movement (receiving stock)
 */
stockMovementSchema.statics.createInbound = async function (data, session) {
  return this.create(
    [
      {
        type: "INBOUND",
        variantId: data.variantId,
        sku: data.sku,
        toLocationId: data.locationId,
        toLocationCode: data.locationCode,
        quantity: data.quantity,
        referenceType: data.referenceType || "MANUAL",
        referenceId: data.referenceId,
        referenceNumber: data.referenceNumber,
        performedBy: data.performedBy,
        performedByName: data.performedByName,
        previousQuantity: data.previousQuantity,
        newQuantity: data.newQuantity,
        unitCost: data.unitCost,
        totalCost: data.unitCost ? data.unitCost * data.quantity : undefined,
        lotNumber: data.lotNumber,
        notes: data.notes,
        status: "COMPLETED",
      },
    ],
    { session }
  );
};

/**
 * Create an outbound movement (shipping/selling)
 */
stockMovementSchema.statics.createOutbound = async function (data, session) {
  return this.create(
    [
      {
        type: "OUTBOUND",
        variantId: data.variantId,
        sku: data.sku,
        fromLocationId: data.locationId,
        fromLocationCode: data.locationCode,
        quantity: data.quantity,
        referenceType: data.referenceType || "SALES_ORDER",
        referenceId: data.referenceId,
        referenceNumber: data.referenceNumber,
        performedBy: data.performedBy,
        performedByName: data.performedByName,
        previousQuantity: data.previousQuantity,
        newQuantity: data.newQuantity,
        notes: data.notes,
        status: "COMPLETED",
      },
    ],
    { session }
  );
};

/**
 * Create a transfer movement
 */
stockMovementSchema.statics.createTransfer = async function (data, session) {
  return this.create(
    [
      {
        type: "TRANSFER",
        variantId: data.variantId,
        sku: data.sku,
        fromLocationId: data.fromLocationId,
        fromLocationCode: data.fromLocationCode,
        toLocationId: data.toLocationId,
        toLocationCode: data.toLocationCode,
        quantity: data.quantity,
        referenceType: data.referenceType || "TRANSFER_ORDER",
        referenceId: data.referenceId,
        referenceNumber: data.referenceNumber,
        performedBy: data.performedBy,
        performedByName: data.performedByName,
        notes: data.notes,
        status: "COMPLETED",
      },
    ],
    { session }
  );
};

/**
 * Create an adjustment movement (cycle count correction)
 */
stockMovementSchema.statics.createAdjustment = async function (data, session) {
  return this.create(
    [
      {
        type: "ADJUSTMENT",
        variantId: data.variantId,
        sku: data.sku,
        toLocationId: data.quantity > 0 ? data.locationId : undefined,
        toLocationCode: data.quantity > 0 ? data.locationCode : undefined,
        fromLocationId: data.quantity < 0 ? data.locationId : undefined,
        fromLocationCode: data.quantity < 0 ? data.locationCode : undefined,
        quantity: Math.abs(data.quantity),
        referenceType: data.referenceType || "INVENTORY_COUNT",
        referenceId: data.referenceId,
        referenceNumber: data.referenceNumber,
        performedBy: data.performedBy,
        performedByName: data.performedByName,
        previousQuantity: data.previousQuantity,
        newQuantity: data.newQuantity,
        reason: data.reason,
        notes: data.notes,
        status: "COMPLETED",
      },
    ],
    { session }
  );
};

/**
 * Get movement history for a variant
 */
stockMovementSchema.statics.getVariantHistory = async function (variantId, options = {}) {
  const { limit = 50, skip = 0, type, startDate, endDate } = options;

  const query = { variantId: new mongoose.Types.ObjectId(variantId) };

  if (type) query.type = type;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  return this.find(query)
    .populate("performedBy", "username fullName")
    .populate("fromLocationId", "code")
    .populate("toLocationId", "code")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

/**
 * Get movement summary by type for date range
 */
stockMovementSchema.statics.getSummary = async function (options = {}) {
  const { startDate, endDate, warehouseId } = options;

  const matchStage = {};
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: "$type",
        count: { $sum: 1 },
        totalQuantity: { $sum: "$quantity" },
        totalValue: { $sum: { $ifNull: ["$totalCost", 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ];

  return this.aggregate(pipeline);
};

const StockMovement = mongoose.model("StockMovement", stockMovementSchema);

export default StockMovement;
