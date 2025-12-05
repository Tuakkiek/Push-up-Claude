// ============================================
// FILE: controllers/productController.js
// ✅ SIMPLIFIED: Only getRelatedProducts used
// ============================================

import { findProductById, PRODUCT_MODELS } from "../models/Product.js";
import Category from "../models/Category.js";

// Get related products
export const getRelatedProducts = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("[Products] getRelatedProducts id=", id);
    const product = await findProductById(id);

    if (!product) {
      console.warn("[Products] getRelatedProducts not found:", id);
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });
    }

    // Try to get model for this product's category (fallback logic will be improved later)
    const Model = PRODUCT_MODELS[product.category];
    if (!Model) {
      console.warn("[Products] No model for category:", product.category);
      return res.status(404).json({ success: false, message: "Không tìm thấy danh mục sản phẩm" });
    }

    // Correct collection names for variants (fallback to `${category}variants`)
    const variantCollectionMap = {
      iPhone: "iphonevariants",
      iPad: "ipadvariants",
      Mac: "macvariants",
      AirPods: "airpodsvariants",
      AppleWatch: "applewatchvariants",
      Accessory: "accessoryvariants",
    };

    const variantCollection = variantCollectionMap[product.category] || `${String(product.category).toLowerCase()}variants`;

    const pipeline = [
      { $match: { _id: { $ne: product._id }, category: product.category, condition: product.condition, status: "AVAILABLE" } },
      { $lookup: { from: variantCollection, localField: "_id", foreignField: "productId", as: "variants" } },
      { $sort: { averageRating: -1 } },
      { $limit: 4 },
      { $project: { _id: 1, name: 1, model: 1, category: 1, images: 1, price: 1, originalPrice: 1, averageRating: 1, totalReviews: 1, variants: 1, baseSlug: 1, installmentBadge: 1 } },
    ];

    const products = await Model.aggregate(pipeline);
    console.log(`[Products] related for ${product.category} ->`, products.length);

    res.json({ success: true, data: { products } });
  } catch (error) {
    console.error("[Products] getRelatedProducts error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Stub functions for backwards compatibility (not implemented)
export const getVariantsByProduct = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getVariantById = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const createVariant = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const updateVariant = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const deleteVariant = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ active: true }).lean();
    console.log("[Products] getCategories count=", categories.length);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error("[Products] getCategories error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllProducts = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getProductsByCategory = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getFeaturedProducts = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getNewArrivals = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getProductById = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const createProduct = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const updateProduct = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const deleteProduct = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getSpecificVariant = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const updateQuantity = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const bulkUpdateProducts = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const getProductStats = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const bulkImportJSON = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const bulkImportCSV = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export const exportToCSV = async (req, res) => {
  res.status(501).json({
    success: false,
    message: "Endpoint not implemented",
  });
};

export default {
  getRelatedProducts,
  getVariantsByProduct,
  getVariantById,
  createVariant,
  updateVariant,
  deleteVariant,
  getCategories,
  getAllProducts,
  getProductsByCategory,
  getFeaturedProducts,
  getNewArrivals,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getSpecificVariant,
  updateQuantity,
  bulkUpdateProducts,
  getProductStats,
  bulkImportJSON,
  bulkImportCSV,
  exportToCSV,
};
