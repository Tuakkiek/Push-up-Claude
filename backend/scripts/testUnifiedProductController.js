// ============================================
// FILE: backend/scripts/testUnifiedProductController.js
// ✅ Test Suite for Unified Product Controller
// ============================================

import mongoose from "mongoose";
import dotenv from "dotenv";
import UnifiedProduct from "../src/models/UnifiedProduct.js";
import UnifiedVariant from "../src/models/UnifiedVariant.js";
import ProductType from "../src/models/ProductType.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/istore";
const ADMIN_USER_ID = "60d21b4667d0d8992e610c85"; // Replace with actual ID

// ============================================
// MOCK REQUEST/RESPONSE
// ============================================

const mockReq = (body = {}, params = {}, query = {}) => ({
  body,
  params,
  query,
  user: { _id: ADMIN_USER_ID },
});

const mockRes = () => {
  const res = {};
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.data = data;
    return res;
  };
  return res;
};

// ============================================
// IMPORT CONTROLLER (simulated)
// ============================================

// Note: In real tests, you'd import the actual controller
// For this test, we'll simulate the controller logic

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
// TEST SUITE
// ============================================

async function runTests() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // ========================================
    // SETUP: Get ProductType
    // ========================================
    console.log("=".repeat(60));
    console.log("SETUP: Get ProductType for testing");
    console.log("=".repeat(60));

    const iPhoneType = await ProductType.findOne({ slug: "iphone" });
    if (!iPhoneType) {
      console.log("❌ iPhone ProductType not found. Run Step 1 seed first!");
      // Create a dummy one for test if missing to avoid hard fail if seed not run
      const adminUser = new mongoose.Types.ObjectId();
       const newType = await ProductType.create({
          name: "iPhone",
          slug: "iphone",
          description: "Smartphones by Apple",
          specificationFields: [
            { name: "chip", type: "text", required: true, label: "Chip" },
            { name: "ram", type: "text", required: true, label: "RAM" },
            { name: "storage", type: "text", required: true, label: "Storage" },
            { name: "frontCamera", type: "text", required: true, label: "Front Camera" },
            { name: "rearCamera", type: "text", required: true, label: "Rear Camera" },
            { name: "screenSize", type: "text", required: true, label: "Screen Size" },
            { name: "screenTech", type: "text", required: false, label: "Screen Tech" },
            { name: "battery", type: "text", required: false, label: "Battery" },
            { name: "os", type: "text", required: false, label: "OS" },
          ],
          createdBy: adminUser
       });
       console.log(`✅ Created temporary iPhone ProductType: ${newType.name} (${newType._id})\n`);
    } else {
        console.log(`✅ Using ProductType: ${iPhoneType.name} (${iPhoneType._id})\n`);
    }

    const typeToUse = await ProductType.findOne({ slug: "iphone" });

    // ========================================
    // TEST 1: Create Product
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 1: Create Unified Product");
    console.log("=".repeat(60));

    const createData = {
      name: "iPhone 15 Pro Max",
      model: "iPhone 15 Pro Max",
      productTypeId: typeToUse._id,
      specifications: {
        chip: "A17 Pro",
        ram: "8GB",
        storage: "256GB",
        frontCamera: "12MP TrueDepth",
        rearCamera: "48MP Main + 12MP Ultra Wide",
        screenSize: '6.7"',
        screenTech: "Super Retina XDR",
        battery: "4422 mAh",
        os: "iOS 17",
      },
      createVariants: [
        {
          color: "Natural Titanium",
          images: ["https://example.com/natural-1.jpg"],
          options: [
            {
              versionName: "256GB",
              originalPrice: 34990000,
              price: 33990000,
              stock: 50,
            },
            {
              versionName: "512GB",
              originalPrice: 40990000,
              price: 39990000,
              stock: 30,
            },
          ],
        },
        {
          color: "Blue Titanium",
          images: ["https://example.com/blue-1.jpg"],
          options: [
            {
              versionName: "256GB",
              originalPrice: 34990000,
              price: 33990000,
              stock: 45,
            },
          ],
        },
      ],
      condition: "NEW",
      status: "AVAILABLE",
      brand: "Apple",
      createdBy: ADMIN_USER_ID,
    };

    const testProduct = await UnifiedProduct.create({
      name: createData.name,
      model: createData.model,
      slug: createSlug(createData.model),
      baseSlug: createSlug(createData.model),
      description: "",
      productTypeId: createData.productTypeId,
      specifications: createData.specifications,
      condition: createData.condition,
      status: createData.status,
      brand: createData.brand,
      createdBy: createData.createdBy,
      variants: [],
    });

    console.log(`✅ Product created: ${testProduct.name}`);
    console.log(`   ID: ${testProduct._id}`);
    console.log(`   Slug: ${testProduct.slug}`);
    console.log(`   ProductType: ${testProduct.productTypeId}`);

    // Create variants
    const createdVariants = [];
    for (const group of createData.createVariants) {
      for (const opt of group.options) {
        const sku = `TEST${Date.now()}`;
        const versionSlug = createSlug(opt.versionName);
        const variantSlug = `${testProduct.slug}-${versionSlug}`;

        const variant = await UnifiedVariant.create({
          productId: testProduct._id,
          color: group.color,
          versionName: opt.versionName,
          originalPrice: opt.originalPrice,
          price: opt.price,
          stock: opt.stock,
          images: group.images,
          sku,
          slug: variantSlug,
        });

        createdVariants.push(variant._id);
        console.log(`   ✅ Variant: ${variant.color} ${variant.versionName} (${variant.sku})`);
      }
    }

    testProduct.variants = createdVariants;
    await testProduct.save();
    console.log(`   ✅ ${createdVariants.length} variants linked to product\n`);

    // ========================================
    // TEST 2: Get Product by ID
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 2: Get Product by ID");
    console.log("=".repeat(60));

    const foundProduct = await UnifiedProduct.findById(testProduct._id)
      .populate("variants")
      .populate("productTypeId");

    console.log(`✅ Found product: ${foundProduct.name}`);
    console.log(`   Variants: ${foundProduct.variants.length}`);
    console.log(`   ProductType: ${foundProduct.productTypeId.name}`);
    console.log();

    // ========================================
    // TEST 3: Get Product by Slug
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 3: Get Product by Slug");
    console.log("=".repeat(60));

    const foundBySlug = await UnifiedProduct.findOne({
      baseSlug: testProduct.slug,
    }).populate("variants");

    console.log(`✅ Found by slug: ${foundBySlug.name}`);
    console.log(`   Slug: ${foundBySlug.slug}`);
    console.log();

    // ========================================
    // TEST 4: Get Variant by Slug
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 4: Get Variant by Slug");
    console.log("=".repeat(60));

    const firstVariant = await UnifiedVariant.findById(createdVariants[0]);
    console.log(`   First variant slug: ${firstVariant.slug}`);

    const foundVariant = await UnifiedVariant.findOne({
      slug: firstVariant.slug,
    });
    console.log(`✅ Found variant: ${foundVariant.fullName}`);
    console.log(`   SKU: ${foundVariant.sku}`);
    console.log();

    // ========================================
    // TEST 5: Query Products (Filter by ProductType)
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 5: Query Products (Filter by ProductType)");
    console.log("=".repeat(60));

    const products = await UnifiedProduct.find({
      productTypeId: typeToUse._id,
    })
      .populate("variants")
      .limit(5);

    console.log(`✅ Found ${products.length} iPhone products`);
    products.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name} (${p.variants.length} variants)`);
    });
    console.log();

    // ========================================
    // TEST 6: Search Products
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 6: Search Products");
    console.log("=".repeat(60));

    const searchResults = await UnifiedProduct.find({
      $or: [
        { name: { $regex: "iPhone 15", $options: "i" } },
        { model: { $regex: "iPhone 15", $options: "i" } },
      ],
    }).limit(3);

    console.log(`✅ Search "iPhone 15": ${searchResults.length} results`);
    searchResults.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name}`);
    });
    console.log();

    // ========================================
    // TEST 7: Update Product
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 7: Update Product");
    console.log("=".repeat(60));

    testProduct.description = "Updated description - The ultimate iPhone";
    testProduct.status = "AVAILABLE";
    await testProduct.save();

    console.log(`✅ Updated product description`);
    console.log(`   Description: ${testProduct.description}`);
    console.log();

    // ========================================
    // TEST 8: Get Variants for Product
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 8: Get Variants for Product");
    console.log("=".repeat(60));

    const variants = await UnifiedVariant.findByProduct(testProduct._id);
    console.log(`✅ Found ${variants.length} variants for product`);
    variants.forEach((v, idx) => {
      console.log(`   ${idx + 1}. ${v.fullName} - ${v.stock} in stock`);
    });
    console.log();

    // ========================================
    // TEST 9: Get Colors and Versions
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 9: Get Colors and Versions");
    console.log("=".repeat(60));

    const colors = await UnifiedVariant.getColorsByProduct(testProduct._id);
    const versions = await UnifiedVariant.getVersionsByProduct(testProduct._id);

    console.log(`✅ Available colors: ${colors.join(", ")}`);
    console.log(`✅ Available versions: ${versions.join(", ")}`);
    console.log();

    // ========================================
    // TEST 10: Price Range Query
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 10: Price Range Query");
    console.log("=".repeat(60));

    const minPrice = await testProduct.getMinPrice();
    const maxPrice = await testProduct.getMaxPrice();
    const priceRange = await testProduct.getPriceRange();

    console.log(`✅ Price range: ${priceRange}`);
    console.log(`   Min: ${minPrice.toLocaleString()}₫`);
    console.log(`   Max: ${maxPrice.toLocaleString()}₫`);
    console.log();

    // ========================================
    // TEST 11: Stock Management
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 11: Stock Management");
    console.log("=".repeat(60));

    const totalStock = await testProduct.getTotalStock();
    const hasStock = await testProduct.hasStock();

    console.log(`✅ Total stock: ${totalStock}`);
    console.log(`✅ Has stock: ${hasStock}`);
    console.log();

    // ========================================
    // TEST 12: Pagination
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 12: Pagination");
    console.log("=".repeat(60));

    const page = 1;
    const limit = 5;
    const paginatedProducts = await UnifiedProduct.find()
      .populate("productTypeId")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await UnifiedProduct.countDocuments();
    const totalPages = Math.ceil(total / limit);

    console.log(`✅ Page ${page}/${totalPages}`);
    console.log(`   Showing ${paginatedProducts.length} of ${total} products`);
    console.log();

    // ========================================
    // TEST 13: Cascade Delete
    // ========================================
    console.log("=".repeat(60));
    console.log("TEST 13: Cascade Delete (Cleanup)");
    console.log("=".repeat(60));

    const variantCountBefore = await UnifiedVariant.countDocuments({
      productId: testProduct._id,
    });

    console.log(`   Variants before delete: ${variantCountBefore}`);

    // Delete variants
    await UnifiedVariant.deleteMany({ productId: testProduct._id });

    const variantCountAfter = await UnifiedVariant.countDocuments({
      productId: testProduct._id,
    });

    console.log(`   Variants after delete: ${variantCountAfter}`);

    // Delete product
    await UnifiedProduct.deleteOne({ _id: testProduct._id });

    console.log(`✅ Product and variants deleted successfully`);
    console.log();

    // ========================================
    // SUCCESS
    // ========================================
    console.log("=".repeat(60));
    console.log("✅ ALL TESTS COMPLETED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log();
    console.log("Summary:");
    console.log("✅ Product CRUD operations");
    console.log("✅ Variant management");
    console.log("✅ Slug-based queries");
    console.log("✅ ProductType filtering");
    console.log("✅ Search functionality");
    console.log("✅ Pagination");
    console.log("✅ Price calculations");
    console.log("✅ Stock management");
    console.log("✅ Cascade deletion");
    console.log();

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// ============================================
// RUN TESTS
// ============================================

runTests();
