// ============================================
// FILE: backend/src/routes/homePageRoutes.js
// Routes for homepage layout management
// ============================================

import express from "express";
import {
  getActiveLayout,
  updateLayout,
  toggleSection,
  reorderSections,
  updateSectionConfig,
  uploadBannerImage,
  deleteBannerImage,
  resetToDefault,
} from "../controllers/homePageController.js";
import { protect, restrictTo } from "../../../shared/middleware/authMiddleware.js";
import { uploadBanner } from "../../../shared/middleware/uploadBanner.js";

const router = express.Router();

// Public route - get active layout
router.get("/layout", getActiveLayout);

// Admin routes - protected
router.use(protect);
router.use(restrictTo("ADMIN"));

router.put("/layout", updateLayout);
router.patch("/sections/:sectionId/toggle", toggleSection);
router.put("/sections/reorder", reorderSections);
router.patch("/sections/:sectionId/config", updateSectionConfig);
router.post("/upload-banner", uploadBanner.single("image"), uploadBannerImage);
router.delete("/banner", deleteBannerImage);
router.post("/reset-default", resetToDefault);

export default router;