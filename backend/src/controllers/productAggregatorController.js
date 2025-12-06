// ============================================
// FILE: backend/src/controllers/productAggregatorController.js
// ✅ AGGREGATOR - Fetch products from ALL categories (fixed + dynamic)
// ============================================

import mongoose from "mongoose";
import Category from "../models/Category.js";

// ============================================
// FIXED CATEGORIES MAPPING
// ============================================
const FIXED_CATEGORIES = [
  "iPhone",
  "iPad",
  "Mac",
  "AirPods",
  "AppleWatch",
  "Accessories",
];

// ============================================
// HELPER: Get all collections from MongoDB
// ============================================
const getAllCollections = async () => {
  try {
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    return collections.map((c) => c.name);
  } catch (error) {
    console.error("Error listing collections:", error);
    return [];
  }
};

// ============================================
// HELPER: Find matching collection for category
// ============================================
const findCollectionForCategory = async (categoryName) => {
  const allCollections = await getAllCollections();
  const categoryLower = categoryName.toLowerCase();

  console.log(`🔍 Looking for collection for category: ${categoryName}`);
  console.log(`📂 Available collections:`, allCollections);

  // Try different patterns
  const patterns = [
    categoryName, // Vision
    categoryLower, // vision
    `${categoryLower}s`, // visions
    `${categoryName}s`, // Visions
  ];

  for (const pattern of patterns) {
    if (allCollections.includes(pattern)) {
      console.log(`✅ Found collection: ${pattern}`);
      return pattern;
    }
  }

  console.warn(`⚠️ No collection found for ${categoryName}`);
  return null;
};

// ============================================
// HELPER: Get or create model dynamically
// ============================================
const getModelForCategory = async (categoryName) => {
  try {
    // Try to get existing model
    return mongoose.model(categoryName);
  } catch {
    // Model doesn't exist, create it
    try {
      console.log(`🔨 Creating dynamic model for: ${categoryName}`);

      // Find actual collection name
      const collectionName = await findCollectionForCategory(categoryName);

      if (!collectionName) {
        console.error(`❌ No collection found for ${categoryName}`);
        return null;
      }

      // Create schema
      const schema = new mongoose.Schema(
        {
          name: { type: String, required: true, trim: true },
          model: { type: String, required: true, trim: true },
          baseSlug: { type: String, required: true, sparse: true },
          slug: { type: String, sparse: true },
          description: { type: String, trim: true, default: "" },
          featuredImages: [{ type: String, trim: true }],
          videoUrl: { type: String, trim: true, default: "" },
          specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
          variants: [{ type: mongoose.Schema.Types.ObjectId }],
          condition: { type: String, default: "NEW" },
          brand: { type: String, default: "Apple", trim: true },
          productType: { type: String, required: true },
          category: { type: String, required: true },
          status: { type: String, default: "AVAILABLE" },
          installmentBadge: { type: String, default: "NONE" },
          createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          averageRating: { type: Number, default: 0, min: 0, max: 5 },
          totalReviews: { type: Number, default: 0, min: 0 },
          salesCount: { type: Number, default: 0, min: 0 },
        },
        { timestamps: true, strict: false } // ✅ strict: false allows any fields
      );

      // Create model with explicit collection name
      const model = mongoose.model(categoryName, schema, collectionName);
      console.log(
        `✅ Model created: ${categoryName} → Collection: ${collectionName}`
      );

      return model;
    } catch (error) {
      console.error(`❌ Failed to create model for ${categoryName}:`, error);
      return null;
    }
  }
};

// ============================================
// GET ALL PRODUCTS FROM ALL CATEGORIES
// ============================================
export const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 100, search, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    console.log("📥 Fetching all products...");

    // 1. Fetch all active categories
    const categories = await Category.find({ active: true });
    console.log(
      "📂 Found categories:",
      categories.map((c) => c.name)
    );

    let allProducts = [];

    // 2. Loop through each category and fetch products
    for (const category of categories) {
      try {
        const Model = await getModelForCategory(category.name);

        if (!Model) {
          console.warn(`⚠️ No model found for category: ${category.name}`);
          continue;
        }

        // Build query
        const query = {};
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { model: { $regex: search, $options: "i" } },
          ];
        }
        if (status) query.status = status;

        // Fetch products
        const products = await Model.find(query)
          .populate("variants")
          .populate("createdBy", "fullName email")
          .lean();

        console.log(`✅ ${category.name}: ${products.length} products`);

        // Add category info to each product
        allProducts.push(
          ...products.map((p) => ({
            ...p,
            category: category.name,
            categorySlug: category.slug,
          }))
        );
      } catch (error) {
        console.error(`❌ Error fetching ${category.name}:`, error.message);
      }
    }

    // 3. Sort by creation date (newest first)
    allProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 4. Pagination
    const total = allProducts.length;
    const paginatedProducts = allProducts.slice(skip, skip + limitNum);

    console.log(
      `📊 Total products: ${total}, Returning: ${paginatedProducts.length}`
    );

    res.json({
      success: true,
      data: {
        products: paginatedProducts,
        total,
        totalPages: Math.ceil(total / limitNum),
        currentPage: parseInt(page),
      },
    });
  } catch (error) {
    console.error("❌ GET ALL PRODUCTS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
      data: {
        products: [],
        total: 0,
        totalPages: 0,
        currentPage: 1,
      },
    });
  }
};

