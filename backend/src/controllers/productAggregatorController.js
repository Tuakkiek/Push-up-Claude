// backend/src/controllers/productAggregatorController.js
import mongoose from "mongoose";
import Category from "../models/Category.js";
import IPhone, { IPhoneVariant } from "../models/IPhone.js";
import IPad, { IPadVariant } from "../models/IPad.js";
import Mac, { MacVariant } from "../models/Mac.js";
import AirPods, { AirPodsVariant } from "../models/AirPods.js";
import AppleWatch, { AppleWatchVariant } from "../models/AppleWatch.js";
import Accessory, { AccessoryVariant } from "../models/Accessory.js";

// ============================================
// FIXED CATEGORIES MAPPING
// ============================================
const FIXED_MODELS = {
  iPhone: { Product: IPhone, Variant: IPhoneVariant },
  iPad: { Product: IPad, Variant: IPadVariant },
  Mac: { Product: Mac, Variant: MacVariant },
  AirPods: { Product: AirPods, Variant: AirPodsVariant },
  AppleWatch: { Product: AppleWatch, Variant: AppleWatchVariant },
  Accessories: { Product: Accessory, Variant: AccessoryVariant },
};

// ============================================
// HELPER: Get all MongoDB collections
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
// HELPER: Find collection for category
// ============================================
const findCollectionForCategory = async (categoryName) => {
  const allCollections = await getAllCollections();
  const categoryLower = categoryName.toLowerCase();

  const patterns = [
    categoryName,
    categoryLower,
    `${categoryLower}s`,
    `${categoryName}s`,
  ];

  for (const pattern of patterns) {
    if (allCollections.includes(pattern)) {
      console.log(`✅ Found collection: ${pattern} for ${categoryName}`);
      return pattern;
    }
  }

  console.warn(`⚠️ No collection found for ${categoryName}`);
  return null;
};

// ============================================
// HELPER: Create dynamic schema
// ============================================
const createDynamicSchema = (isVariant = false) => {
  if (isVariant) {
    return new mongoose.Schema(
      {
        productId: { type: mongoose.Schema.Types.ObjectId, required: true },
        color: { type: String, required: true },
        variantName: { type: String, required: true },
        originalPrice: { type: Number, required: true },
        price: { type: Number, required: true },
        stock: { type: Number, required: true, default: 0 },
        images: [{ type: String }],
        sku: { type: String, required: true, unique: true },
        slug: { type: String, required: true },
        salesCount: { type: Number, default: 0 },
      },
      { timestamps: true, strict: false }
    );
  }

  return new mongoose.Schema(
    {
      name: { type: String, required: true },
      model: { type: String, required: true },
      slug: { type: String, required: true },
      baseSlug: { type: String, required: true },
      description: { type: String, default: "" },
      specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
      variants: [{ type: mongoose.Schema.Types.ObjectId }],
      condition: { type: String, default: "NEW" },
      brand: { type: String, default: "Apple" },
      category: { type: String, required: true },
      productType: { type: String, required: true },
      status: { type: String, default: "AVAILABLE" },
      installmentBadge: { type: String, default: "NONE" },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      salesCount: { type: Number, default: 0 },
      featuredImages: [{ type: String }],
      videoUrl: { type: String, default: "" },
    },
    { timestamps: true, strict: false }
  );
};

// ============================================
// HELPER: Get or Create Models for Category
// ============================================
const getOrCreateModels = async (categoryName) => {
  console.log(`🔍 Getting models for: ${categoryName}`);

  // Check if fixed category
  if (FIXED_MODELS[categoryName]) {
    console.log(`✅ Using FIXED models for ${categoryName}`);
    return FIXED_MODELS[categoryName];
  }

  // Dynamic category
  const productModelName = categoryName;
  const variantModelName = `${categoryName}Variant`;

  try {
    // Try to get existing models
    const ProductModel = mongoose.model(productModelName);
    const VariantModel = mongoose.model(variantModelName);
    console.log(
      `✅ Found existing models: ${productModelName}, ${variantModelName}`
    );
    return { Product: ProductModel, Variant: VariantModel };
  } catch {
    // Models don't exist, create them
    console.log(`🔨 Creating dynamic models for ${categoryName}`);

    const productCollection = await findCollectionForCategory(categoryName);
    if (!productCollection) {
      console.error(`❌ No collection found for ${categoryName}`);
      return null;
    }

    const variantCollection = `${productCollection.replace(/s$/, "")}variants`;

    const productSchema = createDynamicSchema(false);
    const variantSchema = createDynamicSchema(true);

    const ProductModel = mongoose.model(
      productModelName,
      productSchema,
      productCollection
    );
    const VariantModel = mongoose.model(
      variantModelName,
      variantSchema,
      variantCollection
    );

    console.log(
      `✅ Created models: ${productModelName} → ${productCollection}`
    );
    console.log(
      `✅ Created models: ${variantModelName} → ${variantCollection}`
    );

    return { Product: ProductModel, Variant: VariantModel };
  }
};

