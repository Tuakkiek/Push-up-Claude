// backend/src/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const addressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true,
  },
  province: {
    type: String,
    required: true,
    trim: true,
  },
  ward: {
    type: String,
    required: true,
    trim: true,
  },
  detailAddress: {
    type: String,
    required: true,
    trim: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

const userSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: [
        "USER",
        "CUSTOMER",
        "WAREHOUSE_STAFF",
        "ORDER_MANAGER",
        "SHIPPER",
        "POS_STAFF",
        "CASHIER",
        "ADMIN",
      ],
      default: "USER",
    },
    fullName: {
      type: String,
      required: [true, "Vui lòng nhập họ tên"],
      trim: true,
      minlength: [2, "Họ tên phải có ít nhất 2 ký tự"],
      maxlength: [100, "Họ tên không được vượt quá 100 ký tự"],
    },
    phoneNumber: {
      type: String,
      required: [true, "Vui lòng nhập số điện thoại"],
      unique: true,
      trim: true,
      validate: {
        validator: function (v) {
          // CHỈ VALIDATE KHI TẠO MỚI (this.isNew = true)
          // Tài khoản cũ bỏ qua validation này
          if (!this.isNew) return true;

          // Kiểm tra: 10 chữ số, bắt đầu bằng 0
          return /^0\d{9}$/.test(v);
        },
        message: "Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0",
      },
    },
    email: {
      type: String,
      trim: true,
      sparse: true, // Cho phép null nhưng nếu có thì phải unique
      lowercase: true,
      validate: {
        validator: function (v) {
          // Nếu có email thì phải hợp lệ
          if (!v) return true; // Email là optional
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: "Email không hợp lệ. Email phải có dạng: example@domain.com",
      },
    },
    province: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Vui lòng nhập mật khẩu"],
      minlength: [8, "Mật khẩu phải có ít nhất 8 ký tự"],
      validate: {
        validator: function (v) {
          // Kiểm tra mật khẩu mạnh:
          // - Ít nhất 8 ký tự
          // - Có chữ thường (a-z)
          // - Có chữ hoa (A-Z)
          // - Có số (0-9)
          // - Có ký tự đặc biệt
          const hasLowerCase = /[a-z]/.test(v);
          const hasUpperCase = /[A-Z]/.test(v);
          const hasNumber = /[0-9]/.test(v);
          const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(
            v
          );

          return (
            hasLowerCase &&
            hasUpperCase &&
            hasNumber &&
            hasSpecialChar &&
            v.length >= 8
          );
        },
        message:
          "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ thường, chữ hoa, số và ký tự đặc biệt (!@#$%^&*...)",
      },
    },
    status: {
      type: String,
      enum: ["ACTIVE", "LOCKED"],
      default: "ACTIVE",
    },
    addresses: [addressSchema],
    avatar: {
      type: String,
      default: null,
      trim: true,
    },
    storeLocation: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON response
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.models.User || mongoose.model("User", userSchema);
