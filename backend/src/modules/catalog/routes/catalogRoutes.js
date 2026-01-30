import express from "express";
import * as categoryController from "../controllers/CategoryController.js";
import * as productController from "../controllers/ProductController.js";
import { protect, restrictTo } from "../../../shared/middleware/authMiddleware.js";

const router = express.Router();

// CATEGORY ROUTES
router
  .route("/categories")
  .get(categoryController.getCategories)
  .post(protect, restrictTo("ADMIN"), categoryController.createCategory);

router.route("/categories/:slug").get(categoryController.getCategoryBySlug);

// Category by ID (for updates/deletes)
router
  .route("/categories/:id")
  .put(protect, restrictTo("ADMIN"), categoryController.updateCategory)
  .delete(protect, restrictTo("ADMIN"), categoryController.deleteCategory);

// PRODUCT ROUTES
router
  .route("/products")
  .get(productController.getProducts)
  .post(protect, restrictTo("ADMIN", "WAREHOUSE_STAFF"), productController.createProduct);

router.post(
  "/products/validate",
  protect,
  restrictTo("ADMIN", "WAREHOUSE_STAFF"),
  productController.validateProduct
);

router
  .route("/products/:id")
  .get(productController.getProductById)
  .put(protect, restrictTo("ADMIN", "WAREHOUSE_STAFF"), productController.updateProduct)
  .delete(protect, restrictTo("ADMIN", "WAREHOUSE_STAFF"), productController.deleteProduct);

router.route("/products/slug/:slug").get(productController.getProductBySlug);

export default router;
