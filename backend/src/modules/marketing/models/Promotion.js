// models/Promotion.js
import mongoose from "mongoose";

const promotionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [4, "Mã phải từ 4 ký tự"],
      maxlength: [20, "Mã tối đa 20 ký tự"],
      match: [/^[A-Z0-9]+$/, "Chỉ chấp nhận chữ hoa và số"],
    },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: [0, "Giá trị giảm phải ≥ 0"],
    },
    maxDiscountAmount: {
      type: Number,
      min: [0, "Giảm tối đa phải ≥ 0"],
      default: null, // null = không giới hạn
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    usageLimit: { type: Number, required: true, min: [1, "Giới hạn sử dụng phải ≥ 1"] },
    usedCount: { type: Number, default: 0, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

/* ========================================
   VALIDATIONS
   ======================================== */
promotionSchema.pre("save", function (next) {
  if (this.isModified("code")) {
    this.code = this.code.trim().toUpperCase();
  }
  next();
});

promotionSchema.pre("validate", function (next) {
  // Validate discountValue theo loại
  if (this.discountType === "PERCENTAGE") {
    if (this.discountValue > 100 || this.discountValue <= 0) {
      return this.invalidate("discountValue", "Phần trăm giảm phải từ 1 đến 100");
    }
  }

  // endDate phải sau startDate
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    return this.invalidate("endDate", "Ngày kết thúc phải sau ngày bắt đầu");
  }

  next();
});

/* ========================================
   INSTANCE METHODS – ĐÃ SỬA HOÀN HẢO
   ======================================== */

// Kiểm tra xem mã có dùng được không
promotionSchema.methods.canBeUsed = function (orderTotal = 0) {
  const now = new Date();
  return (
    this.isActive === true &&
    now >= this.startDate &&
    now <= this.endDate &&
    this.usedCount < this.usageLimit &&
    orderTotal >= this.minOrderValue
  );
};

// ÁP DỤNG GIẢM GIÁ – ĐÃ XỬ LÝ maxDiscountAmount CHUẨN 100%
promotionSchema.methods.applyDiscount = function (orderTotal) {
  // Không cần throw error ở đây nữa → controller đã kiểm tra canBeUsed() rồi
  let discount = 0;

  if (this.discountType === "PERCENTAGE") {
    discount = (orderTotal * this.discountValue) / 100;
    // ← QUAN TRỌNG: Giới hạn giảm tối đa
    if (this.maxDiscountAmount !== null && this.maxDiscountAmount !== undefined) {
      discount = Math.min(discount, this.maxDiscountAmount);
    }
  } else {
    discount = this.discountValue;
  }

  const finalAmount = orderTotal - discount;
  return Math.max(0, Math.round(finalAmount)); // làm tròn, không âm
};

// Tăng lượt dùng – hỗ trợ transaction
promotionSchema.methods.incrementUsage = async function (session = null) {
  this.usedCount += 1;
  await this.save({ session });
};

// Hiển thị text đẹp cho frontend
promotionSchema.methods.getDisplayText = function () {
  if (this.discountType === "PERCENTAGE") {
    if (this.maxDiscountAmount) {
      return `Giảm ${this.discountValue}% tối đa ${this.maxDiscountAmount.toLocaleString()}₫`;
    }
    return `Giảm ${this.discountValue}%`;
  }
  return `Giảm ${this.discountValue.toLocaleString()}₫`;
};

/* ========================================
   INDEXES
   ======================================== */
// promotionSchema.index({ code: 1 });
promotionSchema.index({ startDate: 1, endDate: 1, isActive: 1 });
promotionSchema.index({ createdBy: 1 });

export default mongoose.models.Promotion || mongoose.model("Promotion", promotionSchema);