// ============================================
// GET ALL PRODUCTS (ALL CATEGORIES)
// ============================================
export const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 1000, search, status } = req.query;

    console.log("🔵 getAllProducts:", { page, limit, search, status });

    // Get all active categories
    const categories = await Category.find({ active: true }).lean();
    console.log(
      `📦 Found ${categories.length} active categories:`,
      categories.map((c) => c.name)
    );

    const allProducts = [];
    const User = mongoose.model("User");

    // Fetch products from each category
    for (const category of categories) {
      try {
        const models = await getOrCreateModels(category.name);

        if (!models || !models.Product || !models.Variant) {
          console.warn(`⚠️ No models for ${category.name}`);
          continue;
        }

        const query = {};
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { model: { $regex: search, $options: "i" } },
          ];
        }
        if (status) {
          query.status = status;
        }

        const products = await models.Product.find(query)
          .sort({ createdAt: -1 })
          .lean();

        console.log(`📦 ${category.name}: Found ${products.length} products`);

        // Populate variants and user for each product
        for (const product of products) {
          // Populate variants
          if (product.variants && product.variants.length > 0) {
            const variants = await models.Variant.find({
              _id: { $in: product.variants },
            }).lean();
            product.variants = variants;
            console.log(`  ✅ ${product.name}: ${variants.length} variants`);
          } else {
            product.variants = [];
          }

          // Populate user
          if (product.createdBy) {
            const user = await User.findById(product.createdBy)
              .select("fullName email")
              .lean();
            product.createdBy = user;
          }

          // Add category info
          product.category = category.name;
          product.categorySlug = category.slug;
        }

        allProducts.push(...products);
      } catch (error) {
        console.error(`❌ Error loading ${category.name}:`, error.message);
      }
    }

    // Apply pagination
    const total = allProducts.length;
    const skip = (page - 1) * limit;
    const paginatedProducts = allProducts.slice(skip, skip + parseInt(limit));

    console.log(`✅ Total: ${total}, Returning: ${paginatedProducts.length}`);

    res.json({
      success: true,
      data: {
        products: paginatedProducts,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
      },
    });
  } catch (error) {
    console.error("❌ getAllProducts error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
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
// GET PRODUCTS BY CATEGORY
// ============================================
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12, search, status } = req.query;

    console.log("🔵 getProductsByCategory:", { category, page, limit });

    // Find category by slug or name
    const categoryDoc = await Category.findOne({
      $or: [{ slug: category }, { name: category }],
      active: true,
    });

    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Category không tồn tại",
      });
    }

    console.log(
      `✅ Found category: ${categoryDoc.name} (slug: ${categoryDoc.slug})`
    );

    const models = await getOrCreateModels(categoryDoc.name);

    if (!models || !models.Product || !models.Variant) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy model cho category này",
      });
    }

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
      ];
    }
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      models.Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      models.Product.countDocuments(query),
    ]);

    console.log(`📦 Found ${products.length}/${total} products`);

    // Populate variants and user
    const User = mongoose.model("User");

    for (const product of products) {
      // Populate variants
      if (product.variants && product.variants.length > 0) {
        const variants = await models.Variant.find({
          _id: { $in: product.variants },
        }).lean();
        product.variants = variants;
        console.log(`  ✅ ${product.name}: ${variants.length} variants`);
      } else {
        product.variants = [];
      }

      // Populate user
      if (product.createdBy) {
        const user = await User.findById(product.createdBy)
          .select("fullName email")
          .lean();
        product.createdBy = user;
      }
    }

    console.log(
      `✅ ${categoryDoc.name}: Returning ${products.length} products with variants`
    );

    res.json({
      success: true,
      data: {
        products,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
      },
    });
  } catch (error) {
    console.error("❌ getProductsByCategory error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
      data: {
        products: [],
        total: 0,
        totalPages: 0,
        currentPage: 1,
      },
    });
  }
};

export default {
  getAllProducts,
  getProductsByCategory,
};
