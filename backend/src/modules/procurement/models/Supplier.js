/**
 * Supplier Model
 * Represents vendors/suppliers for procurement.
 * Part of the Procurement module.
 */

import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, default: "Vietnam", trim: true },
  },
  { _id: false }
);

const bankInfoSchema = new mongoose.Schema(
  {
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    accountHolder: { type: String, trim: true },
    branch: { type: String, trim: true },
  },
  { _id: false }
);

const supplierSchema = new mongoose.Schema(
  {
    // Unique supplier code (e.g., "SUP-APPLE-VN")
    code: {
      type: String,
      required: [true, "Supplier code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
    },

    // Tax identification
    taxCode: { type: String, trim: true },

    contact: contactSchema,

    bankInfo: bankInfoSchema,

    // Payment terms
    paymentTerms: {
      type: String,
      enum: {
        values: ["PREPAID", "NET15", "NET30", "NET60", "COD"],
        message: "{VALUE} is not a valid payment term",
      },
      default: "NET30",
    },

    // Currency for transactions
    currency: {
      type: String,
      default: "VND",
      enum: ["VND", "USD", "EUR"],
    },

    // Lead time in days (average)
    leadTimeDays: { type: Number, default: 7, min: 0 },

    // Categories this supplier provides
    categories: [{ type: String, trim: true }],

    // Rating based on performance
    rating: { type: Number, min: 0, max: 5, default: 0 },

    // Operational status
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE", "BLOCKED", "PENDING_APPROVAL"],
        message: "{VALUE} is not a valid supplier status",
      },
      default: "ACTIVE",
    },

    notes: { type: String, trim: true },

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

supplierSchema.index({ code: 1 }, { unique: true });
supplierSchema.index({ status: 1 });
supplierSchema.index({ name: "text" });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get active suppliers
 */
supplierSchema.statics.getActive = function () {
  return this.find({ status: "ACTIVE" }).sort({ name: 1 });
};

/**
 * Search suppliers by name or code
 */
supplierSchema.statics.search = function (query) {
  return this.find({
    $or: [
      { name: { $regex: query, $options: "i" } },
      { code: { $regex: query, $options: "i" } },
    ],
    status: "ACTIVE",
  }).limit(20);
};

const Supplier = mongoose.model("Supplier", supplierSchema);

export default Supplier;
