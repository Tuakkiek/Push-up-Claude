// backend/src/routes/productAggregatorRoutes.js
import express from "express";
import {
  getAllProducts,
  getProductsByCategory,
} from "../controllers/productAggregatorController.js";

const router = express.Router();

// Public routes
router.get("/all", getAllProducts);
router.get("/category/:category", getProductsByCategory);

export default router;
