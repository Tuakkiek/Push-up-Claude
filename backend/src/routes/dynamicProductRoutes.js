// backend/src/routes/dynamicProductRoutes.js
import express from "express";
import * as controller from "../controllers/dynamicProductController.js";
import { protect, restrictTo } from "../middleware/authMiddleware.js";

const router = express.Router({ mergeParams: true });

// Public routes
router.get("/", controller.findAllDynamicProducts);
router.get("/:id", controller.getDynamicProductDetail);
// TEST ENDPOINT - Kiểm tra category và model
router.get("/test/:category", async (req, res) => {
  try {
    const { category } = req.params;

    // Check category exists
    const categoryDoc = await Category.findOne({ slug: category });
    if (!categoryDoc) {
      return res.json({
        success: false,
        error: "Category not found",
        categorySlug: category,
      });
    }

    // Get model
    const ProductModel = getOrCreateModel(categoryDoc.name);
    const VariantModel = getOrCreateModel(categoryDoc.name, true);

    // Get collection stats
    const productCount = await ProductModel.countDocuments();
    const variantCount = await VariantModel.countDocuments();

    // Get sample products
    const sampleProducts = await ProductModel.find().limit(3).lean();

    res.json({
      success: true,
      data: {
        category: categoryDoc.name,
        slug: categoryDoc.slug,
        productModel: ProductModel.modelName,
        variantModel: VariantModel.modelName,
        productCollection: ProductModel.collection.name,
        variantCollection: VariantModel.collection.name,
        productCount,
        variantCount,
        sampleProducts: sampleProducts.map((p) => ({
          _id: p._id,
          name: p.name,
          model: p.model,
        })),
      },
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

// Protected routes
router.use(protect);
router.use(restrictTo("ADMIN", "WAREHOUSE_STAFF"));

router.post("/", controller.createDynamicProduct);
router.put("/:id", controller.updateDynamicProduct);
router.delete("/:id", controller.deleteDynamicProduct);

export default router;
