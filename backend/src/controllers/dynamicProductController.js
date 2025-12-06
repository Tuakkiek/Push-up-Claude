// backend/src/controllers/dynamicProductController.js
import mongoose from "mongoose";
import Category from "../models/Category.js";
import { getNextSku } from "../lib/generateSKU.js";

// Helper: Tạo slug chuẩn SEO
const createSlug = (str) =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

// ============================================
// CREATE DYNAMIC PRODUCT SCHEMA - NO REF
// ============================================
const createDynamicProductSchema = (category) => {
  return new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      model: { type: String, required: true, trim: true },
      baseSlug: { type: String, required: true, sparse: true },
      slug: { type: String, sparse: true },
      description: { type: String, trim: true, default: "" },
      featuredImages: [{ type: String, trim: true }],
      videoUrl: { type: String, trim: true, default: "" },
      specifications: { type: mongoose.Schema.Types.Mixed, default: {} },

      // ✅ DON'T USE REF - just store ObjectIds
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
    {
      timestamps: true,
      strict: false,
      collection: undefined,
    }
  );
};

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

  const patterns = [
    categoryName,
    categoryLower,
    `${categoryLower}s`,
    `${categoryName}s`,
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
// CREATE DYNAMIC VARIANT SCHEMA
// ============================================
const createDynamicVariantSchema = (category) => {
  return new mongoose.Schema(
    {
      productId: { type: mongoose.Schema.Types.ObjectId, required: true },
      color: { type: String, required: true, trim: true },
      variantName: { type: String, required: true, trim: true },
      originalPrice: { type: Number, required: true, min: 0 },
      price: { type: Number, required: true, min: 0 },
      stock: { type: Number, required: true, min: 0, default: 0 },
      images: [{ type: String, trim: true }],
      sku: { type: String, required: true, unique: true },
      slug: { type: String, required: true, sparse: true },
      salesCount: { type: Number, default: 0, min: 0 },
      specs: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    {
      timestamps: true,
      strict: false,
      collection: undefined,
    }
  );
};

// ============================================
// GET OR CREATE MODEL
// ============================================
const getOrCreateModel = async (category, isVariant = false) => {
  const modelName = isVariant ? `${category}Variant` : category;

  try {
    return mongoose.model(modelName);
  } catch {
    try {
      console.log(`🔨 Creating dynamic model: ${modelName}`);

      const baseCollection = await findCollectionForCategory(category);

      if (!baseCollection) {
        console.error(`❌ No collection found for ${category}`);
        return null;
      }

      const collectionName = isVariant
        ? `${baseCollection.replace(/s$/, "")}variants`
        : baseCollection;

      console.log(`📦 Using collection: ${collectionName}`);

      const schema = isVariant
        ? createDynamicVariantSchema(category)
        : createDynamicProductSchema(category);

      schema.set("strict", false);

      const model = mongoose.model(modelName, schema, collectionName);
      console.log(`✅ Model registered: ${modelName} → ${collectionName}`);

      return model;
    } catch (error) {
      console.error(`❌ Failed to create model ${modelName}:`, error);
      return null;
    }
  }
};

// ============================================
// ✅ FIXED: FIND ALL PRODUCTS - PROPER POPULATION
// ============================================
export const findAllDynamicProducts = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12, search, status } = req.query;

    console.log("🔵 findAllDynamicProducts:", { category, page, limit });

    const categoryDoc = await Category.findOne({ slug: category });
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Category không tồn tại",
      });
    }

    const ProductModel = await getOrCreateModel(categoryDoc.name);
    const VariantModel = await getOrCreateModel(categoryDoc.name, true);
    
    if (!ProductModel || !VariantModel) {
      return res.status(500).json({
        success: false,
        message: "Không thể tạo model",
        data: { products: [], total: 0, totalPages: 0, currentPage: 1 },
      });
    }

    console.log("📦 Models:", ProductModel.modelName, VariantModel.modelName);
    console.log("📦 Collections:", ProductModel.collection.name, VariantModel.collection.name);

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
      ];
    }
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const limitNum = parseInt(limit);

    // ✅ FETCH PRODUCTS
    const [products, count] = await Promise.all([
      ProductModel.find(query)
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 })
        .lean(),
      ProductModel.countDocuments(query),
    ]);

    console.log("✅ Raw products found:", products.length);

    // ✅ MANUALLY POPULATE VARIANTS & USER
    const User = mongoose.model('User');
    
    for (const product of products) {
      // Populate variants
      if (product.variants && product.variants.length > 0) {
        const variants = await VariantModel.find({
          _id: { $in: product.variants }
        }).lean();
        
        console.log(`✅ ${product.name}: ${variants.length} variants`);
        product.variants = variants;
      } else {
        product.variants = [];
      }

      // Populate createdBy
      if (product.createdBy) {
        const user = await User.findById(product.createdBy)
          .select('fullName email')
          .lean();
        product.createdBy = user;
      }
    }

    console.log("✅ Final products with variants:", products.length);

    res.json({
      success: true,
      data: {
        products: products || [],
        totalPages: Math.ceil(count / limitNum),
        currentPage: parseInt(page),
        total: count || 0,
      },
    });
  } catch (error) {
    console.error("❌ FIND ALL ERROR:", error);
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
// CREATE PRODUCT
// ============================================
export const createDynamicProduct = async (req, res) => {
  const { category } = req.params;
  let session = null;
  let transactionStarted = false;

  try {
    console.log("🔵 START: Create dynamic product for category:", category);

    const categoryDoc = await Category.findOne({ slug: category });
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Category không tồn tại",
      });
    }

    const {
      createVariants,
      variants,
      slug: frontendSlug,
      ...productData
    } = req.body;

    if (!productData.name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên sản phẩm là bắt buộc",
      });
    }
    if (!productData.model?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Model là bắt buộc",
      });
    }
    if (!productData.createdBy) {
      return res.status(400).json({
        success: false,
        message: "createdBy là bắt buộc",
      });
    }

    const finalSlug =
      frontendSlug?.trim() || createSlug(productData.model.trim());
    if (!finalSlug) {
      return res.status(400).json({
        success: false,
        message: "Không thể tạo slug từ model",
      });
    }

    const ProductModel = await getOrCreateModel(categoryDoc.name);
    const VariantModel = await getOrCreateModel(categoryDoc.name, true);

    const existingBySlug = await ProductModel.findOne({
      $or: [{ slug: finalSlug }, { baseSlug: finalSlug }],
    });

    if (existingBySlug) {
      return res.status(400).json({
        success: false,
        message: `Slug đã tồn tại: ${finalSlug}`,
      });
    }

    session = await mongoose.startSession();
    session.startTransaction();
    transactionStarted = true;
    console.log("✅ Transaction started");

    const product = new ProductModel({
      name: productData.name.trim(),
      model: productData.model.trim(),
      slug: finalSlug,
      baseSlug: finalSlug,
      description: productData.description?.trim() || "",
      specifications: productData.specifications || {},
      condition: productData.condition || "NEW",
      brand: productData.brand || "Apple",
      category: categoryDoc.name,
      productType: categoryDoc.name,
      status: productData.status || "AVAILABLE",
      installmentBadge: productData.installmentBadge || "NONE",
      createdBy: productData.createdBy,
      featuredImages: productData.featuredImages || [],
      videoUrl: productData.videoUrl?.trim() || "",
      averageRating: 0,
      totalReviews: 0,
      salesCount: 0,
      variants: [],
    });

    await product.save({ session });
    console.log("✅ Product saved:", product._id);

    const variantGroups = createVariants || variants || [];
    const createdVariantIds = [];

    if (variantGroups.length > 0) {
      for (const group of variantGroups) {
        const { color, images = [], options = [] } = group;
        if (!color?.trim() || !Array.isArray(options) || options.length === 0)
          continue;

        for (const opt of options) {
          if (!opt.variantName?.trim()) continue;

          const sku = await getNextSku();
          const variantSlug = `${finalSlug}-${createSlug(
            opt.variantName.trim()
          )}`;

          const variantDoc = new VariantModel({
            productId: product._id,
            color: color.trim(),
            variantName: opt.variantName.trim(),
            originalPrice: Number(opt.originalPrice) || 0,
            price: Number(opt.price) || 0,
            stock: Number(opt.stock) || 0,
            images: images.filter((img) => img?.trim()),
            sku,
            slug: variantSlug,
            specs: opt.specs || {},
          });

          await variantDoc.save({ session });
          createdVariantIds.push(variantDoc._id);
          console.log("✅ Variant saved:", variantDoc._id);
        }
      }

      product.variants = createdVariantIds;
      await product.save({ session });
      console.log("✅ Product updated with variant IDs");
    }

    await session.commitTransaction();
    transactionStarted = false;
    console.log("✅ Transaction committed successfully");

    // ✅ POPULATE AFTER COMMIT
    const User = mongoose.model("User");
    const populated = await ProductModel.findById(product._id).lean();

    if (populated.variants && populated.variants.length > 0) {
      populated.variants = await VariantModel.find({
        _id: { $in: populated.variants },
      }).lean();
    }

    if (populated.createdBy) {
      populated.createdBy = await User.findById(populated.createdBy)
        .select("fullName email")
        .lean();
    }

    console.log("✅ Product created successfully:", populated._id);

    res.status(201).json({
      success: true,
      message: "Tạo sản phẩm thành công",
      data: { product: populated },
    });
  } catch (error) {
    console.error("❌ CREATE ERROR:", error);

    if (session && transactionStarted) {
      try {
        await session.abortTransaction();
        console.log("⚠️ Transaction aborted");
      } catch (abortError) {
        console.error("❌ Error aborting transaction:", abortError.message);
      }
    }

    res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi tạo sản phẩm",
    });
  } finally {
    if (session) {
      await session.endSession();
      console.log("🔴 Session ended");
    }
  }
};

