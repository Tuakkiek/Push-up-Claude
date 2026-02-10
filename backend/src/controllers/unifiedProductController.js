// ============================================
// FILE: backend/src/controllers/unifiedProductController.js
// ✅ STEP 4: Unified Product Controller
// Purpose: Single controller for ALL product types
// Replaces: 6 separate controllers (iPhone, iPad, Mac, etc.)
// ============================================

import mongoose from "mongoose";
import UnifiedProduct from "../models/UnifiedProduct.js";
import UnifiedVariant from "../models/UnifiedVariant.js";
import ProductType from "../models/ProductType.js";
import { getNextSku } from "../lib/generateSKU.js";

// ============================================
// HELPER: Create SEO-friendly slug
// ============================================
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
// HELPER: Validate specifications against ProductType schema
// ============================================
const validateSpecifications = async (productTypeId, specifications) => {
  const productType = await ProductType.findById(productTypeId);
  
  if (!productType) {
    throw new Error("ProductType không tồn tại");
  }

  const requiredFields = productType.specificationFields
    .filter((field) => field.required)
    .map((field) => field.name);

  const missingFields = requiredFields.filter(
    (field) => !specifications || !specifications[field]
  );

  if (missingFields.length > 0) {
    throw new Error(
      `Thiếu các trường bắt buộc: ${missingFields.join(", ")}`
    );
  }

  // Validate field types
  for (const field of productType.specificationFields) {
    const value = specifications[field.name];
    
    if (!value && !field.required) continue;

    switch (field.type) {
      case "select":
        if (field.options && !field.options.includes(value)) {
          throw new Error(
            `${field.name} phải là một trong: ${field.options.join(", ")}`
          );
        }
        break;
      case "multiselect":
        if (field.options && Array.isArray(value)) {
          const invalid = value.filter((v) => !field.options.includes(v));
          if (invalid.length > 0) {
            throw new Error(
              `${field.name} chứa giá trị không hợp lệ: ${invalid.join(", ")}`
            );
          }
        }
        break;
      case "number":
        if (isNaN(Number(value))) {
          throw new Error(`${field.name} phải là số`);
        }
        break;
    }
  }

  return true;
};

