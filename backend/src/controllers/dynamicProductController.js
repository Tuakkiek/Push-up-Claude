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
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

// ============================================
// DYNAMIC PRODUCT SCHEMA
// ============================================
const createDynamicProductSchema = (category) => {
  return new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      model: { type: String, required: true, trim: true },
      baseSlug: { type: String, required: true, unique: true, sparse: true },
      slug: { type: String, sparse: true },
      description: { type: String, trim: true, default: "" },

      featuredImages: [{ type: String, trim: true }],
      videoUrl: { type: String, trim: true, default: "" },

      specifications: { type: mongoose.Schema.Types.Mixed, default: {} },

      variants: [
        { type: mongoose.Schema.Types.ObjectId, ref: `${category}Variant` },
      ],

      condition: {
        type: String,
        enum: ["NEW", "LIKE_NEW"],
        default: "NEW",
      },
      brand: { type: String, default: "Apple", trim: true },
      productType: { type: String, required: true, default: category },
      category: { type: String, required: true, default: category },

      status: {
        type: String,
        enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "PRE_ORDER"],
        default: "AVAILABLE",
      },

      installmentBadge: {
        type: String,
        enum: ["NONE", "Trả góp 0%", "Trả góp 0%, trả trước 0đ"],
        default: "NONE",
      },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      averageRating: { type: Number, default: 0, min: 0, max: 5 },
      totalReviews: { type: Number, default: 0, min: 0 },
      salesCount: { type: Number, default: 0, min: 0 },
    },
    { timestamps: true }
  );
};

const createDynamicVariantSchema = (category) => {
  return new mongoose.Schema(
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: category,
        required: true,
      },
      color: { type: String, required: true, trim: true },
      variantName: { type: String, required: true, trim: true },
      originalPrice: { type: Number, required: true, min: 0 },
      price: { type: Number, required: true, min: 0 },
      stock: { type: Number, required: true, min: 0, default: 0 },
      images: [{ type: String, trim: true }],
      sku: { type: String, required: true, unique: true },
      slug: { type: String, required: true, sparse: true },
      salesCount: { type: Number, default: 0, min: 0 },

      // Dynamic fields
      specs: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
    { timestamps: true }
  );
};

// ============================================
// GET OR CREATE MODEL
// ============================================
const getOrCreateModel = (category, isVariant = false) => {
  const modelName = isVariant ? `${category}Variant` : category;

  try {
    return mongoose.model(modelName);
  } catch {
    const schema = isVariant
      ? createDynamicVariantSchema(category)
      : createDynamicProductSchema(category);

    return mongoose.model(modelName, schema);
  }
};

// ============================================
// CREATE PRODUCT
// ============================================
export const createDynamicProduct = async (req, res) => {
  const { category } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Validate category exists
    const categoryDoc = await Category.findOne({ slug: category });
    if (!categoryDoc) {
      throw new Error("Category không tồn tại");
    }

    const {
      createVariants,
      variants,
      slug: frontendSlug,
      ...productData
    } = req.body;

    if (!productData.name?.trim()) throw new Error("Tên sản phẩm là bắt buộc");
    if (!productData.model?.trim()) throw new Error("Model là bắt buộc");
    if (!productData.createdBy) throw new Error("createdBy là bắt buộc");

    const finalSlug =
      frontendSlug?.trim() || createSlug(productData.model.trim());
    if (!finalSlug) throw new Error("Không thể tạo slug từ model");

    const ProductModel = getOrCreateModel(categoryDoc.name);
    const VariantModel = getOrCreateModel(categoryDoc.name, true);

    const existingBySlug = await ProductModel.findOne({
      $or: [{ slug: finalSlug }, { baseSlug: finalSlug }],
    }).session(session);

    if (existingBySlug) throw new Error(`Slug đã tồn tại: ${finalSlug}`);

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
        }
      }

      product.variants = createdVariantIds;
      await product.save({ session });
    }

    await session.commitTransaction();

    const populated = await ProductModel.findById(product._id)
      .populate("variants")
      .populate("createdBy", "fullName email");

    res.status(201).json({
      success: true,
      message: "Tạo sản phẩm thành công",
      data: { product: populated },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("CREATE DYNAMIC PRODUCT ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi tạo sản phẩm",
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// FIND ALL PRODUCTS
// ============================================
export const findAllDynamicProducts = async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 12, search, status } = req.query;

    const categoryDoc = await Category.findOne({ slug: category });
    if (!categoryDoc) {
      return res.status(404).json({
        success: false,
        message: "Category không tồn tại",
      });
    }

    const ProductModel = getOrCreateModel(categoryDoc.name);
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
      ];
    }
    if (status) query.status = status;

    const [products, count] = await Promise.all([
      ProductModel.find(query)
        .populate("variants")
        .populate("createdBy", "fullName")
        .skip((page - 1) * limit)
        .limit(+limit)
        .sort({ createdAt: -1 }),
      ProductModel.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        products,
        totalPages: Math.ceil(count / limit),
        currentPage: +page,
        total: count,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    const ProductModel = getOrCreateModel(categoryDoc.name);
    const VariantModel = getOrCreateModel(categoryDoc.name, true);

    let variant = await VariantModel.findOne({ slug });
    let product = null;

    if (variant) {
      product = await ProductModel.findById(variant.productId)
        .populate("variants")
        .populate("createdBy", "fullName email");

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      if (skuQuery) {
        const variantBySku = product.variants.find((v) => v.sku === skuQuery);
        if (variantBySku) variant = variantBySku;
      }
    } else {
      product = await ProductModel.findOne({
        $or: [{ baseSlug: slug }, { slug: slug }],
      })
        .populate("variants")
        .populate("createdBy", "fullName email");

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
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
    console.error("getDynamicProductDetail error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
};

// ============================================
// UPDATE & DELETE
// ============================================
export const updateDynamicProduct = async (req, res) => {
  const { category, id } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const categoryDoc = await Category.findOne({ slug: category });
    if (!categoryDoc) throw new Error("Category không tồn tại");

    const ProductModel = getOrCreateModel(categoryDoc.name);
    const VariantModel = getOrCreateModel(categoryDoc.name, true);

    const product = await ProductModel.findById(id).session(session);
    if (!product) throw new Error("Không tìm thấy sản phẩm");

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

    const populated = await ProductModel.findById(id)
      .populate("variants")
      .populate("createdBy", "fullName email");

    res.json({
      success: true,
      message: "Cập nhật thành công",
      data: { product: populated },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("UPDATE ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi cập nhật",
    });
  } finally {
    session.endSession();
  }
};

export const deleteDynamicProduct = async (req, res) => {
  const { category, id } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const categoryDoc = await Category.findOne({ slug: category });
    if (!categoryDoc) throw new Error("Category không tồn tại");

    const ProductModel = getOrCreateModel(categoryDoc.name);
    const VariantModel = getOrCreateModel(categoryDoc.name, true);

    const product = await ProductModel.findById(id).session(session);
    if (!product) throw new Error("Không tìm thấy sản phẩm");

    await VariantModel.deleteMany({ productId: product._id }, { session });
    await product.deleteOne({ session });

    await session.commitTransaction();
    res.json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

export default {
  createDynamicProduct,
  findAllDynamicProducts,
  getDynamicProductDetail,
  updateDynamicProduct,
  deleteDynamicProduct,
};
