// backend/src/controllers/authController.js
import User from "../models/User.js";
import { signToken } from "../../../shared/middleware/authMiddleware.js";

// ============================================
// VALIDATION HELPERS
// ============================================
const validatePhoneNumber = (phoneNumber) => {
  const phoneRegex = /^0\d{9}$/;
  if (!phoneRegex.test(phoneNumber)) {
    throw new Error("Số điện thoại phải có 10 chữ số và bắt đầu bằng số 0");
  }
};

const validateEmail = (email) => {
  if (!email) return; // Email is optional

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error(
      "Email không hợp lệ. Email phải có dạng: example@domain.com"
    );
  }
};

const validatePassword = (password) => {
  if (password.length < 8) {
    throw new Error("Mật khẩu phải có ít nhất 8 ký tự");
  }

  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (!hasLowerCase || !hasUpperCase || !hasNumber || !hasSpecialChar) {
    throw new Error(
      "Mật khẩu phải bao gồm chữ thường (a-z), chữ hoa (A-Z), số (0-9) và ký tự đặc biệt (!@#$%...)"
    );
  }
};

// ============================================
// REGISTER
// ============================================
export const register = async (req, res) => {
  try {
    const { fullName, phoneNumber, email, province, password, role } = req.body;

    // Validate required fields
    if (!fullName || !phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin bắt buộc",
      });
    }

    // Validate full name
    if (fullName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Họ tên phải có ít nhất 2 ký tự",
      });
    }

    // Validate phone number
    validatePhoneNumber(phoneNumber);

    // Validate email if provided
    if (email) {
      validateEmail(email);
    }

    // Validate password
    validatePassword(password);

    // Check if phone number already exists
    const existingUserByPhone = await User.findOne({ phoneNumber });
    if (existingUserByPhone) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại đã được sử dụng",
      });
    }

    // Check if email already exists (if provided)
    if (email) {
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        return res.status(400).json({
          success: false,
          message: "Email đã được sử dụng",
        });
      }
    }

    // Create user with CUSTOMER role by default (unless specified by admin)
    const user = await User.create({
      fullName: fullName.trim(),
      phoneNumber,
      email: email || undefined,
      province,
      password,
      role: role || "CUSTOMER",
    });

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: { user },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Đăng ký thất bại",
    });
  }
};

// ============================================
// LOGIN
// ============================================
export const login = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    // Validate input
    if (!phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập số điện thoại và mật khẩu",
      });
    }

    // ✅ BỎ VALIDATION FORMAT CHO LOGIN - CHO PHÉP TÀI KHOẢN CŨ
    // Tài khoản cũ có thể có format khác (ví dụ: 8 số, 11 số, không bắt đầu bằng 0...)

    // Find user - tìm bằng phoneNumber trực tiếp, không kiểm tra format
    const user = await User.findOne({ phoneNumber }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Số điện thoại hoặc mật khẩu không đúng",
      });
    }

    // Check if account is locked
    if (user.status === "LOCKED") {
      return res.status(403).json({
        success: false,
        message: "Tài khoản đã bị khóa. Vui lòng liên hệ admin.",
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Số điện thoại hoặc mật khẩu không đúng",
      });
    }

    // Generate token
    const token = signToken(user._id);

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      message: "Đăng nhập thành công",
      data: {
        user: {
          _id: user._id,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          email: user.email,
          role: user.role,
          province: user.province,
          avatar: user.avatar,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Đăng nhập thất bại",
    });
  }
};

// ============================================
// LOGOUT
// ============================================
export const logout = async (req, res) => {
  try {
    res.clearCookie("token");
    res.json({
      success: true,
      message: "Đăng xuất thành công",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Đăng xuất thất bại",
    });
  }
};

// ============================================
// GET CURRENT USER
// ============================================
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng",
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

// ============================================
// CHANGE PASSWORD
// ============================================
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin",
      });
    }

    // Validate new password
    validatePassword(newPassword);

    // Get user with password
    const user = await User.findById(req.user._id).select("+password");

    // Check current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng",
      });
    }

    // Check if new password is same as old password
    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới không được trùng với mật khẩu cũ",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Đổi mật khẩu thất bại",
    });
  }
};

// ============================================
// UPDATE AVATAR
// ============================================
export const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;

    if (!avatar) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng cung cấp ảnh đại diện",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar },
      { new: true }
    );

    res.json({
      success: true,
      message: "Cập nhật ảnh đại diện thành công",
      data: { user },
    });
  } catch (error) {
    console.error("Update avatar error:", error);
    res.status(400).json({
      success: false,
      message: "Cập nhật ảnh đại diện thất bại",
    });
  }
};

export default {
  register,
  login,
  logout,
  getCurrentUser,
  changePassword,
  updateAvatar,
};