// ============================================
// CREATE PRODUCT
// ============================================
export const create = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log("🆕 CREATE PRODUCT REQUEST:", JSON.stringify(req.body, null, 2));

    const {
      createVariants,
      variants,
      slug: frontendSlug,
      productTypeId,
      ...productData
    } = req.body;

    // === 1. VALIDATE REQUIRED FIELDS ===
    if (!productData.name?.trim()) {
      throw new Error("Tên sản phẩm là bắt buộc");
    }
    if (!productData.model?.trim()) {
      throw new Error("Model là bắt buộc");
    }
    if (!productTypeId) {
      throw new Error("ProductType là bắt buộc");
    }
    if (!productData.createdBy) {
      throw new Error("createdBy là bắt buộc");
    }

    // === 2. VALIDATE SPECIFICATIONS ===
    await validateSpecifications(productTypeId, productData.specifications);

    // === 3. CREATE SLUG ===
    const finalSlug = frontendSlug?.trim() || createSlug(productData.model.trim());

    if (!finalSlug) {
      throw new Error("Không thể tạo slug từ model");
    }

    // Check for duplicate slug
    const existingBySlug = await UnifiedProduct.findOne({
      $or: [{ slug: finalSlug }, { baseSlug: finalSlug }],
    }).session(session);

    if (existingBySlug) {
      throw new Error(`Slug đã tồn tại: ${finalSlug}`);
    }

    console.log("✅ Generated slug:", finalSlug);

    // === 4. CREATE PRODUCT ===
    const product = new UnifiedProduct({
      name: productData.name.trim(),
      model: productData.model.trim(),
      slug: finalSlug,
      baseSlug: finalSlug,
      description: productData.description?.trim() || "",
      productTypeId,
      specifications: productData.specifications || {},
      condition: productData.condition || "NEW",
      brand: productData.brand || "Apple",
      status: productData.status || "AVAILABLE",
      installmentBadge: productData.installmentBadge || "NONE",
      createdBy: productData.createdBy,
      featuredImages: productData.featuredImages || [],
      videoUrl: productData.videoUrl?.trim() || "",
      variants: [],
    });

    await product.save({ session });
    console.log("✅ Product created:", product._id);

    // === 5. CREATE VARIANTS ===
    const variantGroups = createVariants || variants || [];
    const createdVariantIds = [];

    if (variantGroups.length > 0) {
      console.log(`📦 Processing ${variantGroups.length} variant group(s)`);

      for (const group of variantGroups) {
        const { color, images = [], options = [] } = group;

        if (!color?.trim()) {
          console.warn("⚠️ Skipping: missing color");
          continue;
        }
        if (!Array.isArray(options) || options.length === 0) {
          console.warn(`⚠️ Skipping ${color}: no options`);
          continue;
        }

        for (const opt of options) {
          if (!opt.versionName?.trim()) {
            console.warn(`⚠️ Skipping option: missing versionName`, opt);
            continue;
          }

          const sku = await getNextSku();
          const versionSlug = createSlug(opt.versionName.trim());
          const variantSlug = `${finalSlug}-${versionSlug}`;

          const variantDoc = new UnifiedVariant({
            productId: product._id,
            color: color.trim(),
            versionName: opt.versionName.trim(),
            originalPrice: Number(opt.originalPrice) || 0,
            price: Number(opt.price) || 0,
            stock: Number(opt.stock) || 0,
            images: images.filter((img) => img?.trim()),
            sku,
            slug: variantSlug,
          });

          await variantDoc.save({ session });
          createdVariantIds.push(variantDoc._id);
          console.log(`✅ Created variant: ${sku} → ${variantSlug}`);
        }
      }

      // Update product with variant IDs
      product.variants = createdVariantIds;
      await product.save({ session });
    }

    // === 6. COMMIT & RETURN ===
    await session.commitTransaction();

    const populated = await UnifiedProduct.findById(product._id)
      .populate("variants")
      .populate("productTypeId")
      .populate("createdBy", "fullName email");

    res.status(201).json({
      success: true,
      message: "Tạo sản phẩm thành công",
      data: { product: populated },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ CREATE ERROR:", error.message);
    console.error("Stack:", error.stack);

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({
        success: false,
        message: `Trường ${field} đã tồn tại: ${value}`,
      });
    }

    res.status(400).json({
      success: false,
      message: error.message || "Lỗi khi tạo sản phẩm",
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// UPDATE PRODUCT
// ============================================
export const update = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { createVariants, variants, slug: frontendSlug, ...data } = req.body;

    console.log("🔄 UPDATE PRODUCT REQUEST:", id);

    const product = await UnifiedProduct.findById(id).session(session);
    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }

    // === 1. UPDATE BASIC FIELDS ===
    if (data.name) product.name = data.name.trim();
    if (data.description !== undefined)
      product.description = data.description?.trim() || "";
    if (data.condition) product.condition = data.condition;
    if (data.status) product.status = data.status;
    if (data.installmentBadge)
      product.installmentBadge = data.installmentBadge;
    if (data.featuredImages !== undefined)
      product.featuredImages = data.featuredImages;
    if (data.videoUrl !== undefined)
      product.videoUrl = data.videoUrl?.trim() || "";

    // === 2. UPDATE SLUG ===
    let newSlug = product.slug || product.baseSlug;

    if (data.model && data.model.trim() !== product.model) {
      newSlug = createSlug(data.model.trim());
    } else if (frontendSlug?.trim()) {
      newSlug = frontendSlug.trim();
    }

    if (newSlug !== (product.slug || product.baseSlug)) {
      const slugExists = await UnifiedProduct.findOne({
        $or: [{ slug: newSlug }, { baseSlug: newSlug }],
        _id: { $ne: id },
      }).session(session);

      if (slugExists) {
        throw new Error(`Slug đã tồn tại: ${newSlug}`);
      }

      product.slug = newSlug;
      product.baseSlug = newSlug;
      product.model = data.model?.trim() || product.model;
      console.log("✅ Updated slug to:", newSlug);
    }

    // === 3. UPDATE SPECIFICATIONS ===
    if (data.specifications) {
      await validateSpecifications(product.productTypeId, data.specifications);
      product.specifications = data.specifications;
    }

    await product.save({ session });

    // === 4. UPDATE VARIANTS ===
    const variantGroups = createVariants || variants || [];
    if (variantGroups.length > 0) {
      console.log(`📦 Updating ${variantGroups.length} variant group(s)`);

      // Delete old variants
      await UnifiedVariant.deleteMany({ productId: id }, { session });
      const newIds = [];

      for (const g of variantGroups) {
        const { color, images = [], options = [] } = g;
        if (!color?.trim() || !options.length) continue;

        for (const opt of options) {
          if (!opt.versionName?.trim()) continue;

          const sku = await getNextSku();
          const versionSlug = createSlug(opt.versionName.trim());
          const variantSlug = `${product.baseSlug || product.slug}-${versionSlug}`;

          const v = new UnifiedVariant({
            productId: id,
            color: color.trim(),
            versionName: opt.versionName.trim(),
            originalPrice: Number(opt.originalPrice) || 0,
            price: Number(opt.price) || 0,
            stock: Number(opt.stock) || 0,
            images: images.filter((i) => i?.trim()),
            sku,
            slug: variantSlug,
          });

          await v.save({ session });
          newIds.push(v._id);
          console.log(`✅ Updated variant: ${sku} → ${variantSlug}`);
        }
      }

      product.variants = newIds;
      await product.save({ session });
    }

    await session.commitTransaction();

    const populated = await UnifiedProduct.findById(id)
      .populate("variants")
      .populate("productTypeId")
      .populate("createdBy", "fullName email");

    res.json({
      success: true,
      message: "Cập nhật thành công",
      data: { product: populated },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ UPDATE ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Lỗi cập nhật",
    });
  } finally {
    session.endSession();
  }
};

