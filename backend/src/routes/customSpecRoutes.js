import express from "express";
import {
  getAll,
  getByCategory,
  update,
  resetToDefault,
} from "../controllers/customSpecController.js";

import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protect all routes - Admin only
router.use(protect);
router.use(restrictTo("ADMIN"));

// GET all custom specs
router.get("/", getAll);

// GET custom spec by category
router.get("/:category", getByCategory);

// UPDATE custom spec
router.put("/:category", update);

// RESET to default
router.post("/:category/reset", resetToDefault);

export default router;
