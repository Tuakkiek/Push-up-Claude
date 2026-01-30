// routes/promotionRoutes.js
import express from "express";
import {
  getActivePromotions,
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  applyPromotion,
} from "../controllers/promotionController.js";
import { protect, restrictTo } from "../../../shared/middleware/authMiddleware.js";

const router = express.Router();

// ==================== PUBLIC / CUSTOMER ====================
router.get("/active", getActivePromotions);           // GET /promotions/active
router.post("/apply", protect, applyPromotion);        // POST /promotions/apply

// ==================== ADMIN ONLY ====================
router.use(protect, restrictTo("ADMIN")); // ← Từ đây trở xuống chỉ ADMIN

// Đổi từ "/" → "/admin" để rõ ràng hơn
router.get("/admin", getAllPromotions);        // GET /promotions/admin
router.post("/", createPromotion);             // POST /promotions
router.put("/:id", updatePromotion);           // PUT /promotions/:id
router.delete("/:id", deletePromotion);        // DELETE /promotions/:id

export default router;