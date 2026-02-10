// ============================================
// FILE: backend/src/routes/unifiedProductRoutes.js
// ✅ STEP 4: Unified Product Routes
// Purpose: Single route file for ALL product types
// Replaces: 6 separate route files
// ============================================

import express from "express";
import * as controller from "../controllers/unifiedProductController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * GET /api/products
 * Get all products with optional filters
 * Query params: page, limit, search, status, productTypeId, productTypeSlug
 */
router.get("/", controller.findAll);

/**
 * GET /api/products/:id/variants
 * Get all variants for a specific product
 */
router.get("/:id/variants", controller.getVariants);

// ============================================
// PROTECTED ROUTES (Admin/Warehouse Staff)
// ============================================

/**
 * POST /api/products
 * Create new product
 * Body: { name, model, productTypeId, specifications, variants, ... }
 */
router.post(
  "/",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_STAFF"),
  controller.create
);

/**
 * PUT /api/products/:id
 * Update existing product
 */
router.put(
  "/:id",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_STAFF"),
  controller.update
);

/**
 * DELETE /api/products/:id
 * Delete product (cascade delete variants)
 */
router.delete(
  "/:id",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_STAFF"),
  controller.deleteProduct
);

// ============================================
// DYNAMIC ROUTES (must be last)
// ============================================

/**
 * GET /api/products/:id
 * Get product by ID or slug
 * Handles both MongoDB ObjectId and SEO slugs
 */
const routeHandler = (req, res, next) => {
  const { id } = req.params;

  // Check if it's a MongoDB ObjectId (24 hex characters)
  if (/^[0-9a-fA-F]{24}$/.test(id)) {
    console.log("✅ Detected ObjectId, calling findOne");
    return controller.findOne(req, res, next);
  }

  // Otherwise, it's a slug
  console.log("✅ Detected slug, calling getProductDetail");
  return controller.getProductDetail(req, res, next);
};

router.get("/:id", routeHandler);

// ============================================
// EXPORT
// ============================================
export default router;
