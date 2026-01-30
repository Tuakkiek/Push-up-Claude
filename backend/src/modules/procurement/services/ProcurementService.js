/**
 * ProcurementService
 * Service for supplier and purchase order management.
 * Part of the Procurement module.
 */

import mongoose from "mongoose";
import Supplier from "../models/Supplier.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import InventoryService from "../../wms/services/InventoryService.js";
import Variant from "../../catalog/models/Variant.js";

class ProcurementService {
  // ============================================
  // SUPPLIER OPERATIONS
  // ============================================

  /**
   * Create a new supplier
   */
  async createSupplier(data, userId) {
    const supplier = new Supplier({
      ...data,
      createdBy: userId,
    });

    await supplier.save();
    return supplier;
  }

  /**
   * Get all suppliers
   */
  async getAllSuppliers(options = {}) {
    const { status, search, limit = 50, skip = 0 } = options;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      Supplier.find(query).sort({ name: 1 }).skip(skip).limit(limit),
      Supplier.countDocuments(query),
    ]);

    return { suppliers, total };
  }

  /**
   * Get supplier by ID or code
   */
  async getSupplier(identifier) {
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      const byId = await Supplier.findById(identifier);
      if (byId) return byId;
    }
    return Supplier.findOne({ code: identifier.toUpperCase() });
  }

  /**
   * Update supplier
   */
  async updateSupplier(supplierId, data) {
    return Supplier.findByIdAndUpdate(supplierId, data, {
      new: true,
      runValidators: true,
    });
  }

  // ============================================
  // PURCHASE ORDER OPERATIONS
  // ============================================

  /**
   * Create a new purchase order
   */
  async createPurchaseOrder(data, userId) {
    // Validate supplier
    const supplier = await Supplier.findById(data.supplierId);
    if (!supplier) {
      throw new Error("Supplier not found");
    }

    // Validate and enrich items
    const enrichedItems = await Promise.all(
      data.items.map(async (item) => {
        const variant = await Variant.findById(item.variantId).populate("productId", "name");
        if (!variant) {
          throw new Error(`Variant not found: ${item.variantId}`);
        }

        const totalPrice = item.quantityOrdered * item.unitPrice;

        return {
          variantId: variant._id,
          sku: variant.sku,
          productName: variant.productId?.name || "Unknown Product",
          variantDescription: variant.displayName,
          quantityOrdered: item.quantityOrdered,
          quantityReceived: 0,
          unitPrice: item.unitPrice,
          totalPrice,
          receivingStatus: "PENDING",
          notes: item.notes,
        };
      })
    );

    const subtotal = enrichedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const po = new PurchaseOrder({
      supplierId: supplier._id,
      supplierName: supplier.name,
      warehouseId: data.warehouseId,
      items: enrichedItems,
      expectedDate: data.expectedDate,
      subtotal,
      taxAmount: data.taxAmount || 0,
      shippingCost: data.shippingCost || 0,
      totalAmount: subtotal + (data.taxAmount || 0) + (data.shippingCost || 0),
      paymentTerms: supplier.paymentTerms,
      notes: data.notes,
      internalNotes: data.internalNotes,
      createdBy: userId,
      status: "DRAFT",
    });

    await po.save();
    return po;
  }

  /**
   * Get purchase orders with filtering
   */
  async getPurchaseOrders(options = {}) {
    const { status, supplierId, warehouseId, limit = 50, skip = 0 } = options;

    const query = {};
    if (status) query.status = status;
    if (supplierId) query.supplierId = supplierId;
    if (warehouseId) query.warehouseId = warehouseId;

    const [orders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate("supplierId", "code name")
        .populate("warehouseId", "code name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PurchaseOrder.countDocuments(query),
    ]);

    return { orders, total };
  }

  /**
   * Get single PO by ID or PO number
   */
  async getPurchaseOrder(identifier) {
    let po;
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      po = await PurchaseOrder.findById(identifier);
    }
    if (!po) {
      po = await PurchaseOrder.findOne({ poNumber: identifier.toUpperCase() });
    }

    if (po) {
      await po.populate("supplierId", "code name contact");
      await po.populate("warehouseId", "code name");
      await po.populate("createdBy", "username fullName");
    }

    return po;
  }

  /**
   * Update PO (only allowed in DRAFT status)
   */
  async updatePurchaseOrder(poId, data, userId) {
    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      throw new Error("Purchase order not found");
    }

    if (po.status !== "DRAFT") {
      throw new Error("Can only update PO in DRAFT status");
    }

    // Update allowed fields
    if (data.items) {
      const enrichedItems = await Promise.all(
        data.items.map(async (item) => {
          const variant = await Variant.findById(item.variantId).populate("productId", "name");
          if (!variant) {
            throw new Error(`Variant not found: ${item.variantId}`);
          }

          return {
            variantId: variant._id,
            sku: variant.sku,
            productName: variant.productId?.name || "Unknown Product",
            variantDescription: variant.displayName,
            quantityOrdered: item.quantityOrdered,
            quantityReceived: 0,
            unitPrice: item.unitPrice,
            totalPrice: item.quantityOrdered * item.unitPrice,
            receivingStatus: "PENDING",
            notes: item.notes,
          };
        })
      );
      po.items = enrichedItems;
    }

    if (data.expectedDate) po.expectedDate = data.expectedDate;
    if (data.taxAmount !== undefined) po.taxAmount = data.taxAmount;
    if (data.shippingCost !== undefined) po.shippingCost = data.shippingCost;
    if (data.notes) po.notes = data.notes;
    if (data.internalNotes) po.internalNotes = data.internalNotes;

    await po.save();
    return po;
  }

  /**
   * Confirm PO
   */
  async confirmPurchaseOrder(poId, userId) {
    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      throw new Error("Purchase order not found");
    }

    return po.confirm(userId);
  }

  /**
   * Cancel PO
   */
  async cancelPurchaseOrder(poId, userId, reason) {
    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      throw new Error("Purchase order not found");
    }

    return po.cancel(userId, reason);
  }

  /**
   * Receive goods for a PO (GRN)
   * This is the core goods receiving workflow
   */
  async receiveGoods(poId, receivingData, userId) {
    const po = await PurchaseOrder.findById(poId);
    if (!po) {
      throw new Error("Purchase order not found");
    }

    if (!["CONFIRMED", "PARTIAL"].includes(po.status)) {
      throw new Error(`Cannot receive goods for PO in ${po.status} status`);
    }

    const { locationId, items, notes, receivedByName } = receivingData;

    // Validate items array
    if (!items || items.length === 0) {
      throw new Error("Items array is required");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const grnNumber = po.generateGrnNumber();
      const grnItems = [];

      // Process each item
      for (const receivingItem of items) {
        const { variantId, quantityReceived } = receivingItem;

        // Find the PO item
        const poItem = po.items.find(
          (item) => item.variantId.toString() === variantId.toString()
        );

        if (!poItem) {
          throw new Error(`Variant ${variantId} not found in PO`);
        }

        const pendingQty = poItem.quantityOrdered - poItem.quantityReceived;
        if (quantityReceived > pendingQty) {
          throw new Error(
            `Cannot receive ${quantityReceived} for ${poItem.sku}. Pending: ${pendingQty}`
          );
        }

        // Receive stock via WMS
        await InventoryService.receiveStock({
          variantId,
          locationId,
          quantity: quantityReceived,
          userId,
          reference: {
            type: "PURCHASE_ORDER",
            id: po._id,
            number: po.poNumber,
          },
          options: {
            unitCost: poItem.unitPrice,
            notes: `GRN: ${grnNumber}`,
          },
        });

        // Update PO item
        poItem.quantityReceived += quantityReceived;

        grnItems.push({
          variantId,
          sku: poItem.sku,
          quantityReceived,
          notes: receivingItem.notes,
        });
      }

      // Get location details
      const Location = (await import("../../wms/models/Location.js")).default;
      const location = await Location.findById(locationId).session(session);

      // Add GRN record
      po.goodsReceipts.push({
        grnNumber,
        receivedAt: new Date(),
        receivedBy: userId,
        receivedByName,
        locationId,
        locationCode: location?.code,
        items: grnItems,
        notes,
      });

      await po.save({ session });

      await session.commitTransaction();

      return {
        success: true,
        grnNumber,
        receivedItems: grnItems,
        poStatus: po.status,
        receivingSummary: po.getReceivingSummary(),
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get pending POs for receiving
   */
  async getPendingPurchaseOrders(warehouseId) {
    return PurchaseOrder.getPending(warehouseId);
  }

  /**
   * Get overdue POs
   */
  async getOverduePurchaseOrders() {
    return PurchaseOrder.getOverdue();
  }
}

// Export singleton instance
export default new ProcurementService();
