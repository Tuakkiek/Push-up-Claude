// ============================================
// FILE: backend/src/services/orderCleanupService.js
// Auto-cancel expired VNPay orders after 15 minutes (Unified)
// ============================================

import Order from "../models/Order.js";
import mongoose from "mongoose";
import Product from "../../catalog/models/Product.js";

export const cancelExpiredVNPayOrders = async () => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const expiredOrders = await Order.find({
      paymentMethod: "VNPAY",
      status: "PENDING_PAYMENT",
      createdAt: { $lte: fifteenMinutesAgo },
    }).session(session);

    if (expiredOrders.length === 0) {
      await session.commitTransaction();
      return { success: true, cancelled: 0 };
    }

    console.log(
      `🔄 Found ${expiredOrders.length} expired VNPay orders to cancel`
    );

    for (const order of expiredOrders) {
      // Hoàn lại kho
      for (const item of order.items) {
          const product = await Product.findById(item.productId).session(session);
          
          if (product) {
              // Update Product Sales
              product.salesCount = Math.max(0, (product.salesCount || 0) - item.quantity);
              
              // Update Variant Stock & Sales
              const variant = product.variants.id(item.variantId);
              if (variant) {
                  variant.stock += item.quantity;
                  variant.salesCount = Math.max(0, (variant.salesCount || 0) - item.quantity);
              }
              
              await product.save({ session });
          }
      }

      // Hoàn lại reward points nếu có
      if (order.pointsUsed > 0) {
        const user = await mongoose
          .model("User")
          .findById(order.customerId)
          .session(session);
        if (user) {
          user.rewardPoints += order.pointsUsed;
          await user.save({ session });
        }
      }

      // Cập nhật trạng thái đơn hàng
      order.status = "CANCELLED";
      order.cancelledAt = new Date();
      order.cancelReason = "Hết thời gian thanh toán VNPay (15 phút)";
      order.statusHistory.push({
        status: "CANCELLED",
        updatedBy: order.customerId,
        updatedAt: new Date(),
        note: "Tự động hủy do hết thời gian thanh toán",
      });
      await order.save({ session });

      console.log(`✅ Auto-cancelled order: ${order.orderNumber}`);
    }

    await session.commitTransaction();
    console.log(
      `✅ Successfully cancelled ${expiredOrders.length} expired orders`
    );
    return { success: true, cancelled: expiredOrders.length };
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Auto-cancel error:", error);
    return { success: false, error: error.message };
  } finally {
    session.endSession();
  }
};
