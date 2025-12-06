// backend/src/routes/productAggregatorRoutes.js
import express from "express";
import * as controller from "../controllers/productAggregatorController.js";

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================

// GET /api/products-aggregator/all
router.get("/all", controller.getAllProducts);

// GET /api/products-aggregator/category/:category
router.get("/category/:category", controller.getProductsByCategory);

export default router;
