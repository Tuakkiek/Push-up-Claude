// ============================================
// FILE: backend/src/routes/cartRoutes.js
// ✅ ĐÃ SỬA: Loại bỏ trùng lặp, chỉnh lại endpoint
// ============================================
import express from "express";
import { protect, restrictTo } from "../../../shared/middleware/authMiddleware.js";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  validateCart,
} from "../controllers/cartController.js";

const router = express.Router();

// Tất cả các route yêu cầu người dùng đăng nhập
router.use(protect);
router.use(restrictTo("CUSTOMER"));

// Các route cho giỏ hàng
router.get("/", getCart);
router.post("/", addToCart); // ✅ POST /api/cart với body: {variantId, productType, quantity}
router.put("/", updateCartItem); // ✅ PUT /api/cart với body: {variantId, productType, quantity}
router.delete("/:itemId", removeFromCart); // ✅ DELETE /api/cart/:itemId
router.delete("/", clearCart); // ✅ DELETE /api/cart (xóa toàn bộ)
router.post("/validate", validateCart);

export default router;
