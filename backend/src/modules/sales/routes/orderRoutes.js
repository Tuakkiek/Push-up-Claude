// routes/orderRoutes.js
import express from "express";
import { protect, restrictTo } from "../../../shared/middleware/authMiddleware.js";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,

} from "../controllers/orderController.js";

const router = express.Router();

router.use(protect);

// Customer routes
router.post("/", restrictTo("CUSTOMER"), createOrder);
router.get("/my-orders", restrictTo("CUSTOMER"), getMyOrders);
router.post("/:id/cancel", restrictTo("CUSTOMER"), cancelOrder);

// Order Manager routes
router.get(
  "/all",
  restrictTo("ORDER_MANAGER", "ADMIN", "SHIPPER"), // ✅ THÊM SHIPPER
  getAllOrders
);
router.put(
  "/:id/status",
  restrictTo("ORDER_MANAGER", "ADMIN", "SHIPPER"), // ✅ THÊM SHIPPER
  updateOrderStatus
);

// Shared routes
router.get("/:id", getOrderById);



export default router;
