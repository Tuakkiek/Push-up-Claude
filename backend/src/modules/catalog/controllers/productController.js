import Product from "../models/Product.js";
import Category from "../models/Category.js";
import SchemaValidationService from "../services/SchemaValidationService.js";
import { AppError } from "../../../shared/utils/AppError.js";
import { generateSKU } from "../../../shared/utils/generateSKU.js";
import { logEvent } from "../../../shared/infrastructure/logger.js";

const VARIANT_SAFETY_THRESHOLD = 50;

// Helper to infer request source for logging
const getSourceFromRequest = (req) =>
  req.body?.__source === "csv"
    ? "csv"
    : req.body?.__source === "json"
    ? "json"
    : "manual";

// Transform and validate incoming product payload into Product model shape
const transformAndValidateProductPayload = async (req, { validateOnly = false } = {}) => {
  const {
    name,
    slug,
    description,
    categoryId,
    brand,
    model,
    specs,
    specifications,
    variants,
    featuredImages,
    videoUrl,
    condition,
    status,
    createdBy,
  } = req.body || {};

  if (!categoryId) {
    throw new AppError("categoryId is required", 400);
  }

  const category = await Category.findById(categoryId);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  const schemaVersion = category.version;

  // Specs mapping
  const rawSpecs = specs || specifications || {};
  const { errors: specErrors, unknownKeys: specUnknown } =
    SchemaValidationService.validateWithDetails(rawSpecs, category.specSchema || [], "spec");
  if (!validateOnly && specErrors.length > 0) {
    throw new AppError(`Invalid Specifications: ${specErrors.join(", ")}`, 400);
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    throw new AppError("Product must have at least one variant", 400);
  }

  const variantSchema = category.variantSchema || [];
  const transformedVariants = [];
  const allUnknownVariantKeys = [];

  // Decide input mode
  const isExplicitVariantArray =
    variants.length > 0 &&
    variants.every(
      (v) =>
        typeof v === "object" &&
        v !== null &&
        ("attributes" in v || "price" in v || "stock" in v)
    );

  let generationMode = "explicit";

  if (isExplicitVariantArray) {
    // Payload already has final variants: { attributes, price, stock, sku?, status? }
    variants.forEach((variant, index) => {
      const attributesRaw = variant.attributes || {};
      const { errors, unknownKeys } = SchemaValidationService.validateWithDetails(
        attributesRaw,
        variantSchema,
        `variant[${index}]`
      );
      if (!validateOnly && errors.length > 0) {
        throw new AppError(`Invalid Variant attributes: ${errors.join(", ")}`, 400);
      }
      allUnknownVariantKeys.push(...unknownKeys);

      const price = Number(variant.price);
      const stock = Number(variant.stock);
      const originalPrice =
        variant.originalPrice !== undefined ? Number(variant.originalPrice) : price;

      if (!validateOnly) {
        if (Number.isNaN(price) || price < 0) {
          throw new AppError(`Variant[${index}] price must be a non-negative number`, 400);
        }
        if (Number.isNaN(stock) || stock < 0) {
          throw new AppError(`Variant[${index}] stock must be a non-negative number`, 400);
        }
      }

      const attrsForSku = {
        ...attributesRaw,
      };

      const skuValue =
        variant.sku ||
        generateSKU(category.slug, model || slug || name, attrsForSku.color, attrsForSku);

      transformedVariants.push({
        sku: String(skuValue).normalize("NFC"),
        price: Number.isNaN(price) ? 0 : price,
        originalPrice: Number.isNaN(originalPrice) ? price : originalPrice,
        stock: Number.isNaN(stock) ? 0 : stock,
        attributes: attrsForSku,
        images: Array.isArray(variant.images) ? variant.images : [],
        status: variant.status || "AVAILABLE",
      });
    });
  } else {
    // Legacy/grouped input from Manual Form / CSV importer
    generationMode = "matrix";

    for (const [index, variant] of variants.entries()) {
      if (!variant.options || !Array.isArray(variant.options) || variant.options.length === 0) {
        throw new AppError(`Variant ${index} must have at least one option`, 400);
      }

      for (const option of variant.options) {
        const {
          price,
          originalPrice,
          stock,
          sku,
          _id,
          createdAt,
          updatedAt,
          __v,
          salesCount,
          status: optionStatus,
          ...dynamicFields
        } = option;

        const attributes = {
          ...dynamicFields,
        };

        variantSchema.forEach((field) => {
          const key = field.key;
          if (key === "color" && variant.color && !attributes[key]) {
            attributes[key] = variant.color;
          }
        });

        const { errors, unknownKeys } = SchemaValidationService.validateWithDetails(
          attributes,
          variantSchema,
          `variant[${index}]`
        );
        if (!validateOnly && errors.length > 0) {
          throw new AppError(`Invalid Variant attributes: ${errors.join(", ")}`, 400);
        }
        allUnknownVariantKeys.push(...unknownKeys);

        const priceNum = Number(price);
        const stockNum = Number(stock);
        const originalPriceNum =
          originalPrice !== undefined ? Number(originalPrice) : priceNum;

        if (!validateOnly) {
          if (Number.isNaN(priceNum) || priceNum < 0) {
            throw new AppError(`Variant[${index}] price must be a non-negative number`, 400);
          }
          if (Number.isNaN(stockNum) || stockNum < 0) {
            throw new AppError(`Variant[${index}] stock must be a non-negative number`, 400);
          }
        }

        const skuValue =
          sku ||
          generateSKU(category.slug, model || slug || name, attributes.color, attributes);

        transformedVariants.push({
          sku: String(skuValue).normalize("NFC"),
          price: Number.isNaN(priceNum) ? 0 : priceNum,
          originalPrice: Number.isNaN(originalPriceNum) ? priceNum : originalPriceNum,
          stock: Number.isNaN(stockNum) ? 0 : stockNum,
          attributes,
          images: Array.isArray(variant.images) ? variant.images : [],
          status: optionStatus || "AVAILABLE",
        });
      }
    }
  }

  const variantCount = transformedVariants.length;

  const productData = {
    name: String(name || "").normalize("NFC"),
    slug: String(slug || "").normalize("NFC"),
    description: (description || "").trim(),
    brand: brand || model,
    category: category._id,
    schemaVersion,
    specs: rawSpecs,
    variants: transformedVariants,
    featuredImages: featuredImages || [],
    videoUrl: videoUrl || "",
    condition: condition || "NEW",
    status: status || "AVAILABLE",
    createdBy: createdBy || req.user?._id,
  };

  const skuSample = transformedVariants.slice(0, 3).map((v) => v.sku);

  return {
    category,
    productData,
    variantCount,
    skuSample,
    generationMode,
    specErrors,
    specUnknown,
    allUnknownVariantKeys,
  };
};

