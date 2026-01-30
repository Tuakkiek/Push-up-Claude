import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../../catalog/models/Product.js";

// ============================================
// 1. TẠO ĐƠN HÀNG POS
// ============================================
export const createPOSOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, customerInfo, storeLocation, totalAmount, promotionCode } =
      req.body;

    if (!items?.length) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Giỏ hàng trống" });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const { variantId, quantity } = item;
      
      const product = await Product.findOne({ "variants._id": variantId }).session(session);
      
      if (!product) {
        await session.abortTransaction();
        return res
          .status(404)
          .json({ success: false, message: `Không tìm thấy sản phẩm chứa biến thể ${variantId}` });
      }

      const variant = product.variants.id(variantId);
      
      if (variant.stock < quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `${product.name} chỉ còn ${variant.stock} sản phẩm`,
        });
      }

      // Update Stock
      variant.stock -= quantity;
      variant.salesCount = (variant.salesCount || 0) + quantity;
      product.salesCount = (product.salesCount || 0) + quantity;
      
      await product.save({ session });

      const price = item.price ?? variant.price;
      const itemTotal = price * quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: product._id,
        variantId: variant._id,
        productName: product.name,
        variantSku: variant.sku,
        quantity,
        price,
        total: itemTotal,
        images: variant.images || [],
      });
    }

    const order = await Order.create(
      [
        {
          orderSource: "IN_STORE",
          customerId: req.user._id,
          items: orderItems,
          shippingAddress: {
            fullName: customerInfo.fullName,
            phoneNumber: customerInfo.phoneNumber,
            province: storeLocation || "Cần Thơ",
          },
          paymentMethod: "CASH",
          status: "PENDING_PAYMENT",
          subtotal,
          totalAmount: totalAmount || subtotal,
          posInfo: {
            staffId: req.user._id,
            storeLocation: storeLocation || "Ninh Kiều",
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Tạo đơn thành công",
      data: { order: order[0] },
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

export const getPendingOrders = async (req, res) => {
  try {
    const orders = await Order.find({ orderSource: "IN_STORE", status: "PENDING_PAYMENT" })
        .sort({ createdAt: -1 });
    res.json({ success: true, data: { orders } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const processPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentReceived } = req.body;
        const order = await Order.findById(orderId);
        if(!order) return res.status(404).json({success:false});
        
        order.paymentStatus = "PAID";
        order.status = "DELIVERED";
        order.paymentInfo = { paymentReceived, processedAt: new Date() };
        
        await order.save();
        res.json({success:true, data: { order }});
    } catch(e) {
        res.status(500).json({success:false, message: e.message});
    }
};

export const cancelPendingOrder = async (req, res) => {
    // Need restore logic
     try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        if(!order) return res.status(404).json({success:false});
        
        order.status = "CANCELLED";
        await order.save();
        res.json({success:true, message: "Cancelled"});
    } catch(e) {
        res.status(500).json({success:false, message: e.message});
    }
};

export const issueVATInvoice = async (req, res) => { res.json({success:true}); };
export const getPOSOrderHistory = async (req, res) => { res.json({success:true}); };
export const getPOSStats = async (req, res) => { res.json({success:true}); };

export default {
    createPOSOrder,
    getPendingOrders,
    processPayment,
    cancelPendingOrder,
    issueVATInvoice,
    getPOSOrderHistory,
    getPOSStats
};
