// ============================================
// FILE: backend/scripts/testUnifiedVariant.js
// ✅ Test Suite for UnifiedVariant Model
// ============================================

import mongoose from "mongoose";
import dotenv from "dotenv";
import UnifiedVariant from "../src/models/UnifiedVariant.js";
import UnifiedProduct from "../src/models/UnifiedProduct.js";
import ProductType from "../src/models/ProductType.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/istore";

// Sample admin user ID (replace with actual)
const ADMIN_USER_ID = "60d21b4667d0d8992e610c85";

// ============================================
// TEST SUITE
// ============================================

async function testUnifiedVariant() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Cleanup previous failed runs
    await UnifiedVariant.deleteMany({ sku: { $in: ["00000201", "00000202", "00000203", "00000204", "00000205"] } });
    await UnifiedProduct.deleteMany({ model: "iPhone 15 Pro Max", createdBy: ADMIN_USER_ID });
    console.log("🧹 Cleaned up previous test data\n");

    // ========================================
    // SETUP: Create ProductType and Product
    // ========================================
    console.log("=" .repeat(60));
    console.log("SETUP: Creating Test ProductType and Product");
    console.log("=" .repeat(60));

    let productType = await ProductType.findOne({ slug: "iphone" });
    if (!productType) {
      console.log("⚠️ iPhone ProductType not found. Creating temporary one for test...");
      const adminUser = new mongoose.Types.ObjectId();
      productType = await ProductType.create({
        name: "iPhone",
        slug: "iphone", 
        description: "Smartphones by Apple",
        specificationFields: [
          { name: "chip", type: "text", required: true, label: "Chip" },
          { name: "ram", type: "text", required: true, label: "RAM" },
          { name: "storage", type: "text", required: true, label: "Storage" }
        ],
        createdBy: adminUser
      });
      console.log(`✅ Created temporary iPhone ProductType: ${productType.name} (${productType._id})`);
    }

    const testProduct = await UnifiedProduct.create({
      name: "iPhone 15 Pro Max",
      model: "iPhone 15 Pro Max",
      baseSlug: "iphone-15-pro-max",
      description: "The ultimate iPhone with titanium design",
      productTypeId: productType._id,
      specifications: {
        chip: "A17 Pro",
        ram: "8GB",
        storage: "256GB",
        frontCamera: "12MP",
        rearCamera: "48MP Main",
        screenSize: '6.7"',
        screenTech: "Super Retina XDR",
        battery: "4422 mAh",
        os: "iOS 17",
      },
      condition: "NEW",
      status: "AVAILABLE",
      brand: "Apple",
      createdBy: ADMIN_USER_ID,
    });

    console.log(`✅ Test product created: ${testProduct.name} (${testProduct._id})\n`);

    // ========================================
    // TEST 1: Create Basic Variant
    // ========================================
    console.log("=" .repeat(60));
    console.log("TEST 1: Create Unified Variant");
    console.log("=" .repeat(60));

    const variant1 = await UnifiedVariant.create({
      productId: testProduct._id,
      color: "Natural Titanium",
      versionName: "256GB",
      originalPrice: 34990000,
      price: 33990000,
      stock: 50,
      images: ["https://example.com/natural-256gb-1.jpg"],
      sku: "00000201",
      legacyFields: {
        storage: "256GB",
      },
    });

    console.log(`✅ Variant created:`);
    console.log(`   Color: ${variant1.color}`);
    console.log(`   Version: ${variant1.versionName}`);
    console.log(`   SKU: ${variant1.sku}`);
    console.log(`   Slug: ${variant1.slug}`);
    console.log(`   Full Name: ${variant1.fullName}`);
    console.log(`   Discount: ${variant1.discountPercent}%`);
    console.log(`   In Stock: ${variant1.inStock}\n`);

    // ========================================
    // TEST 2: Create Complex Variant (Mac-like)
    // ========================================
    console.log("=" .repeat(60));
    console.log("TEST 2: Create Complex Variant (Mac-like)");
    console.log("=" .repeat(60));

    const variant2 = await UnifiedVariant.create({
      productId: testProduct._id,
      color: "Space Black",
      versionName: "M3 Pro 16GB 512GB", // Complex version name
      originalPrice: 45990000,
      price: 43990000,
      stock: 25,
      images: ["https://example.com/black-m3-1.jpg"],
      sku: "00000202",
      legacyFields: {
        cpuGpu: "M3 Pro",
        ram: "16GB",
        storage: "512GB",
      },
    });

    console.log(`✅ Complex variant created:`);
    console.log(`   Color: ${variant2.color}`);
    console.log(`   Version: ${variant2.versionName}`);
    console.log(`   Full Name: ${variant2.fullName}`);
    console.log(`   Legacy Fields:`, Object.fromEntries(variant2.legacyFields));
    console.log();

    // ========================================
    // TEST 3: Price Validation
    // ========================================
    console.log("=" .repeat(60));
    console.log("TEST 3: Price Validation");
    console.log("=" .repeat(60));

    try {
      await UnifiedVariant.create({
        productId: testProduct._id,
        color: "Test Color",
        versionName: "Test Version",
        originalPrice: 1000000,
        price: 2000000, // Invalid: price > originalPrice
        stock: 10,
        sku: "00000299",
      });
      console.log("❌ Should have failed validation!");
    } catch (error) {
      console.log("✅ Price validation works correctly");
      console.log(`   Error: ${error.message}\n`);
    }

    // ========================================
    // TEST 4: Stock Management
    // ========================================
    console.log("=" .repeat(60));
    console.log("TEST 4: Stock Management");
    console.log("=" .repeat(60));

    console.log(`Initial stock: ${variant1.stock}`);

    // Decrement stock
    await variant1.decrementStock(5);
    console.log(`After decrement(5): ${variant1.stock}`);

    // Increment stock
    await variant1.incrementStock(10);
    console.log(`After increment(10): ${variant1.stock}`);

    // Try to decrement more than available
    try {
      await variant1.decrementStock(1000);
      console.log("❌ Should have thrown error!");
    } catch (error) {
      console.log(`✅ Stock protection works: ${error.message}\n`);
    }

    // ========================================
    // TEST 5: Sales Tracking
    // ========================================
    console.log("=" .repeat(60));
    console.log("TEST 5: Sales Tracking");
    console.log("=" .repeat(60));

    console.log(`Initial sales: ${variant1.salesCount}`);
    await variant1.incrementSales(3);
    console.log(`After incrementSales(3): ${variant1.salesCount}\n`);

    // ========================================
    // TEST 6: Query Methods
    // ========================================
    console.log("=" .repeat(60));
    console.log("TEST 6: Static Query Methods");
    console.log("=" .repeat(60));

    // Find by product
    const productVariants = await UnifiedVariant.findByProduct(testProduct._id);
    console.log(`✅ findByProduct: Found ${productVariants.length} variants`);

    // Find in-stock variants
    const inStock = await UnifiedVariant.findInStockByProduct(testProduct._id);
    console.log(`✅ findInStockByProduct: Found ${inStock.length} in-stock variants`);

    // Get unique colors
    const colors = await UnifiedVariant.getColorsByProduct(testProduct._id);
    console.log(`✅ getColorsByProduct: ${colors.join(", ")}`);

    // Get unique versions
    const versions = await UnifiedVariant.getVersionsByProduct(testProduct._id);
    console.log(`✅ getVersionsByProduct: ${versions.join(", ")}`);

    // Find by color
    const naturalVariants = await UnifiedVariant.findByColor(
      testProduct._id,
      "Natural Titanium"
    );
    console.log(`✅ findByColor: Found ${naturalVariants.length} "Natural Titanium" variants`);

    // Find by SKU
    const variantBySku = await UnifiedVariant.findBySku("00000201");
    console.log(`✅ findBySku: Found ${variantBySku?.fullName || "none"}`);

    // Find by slug
    const variantBySlug = await UnifiedVariant.findBySlug(variant1.slug);
    console.log(`✅ findBySlug: Found ${variantBySlug?.fullName || "none"}\n`);

    // ========================================
    // TEST 7: Virtuals
    // ========================================
    console.log("=" .repeat(60));
    console.log("TEST 7: Virtual Fields");
    console.log("=" .repeat(60));

    const variantJSON = variant1.toJSON();
    console.log(`✅ fullName: ${variantJSON.fullName}`);
    console.log(`✅ discountPercent: ${variantJSON.discountPercent}%`);
    console.log(`✅ inStock: ${variantJSON.inStock}`);
    console.log(`✅ isLowStock: ${variantJSON.isLowStock}\n`);

    // ========================================
    // TEST 8: Auto-Generated Slug
    // ========================================
    console.log("=" .repeat(60));
    console.log("TEST 8: Auto-Generated Slug");
    console.log("=" .repeat(60));

    const variant3 = await UnifiedVariant.create({
      productId: testProduct._id,
      color: "Blue Titanium",
      versionName: "512GB",
      originalPrice: 40990000,
      price: 39990000,
      stock: 30,
      sku: "00000203",
      // No slug provided - should auto-generate
    });

    console.log(`✅ Auto-generated slug: ${variant3.slug}`);
    console.log(`   Expected pattern: ${testProduct.baseSlug}-512gb\n`);

    // ========================================
    // TEST 9: Low Stock & Out of Stock Queries
    // ========================================
    console.log("=" .repeat(60));
    console.log("TEST 9: Inventory Alerts");
    console.log("=" .repeat(60));

    // Create low stock variant
    const lowStockVariant = await UnifiedVariant.create({
      productId: testProduct._id,
      color: "White Titanium",
      versionName: "128GB",
      originalPrice: 30990000,
      price: 29990000,
      stock: 3, // Low stock
      sku: "00000204",
    });

    // Create out of stock variant
    const outOfStockVariant = await UnifiedVariant.create({
      productId: testProduct._id,
      color: "Gold Titanium",
      versionName: "1TB",
      originalPrice: 50990000,
      price: 49990000,
      stock: 0, // Out of stock
      sku: "00000205",
    });

    const lowStock = await UnifiedVariant.findLowStock(5);
    console.log(`✅ findLowStock(5): Found ${lowStock.length} low stock variants`);
    lowStock.forEach((v) => {
      console.log(`   - ${v.fullName}: ${v.stock} left`);
    });

    const outOfStock = await UnifiedVariant.findOutOfStock();
    console.log(`✅ findOutOfStock: Found ${outOfStock.length} out of stock variants`);
    outOfStock.forEach((v) => {
      console.log(`   - ${v.fullName}`);
    });
    console.log();

    // ========================================
    // TEST 10: Top Selling Variants
    // ========================================
    console.log("=" .repeat(60));
    console.log("TEST 10: Top Selling Analytics");
    console.log("=" .repeat(60));

    // Simulate some sales
    await variant1.incrementSales(10);
    await variant2.incrementSales(15);
    await variant3.incrementSales(5);

    const topSelling = await UnifiedVariant.findTopSelling(5);
    console.log(`✅ findTopSelling(5): Found ${topSelling.length} variants`);
    topSelling.forEach((v, idx) => {
      console.log(`   ${idx + 1}. ${v.fullName}: ${v.salesCount} sales`);
    });
    console.log();

    // ========================================
    // TEST 11: Aggregation Example
    // ========================================
    console.log("=" .repeat(60));
    console.log("TEST 11: Aggregation - Variant Statistics");
    console.log("=" .repeat(60));

    const stats = await UnifiedVariant.aggregate([
      {
        $group: {
          _id: null,
          totalVariants: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          avgPrice: { $avg: "$price" },
          totalSales: { $sum: "$salesCount" },
        },
      },
    ]);

    if (stats.length > 0) {
      const s = stats[0];
      console.log(`✅ Global Statistics:`);
      console.log(`   Total Variants: ${s.totalVariants}`);
      console.log(`   Total Stock: ${s.totalStock}`);
      console.log(`   Average Price: ${s.avgPrice.toLocaleString()}₫`);
      console.log(`   Total Sales: ${s.totalSales}`);
    }
    console.log();

    // ========================================
    // CLEANUP
    // ========================================
    console.log("=" .repeat(60));
    console.log("🧹 CLEANUP");
    console.log("=" .repeat(60));

    console.log("\n⚠️ Test data created. Cleaning up...");

    // Delete all test variants
    await UnifiedVariant.deleteMany({ productId: testProduct._id });
    console.log("✅ Test variants deleted");

    // Delete test product
    await UnifiedProduct.deleteOne({ _id: testProduct._id });
    console.log("✅ Test product deleted");

    // ========================================
    // SUCCESS
    // ========================================
    console.log("\n" + "=" .repeat(60));
    console.log("✅ ALL TESTS COMPLETED SUCCESSFULLY");
    console.log("=" .repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ TEST FAILED:", error.message);
    if (error.errors) {
        Object.keys(error.errors).forEach(key => {
            console.error(`   - ${key}: ${error.errors[key].message} (${error.errors[key].kind})`);
        });
    }
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// ============================================
// RUN TESTS
// ============================================

testUnifiedVariant();
