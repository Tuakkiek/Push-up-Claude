/**
 * WMS Controller
 * Handles HTTP requests for warehouse and inventory operations.
 * Part of the WMS module.
 */

import WarehouseService from "../services/WarehouseService.js";
import InventoryService from "../services/InventoryService.js";
import Warehouse from "../models/Warehouse.js";
import Location from "../models/Location.js";
import Inventory from "../models/Inventory.js";
import StockMovement from "../models/StockMovement.js";

// ============================================
// WAREHOUSE ENDPOINTS
// ============================================

/**
 * GET /api/wms/warehouses
 * List all warehouses
 */
export const getWarehouses = async (req, res) => {
  try {
    const { status, includeInactive } = req.query;
    const warehouses = await WarehouseService.getAllWarehouses({
      status,
      includeInactive: includeInactive === "true",
    });

    res.json({
      success: true,
      data: warehouses,
      count: warehouses.length,
    });
  } catch (error) {
    console.error("Get warehouses error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/wms/warehouses/:id
 * Get single warehouse
 */
export const getWarehouse = async (req, res) => {
  try {
    const warehouse = await WarehouseService.getWarehouse(req.params.id);

    if (!warehouse) {
      return res.status(404).json({ success: false, message: "Warehouse not found" });
    }

    res.json({ success: true, data: warehouse });
  } catch (error) {
    console.error("Get warehouse error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/wms/warehouses
 * Create warehouse
 */
export const createWarehouse = async (req, res) => {
  try {
    const warehouse = await WarehouseService.createWarehouse(req.body, req.user._id);

    res.status(201).json({
      success: true,
      message: "Warehouse created successfully",
      data: warehouse,
    });
  } catch (error) {
    console.error("Create warehouse error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Warehouse code already exists",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/wms/warehouses/:id
 * Update warehouse
 */
export const updateWarehouse = async (req, res) => {
  try {
    const warehouse = await WarehouseService.updateWarehouse(req.params.id, req.body);

    res.json({
      success: true,
      message: "Warehouse updated successfully",
      data: warehouse,
    });
  } catch (error) {
    console.error("Update warehouse error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/wms/warehouses/:id/set-default
 * Set warehouse as default
 */
export const setDefaultWarehouse = async (req, res) => {
  try {
    const warehouse = await WarehouseService.setDefaultWarehouse(req.params.id);

    res.json({
      success: true,
      message: "Default warehouse updated",
      data: warehouse,
    });
  } catch (error) {
    console.error("Set default warehouse error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// LOCATION ENDPOINTS
// ============================================

/**
 * POST /api/wms/warehouses/:id/locations/generate
 * Bulk generate locations for a warehouse
 */
export const generateLocations = async (req, res) => {
  try {
    const { zone, aisles, shelves, bins, type, capacity } = req.body;

    if (!zone || !aisles || !shelves || !bins) {
      return res.status(400).json({
        success: false,
        message: "zone, aisles, shelves, and bins are required",
      });
    }

    const result = await WarehouseService.generateLocations(req.params.id, {
      zone: zone.toUpperCase(),
      aisles: parseInt(aisles),
      shelves: parseInt(shelves),
      bins: parseInt(bins),
      type: type || "STORAGE",
      capacity: parseInt(capacity) || 100,
    });

    res.status(201).json({
      success: true,
      message: `Generated ${result.created} locations in zone ${zone}`,
      data: result,
    });
  } catch (error) {
    console.error("Generate locations error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/wms/locations
 * List locations with filtering
 */
export const getLocations = async (req, res) => {
  try {
    const { warehouseId, zone, type, status, limit, skip } = req.query;

    if (!warehouseId) {
      return res.status(400).json({
        success: false,
        message: "warehouseId is required",
      });
    }

    const result = await WarehouseService.getLocationsByWarehouse(warehouseId, {
      zone,
      type,
      status,
      limit: parseInt(limit) || 100,
      skip: parseInt(skip) || 0,
    });

    res.json({
      success: true,
      data: result.locations,
      total: result.total,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error("Get locations error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/wms/locations/code/:code
 * Get location by code (QR scan)
 */
export const getLocationByCode = async (req, res) => {
  try {
    const location = await WarehouseService.getLocationByCode(req.params.code);

    if (!location) {
      return res.status(404).json({ success: false, message: "Location not found" });
    }

    res.json({ success: true, data: location });
  } catch (error) {
    console.error("Get location by code error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/wms/locations/:id
 * Get location with inventory
 */
export const getLocationWithInventory = async (req, res) => {
  try {
    const result = await WarehouseService.getLocationWithInventory(req.params.id);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Get location with inventory error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/wms/locations/:id
 * Update location
 */
export const updateLocation = async (req, res) => {
  try {
    const location = await WarehouseService.updateLocation(req.params.id, req.body);

    res.json({
      success: true,
      message: "Location updated successfully",
      data: location,
    });
  } catch (error) {
    console.error("Update location error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/wms/locations/:id/status
 * Set location status
 */
export const setLocationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const location = await WarehouseService.setLocationStatus(req.params.id, status);

    res.json({
      success: true,
      message: `Location status set to ${status}`,
      data: location,
    });
  } catch (error) {
    console.error("Set location status error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/wms/warehouses/:id/zones
 * Get zones summary for a warehouse
 */
export const getZonesSummary = async (req, res) => {
  try {
    const mongoose = await import("mongoose");
    const warehouseId = new mongoose.default.Types.ObjectId(req.params.id);
    const zones = await WarehouseService.getZonesSummary(warehouseId);

    res.json({ success: true, data: zones });
  } catch (error) {
    console.error("Get zones summary error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// INVENTORY ENDPOINTS
// ============================================

/**
 * POST /api/wms/inventory/receive
 * Receive stock into a location
 */
export const receiveStock = async (req, res) => {
  try {
    const { variantId, locationId, quantity, referenceType, referenceId, referenceNumber, lotNumber, unitCost, notes } =
      req.body;

    if (!variantId || !locationId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "variantId, locationId, and quantity are required",
      });
    }

    const result = await InventoryService.receiveStock({
      variantId,
      locationId,
      quantity: parseInt(quantity),
      userId: req.user._id,
      reference: {
        type: referenceType,
        id: referenceId,
        number: referenceNumber,
      },
      options: { lotNumber, unitCost, notes },
    });

    res.json({
      success: true,
      message: `Received ${quantity} units successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Receive stock error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/wms/inventory/release
 * Release stock (outbound)
 */
export const releaseStock = async (req, res) => {
  try {
    const { variantId, quantity, locationId, referenceType, referenceId, referenceNumber, notes } = req.body;

    if (!variantId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "variantId and quantity are required",
      });
    }

    const result = await InventoryService.releaseStock({
      variantId,
      quantity: parseInt(quantity),
      locationId,
      userId: req.user._id,
      reference: {
        type: referenceType,
        id: referenceId,
        number: referenceNumber,
      },
      notes,
    });

    res.json({
      success: true,
      message: `Released ${quantity} units successfully`,
      data: result,
    });
  } catch (error) {
    console.error("Release stock error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/wms/inventory/transfer
 * Transfer stock between locations
 */
export const transferStock = async (req, res) => {
  try {
    const { variantId, fromLocationId, toLocationId, quantity, notes } = req.body;

    if (!variantId || !fromLocationId || !toLocationId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "variantId, fromLocationId, toLocationId, and quantity are required",
      });
    }

    const result = await InventoryService.transferStock({
      variantId,
      fromLocationId,
      toLocationId,
      quantity: parseInt(quantity),
      userId: req.user._id,
      notes,
    });

    res.json({
      success: true,
      message: `Transferred ${quantity} units from ${result.fromLocation} to ${result.toLocation}`,
      data: result,
    });
  } catch (error) {
    console.error("Transfer stock error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/wms/inventory/adjust
 * Adjust stock (cycle count correction)
 */
export const adjustStock = async (req, res) => {
  try {
    const { variantId, locationId, newQuantity, reason, notes } = req.body;

    if (!variantId || !locationId || newQuantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "variantId, locationId, and newQuantity are required",
      });
    }

    const result = await InventoryService.adjustStock({
      variantId,
      locationId,
      newQuantity: parseInt(newQuantity),
      userId: req.user._id,
      reason,
      notes,
    });

    res.json({
      success: true,
      message: result.adjusted
        ? `Adjusted stock: ${result.previousQuantity} → ${result.newQuantity}`
        : "No adjustment needed",
      data: result,
    });
  } catch (error) {
    console.error("Adjust stock error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/wms/inventory/variant/:variantId
 * Get stock summary for a variant
 */
export const getVariantStock = async (req, res) => {
  try {
    const result = await InventoryService.getVariantStock(req.params.variantId);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Get variant stock error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/wms/movements
 * Get stock movement history
 */
export const getMovements = async (req, res) => {
  try {
    const { variantId, type, startDate, endDate, limit, skip } = req.query;

    if (!variantId) {
      // Get general movement summary
      const summary = await StockMovement.getSummary({
        startDate,
        endDate,
      });

      return res.json({ success: true, data: { summary } });
    }

    const movements = await InventoryService.getMovementHistory(variantId, {
      type,
      startDate,
      endDate,
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
    });

    res.json({
      success: true,
      data: movements,
      count: movements.length,
    });
  } catch (error) {
    console.error("Get movements error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/wms/inventory/find-location
 * Find optimal location for placement
 */
export const findOptimalLocation = async (req, res) => {
  try {
    const { warehouseId, variantId, quantity } = req.query;

    if (!warehouseId || !variantId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "warehouseId, variantId, and quantity are required",
      });
    }

    const location = await WarehouseService.findOptimalLocation(
      warehouseId,
      variantId,
      parseInt(quantity)
    );

    res.json({
      success: true,
      data: location,
      found: !!location,
    });
  } catch (error) {
    console.error("Find optimal location error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/wms/inventory/picking-list
 * Get picking list for a variant
 */
export const getPickingList = async (req, res) => {
  try {
    const { warehouseId, variantId, quantity } = req.query;

    if (!warehouseId || !variantId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "warehouseId, variantId, and quantity are required",
      });
    }

    const result = await WarehouseService.getPickingLocations(
      warehouseId,
      variantId,
      parseInt(quantity)
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Get picking list error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
