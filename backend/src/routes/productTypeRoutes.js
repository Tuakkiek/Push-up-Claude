// ============================================
// FILE: backend/src/routes/productTypeRoutes.js
// ✅ STEP 1: ProductType Routes
// Purpose: API endpoints for managing product types
// ============================================

import express from "express";
import * as controller from "../controllers/productTypeController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * GET /api/product-types
 * Get all product types
 * Query params: status, includeInactive
 */
router.get("/", controller.findAll);

/**
 * GET /api/product-types/slug/:slug
 * Get product type by slug
 */
router.get("/slug/:slug", controller.findBySlug);

/**
 * GET /api/product-types/:id
 * Get product type by ID
 */
router.get("/:id", controller.findOne);

// ============================================
// PROTECTED ROUTES (Admin only)
// ============================================

/**
 * POST /api/product-types
 * Create new product type
 */
router.post("/", protect, restrictTo("ADMIN"), controller.create);

/**
 * PUT /api/product-types/:id
 * Update product type
 */
router.put("/:id", protect, restrictTo("ADMIN"), controller.update);

/**
 * DELETE /api/product-types/:id
 * Delete product type (only if no products use it)
 */
router.delete("/:id", protect, restrictTo("ADMIN"), controller.deleteProductType);

// ============================================
// SPECIFICATION FIELD MANAGEMENT
// ============================================

/**
 * POST /api/product-types/:id/fields
 * Add specification field to product type
 */
router.post(
  "/:id/fields",
  protect,
  restrictTo("ADMIN"),
  controller.addSpecificationField
);

/**
 * PUT /api/product-types/:id/fields/:fieldName
 * Update specification field
 */
router.put(
  "/:id/fields/:fieldName",
  protect,
  restrictTo("ADMIN"),
  controller.updateSpecificationField
);

/**
 * DELETE /api/product-types/:id/fields/:fieldName
 * Remove specification field
 */
router.delete(
  "/:id/fields/:fieldName",
  protect,
  restrictTo("ADMIN"),
  controller.removeSpecificationField
);

// ============================================
// EXPORT
// ============================================
export default router;
