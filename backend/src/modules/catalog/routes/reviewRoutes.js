// ============================================
// FILE: backend/src/routes/reviewRoutes.js
// ✅ UPDATED: Added canReview endpoint
// ============================================

import express from "express";
import { protect, restrictTo } from "../../../shared/middleware/authMiddleware.js";
import {
  canReviewProduct,
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  likeReview,
  replyToReview,
  updateAdminReply,
  toggleReviewVisibility,
} from "../controllers/reviewController.js";

const router = express.Router();

// ✅ NEW: Check if user can review product
router.get(
  "/can-review/:productId",
  protect,
  restrictTo("CUSTOMER"),
  canReviewProduct
);

// Public route
router.get("/product/:productId", getProductReviews);

// Customer routes
router.use(protect);
router.use(restrictTo("CUSTOMER", "ADMIN"));

router.post("/", createReview);
router.put("/:id", updateReview);
router.delete("/:id", deleteReview);
router.post("/:id/like", likeReview);

// Admin routes
router.post("/:id/reply", restrictTo("ADMIN"), replyToReview);
router.put("/:id/reply", restrictTo("ADMIN"), updateAdminReply);
router.patch(
  "/:id/toggle-visibility",
  restrictTo("ADMIN"),
  toggleReviewVisibility
);

export default router;