// ============================================
// GET PRODUCTS BY CATEGORY NAME
// ============================================
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12, search, status } = req.query;

    console.log(`📥 Fetching products for category: ${category}`);

    // 1. Check if category exists
    const categoryDoc = await Category.findOne({ name: category });
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: `Category "${category}" không tồn tại`,
      });
    }

    // 2. Get model
    const Model = await getModelForCategory(category);
    if (!Model) {
      return res.status(404).json({
        success: false,
        message: `Model cho category "${category}" không tồn tại`,
      });
    }

    // 3. Build query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
      ];
    }
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // 4. Fetch products
    const [products, total] = await Promise.all([
      Model.find(query)
        .populate("variants")
        .populate("createdBy", "fullName email")
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 })
        .lean(),
      Model.countDocuments(query),
    ]);

    console.log(`✅ Found ${total} products in ${category}`);

    res.json({
      success: true,
      data: {
        products: products.map((p) => ({
          ...p,
          category: category,
          categorySlug: categoryDoc.slug,
        })),
        total,
        totalPages: Math.ceil(total / limitNum),
        currentPage: parseInt(page),
      },
    });
  } catch (error) {
    console.error("❌ GET PRODUCTS BY CATEGORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
      data: {
        products: [],
        total: 0,
        totalPages: 0,
        currentPage: 1,
      },
    });
  }
};

// ============================================
// SEARCH PRODUCTS ACROSS ALL CATEGORIES
// ============================================
export const searchProducts = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: {
          products: [],
          total: 0,
        },
      });
    }

    console.log(`🔍 Searching for: "${q}"`);

    const categories = await Category.find({ active: true });
    let allResults = [];

    for (const category of categories) {
      try {
        const Model = await getModelForCategory(category.name);
        if (!Model) continue;

        const products = await Model.find({
          $or: [
            { name: { $regex: q, $options: "i" } },
            { model: { $regex: q, $options: "i" } },
          ],
        })
          .populate("variants")
          .limit(parseInt(limit))
          .lean();

        allResults.push(
          ...products.map((p) => ({
            ...p,
            category: category.name,
            categorySlug: category.slug,
          }))
        );
      } catch (error) {
        console.error(`Error searching ${category.name}:`, error.message);
      }
    }

    // Sort by relevance (exact match first, then alphabetical)
    allResults.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().includes(q.toLowerCase());
      const bNameMatch = b.name.toLowerCase().includes(q.toLowerCase());
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      return a.name.localeCompare(b.name);
    });

    console.log(`✅ Found ${allResults.length} matching products`);

    res.json({
      success: true,
      data: {
        products: allResults.slice(0, parseInt(limit)),
        total: allResults.length,
      },
    });
  } catch (error) {
    console.error("❌ SEARCH ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi tìm kiếm",
      data: {
        products: [],
        total: 0,
      },
    });
  }
};

// ============================================
// GET PRODUCT STATISTICS
// ============================================
export const getProductStats = async (req, res) => {
  try {
    const categories = await Category.find({ active: true });
    const stats = [];

    for (const category of categories) {
      try {
        const Model = await getModelForCategory(category.name);
        if (!Model) continue;

        const [total, available, outOfStock] = await Promise.all([
          Model.countDocuments(),
          Model.countDocuments({ status: "AVAILABLE" }),
          Model.countDocuments({ status: "OUT_OF_STOCK" }),
        ]);

        stats.push({
          category: category.name,
          slug: category.slug,
          total,
          available,
          outOfStock,
        });
      } catch (error) {
        console.error(
          `Error getting stats for ${category.name}:`,
          error.message
        );
      }
    }

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error("❌ GET STATS ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi lấy thống kê",
    });
  }
};

// ============================================
// EXPORT
// ============================================
export default {
  getAllProducts,
  getProductsByCategory,
  searchProducts,
  getProductStats,
};
