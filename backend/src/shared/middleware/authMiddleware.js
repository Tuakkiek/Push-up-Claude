// middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import User from '../../modules/identity/models/User.js';
import config from '../../config/config.js'; // Kiểm tra đúng tên trong config
import dotenv from 'dotenv';
dotenv.config(); 

// Protect routes - verify token
export const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header or cookie
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập để truy cập'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, config.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    if (user.status === 'LOCKED') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản đã bị khóa'
      });
    }

    req.user = user; // Lưu thông tin user vào request object
    next(); // Tiến hành vào controller tiếp theo
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn'
    });
  }
};

// Restrict to specific roles
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này'
      });
    }
    next(); // Nếu user có quyền, tiếp tục vào controller tiếp theo
  };
};

// Generate JWT token
export const signToken = (id) => {
  return jwt.sign({ id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN
  });
};
