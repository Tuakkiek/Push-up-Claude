/**
 * Warehouse Model
 * Represents a physical warehouse location for inventory storage.
 * Part of the WMS (Warehouse Management System) module.
 */

import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    province: { type: String, trim: true },
    country: { type: String, default: "Vietnam", trim: true },
    postalCode: { type: String, trim: true },
  },
  { _id: false }
);

const contactSchema = new mongoose.Schema(
  {
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    manager: { type: String, trim: true },
  },
  { _id: false }
);

const warehouseSchema = new mongoose.Schema(
  {
    // Unique warehouse code (e.g., "WH-HCM", "WH-HN")
    code: {
      type: String,
      required: [true, "Warehouse code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: [true, "Warehouse name is required"],
      trim: true,
    },

    description: { type: String, trim: true },

    address: addressSchema,

    contact: contactSchema,

    // Operational status
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "INACTIVE", "MAINTENANCE"],
        message: "{VALUE} is not a valid warehouse status",
      },
      default: "ACTIVE",
    },

    // Capacity tracking
    totalCapacity: { type: Number, default: 0, min: 0 },
    currentOccupancy: { type: Number, default: 0, min: 0 },

    // Operational hours (optional)
    operatingHours: {
      openTime: { type: String }, // "08:00"
      closeTime: { type: String }, // "18:00"
      workDays: [{ type: String }], // ["Monday", "Tuesday", ...]
    },

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isDefault: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Unique index on code
warehouseSchema.index({ code: 1 }, { unique: true });

// Status for filtering active warehouses
warehouseSchema.index({ status: 1 });

// Default warehouse lookup
warehouseSchema.index({ isDefault: 1 });

// ============================================
// VIRTUALS
// ============================================

// Calculate occupancy percentage
warehouseSchema.virtual("occupancyPercentage").get(function () {
  if (this.totalCapacity === 0) return 0;
  return Math.round((this.currentOccupancy / this.totalCapacity) * 100);
});

// Ensure virtuals are included in JSON
warehouseSchema.set("toJSON", { virtuals: true });
warehouseSchema.set("toObject", { virtuals: true });

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get the default warehouse
 */
warehouseSchema.statics.getDefault = async function () {
  const defaultWarehouse = await this.findOne({ isDefault: true, status: "ACTIVE" });
  if (defaultWarehouse) return defaultWarehouse;

  // Fallback to first active warehouse
  return this.findOne({ status: "ACTIVE" }).sort({ createdAt: 1 });
};

/**
 * Set a warehouse as default (unset others)
 */
warehouseSchema.statics.setAsDefault = async function (warehouseId) {
  await this.updateMany({}, { isDefault: false });
  return this.findByIdAndUpdate(warehouseId, { isDefault: true }, { new: true });
};

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Update occupancy based on location changes
 */
warehouseSchema.methods.recalculateOccupancy = async function () {
  const Location = mongoose.model("Location");
  const result = await Location.aggregate([
    { $match: { warehouseId: this._id } },
    {
      $group: {
        _id: null,
        totalCapacity: { $sum: "$capacity" },
        currentOccupancy: { $sum: "$currentLoad" },
      },
    },
  ]);

  if (result.length > 0) {
    this.totalCapacity = result[0].totalCapacity;
    this.currentOccupancy = result[0].currentOccupancy;
    await this.save();
  }

  return this;
};

const Warehouse = mongoose.model("Warehouse", warehouseSchema);

export default Warehouse;