// ============================================
// GET PRODUCT DETAIL
// ============================================
export const getDynamicProductDetail = async (req, res) => {
  try {
    const { category, id } = req.params;
    const slug = id;
    const skuQuery = req.query.sku?.trim();

    const categoryDoc = await Category.findOne({ slug: category });
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Category không tồn tại",
      });
    }

    const ProductModel = await getOrCreateModel(categoryDoc.name);
    const VariantModel = await getOrCreateModel(categoryDoc.name, true);

    let variant = await VariantModel.findOne({ slug }).lean();
    let product = null;

    if (variant) {
      product = await ProductModel.findById(variant.productId).lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      // Populate variants
      if (product.variants && product.variants.length > 0) {
        product.variants = await VariantModel.find({
          _id: { $in: product.variants },
        }).lean();
      }

      // Populate user
      if (product.createdBy) {
        const User = mongoose.model("User");
        product.createdBy = await User.findById(product.createdBy)
          .select("fullName email")
          .lean();
      }

      if (skuQuery) {
        const variantBySku = product.variants.find((v) => v.sku === skuQuery);
        if (variantBySku) variant = variantBySku;
      }
    } else {
      product = await ProductModel.findOne({
        $or: [{ baseSlug: slug }, { slug: slug }],
      }).lean();

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      // Populate variants
      if (product.variants && product.variants.length > 0) {
        product.variants = await VariantModel.find({
          _id: { $in: product.variants },
        }).lean();
      } else {
        product.variants = [];
      }

      // Populate user
      if (product.createdBy) {
        const User = mongoose.model("User");
        product.createdBy = await User.findById(product.createdBy)
          .select("fullName email")
          .lean();
      }

      const variants = product.variants || [];
      variant = variants.find((v) => v.stock > 0) || variants[0];

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Sản phẩm không có biến thể",
        });
      }

      return res.json({
        success: true,
        redirect: true,
        redirectSlug: variant.slug,
        redirectSku: variant.sku,
        data: {
          product,
          selectedVariantSku: variant.sku,
        },
      });
    }

    res.json({
      success: true,
      data: {
        product,
        selectedVariantSku: variant.sku,
      },
    });
  } catch (error) {
    console.error("GET DETAIL ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
};

// ============================================
// UPDATE PRODUCT
// ============================================
export const updateDynamicProduct = async (req, res) => {
  const { category, id } = req.params;
  let session = null;
  let transactionStarted = false;

  try {
    const categoryDoc = await Category.findOne({ slug: category });
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Category không tồn tại",
      });
    }

    const ProductModel = getOrCreateModel(categoryDoc.name);
    const VariantModel = getOrCreateModel(categoryDoc.name, true);

    const product = await ProductModel.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    session = await mongoose.startSession();
    session.startTransaction();
    transactionStarted = true;

    const { createVariants, variants, slug: frontendSlug, ...data } = req.body;

    if (data.name) product.name = data.name.trim();
    if (data.description !== undefined)
      product.description = data.description?.trim() || "";
    if (data.condition) product.condition = data.condition;
    if (data.status) product.status = data.status;
    if (data.specifications) product.specifications = data.specifications;
    if (data.featuredImages !== undefined)
      product.featuredImages = data.featuredImages;
    if (data.videoUrl !== undefined)
      product.videoUrl = data.videoUrl?.trim() || "";

    await product.save({ session });

    const variantGroups = createVariants || variants || [];
    if (variantGroups.length > 0) {
      await VariantModel.deleteMany({ productId: id }, { session });
      const newIds = [];

      for (const g of variantGroups) {
        const { color, images = [], options = [] } = g;
        if (!color?.trim() || !options.length) continue;

        for (const opt of options) {
          if (!opt.variantName?.trim()) continue;

          const sku = await getNextSku();
          const variantSlug = `${product.baseSlug}-${createSlug(
            opt.variantName.trim()
          )}`;

          const v = new VariantModel({
            productId: id,
            color: color.trim(),
            variantName: opt.variantName.trim(),
            originalPrice: Number(opt.originalPrice) || 0,
            price: Number(opt.price) || 0,
            stock: Number(opt.stock) || 0,
            images: images.filter((i) => i?.trim()),
            sku,
            slug: variantSlug,
            specs: opt.specs || {},
          });

          await v.save({ session });
          newIds.push(v._id);
        }
      }

      product.variants = newIds;
      await product.save({ session });
    }

    await session.commitTransaction();
    transactionStarted = false;

    const populated = await ProductModel.findById(id)
      .populate("variants")
      .populate("createdBy", "fullName email");

    res.json({
      success: true,
      message: "Cập nhật thành công",
      data: { product: populated },
    });
  } catch (error) {
    if (session && transactionStarted) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Error aborting transaction:", abortError.message);
      }
    }

    console.error("UPDATE ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi cập nhật",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

// ============================================
// DELETE PRODUCT
// ============================================
export const deleteDynamicProduct = async (req, res) => {
  const { category, id } = req.params;
  let session = null;
  let transactionStarted = false;

  try {
    const categoryDoc = await Category.findOne({ slug: category });
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Category không tồn tại",
      });
    }

    const ProductModel = getOrCreateModel(categoryDoc.name);
    const VariantModel = getOrCreateModel(categoryDoc.name, true);

    const product = await ProductModel.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    session = await mongoose.startSession();
    session.startTransaction();
    transactionStarted = true;

    await VariantModel.deleteMany({ productId: product._id }, { session });
    await product.deleteOne({ session });

    await session.commitTransaction();
    transactionStarted = false;

    res.json({
      success: true,
      message: "Xóa thành công",
    });
  } catch (error) {
    if (session && transactionStarted) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Error aborting transaction:", abortError.message);
      }
    }

    console.error("DELETE ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export default {
  createDynamicProduct,
  findAllDynamicProducts,
  getDynamicProductDetail,
  updateDynamicProduct,
  deleteDynamicProduct,
};