// ============================================
// GET ALL PRODUCTS (with filters)
// ============================================
export const findAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      status,
      productTypeId,
      productTypeSlug,
    } = req.query;

    const query = {};

    // Filter by search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by status
    if (status) query.status = status;

    // Filter by productType (ID or slug)
    if (productTypeId) {
      query.productTypeId = productTypeId;
    } else if (productTypeSlug) {
      const productType = await ProductType.findOne({ slug: productTypeSlug });
      if (productType) {
        query.productTypeId = productType._id;
      }
    }

    const [products, count] = await Promise.all([
      UnifiedProduct.find(query)
        .populate("variants")
        .populate("productTypeId")
        .populate("createdBy", "fullName")
        .skip((page - 1) * limit)
        .limit(+limit)
        .sort({ createdAt: -1 }),
      UnifiedProduct.countDocuments(query),
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
    console.error("❌ FIND ALL ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// GET ONE PRODUCT BY ID
// ============================================
export const findOne = async (req, res) => {
  try {
    const product = await UnifiedProduct.findById(req.params.id)
      .populate("variants")
      .populate("productTypeId")
      .populate("createdBy", "fullName email");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy sản phẩm",
      });
    }

    res.json({ success: true, data: { product } });
  } catch (error) {
    console.error("❌ FIND ONE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// GET PRODUCT BY SLUG
// ============================================
export const getProductDetail = async (req, res) => {
  try {
    const { slug } = req.params;
    const skuQuery = req.query.sku?.trim();

    console.log("🔍 GET PRODUCT DETAIL:", { slug, sku: skuQuery });

    // Try to find variant by slug first
    let variant = await UnifiedVariant.findOne({ slug });
    let product = null;

    if (variant) {
      // Variant found - get product
      product = await UnifiedProduct.findById(variant.productId)
        .populate("variants")
        .populate("productTypeId")
        .populate("createdBy", "fullName email");

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      // If SKU provided, switch to that variant
      if (skuQuery) {
        const variantBySku = product.variants.find((v) => v.sku === skuQuery);
        if (variantBySku) {
          variant = variantBySku;
          console.log("✅ Switched to variant by SKU:", skuQuery);
        }
      }
    } else {
      // Try to find product by baseSlug
      product = await UnifiedProduct.findOne({
        $or: [{ baseSlug: slug }, { slug: slug }],
      })
        .populate("variants")
        .populate("productTypeId")
        .populate("createdBy", "fullName email");

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      // Select first in-stock variant or first variant
      const variants = product.variants || [];
      variant = variants.find((v) => v.stock > 0) || variants[0];

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Sản phẩm không có biến thể",
        });
      }

      // Redirect to variant slug
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
    console.error("❌ GET PRODUCT DETAIL ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
};

// ============================================
// DELETE PRODUCT (cascade delete variants)
// ============================================
export const deleteProduct = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const product = await UnifiedProduct.findById(req.params.id).session(
      session
    );
    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }

    // Delete all variants
    await UnifiedVariant.deleteMany({ productId: product._id }, { session });
    console.log(`✅ Deleted variants for product ${product._id}`);

    // Delete product
    await product.deleteOne({ session });
    console.log(`✅ Deleted product ${product._id}`);

    await session.commitTransaction();
    res.json({ success: true, message: "Xóa thành công" });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ DELETE ERROR:", error);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

// ============================================
// GET VARIANTS FOR PRODUCT
// ============================================
export const getVariants = async (req, res) => {
  try {
    const variants = await UnifiedVariant.find({
      productId: req.params.id,
    }).sort({ color: 1, versionName: 1 });

    res.json({ success: true, data: { variants } });
  } catch (error) {
    console.error("❌ GET VARIANTS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================
export default {
  create,
  update,
  findAll,
  findOne,
  getProductDetail,
  deleteProduct,
  getVariants,
};
