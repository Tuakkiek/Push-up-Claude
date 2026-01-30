// models/PromotionUsage.js
import mongoose from "mongoose";

const promotionUsageSchema = new mongoose.Schema(
  {
    promotion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Promotion",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false, // Bắt buộc để tránh log giả
      index: true,
    },
    orderTotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    usedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    snapshot: {
      code: { type: String, required: true },
      name: { type: String, required: true },
      discountType: {
        type: String,
        enum: ["PERCENTAGE", "FIXED"],
        required: true,
      },
      discountValue: { type: Number, required: true },
      maxDiscountAmount: { type: Number, default: null },
    },
  },
  {
    timestamps: true,
  }
);

/* ========================================
   INDEXES – RẤT QUAN TRỌNG CHO HIỆU NĂNG & CHỐNG GIAN LẬN
   ======================================== */

// 1. Mỗi user chỉ được dùng mỗi mã 1 lần → unique
promotionUsageSchema.index({ promotion: 1, user: 1 }, { unique: true });

// 2. Tìm nhanh lịch sử dùng của một mã
promotionUsageSchema.index({ promotion: 1, usedAt: -1 });

// 3. Tìm nhanh tất cả mã đã dùng của một user → ĐÃ SỬA DÒNG LỖI Ở ĐÂY
promotionUsageSchema.index({ user: 1, usedAt: -1 });

// 4. Mỗi đơn hàng chỉ dùng được 1 mã (tránh retry thanh toán gây trùng)
// promotionUsageSchema.index({ order: 1 }, { unique: true });

// 5. Compound index cho báo cáo doanh thu theo thời gian + mã
promotionUsageSchema.index({ usedAt: 1, promotion: 1 });

export default mongoose.models.PromotionUsage || mongoose.model("PromotionUsage", promotionUsageSchema);
