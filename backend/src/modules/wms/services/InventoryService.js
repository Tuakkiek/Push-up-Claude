/**
 * InventoryService
 * Core service for all stock operations with MongoDB transaction support.
 * ALL stock modifications MUST go through this service.
 * Part of the WMS module.
 */

import mongoose from "mongoose";
import Inventory from "../models/Inventory.js";
import Location from "../models/Location.js";
import StockMovement from "../models/StockMovement.js";
import Variant from "../../catalog/models/Variant.js";

class InventoryService {
  /**
   * Receive stock into a location (Inbound from PO or manual)
   * @param {Object} params - Receiving parameters
   * @param {String} params.variantId - Variant to receive
   * @param {String} params.locationId - Target location
   * @param {Number} params.quantity - Quantity to receive
   * @param {String} params.userId - User performing the action
   * @param {Object} params.reference - Reference document info { type, id, number }
   * @param {Object} params.options - Optional: { lotNumber, unitCost, notes }
   */
  async receiveStock(params) {
    const {
      variantId,
      locationId,
      quantity,
      userId,
      reference = {},
      options = {},
    } = params;

    if (quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Validate variant exists
      const variant = await Variant.findById(variantId).session(session);
      if (!variant) {
        throw new Error(`Variant not found: ${variantId}`);
      }

      // Validate location exists and is available
      const location = await Location.findById(locationId).session(session);
      if (!location) {
        throw new Error(`Location not found: ${locationId}`);
      }
      if (location.status === "DISABLED") {
        throw new Error(`Location ${location.code} is disabled`);
      }

      // Check capacity
      if (location.currentLoad + quantity > location.capacity) {
        throw new Error(
          `Insufficient capacity at ${location.code}. Available: ${location.availableCapacity}, Required: ${quantity}`
        );
      }

      // Find or create inventory record
      let inventory = await Inventory.findOne({
        variantId,
        locationId,
      }).session(session);

      const previousQuantity = inventory ? inventory.quantity : 0;

      if (inventory) {
        inventory.quantity += quantity;
        if (options.lotNumber) inventory.lotNumber = options.lotNumber;
        if (options.unitCost) inventory.unitCost = options.unitCost;
        await inventory.save({ session });
      } else {
        inventory = await Inventory.create(
          [
            {
              variantId,
              locationId,
              quantity,
              lotNumber: options.lotNumber,
              unitCost: options.unitCost,
              receivedAt: new Date(),
            },
          ],
          { session }
        );
        inventory = inventory[0];
      }

      // Update location currentLoad
      location.currentLoad += quantity;
      await location.save({ session });

      // Create stock movement record
      await StockMovement.createInbound(
        {
          variantId,
          sku: variant.sku,
          locationId,
          locationCode: location.code,
          quantity,
          referenceType: reference.type || "MANUAL",
          referenceId: reference.id,
          referenceNumber: reference.number,
          performedBy: userId,
          previousQuantity,
          newQuantity: inventory.quantity,
          unitCost: options.unitCost,
          lotNumber: options.lotNumber,
          notes: options.notes,
        },
        session
      );

      // Recalculate variant totalStock
      await Variant.recalculateTotalStock(variantId, session);

      await session.commitTransaction();

      return {
        success: true,
        inventory,
        variant: await Variant.findById(variantId),
        location,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Release stock (Outbound for order fulfillment)
   * @param {Object} params - Release parameters
   * @param {String} params.variantId - Variant to release
   * @param {Number} params.quantity - Quantity to release
   * @param {String} params.userId - User performing the action
   * @param {Object} params.reference - Reference document info { type, id, number }
   * @param {String} params.locationId - Optional specific location (otherwise uses FIFO)
   */
  async releaseStock(params) {
    const { variantId, quantity, userId, reference = {}, locationId, notes } = params;

    if (quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const variant = await Variant.findById(variantId).session(session);
      if (!variant) {
        throw new Error(`Variant not found: ${variantId}`);
      }

      // Check total available stock
      const stockInfo = await Inventory.getTotalStock(variantId);
      if (stockInfo.availableQuantity < quantity) {
        throw new Error(
          `Insufficient stock for ${variant.sku}. Available: ${stockInfo.availableQuantity}, Required: ${quantity}`
        );
      }

      let remaining = quantity;
      const movements = [];

      // If specific location provided, release from there only
      if (locationId) {
        const inventory = await Inventory.findOne({
          variantId,
          locationId,
        }).session(session);

        if (!inventory || inventory.availableQuantity < quantity) {
          throw new Error(`Insufficient stock at specified location`);
        }

        const location = await Location.findById(locationId).session(session);
        const previousQuantity = inventory.quantity;

        inventory.quantity -= quantity;
        await inventory.save({ session });

        location.currentLoad -= quantity;
        await location.save({ session });

        movements.push({
          variantId,
          sku: variant.sku,
          locationId,
          locationCode: location.code,
          quantity,
          previousQuantity,
          newQuantity: inventory.quantity,
        });

        remaining = 0;
      } else {
        // FIFO: Release from oldest stock first
        const inventories = await Inventory.find({
          variantId,
          quantity: { $gt: 0 },
        })
          .populate("locationId")
          .sort({ receivedAt: 1 })
          .session(session);

        for (const inv of inventories) {
          if (remaining <= 0) break;

          const available = inv.quantity - inv.reservedQuantity;
          const toRelease = Math.min(remaining, available);

          const previousQuantity = inv.quantity;
          inv.quantity -= toRelease;
          await inv.save({ session });

          inv.locationId.currentLoad -= toRelease;
          await inv.locationId.save({ session });

          movements.push({
            variantId,
            sku: variant.sku,
            locationId: inv.locationId._id,
            locationCode: inv.locationId.code,
            quantity: toRelease,
            previousQuantity,
            newQuantity: inv.quantity,
          });

          remaining -= toRelease;
        }
      }

      // Create stock movement records
      for (const movement of movements) {
        await StockMovement.createOutbound(
          {
            ...movement,
            referenceType: reference.type || "SALES_ORDER",
            referenceId: reference.id,
            referenceNumber: reference.number,
            performedBy: userId,
            notes,
          },
          session
        );
      }

      // Recalculate variant totalStock
      await Variant.recalculateTotalStock(variantId, session);

      await session.commitTransaction();

      return {
        success: true,
        released: quantity,
        movements,
        variant: await Variant.findById(variantId),
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Transfer stock between locations
   * @param {Object} params - Transfer parameters
   */
  async transferStock(params) {
    const {
      variantId,
      fromLocationId,
      toLocationId,
      quantity,
      userId,
      reference = {},
      notes,
    } = params;

    if (quantity <= 0) {
      throw new Error("Quantity must be positive");
    }

    if (fromLocationId.toString() === toLocationId.toString()) {
      throw new Error("Source and destination locations must be different");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const variant = await Variant.findById(variantId).session(session);
      if (!variant) {
        throw new Error(`Variant not found: ${variantId}`);
      }

      // Get source inventory
      const sourceInventory = await Inventory.findOne({
        variantId,
        locationId: fromLocationId,
      }).session(session);

      if (!sourceInventory || sourceInventory.availableQuantity < quantity) {
        throw new Error("Insufficient stock at source location");
      }

      const fromLocation = await Location.findById(fromLocationId).session(session);
      const toLocation = await Location.findById(toLocationId).session(session);

      if (!fromLocation || !toLocation) {
        throw new Error("Invalid location(s)");
      }

      // Check destination capacity
      if (toLocation.currentLoad + quantity > toLocation.capacity) {
        throw new Error(
          `Insufficient capacity at destination. Available: ${toLocation.availableCapacity}`
        );
      }

      // Deduct from source
      sourceInventory.quantity -= quantity;
      await sourceInventory.save({ session });

      fromLocation.currentLoad -= quantity;
      await fromLocation.save({ session });

      // Add to destination
      let destInventory = await Inventory.findOne({
        variantId,
        locationId: toLocationId,
      }).session(session);

      if (destInventory) {
        destInventory.quantity += quantity;
        await destInventory.save({ session });
      } else {
        destInventory = await Inventory.create(
          [
            {
              variantId,
              locationId: toLocationId,
              quantity,
              receivedAt: new Date(),
            },
          ],
          { session }
        );
      }

      toLocation.currentLoad += quantity;
      await toLocation.save({ session });

      // Create transfer movement
      await StockMovement.createTransfer(
        {
          variantId,
          sku: variant.sku,
          fromLocationId,
          fromLocationCode: fromLocation.code,
          toLocationId,
          toLocationCode: toLocation.code,
          quantity,
          referenceType: reference.type || "TRANSFER_ORDER",
          referenceId: reference.id,
          referenceNumber: reference.number,
          performedBy: userId,
          notes,
        },
        session
      );

      // totalStock doesn't change for transfers, but we recalculate anyway for consistency
      await Variant.recalculateTotalStock(variantId, session);

      await session.commitTransaction();

      return {
        success: true,
        transferred: quantity,
        fromLocation: fromLocation.code,
        toLocation: toLocation.code,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Adjust stock (cycle count / inventory correction)
   * @param {Object} params - Adjustment parameters
   */
  async adjustStock(params) {
    const { variantId, locationId, newQuantity, userId, reason, reference = {}, notes } =
      params;

    if (newQuantity < 0) {
      throw new Error("New quantity cannot be negative");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const variant = await Variant.findById(variantId).session(session);
      if (!variant) {
        throw new Error(`Variant not found: ${variantId}`);
      }

      const location = await Location.findById(locationId).session(session);
      if (!location) {
        throw new Error(`Location not found: ${locationId}`);
      }

      let inventory = await Inventory.findOne({
        variantId,
        locationId,
      }).session(session);

      const previousQuantity = inventory ? inventory.quantity : 0;
      const difference = newQuantity - previousQuantity;

      if (difference === 0) {
        await session.abortTransaction();
        return { success: true, adjusted: false, message: "No adjustment needed" };
      }

      if (inventory) {
        inventory.quantity = newQuantity;
        inventory.lastCountedAt = new Date();
        inventory.lastCountedBy = userId;
        await inventory.save({ session });
      } else if (newQuantity > 0) {
        inventory = await Inventory.create(
          [
            {
              variantId,
              locationId,
              quantity: newQuantity,
              lastCountedAt: new Date(),
              lastCountedBy: userId,
            },
          ],
          { session }
        );
      }

      // Update location load
      location.currentLoad = Math.max(0, location.currentLoad + difference);
      await location.save({ session });

      // Create adjustment movement
      await StockMovement.createAdjustment(
        {
          variantId,
          sku: variant.sku,
          locationId,
          locationCode: location.code,
          quantity: difference,
          previousQuantity,
          newQuantity,
          referenceType: reference.type || "INVENTORY_COUNT",
          referenceId: reference.id,
          referenceNumber: reference.number,
          performedBy: userId,
          reason,
          notes,
        },
        session
      );

      // Recalculate totalStock
      await Variant.recalculateTotalStock(variantId, session);

      await session.commitTransaction();

      return {
        success: true,
        adjusted: true,
        previousQuantity,
        newQuantity,
        difference,
        variant: await Variant.findById(variantId),
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Reserve stock for an order
   */
  async reserveStock(params) {
    const { variantId, quantity, userId, reference = {} } = params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const result = await Inventory.reserveStock(variantId, quantity, session);

      if (!result.success) {
        throw new Error(`Cannot reserve ${quantity} units. Shortfall: ${result.shortfall}`);
      }

      await Variant.recalculateTotalStock(variantId, session);

      await session.commitTransaction();

      return { success: true, reserved: quantity };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Release reservation (order cancelled)
   */
  async releaseReservation(params) {
    const { variantId, quantity, userId } = params;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Inventory.releaseReservation(variantId, quantity, session);
      await Variant.recalculateTotalStock(variantId, session);

      await session.commitTransaction();

      return { success: true, released: quantity };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get stock summary for a variant
   */
  async getVariantStock(variantId) {
    const [variant, inventories, stockInfo] = await Promise.all([
      Variant.findById(variantId).populate("productId", "name slug brand"),
      Inventory.getByVariant(variantId),
      Inventory.getTotalStock(variantId),
    ]);

    if (!variant) {
      throw new Error(`Variant not found: ${variantId}`);
    }

    return {
      variant: {
        _id: variant._id,
        sku: variant.sku,
        productName: variant.productId?.name,
        attributes: variant.attributes,
        totalStock: variant.totalStock,
        reservedStock: variant.reservedStock,
        availableStock: variant.availableStock,
      },
      calculated: stockInfo,
      locations: inventories.map((inv) => ({
        locationId: inv.locationId._id,
        locationCode: inv.locationId.code,
        warehouseCode: inv.locationId.warehouseId?.code,
        quantity: inv.quantity,
        reserved: inv.reservedQuantity,
        available: inv.availableQuantity,
        receivedAt: inv.receivedAt,
      })),
    };
  }

  /**
   * Get movement history for a variant
   */
  async getMovementHistory(variantId, options = {}) {
    return StockMovement.getVariantHistory(variantId, options);
  }
}

// Export singleton instance
export default new InventoryService();
