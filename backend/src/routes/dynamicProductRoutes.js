// backend/src/routes/dynamicProductRoutes.js
import express from "express";
import * as controller from "../controllers/dynamicProductController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router({ mergeParams: true });

// Public routes
router.get("/", controller.findAllDynamicProducts);
router.get("/:id", controller.getDynamicProductDetail);

// Protected routes
router.use(protect);
router.use(restrictTo("ADMIN", "WAREHOUSE_STAFF"));

router.post("/", controller.createDynamicProduct);
router.put("/:id", controller.updateDynamicProduct);
router.delete("/:id", controller.deleteDynamicProduct);

export default router;
