/**
 * Procurement Routes
 * API endpoints for supplier and purchase order management.
 * Part of the Procurement module.
 */

import express from "express";
import {
  // Supplier endpoints
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,

  // Purchase Order endpoints
  getPurchaseOrders,
  getPendingPurchaseOrders,
  getOverduePurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  confirmPurchaseOrder,
  cancelPurchaseOrder,
  receiveGoods,
} from "../controllers/procurementController.js";

const router = express.Router();

// ============================================
// SUPPLIER ROUTES
// ============================================

router.get("/suppliers", getSuppliers);
router.get("/suppliers/:id", getSupplier);
router.post("/suppliers", createSupplier);
router.put("/suppliers/:id", updateSupplier);

// ============================================
// PURCHASE ORDER ROUTES
// ============================================

// List routes (put specific routes before :id)
router.get("/purchase-orders/pending", getPendingPurchaseOrders);
router.get("/purchase-orders/overdue", getOverduePurchaseOrders);
router.get("/purchase-orders", getPurchaseOrders);
router.get("/purchase-orders/:id", getPurchaseOrder);

// CRUD routes
router.post("/purchase-orders", createPurchaseOrder);
router.put("/purchase-orders/:id", updatePurchaseOrder);

// Action routes
router.patch("/purchase-orders/:id/confirm", confirmPurchaseOrder);
router.patch("/purchase-orders/:id/cancel", cancelPurchaseOrder);
router.post("/purchase-orders/:id/receive", receiveGoods);

export default router;
