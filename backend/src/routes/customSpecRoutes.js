// backend/src/routes/customSpecRoutes.js
import express from "express";
import controller from "../controllers/customSpecController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protect all routes - Admin only
router.use(protect);
router.use(restrictTo("ADMIN"));

// GET all custom specs
router.get("/", controller.getAll);

// GET custom spec by category
router.get("/:category", controller.getByCategory);

// UPDATE custom spec
router.put("/:category", controller.update);

// RESET to default
router.post("/:category/reset", controller.resetToDefault);

export default router;