// @desc    Validate product payload only (no DB writes)
// @route   POST /api/products/validate
// @access  Private/Admin
export const validateProduct = async (req, res, next) => {
  const requestId = req.requestId;
  const source = getSourceFromRequest(req);

  try {
    const {
      category,
      productData,
      variantCount,
      generationMode,
      specErrors,
      specUnknown,
      allUnknownVariantKeys,
    } = await transformAndValidateProductPayload(req, { validateOnly: true });

    const validationErrors = [];

    if (!productData.name) {
      validationErrors.push({ path: "name", message: "Name is required", code: "REQUIRED" });
    }
    if (!productData.slug) {
      validationErrors.push({ path: "slug", message: "Slug is required", code: "REQUIRED" });
    }

    (specErrors || []).forEach((msg) =>
      validationErrors.push({ path: "specifications", message: msg, code: "SPEC_VALIDATION" })
    );

    const unknownKeys = [...new Set([...(specUnknown || []), ...allUnknownVariantKeys])];

    const valid = validationErrors.length === 0 && unknownKeys.length === 0;

    logEvent("product.create.validation", {
      requestId,
      adminId: req.user?._id,
      categoryId: category._id,
      categorySlug: category.slug,
      schemaVersion: category.version,
      valid,
      errors: validationErrors,
      unknownKeys,
      variantCount,
      generationMode,
    });

    const variantThresholdExceeded = variantCount > VARIANT_SAFETY_THRESHOLD;

    return res.status(valid ? 200 : 400).json({
      success: valid,
      data: {
        valid,
        errors: validationErrors,
        unknownKeys,
        variantCount,
        generationMode,
        variantThresholdExceeded,
      },
    });
  } catch (error) {
    logEvent("product.create.failure", {
      requestId,
      errorMessage: error.message,
      stack: error.stack,
      code: error.code || "VALIDATE_ERROR",
    });
    next(error);
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req, res, next) => {
  const requestId = req.requestId;
  const source = getSourceFromRequest(req);

  console.log('\n' + '═'.repeat(80));
  console.log('🚀 PRODUCT CREATE REQUEST - START');
  console.log('═'.repeat(80));
  console.log(`📋 Request ID: ${requestId}`);
  console.log(`📦 Source: ${source}`);
  console.log(`👤 User ID: ${req.user?._id || 'N/A'}`);
  console.log('\n📥 INCOMING PAYLOAD:');
  console.log('  Name:', req.body.name);
  console.log('  Slug:', req.body.slug);
  console.log('  Status:', req.body.status);
  console.log('  Category ID:', req.body.categoryId);
  console.log('  Variants count:', req.body.variants?.length || 0);

  try {
    console.log('\n🔄 STEP 1: Transform and Validate Payload');
    const { category, productData, variantCount, skuSample, generationMode } =
      await transformAndValidateProductPayload(req, { validateOnly: false });

    console.log('✅ Transformation complete!');
    console.log('\n📊 TRANSFORMED DATA SUMMARY:');
    console.log('  Category:', category.name, `(${category.slug})`);
    console.log('  Category ID:', category._id.toString());
    console.log('  Schema Version:', category.version);
    console.log('  Product Name:', productData.name);
    console.log('  Product Slug:', productData.slug);
    console.log('  Product Status:', productData.status);
    console.log('  Product Condition:', productData.condition);
    console.log('  Brand:', productData.brand);
    console.log('  Variant Count:', variantCount);
    console.log('  Generation Mode:', generationMode);
    console.log('  SKU Sample:', skuSample);
    console.log('  Featured Images:', productData.featuredImages?.length || 0);
    console.log('  Video URL:', productData.videoUrl ? 'Yes' : 'No');
    
    console.log('\n🔍 VARIANT DETAILS (first 3):');
    productData.variants.slice(0, 3).forEach((v, idx) => {
      console.log(`  Variant ${idx + 1}:`);
      console.log(`    SKU: ${v.sku}`);
      console.log(`    Price: ${v.price}`);
      console.log(`    Stock: ${v.stock}`);
      console.log(`    Status: ${v.status}`);
      console.log(`    Attributes:`, JSON.stringify(v.attributes));
    });

    logEvent("product.create.request", {
      requestId,
      adminId: req.user?._id,
      categoryId: category._id,
      categorySlug: category.slug,
      schemaVersion: category.version,
      payloadSummary: {
        name: productData.name,
        slug: productData.slug,
        variantCount,
      },
      source,
    });

    if (variantCount > VARIANT_SAFETY_THRESHOLD) {
      console.log(`\n⚠️  SAFETY THRESHOLD EXCEEDED: ${variantCount} > ${VARIANT_SAFETY_THRESHOLD}`);
      throw new AppError(
        `Variant matrix too large (${variantCount}). Please reduce dimensions.`,
        400
      );
    }

    console.log('\n🔍 STEP 2: Check for Existing Product');
    const existing = await Product.findOne({ slug: productData.slug });
    if (existing) {
      console.log('⚠️  Product with this slug already exists!');
      console.log('  Existing Product ID:', existing._id.toString());
      console.log('  Existing Product Status:', existing.status);
      console.log('  Returning existing product (idempotent behavior)');
      console.log('═'.repeat(80) + '\n');
      
      return res.status(200).json({
        success: true,
        data: existing,
        meta: {
          productId: existing._id,
          variantCount: existing.variants?.length || 0,
          skusSample: (existing.variants || []).slice(0, 3).map((v) => v.sku),
          idempotent: true,
        },
      });
    }
    console.log('✅ No existing product found, proceeding with creation');

    console.log('\n💾 STEP 3: Save Product to MongoDB');
    console.log('  Database: MongoDB');
    console.log('  Collection: products');
    console.log('  Operation: Product.create()');
    
    const start = performance.now();
    const product = await Product.create(productData);
    const dbWriteDurationMs = Math.round(performance.now() - start);

    console.log('\n✅ PRODUCT SAVED SUCCESSFULLY!');
    console.log('═'.repeat(80));
    console.log('📦 SAVED PRODUCT DETAILS:');
    console.log('  Product ID:', product._id.toString());
    console.log('  Name:', product.name);
    console.log('  Slug:', product.slug);
    console.log('  Status:', product.status, product.status === 'AVAILABLE' ? '✅' : '⚠️');
    console.log('  Category:', product.category.toString());
    console.log('  Variants Saved:', product.variants?.length || 0);
    console.log('  Created At:', product.createdAt);
    console.log('  DB Write Duration:', dbWriteDurationMs + 'ms');
    
    console.log('\n🔍 VERIFICATION:');
    console.log('  Will be visible in UI:', product.status === 'AVAILABLE' ? 'YES ✅' : 'NO ⚠️ (status != AVAILABLE)');
    console.log('  Category Match:', product.category ? 'YES ✅' : 'NO ❌');
    console.log('  Has Variants:', product.variants?.length > 0 ? 'YES ✅' : 'NO ❌');

    logEvent("product.create.variants.generated", {
      requestId,
      variantCount,
      generationMode,
      estimatedSize: JSON.stringify(product.variants || []).length,
    });

    logEvent("product.create.success", {
      requestId,
      productId: product._id,
      variantCount,
      skusSample: skuSample,
      dbWriteDurationMs,
    });

    console.log('\n✅ RESPONSE SENT TO CLIENT');
    console.log('═'.repeat(80) + '\n');

    res.status(201).json({
      success: true,
      data: product,
      meta: {
        productId: product._id,
        variantCount,
        skusSample: skuSample,
      },
    });
  } catch (error) {
    console.log('\n❌ PRODUCT CREATE FAILED!');
    console.log('═'.repeat(80));
    console.log('Error Type:', error.name);
    console.log('Error Message:', error.message);
    console.log('Error Code:', error.code || 'N/A');
    if (error.stack) {
      console.log('\nStack Trace (first 3 lines):');
      console.log(error.stack.split('\n').slice(0, 3).join('\n'));
    }
    console.log('═'.repeat(80) + '\n');
    
    logEvent("product.create.failure", {
      requestId,
      errorMessage: error.message,
      stack: error.stack,
      code: error.code || "CREATE_ERROR",
    });
    next(error);
  }
};


// @desc    Get all products (with pagination & dynamic filters)
// @route   GET /api/products
// @access  Public/Admin
export const getProducts = async (req, res, next) => {
  try {
    const requestId = req.requestId;

    const {
      category,
      brand,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 10,
      status,
      ...filters
    } = req.query;
    
    // Status Filter - Allow override but don't force default for admin/warehouse views
    // Public-facing endpoints should explicitly pass status='AVAILABLE'
    console.log("\n🔍 STATUS FILTER LOGIC:");
    const query = {};
    if (status) {
        console.log("✅ Status filter from request:", status);
        query.status = status;
    } else {
        console.log("ℹ️  NO STATUS FILTER - Showing all products (admin/warehouse view)");
        // DO NOT add default status filter - let warehouse see all products
    }
    
    // Category Filter
    if (category) {
        // Resolve slug to ID if necessary, but assuming client sends slug or ID
        // Simplified: assuming we might join or lookup
        // For now, let's assume client sends categoryId or we lookup by slug
        console.log("🔍 PHASE 3: Resolving category slug:", category);
        const catDoc = await Category.findOne({ slug: category });
        if (catDoc) {
            query.category = catDoc._id;
            console.log("✅ Category resolved:", { slug: category, id: catDoc._id, name: catDoc.name });
        } else {
            console.log("⚠️  Category not found for slug:", category);
        }
    }

    // Brand Filter
    if (brand) {
        query.brand = brand;
    }

    // Dynamic Spec Filters
    // e.g., ?specs.color=Red or ?specs.storage=128GB
    // We need to parse query params that start with 'specs.'
    // ACTUALLY: Let's support precise filtering like ?chip=A16
    // But we need to distinguish between top-level fields and spec fields.
    // For simplicity, let's look for known keys in query that aren't pagination/sort

    // ... (Advanced filtering logic can be added later, keep it simple for now)

    console.log("\n🔍 FINAL MONGODB QUERY:");
    console.log(JSON.stringify(query, null, 2));

    const products = await Product.find(query)
        .populate("category", "name slug")
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort(sort ? { [sort]: 1 } : { createdAt: -1 });
        
    const count = await Product.countDocuments(query);
    
    logEvent("product.list.refresh", {
      requestId,
      adminId: req.user?._id,
      filtersUsed: {
        category,
        brand,
        status,
        minPrice,
        maxPrice,
        sort,
        page,
        limit,
      },
    });

    res.status(200).json({
      success: true,
      count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: {
        products: products,  // ✅ Nested structure for frontend compatibility
        total: count,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product by slug
// @route   GET /api/products/slug/:slug
// @access  Public
export const getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
        .populate("category"); // Populate full category to get schema for frontend to render table

    if (!product) {
      throw new AppError("Product not found", 404);
    }

    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get product by id
// @route   GET /api/products/:id
// @access  Public/Admin
export const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product) {
      throw new AppError("Product not found", 404);
    }
    res.status(200).json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update existing product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res, next) => {
  const requestId = req.requestId;

  try {
    const existing = await Product.findById(req.params.id);
    if (!existing) {
      throw new AppError("Product not found", 404);
    }

    if (!req.body.categoryId) {
      req.body.categoryId = existing.category.toString();
    }

    const { category, productData, variantCount, skuSample, generationMode } =
      await transformAndValidateProductPayload(req, { validateOnly: false });

    existing.set(productData);
    const start = performance.now();
    const saved = await existing.save();
    const dbWriteDurationMs = Math.round(performance.now() - start);

    logEvent("product.create.variants.generated", {
      requestId,
      variantCount,
      generationMode,
      estimatedSize: JSON.stringify(saved.variants || []).length,
      update: true,
    });

    logEvent("product.create.success", {
      requestId,
      productId: saved._id,
      variantCount,
      skusSample: skuSample,
      dbWriteDurationMs,
      update: true,
    });

    res.status(200).json({
      success: true,
      data: saved,
      meta: {
        productId: saved._id,
        variantCount,
        skusSample: skuSample,
        updated: true,
      },
    });
  } catch (error) {
    logEvent("product.create.failure", {
      requestId,
      errorMessage: error.message,
      stack: error.stack,
      code: error.code || "UPDATE_ERROR",
    });
    next(error);
  }
};

// @desc    Delete product (with basic business rule checks)
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const { default: Order } = await import("../../sales/models/Order.js");

    const hasPendingOrder = await Order.findOne({
      "items.productId": productId,
      status: { $in: ["PENDING", "PENDING_PAYMENT", "CONFIRMED", "PROCESSING", "SHIPPING"] },
    }).lean();

    if (hasPendingOrder) {
      throw new AppError(
        "Cannot delete product that has pending or in-progress orders",
        400
      );
    }

    const product = await Product.findByIdAndDelete(productId);
    if (!product) {
      throw new AppError("Product not found", 404);
    }

    res.status(200).json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    next(error);
  }
};


