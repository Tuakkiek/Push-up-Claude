/**
 * WarehouseService
 * Service for warehouse and location management.
 * Part of the WMS module.
 */

import Warehouse from "../models/Warehouse.js";
import Location from "../models/Location.js";

class WarehouseService {
  // ============================================
  // WAREHOUSE OPERATIONS
  // ============================================

  /**
   * Create a new warehouse
   */
  async createWarehouse(data, userId) {
    const warehouse = new Warehouse({
      ...data,
      createdBy: userId,
    });

    await warehouse.save();

    // If this is the first warehouse, make it default
    const count = await Warehouse.countDocuments();
    if (count === 1) {
      warehouse.isDefault = true;
      await warehouse.save();
    }

    return warehouse;
  }

  /**
   * Get all warehouses
   */
  async getAllWarehouses(options = {}) {
    const { status, includeInactive = false } = options;

    const query = {};
    if (status) {
      query.status = status;
    } else if (!includeInactive) {
      query.status = "ACTIVE";
    }

    return Warehouse.find(query).sort({ isDefault: -1, name: 1 });
  }

  /**
   * Get warehouse by ID or code
   */
  async getWarehouse(identifier) {
    // Try by ID first
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      const byId = await Warehouse.findById(identifier);
      if (byId) return byId;
    }

    // Try by code
    return Warehouse.findOne({ code: identifier.toUpperCase() });
  }

  /**
   * Update warehouse
   */
  async updateWarehouse(warehouseId, data) {
    const warehouse = await Warehouse.findByIdAndUpdate(warehouseId, data, {
      new: true,
      runValidators: true,
    });

    if (!warehouse) {
      throw new Error("Warehouse not found");
    }

    return warehouse;
  }

  /**
   * Set warehouse as default
   */
  async setDefaultWarehouse(warehouseId) {
    return Warehouse.setAsDefault(warehouseId);
  }

  /**
   * Get default warehouse
   */
  async getDefaultWarehouse() {
    return Warehouse.getDefault();
  }

  // ============================================
  // LOCATION OPERATIONS
  // ============================================

  /**
   * Bulk generate locations for a warehouse
   */
  async generateLocations(warehouseId, config) {
    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      throw new Error("Warehouse not found");
    }

    const result = await Location.bulkGenerate(warehouseId, warehouse.code, config);

    // Recalculate warehouse capacity
    await warehouse.recalculateOccupancy();

    return {
      ...result,
      warehouse: warehouse.code,
      zone: config.zone,
    };
  }

  /**
   * Get locations by warehouse
   */
  async getLocationsByWarehouse(warehouseId, options = {}) {
    const { zone, type, status, limit = 100, skip = 0 } = options;

    const query = { warehouseId };
    if (zone) query.zone = zone.toUpperCase();
    if (type) query.type = type;
    if (status) query.status = status;

    const [locations, total] = await Promise.all([
      Location.find(query)
        .sort({ zone: 1, aisle: 1, shelf: 1, bin: 1 })
        .skip(skip)
        .limit(limit),
      Location.countDocuments(query),
    ]);

    return { locations, total, hasMore: skip + locations.length < total };
  }

  /**
   * Get location by code (for QR scanning)
   */
  async getLocationByCode(code) {
    return Location.findOne({ code: code.toUpperCase() }).populate(
      "warehouseId",
      "code name"
    );
  }

  /**
   * Get location details with inventory
   */
  async getLocationWithInventory(locationId) {
    const location = await Location.findById(locationId).populate(
      "warehouseId",
      "code name"
    );

    if (!location) {
      throw new Error("Location not found");
    }

    const Inventory = (await import("../models/Inventory.js")).default;
    const inventory = await Inventory.getByLocation(locationId);

    return {
      location,
      inventory,
      summary: {
        totalSkus: inventory.length,
        totalUnits: inventory.reduce((sum, inv) => sum + inv.quantity, 0),
        occupancy: location.occupancyPercentage,
      },
    };
  }

  /**
   * Update location
   */
  async updateLocation(locationId, data) {
    // Prevent updating critical fields directly
    const { warehouseId, code, zone, aisle, shelf, bin, ...updateData } = data;

    const location = await Location.findByIdAndUpdate(locationId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!location) {
      throw new Error("Location not found");
    }

    return location;
  }

  /**
   * Disable/Enable location
   */
  async setLocationStatus(locationId, status) {
    if (!["AVAILABLE", "DISABLED", "MAINTENANCE"].includes(status)) {
      throw new Error("Invalid status");
    }

    const location = await Location.findById(locationId);
    if (!location) {
      throw new Error("Location not found");
    }

    // Check if location has inventory before disabling
    if (status === "DISABLED" && location.currentLoad > 0) {
      throw new Error("Cannot disable location with inventory. Transfer stock first.");
    }

    location.status = status;
    await location.save();

    return location;
  }

  /**
   * Find optimal location for placing stock
   */
  async findOptimalLocation(warehouseId, variantId, quantity) {
    return Location.findOptimalForPlacement(warehouseId, variantId, quantity);
  }

  /**
   * Get picking locations for an order
   */
  async getPickingLocations(warehouseId, variantId, quantity) {
    return Location.findForPicking(warehouseId, variantId, quantity);
  }

  /**
   * Get warehouse zones summary
   */
  async getZonesSummary(warehouseId) {
    const zones = await Location.aggregate([
      { $match: { warehouseId: warehouseId } },
      {
        $group: {
          _id: "$zone",
          totalLocations: { $sum: 1 },
          totalCapacity: { $sum: "$capacity" },
          totalLoad: { $sum: "$currentLoad" },
          availableLocations: {
            $sum: { $cond: [{ $eq: ["$status", "AVAILABLE"] }, 1, 0] },
          },
          fullLocations: {
            $sum: { $cond: [{ $eq: ["$status", "FULL"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          zone: "$_id",
          totalLocations: 1,
          totalCapacity: 1,
          totalLoad: 1,
          availableLocations: 1,
          fullLocations: 1,
          occupancyPercentage: {
            $round: [{ $multiply: [{ $divide: ["$totalLoad", "$totalCapacity"] }, 100] }],
          },
        },
      },
      { $sort: { zone: 1 } },
    ]);

    return zones;
  }

  /**
   * Create a single location
   */
  async createLocation(data, userId) {
    const warehouse = await Warehouse.findById(data.warehouseId);
    if (!warehouse) {
      throw new Error("Warehouse not found");
    }

    // Auto-generate code if not provided
    if (!data.code) {
      data.code = `${warehouse.code}-${data.zone}-${data.aisle}-${data.shelf}-${data.bin}`;
    }

    const location = new Location({
      ...data,
      createdBy: userId,
    });

    await location.save();

    // Recalculate warehouse capacity
    await warehouse.recalculateOccupancy();

    return location;
  }
}

// Export singleton instance
export default new WarehouseService();
