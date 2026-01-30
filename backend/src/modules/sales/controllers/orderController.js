import mongoose from "mongoose";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../../catalog/models/Product.js";

// ============================================
// CREATE ORDER (Unified)
// ============================================
export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      shippingAddress,
      paymentMethod,
      note,
      items: requestItems, // optional direct items
      // ... promotions ...
    } = req.body;

    const cart = await Cart.findOne({ customerId: req.user._id }).session(session);
    const itemsToProcess = requestItems || cart?.items || [];
    
    if (itemsToProcess.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Cart empty" });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const reqItem of itemsToProcess) {
      const variantId = reqItem.variantId;
      const quantity = reqItem.quantity;

      const product = await Product.findOne({ "variants._id": variantId }).session(session);

      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Product not found for variant ${variantId}`,
        });
      }

      const variant = product.variants.id(variantId);

      if (variant.stock < quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Stock insufficient for ${product.name}`,
        });
      }

      // Update Stock
      variant.stock -= quantity;
      variant.salesCount = (variant.salesCount || 0) + quantity;
      product.salesCount = (product.salesCount || 0) + quantity;
      await product.save({ session });

      const price = reqItem.price || variant.price;
      const itemTotal = price * quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: product._id,
        variantId: variant._id,
        productName: product.name,
        variantSku: variant.sku,
        variantColor: variant.attributes?.color,
        quantity: quantity,
        price: price,
        total: itemTotal,
        images: variant.images || [],
      });
    }

    const total = subtotal; // Simplified (add shipping/promo later if needed)

    const order = await Order.create(
      [
        {
          customerId: req.user._id,
          items: orderItems,
          shippingAddress,
          paymentMethod,
          note,
          subtotal,
          totalAmount: total,
          status: paymentMethod === "VNPAY" ? "PENDING_PAYMENT" : "PENDING",
        },
      ],
      { session }
    );

    if (cart && paymentMethod !== "VNPAY") {
        cart.items = [];
        await cart.save({ session });
    }

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Order created",
      data: { order: order[0] },
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ============================================
// GET ALL ORDERS (Admin)
// ============================================
export const getAllOrders = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate("customerId", "fullName email");
        
        const total = await Order.countDocuments();
        
        res.json({
            success: true,
            data: { orders, total, totalPages: Math.ceil(total/limit) }
        });
    } catch(e) {
        res.status(500).json({success:false, message: e.message});
    }
};

export const getMyOrders = async (req, res) => {
     try {
        const orders = await Order.find({ customerId: req.user._id }).sort({ createdAt: -1 });
        res.json({success:true, data: { orders }});
    } catch(e) {
        res.status(500).json({success:false, message: e.message});
    }
};

export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate("customerId");
        if(!order) return res.status(404).json({success:false, message:"Not found"});
        // Add auth check here
        res.json({success:true, data: { order }});
    } catch(e) {
        res.status(500).json({success:false, message: e.message});
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
        res.json({success:true, data: { order }});
    } catch(e) {
        res.status(500).json({success:false, message: e.message});
    }
};

export const cancelOrder = async (req, res) => {
    // Restore logic needed
     try {
        const order = await Order.findById(req.params.id);
        if(!order) return res.status(404).json({success:false});
        order.status = "CANCELLED";
        await order.save();
        // TODO: Restore stock
        res.json({success:true, message:"Cancelled"});
    } catch(e) {
        res.status(500).json({success:false, message: e.message});
    }
};

export default {
    createOrder,
    getAllOrders,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder
};