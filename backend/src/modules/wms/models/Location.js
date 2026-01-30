/**
 * Location Model
 * Represents a physical storage bin/location within a warehouse.
 * Supports QR code generation for mobile scanning.
 * Part of the WMS (Warehouse Management System) module.
 */

import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    // Reference to parent warehouse
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: [true, "Warehouse ID is required"],
    },

    // Unique location code (e.g., "WH-HCM-A-01-03-05")
    // Format: {warehouseCode}-{zone}-{aisle}-{shelf}-{bin}
    code: {
      type: String,
      required: [true, "Location code is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    // Location hierarchy components
    zone: {
      type: String,
      required: [true, "Zone is required"],
      trim: true,
      uppercase: true,
    },
    aisle: {
      type: String,
      required: [true, "Aisle is required"],
      trim: true,
    },
    shelf: {
      type: String,
      required: [true, "Shelf is required"],
      trim: true,
    },
    bin: {
      type: String,
      required: [true, "Bin is required"],
      trim: true,
    },

    // Location type determines operational priority
    type: {
      type: String,
      enum: {
        values: ["RECEIVING", "STORAGE", "PICKING", "RETURN", "QUARANTINE", "SHIPPING"],
        message: "{VALUE} is not a valid location type",
      },
      default: "STORAGE",
    },

    // Capacity management
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [0, "Capacity cannot be negative"],
      default: 100,
    },
    currentLoad: {
      type: Number,
      default: 0,
      min: [0, "Current load cannot be negative"],
    },

    // Operational status
    status: {
      type: String,
      enum: {
        values: ["AVAILABLE", "FULL", "RESERVED", "DISABLED", "MAINTENANCE"],
        message: "{VALUE} is not a valid location status",
      },
      default: "AVAILABLE",
    },

    // Optional zone metadata
    zoneDescription: { type: String, trim: true },

    // Priority for picking (lower = higher priority)
    pickingPriority: { type: Number, default: 100, min: 1 },

    // Allow mixing different SKUs in same location
    allowMixedSku: { type: Boolean, default: true },

    // QR Code data (serialized JSON for QR generation)
    qrData: { type: String },

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lastInventoryAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// ============================================
// INDEXES
// ============================================

// Unique code index
locationSchema.index({ code: 1 }, { unique: true });

// Warehouse filtering
locationSchema.index({ warehouseId: 1 });

// Type filtering for operations (e.g., find all PICKING locations)
locationSchema.index({ type: 1 });

// Status filtering
locationSchema.index({ status: 1 });

// Hierarchical lookup
locationSchema.index({ warehouseId: 1, zone: 1, aisle: 1 });

// Picking priority for optimal route
locationSchema.index({ warehouseId: 1, type: 1, pickingPriority: 1 });

// Available capacity search
locationSchema.index({ warehouseId: 1, status: 1, currentLoad: 1 });

// ============================================
// VIRTUALS
// ============================================

// Available capacity
locationSchema.virtual("availableCapacity").get(function () {
  return Math.max(0, this.capacity - this.currentLoad);
});

// Occupancy percentage
locationSchema.virtual("occupancyPercentage").get(function () {
  if (this.capacity === 0) return 0;
  return Math.round((this.currentLoad / this.capacity) * 100);
});

// Is location available for new stock
locationSchema.virtual("isAvailable").get(function () {
  return this.status === "AVAILABLE" && this.currentLoad < this.capacity;
});

// Ensure virtuals are included
locationSchema.set("toJSON", { virtuals: true });
locationSchema.set("toObject", { virtuals: true });

// ============================================
// PRE-SAVE HOOKS
// ============================================

// Generate QR data and update status based on load
locationSchema.pre("save", function (next) {
  // Generate QR data
  this.qrData = JSON.stringify({
    locationCode: this.code,
    warehouseId: this.warehouseId.toString(),
    zone: this.zone,
    aisle: this.aisle,
    shelf: this.shelf,
    bin: this.bin,
    type: this.type,
    capacity: this.capacity,
  });

  // Auto-update status based on load
  if (this.isModified("currentLoad")) {
    if (this.currentLoad >= this.capacity) {
      this.status = "FULL";
    } else if (this.status === "FULL" && this.currentLoad < this.capacity) {
      this.status = "AVAILABLE";
    }
  }

  next();
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * Generate multiple locations for a warehouse
 * @param {ObjectId} warehouseId - Target warehouse
 * @param {String} warehouseCode - Warehouse code for location code generation
 * @param {Object} config - Generation config { zone, aisles, shelves, bins, type, capacity }
 */
locationSchema.statics.bulkGenerate = async function (warehouseId, warehouseCode, config) {
  const { zone, aisles, shelves, bins, type = "STORAGE", capacity = 100 } = config;

  const locations = [];
  const pad = (num, size) => String(num).padStart(size, "0");

  for (let a = 1; a <= aisles; a++) {
    for (let s = 1; s <= shelves; s++) {
      for (let b = 1; b <= bins; b++) {
        const code = `${warehouseCode}-${zone}-${pad(a, 2)}-${pad(s, 2)}-${pad(b, 2)}`;
        locations.push({
          warehouseId,
          code,
          zone,
          aisle: pad(a, 2),
          shelf: pad(s, 2),
          bin: pad(b, 2),
          type,
          capacity,
          status: "AVAILABLE",
          pickingPriority: a * 1000 + s * 10 + b, // Natural order priority
        });
      }
    }
  }

  // Use insertMany with ordered: false to continue on duplicates
  try {
    const result = await this.insertMany(locations, { ordered: false });
    return { created: result.length, locations: result };
  } catch (error) {
    // Handle duplicate key errors gracefully
    if (error.code === 11000) {
      const inserted = error.insertedDocs || [];
      return { created: inserted.length, locations: inserted, duplicates: true };
    }
    throw error;
  }
};

/**
 * Find optimal location for placing stock
 * Prioritizes: same SKU consolidation > available capacity > picking priority
 */
locationSchema.statics.findOptimalForPlacement = async function (
  warehouseId,
  variantId,
  quantity
) {
  const Inventory = mongoose.model("Inventory");

  // First, try to find locations that already have this SKU
  const existingInventory = await Inventory.find({
    variantId,
  }).populate({
    path: "locationId",
    match: {
      warehouseId,
      status: { $in: ["AVAILABLE", "FULL"] },
    },
  });

  // Filter locations with available capacity
  const consolidationCandidates = existingInventory
    .filter((inv) => inv.locationId && inv.locationId.availableCapacity >= quantity)
    .map((inv) => inv.locationId)
    .sort((a, b) => a.pickingPriority - b.pickingPriority);

  if (consolidationCandidates.length > 0) {
    return consolidationCandidates[0];
  }

  // If no consolidation possible, find empty/available location
  return this.findOne({
    warehouseId,
    status: "AVAILABLE",
    $expr: { $gte: [{ $subtract: ["$capacity", "$currentLoad"] }, quantity] },
  }).sort({ pickingPriority: 1 });
};

/**
 * Find locations for picking stock (FIFO order)
 */
locationSchema.statics.findForPicking = async function (warehouseId, variantId, quantity) {
  const Inventory = mongoose.model("Inventory");

  // Get inventory sorted by received date (FIFO)
  const inventory = await Inventory.find({ variantId })
    .populate({
      path: "locationId",
      match: {
        warehouseId,
        status: { $ne: "DISABLED" },
        type: { $in: ["PICKING", "STORAGE"] }, // Prioritize PICKING type
      },
    })
    .sort({ receivedAt: 1 });

  // Build picking list
  const pickingList = [];
  let remaining = quantity;

  // Sort by type (PICKING first) then by receivedAt
  const sortedInventory = inventory
    .filter((inv) => inv.locationId && inv.quantity > 0)
    .sort((a, b) => {
      if (a.locationId.type === "PICKING" && b.locationId.type !== "PICKING") return -1;
      if (a.locationId.type !== "PICKING" && b.locationId.type === "PICKING") return 1;
      return new Date(a.receivedAt) - new Date(b.receivedAt);
    });

  for (const inv of sortedInventory) {
    if (remaining <= 0) break;

    const pickQty = Math.min(remaining, inv.quantity);
    pickingList.push({
      locationId: inv.locationId._id,
      locationCode: inv.locationId.code,
      inventoryId: inv._id,
      availableQty: inv.quantity,
      pickQty,
      zone: inv.locationId.zone,
      aisle: inv.locationId.aisle,
      shelf: inv.locationId.shelf,
      bin: inv.locationId.bin,
    });
    remaining -= pickQty;
  }

  return {
    fulfilled: remaining <= 0,
    shortfall: Math.max(0, remaining),
    pickingList,
  };
};

const Location = mongoose.model("Location", locationSchema);

export default Location;
