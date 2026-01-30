// ============================================
// FILE: backend/src/routes/userRoutes.js
// ✅ UPDATED: Thêm route lấy danh sách Shipper
// ============================================

import express from "express";
import { protect, restrictTo } from "../../../shared/middleware/authMiddleware.js";
import {
  updateProfile,
  addAddress,
  updateAddress,
  deleteAddress,
  getAllEmployees,
  createEmployee,
  toggleEmployeeStatus,
  deleteEmployee,
  updateEmployeeAvatar,
  updateEmployee,
  getAllShippers, // ✅ THÊM
} from "../controllers/userController.js";

const router = express.Router();

router.use(protect);

// Customer routes
router.put("/profile", restrictTo("CUSTOMER"), updateProfile);
router.post("/addresses", restrictTo("CUSTOMER"), addAddress);
router.put("/addresses/:addressId", restrictTo("CUSTOMER"), updateAddress);
router.delete("/addresses/:addressId", restrictTo("CUSTOMER"), deleteAddress);

// Admin/Manager routes
router.get("/employees", restrictTo("ADMIN", "ORDER_MANAGER"), getAllEmployees);

// ✅ NEW: Get all shippers (for Order Manager to assign)
router.get("/shippers", restrictTo("ADMIN", "ORDER_MANAGER"), getAllShippers);

router.post("/employees", restrictTo("ADMIN"), createEmployee);
router.patch(
  "/employees/:id/toggle-status",
  restrictTo("ADMIN"),
  toggleEmployeeStatus
);
router.delete("/employees/:id", restrictTo("ADMIN"), deleteEmployee);
router.put("/employees/:id/avatar", restrictTo("ADMIN"), updateEmployeeAvatar);
router.put("/employees/:id", restrictTo("ADMIN"), updateEmployee);

export default router;
