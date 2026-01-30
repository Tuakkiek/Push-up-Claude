/**
 * WMS Routes
 * API endpoints for warehouse management system.
 * Part of the WMS module.
 */

import express from "express";
import {
  // Warehouse endpoints
  getWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  setDefaultWarehouse,
  getZonesSummary,
  generateLocations,

  // Location endpoints
  getLocations,
  getLocationByCode,
  getLocationWithInventory,
  updateLocation,
  setLocationStatus,

  // Inventory endpoints
  receiveStock,
  releaseStock,
  transferStock,
  adjustStock,
  getVariantStock,
  getMovements,
  findOptimalLocation,
  getPickingList,
} from "../controllers/wmsController.js";

const router = express.Router();

// ============================================
// WAREHOUSE ROUTES
// ============================================

// List all warehouses
router.get("/warehouses", getWarehouses);

// Get single warehouse
router.get("/warehouses/:id", getWarehouse);

// Create warehouse
router.post("/warehouses", createWarehouse);

// Update warehouse
router.put("/warehouses/:id", updateWarehouse);

// Set default warehouse
router.post("/warehouses/:id/set-default", setDefaultWarehouse);

// Get zones summary for a warehouse
router.get("/warehouses/:id/zones", getZonesSummary);

// Bulk generate locations for a warehouse
router.post("/warehouses/:id/locations/generate", generateLocations);

// ============================================
// LOCATION ROUTES
// ============================================

// List locations (requires warehouseId query param)
router.get("/locations", getLocations);

// Get location by code (QR scan)
router.get("/locations/code/:code", getLocationByCode);

// Get location with inventory
router.get("/locations/:id", getLocationWithInventory);

// Update location
router.put("/locations/:id", updateLocation);

// Set location status
router.post("/locations/:id/status", setLocationStatus);

// ============================================
// INVENTORY ROUTES
// ============================================

// Find optimal location for placement
router.get("/inventory/find-location", findOptimalLocation);

// Get picking list for order fulfillment
router.get("/inventory/picking-list", getPickingList);

// Get stock for a variant
router.get("/inventory/variant/:variantId", getVariantStock);

// Receive stock (inbound)
router.post("/inventory/receive", receiveStock);

// Release stock (outbound)
router.post("/inventory/release", releaseStock);

// Transfer stock between locations
router.post("/inventory/transfer", transferStock);

// Adjust stock (cycle count)
router.post("/inventory/adjust", adjustStock);

// ============================================
// MOVEMENT ROUTES
// ============================================

// Get stock movements
router.get("/movements", getMovements);

export default router;
