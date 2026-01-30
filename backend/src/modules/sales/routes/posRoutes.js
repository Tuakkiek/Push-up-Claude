// ============================================
// FILE: backend/src/routes/posRoutes.js
// FINAL VERSION – ĐỒNG BỘ 100% VỚI posController.js (đã bỏ promotion backend)
// ============================================

import express from "express";
import { protect, restrictTo } from "../../../shared/middleware/authMiddleware.js";
import {
  createPOSOrder,
  getPendingOrders,
  processPayment,
  cancelPendingOrder,
  issueVATInvoice,
  getPOSOrderHistory,
} from "../controllers/posController.js";

// DÙNG LẠI getOrderById từ orderController (đã có kiểm tra quyền + populate đầy đủ)
import { getOrderById } from "../controllers/orderController.js";

const router = express.Router();

// TẤT CẢ ROUTES ĐỀU YÊU CẦU ĐĂNG NHẬP
router.use(protect);

// ============================================
// ROUTES CHO POS STAFF
// ============================================

// 1. Tạo đơn hàng tại quầy
router.post("/create-order", restrictTo("POS_STAFF", "ADMIN"), createPOSOrder);

// 2. POS Staff xem lịch sử đơn của chính mình
router.get("/my-orders", restrictTo("POS_STAFF", "ADMIN"), getPOSOrderHistory);

// 3. Xem chi tiết 1 đơn hàng bất kỳ (POS Staff xem được đơn của mình + đơn đã thanh toán)
router.get("/orders/:id", restrictTo("POS_STAFF", "CASHIER", "ADMIN"), getOrderById);

// ============================================
// ROUTES CHO CASHIER & ADMIN
// ============================================

// 4. Thu ngân xem danh sách đơn chờ thanh toán
router.get("/pending-orders", restrictTo("CASHIER", "ADMIN"), getPendingOrders);

// 5. Thu ngân xử lý thanh toán
router.post("/orders/:orderId/payment", restrictTo("CASHIER", "ADMIN"), processPayment);

// 6. Thu ngân hủy đơn chờ thanh toán
router.post("/orders/:orderId/cancel", restrictTo("CASHIER", "ADMIN"), cancelPendingOrder);

// 7. Thu ngân xuất hóa đơn VAT
router.post("/orders/:orderId/vat", restrictTo("CASHIER", "ADMIN"), issueVATInvoice);

// 8. Thu ngân / Admin xem toàn bộ lịch sử đơn POS (tất cả nhân viên)
router.get("/history", restrictTo("CASHIER", "ADMIN","POS_STAFF"), getPOSOrderHistory);

// ============================================
// ROUTE CHUNG: Tìm kiếm + lọc lịch sử (dùng chung cho cả POS_STAFF và CASHIER)
// ============================================

// POS Staff: chỉ thấy đơn của mình
// Cashier/Admin: thấy tất cả
router.get("/history/all", restrictTo("POS_STAFF", "CASHIER", "ADMIN"), getPOSOrderHistory);

export default router;