// ============================================
// FILE: backend/src/models/Review.js
// ✅ UPDATED: Support for unified Product Collection
// ============================================

import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Product", // Changed from refPath to static ref
    },
    // Keep for backward compatibility or informational, but make optional
    productModel: {
      type: String,
      required: false, // Relaxed requirement
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    verified: {
      type: Boolean,
      default: false,
    },
    purchaseVerified: {
      type: Boolean,
      default: false,
    },
    helpful: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    adminReply: {
      content: {
        type: String,
        trim: true,
        maxlength: 500,
      },
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      repliedAt: {
        type: Date,
      },
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ productId: 1, createdAt: -1 });
reviewSchema.index({ customerId: 1, createdAt: -1 });
reviewSchema.index({ orderId: 1 });
reviewSchema.index({ purchaseVerified: 1 });
reviewSchema.index({ productId: 1, customerId: 1 });

const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema);

export default Review;
