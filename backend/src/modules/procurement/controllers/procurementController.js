/**
 * Procurement Controller
 * Handles HTTP requests for supplier and purchase order operations.
 * Part of the Procurement module.
 */

import ProcurementService from "../services/ProcurementService.js";

// ============================================
// SUPPLIER ENDPOINTS
// ============================================

/**
 * GET /api/procurement/suppliers
 */
export const getSuppliers = async (req, res) => {
  try {
    const { status, search, limit, skip } = req.query;
    const result = await ProcurementService.getAllSuppliers({
      status,
      search,
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
    });

    res.json({
      success: true,
      data: result.suppliers,
      total: result.total,
    });
  } catch (error) {
    console.error("Get suppliers error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/procurement/suppliers/:id
 */
export const getSupplier = async (req, res) => {
  try {
    const supplier = await ProcurementService.getSupplier(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    res.json({ success: true, data: supplier });
  } catch (error) {
    console.error("Get supplier error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/procurement/suppliers
 */
export const createSupplier = async (req, res) => {
  try {
    const supplier = await ProcurementService.createSupplier(req.body, req.user._id);

    res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      data: supplier,
    });
  } catch (error) {
    console.error("Create supplier error:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Supplier code already exists",
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/procurement/suppliers/:id
 */
export const updateSupplier = async (req, res) => {
  try {
    const supplier = await ProcurementService.updateSupplier(req.params.id, req.body);

    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    res.json({
      success: true,
      message: "Supplier updated successfully",
      data: supplier,
    });
  } catch (error) {
    console.error("Update supplier error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// PURCHASE ORDER ENDPOINTS
// ============================================

/**
 * GET /api/procurement/purchase-orders
 */
export const getPurchaseOrders = async (req, res) => {
  try {
    const { status, supplierId, warehouseId, limit, skip } = req.query;
    const result = await ProcurementService.getPurchaseOrders({
      status,
      supplierId,
      warehouseId,
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0,
    });

    res.json({
      success: true,
      data: result.orders,
      total: result.total,
    });
  } catch (error) {
    console.error("Get purchase orders error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/procurement/purchase-orders/pending
 */
export const getPendingPurchaseOrders = async (req, res) => {
  try {
    const { warehouseId } = req.query;
    const orders = await ProcurementService.getPendingPurchaseOrders(warehouseId);

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error("Get pending POs error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/procurement/purchase-orders/overdue
 */
export const getOverduePurchaseOrders = async (req, res) => {
  try {
    const orders = await ProcurementService.getOverduePurchaseOrders();

    res.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    console.error("Get overdue POs error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/procurement/purchase-orders/:id
 */
export const getPurchaseOrder = async (req, res) => {
  try {
    const po = await ProcurementService.getPurchaseOrder(req.params.id);

    if (!po) {
      return res.status(404).json({ success: false, message: "Purchase order not found" });
    }

    res.json({
      success: true,
      data: po,
      receivingSummary: po.getReceivingSummary(),
    });
  } catch (error) {
    console.error("Get purchase order error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/procurement/purchase-orders
 */
export const createPurchaseOrder = async (req, res) => {
  try {
    const po = await ProcurementService.createPurchaseOrder(req.body, req.user._id);

    res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      data: po,
    });
  } catch (error) {
    console.error("Create purchase order error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/procurement/purchase-orders/:id
 */
export const updatePurchaseOrder = async (req, res) => {
  try {
    const po = await ProcurementService.updatePurchaseOrder(
      req.params.id,
      req.body,
      req.user._id
    );

    res.json({
      success: true,
      message: "Purchase order updated successfully",
      data: po,
    });
  } catch (error) {
    console.error("Update purchase order error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/procurement/purchase-orders/:id/confirm
 */
export const confirmPurchaseOrder = async (req, res) => {
  try {
    const po = await ProcurementService.confirmPurchaseOrder(req.params.id, req.user._id);

    res.json({
      success: true,
      message: `Purchase order ${po.poNumber} confirmed`,
      data: po,
    });
  } catch (error) {
    console.error("Confirm purchase order error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/procurement/purchase-orders/:id/cancel
 */
export const cancelPurchaseOrder = async (req, res) => {
  try {
    const { reason } = req.body;
    const po = await ProcurementService.cancelPurchaseOrder(
      req.params.id,
      req.user._id,
      reason
    );

    res.json({
      success: true,
      message: `Purchase order ${po.poNumber} cancelled`,
      data: po,
    });
  } catch (error) {
    console.error("Cancel purchase order error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/procurement/purchase-orders/:id/receive
 * Goods Receiving Note (GRN) - receive goods from supplier
 */
export const receiveGoods = async (req, res) => {
  try {
    const { locationId, items, notes } = req.body;

    if (!locationId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "locationId and items array are required",
      });
    }

    const result = await ProcurementService.receiveGoods(
      req.params.id,
      {
        locationId,
        items,
        notes,
        receivedByName: req.user.fullName || req.user.username,
      },
      req.user._id
    );

    res.json({
      success: true,
      message: `Goods received successfully. GRN: ${result.grnNumber}`,
      data: result,
    });
  } catch (error) {
    console.error("Receive goods error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
