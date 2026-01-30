// ============================================
// FILE: backend/src/models/ShortVideo.js
// MongoDB model for short videos (Updated)
// ============================================

import mongoose from "mongoose";

const shortVideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Tiêu đề không được để trống"],
      trim: true,
      maxLength: [100, "Tiêu đề không được vượt quá 100 ký tự"],
    },
    description: {
      type: String,
      trim: true,
      maxLength: [500, "Mô tả không được vượt quá 500 ký tự"],
    },
    videoUrl: {
      type: String,
      required: [true, "URL video không được để trống"],
    },
    thumbnailUrl: {
      type: String,
      required: [true, "URL thumbnail không được để trống"],
    },
    duration: {
      type: Number, // in seconds
      required: true,
      default: 60,
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
    },
    order: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    shares: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    linkedProducts: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product", // Changed refPath to static Product ref
        },
        productType: {
          type: String,
          // enum removed
        },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    publishedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

shortVideoSchema.index({ status: 1, order: 1 });
shortVideoSchema.index({ status: 1, createdAt: -1 });
shortVideoSchema.index({ views: -1, likes: -1 });
shortVideoSchema.index({ createdBy: 1 });

shortVideoSchema.virtual("trendingScore").get(function () {
  return this.views * 0.5 + this.likes * 2 + this.shares * 3;
});

shortVideoSchema.pre("save", function (next) {
  if (
    this.isModified("status") &&
    this.status === "PUBLISHED" &&
    !this.publishedAt
  ) {
    this.publishedAt = new Date();
  }
  next();
});

const ShortVideo = mongoose.models.ShortVideo || mongoose.model("ShortVideo", shortVideoSchema);

export default ShortVideo;
