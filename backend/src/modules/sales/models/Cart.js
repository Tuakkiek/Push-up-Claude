// ============================================
// FILE: backend/src/models/Cart.js
// ✅ UPDATED: Removed hardcoded enums
// ============================================

import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    productType: {
      type: String,
      required: true,
      // enum removed
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    sku: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const cartSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
  }
);

cartSchema.virtual("totalAmount").get(function () {
  return this.items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
});

cartSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => {
    return total + item.quantity;
  }, 0);
});

cartSchema.set("toJSON", { virtuals: true });
cartSchema.set("toObject", { virtuals: true });

const Cart = mongoose.models.Cart || mongoose.model("Cart", cartSchema);

export default Cart;
