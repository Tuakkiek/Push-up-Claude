/**
 * PurchaseOrder Model
 * Represents orders placed with suppliers for inventory replenishment.
 * Supports partial receiving and goods receipt tracking.
 * Part of the Procurement module.
 */

import mongoose from "mongoose";

// Individual item in a PO
const purchaseOrderItemSchema = new mongoose.Schema(
  {
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Variant",
      required: [true, "Variant ID is required"],
    },

    // Denormalized for readability
    sku: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    variantDescription: { type: String, trim: true }, // "Red, 128GB"

    // Quantities
    quantityOrdered: {
      type: Number,
      required: [true, "Ordered quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    quantityReceived: {
      type: Number,
      default: 0,
      min: [0, "Received quantity cannot be negative"],
    },

    // Pricing
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // Item-level receiving status
    receivingStatus: {
      type: String,
      enum: ["PENDING", "PARTIAL", "COMPLETE", "CANCELLED"],
      default: "PENDING",
    },

    // Notes for this item
    notes: { type: String, trim: true },
  },
  { _id: true }
);

// Goods Receipt Note (GRN) - tracks individual receiving events
const goodsReceiptSchema = new mongoose.Schema(
  {
    grnNumber: { type: String, required: true, trim: true },
    receivedAt: { type: Date, default: Date.now },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receivedByName: { type: String, trim: true },

    // Which location the goods were placed
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: "Location" },
    locationCode: { type: String, trim: true },

    // Items received in this GRN
    items: [
      {
        variantId: { type: mongoose.Schema.Types.ObjectId, ref: "Variant" },
        sku: { type: String },
        quantityReceived: { type: Number, min: 0 },
        notes: { type: String },
      },
    ],

    notes: { type: String, trim: true },
  },
  { _id: true, timestamps: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    // Unique PO number (e.g., "PO-2026-0001")
    poNumber: {
      type: String,
      required: [true, "PO number is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Supplier reference
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier is required"],
    },
    supplierName: { type: String, trim: true }, // Denormalized

    // Target warehouse for receiving
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: [true, "Warehouse is required"],
    },
    warehouseCode: { type: String, trim: true }, // Denormalized

    // Order items
    items: {
      type: [purchaseOrderItemSchema],
      validate: {
        validator: (items) => items && items.length > 0,
        message: "Purchase order must have at least one item",
      },
    },

    // Dates
    orderDate: { type: Date, default: Date.now },
    expectedDate: { type: Date },
    completedDate: { type: Date },

    // PO status
    status: {
      type: String,
      enum: {
        values: ["DRAFT", "PENDING", "CONFIRMED", "PARTIAL", "COMPLETED", "CANCELLED"],
        message: "{VALUE} is not a valid PO status",
      },
      default: "DRAFT",
    },

    // Financial
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    shippingCost: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    // Payment
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIAL", "PAID"],
      default: "UNPAID",
    },
    paymentTerms: { type: String, trim: true },

    // Goods receipts (multiple receiving events)
    goodsReceipts: [goodsReceiptSchema],

    // Notes
    notes: { type: String, trim: true },
    internalNotes: { type: String, trim: true },

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    confirmedAt: { type: Date },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

purchaseOrderSchema.index({ poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ supplierId: 1 });
purchaseOrderSchema.index({ warehouseId: 1 });
purchaseOrderSchema.index({ status: 1, createdAt: -1 });
purchaseOrderSchema.index({ expectedDate: 1 });
purchaseOrderSchema.index({ createdBy: 1 });

// ============================================
// PRE-SAVE HOOKS
// ============================================

// Auto-generate PO number if not set
purchaseOrderSchema.pre("validate", async function (next) {
  if (this.isNew && !this.poNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    const lastPO = await mongoose
      .model("PurchaseOrder")
      .findOne({ poNumber: new RegExp(`^PO-${year}${month}`) })
      .sort({ poNumber: -1 });

    let sequence = 1;
    if (lastPO?.poNumber) {
      const parts = lastPO.poNumber.split("-");
      const lastSeq = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }

    this.poNumber = `PO-${year}${month}-${String(sequence).padStart(4, "0")}`;
  }
  next();
});

// Calculate totals before save
purchaseOrderSchema.pre("save", function (next) {
  // Calculate subtotal from items
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);

  // Calculate total
  this.totalAmount = this.subtotal + this.taxAmount + this.shippingCost;

  // Update status based on receiving progress
  if (this.status !== "DRAFT" && this.status !== "CANCELLED") {
    const allReceived = this.items.every(
      (item) => item.quantityReceived >= item.quantityOrdered
    );
    const someReceived = this.items.some((item) => item.quantityReceived > 0);

    if (allReceived) {
      this.status = "COMPLETED";
      if (!this.completedDate) this.completedDate = new Date();
    } else if (someReceived) {
      this.status = "PARTIAL";
    }
  }

  // Update item-level receiving status
  this.items.forEach((item) => {
    if (item.quantityReceived >= item.quantityOrdered) {
      item.receivingStatus = "COMPLETE";
    } else if (item.quantityReceived > 0) {
      item.receivingStatus = "PARTIAL";
    }
  });

  next();
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Confirm the PO (ready for receiving)
 */
purchaseOrderSchema.methods.confirm = async function (userId) {
  if (this.status !== "DRAFT" && this.status !== "PENDING") {
    throw new Error(`Cannot confirm PO in ${this.status} status`);
  }

  this.status = "CONFIRMED";
  this.confirmedBy = userId;
  this.confirmedAt = new Date();

  return this.save();
};

/**
 * Cancel the PO
 */
purchaseOrderSchema.methods.cancel = async function (userId, reason) {
  if (this.status === "COMPLETED" || this.status === "CANCELLED") {
    throw new Error(`Cannot cancel PO in ${this.status} status`);
  }

  // Check if any items received
  const hasReceived = this.items.some((item) => item.quantityReceived > 0);
  if (hasReceived) {
    throw new Error("Cannot cancel PO with received items");
  }

  this.status = "CANCELLED";
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancelReason = reason;

  // Mark all items as cancelled
  this.items.forEach((item) => {
    item.receivingStatus = "CANCELLED";
  });

  return this.save();
};

/**
 * Generate next GRN number
 */
purchaseOrderSchema.methods.generateGrnNumber = function () {
  const grnCount = this.goodsReceipts.length + 1;
  return `${this.poNumber}-GRN${String(grnCount).padStart(2, "0")}`;
};

/**
 * Get receiving summary
 */
purchaseOrderSchema.methods.getReceivingSummary = function () {
  return this.items.map((item) => ({
    sku: item.sku,
    productName: item.productName,
    ordered: item.quantityOrdered,
    received: item.quantityReceived,
    pending: item.quantityOrdered - item.quantityReceived,
    status: item.receivingStatus,
  }));
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get pending POs for a warehouse
 */
purchaseOrderSchema.statics.getPending = function (warehouseId) {
  const query = { status: { $in: ["CONFIRMED", "PARTIAL"] } };
  if (warehouseId) query.warehouseId = warehouseId;

  return this.find(query)
    .populate("supplierId", "code name")
    .sort({ expectedDate: 1 });
};

/**
 * Get overdue POs
 */
purchaseOrderSchema.statics.getOverdue = function () {
  return this.find({
    status: { $in: ["CONFIRMED", "PARTIAL"] },
    expectedDate: { $lt: new Date() },
  })
    .populate("supplierId", "code name")
    .populate("warehouseId", "code name")
    .sort({ expectedDate: 1 });
};

const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);

export default PurchaseOrder;
