// ============================================
// FILE: backend/scripts/verifyMigration.js
// ✅ STEP 5: Migration Verification Script
// Purpose: Verify data integrity after migration
// ============================================

import mongoose from "mongoose";
import dotenv from "dotenv";
import UnifiedProduct from "../src/models/UnifiedProduct.js";
import UnifiedVariant from "../src/models/UnifiedVariant.js";

// Import old models
import IPhone, { IPhoneVariant } from "../src/models/IPhone.js";
import IPad, { IPadVariant } from "../src/models/IPad.js";
import Mac, { MacVariant } from "../src/models/Mac.js";
import AirPods, { AirPodsVariant } from "../src/models/AirPods.js";
import AppleWatch, { AppleWatchVariant } from "../src/models/AppleWatch.js";
import Accessory, { AccessoryVariant } from "../src/models/Accessory.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_CONNECTIONSTRING || "mongodb://localhost:27017/istore";

// ============================================
// VERIFICATION CONFIGURATION
// ============================================

const VERIFICATION_MAP = [
  {
    name: "iPhone",
    ProductModel: IPhone,
    VariantModel: IPhoneVariant,
  },
  {
    name: "iPad",
    ProductModel: IPad,
    VariantModel: IPadVariant,
  },
  {
    name: "Mac",
    ProductModel: Mac,
    VariantModel: MacVariant,
  },
  {
    name: "AirPods",
    ProductModel: AirPods,
    VariantModel: AirPodsVariant,
  },
  {
    name: "Apple Watch",
    ProductModel: AppleWatch,
    VariantModel: AppleWatchVariant,
  },
  {
    name: "Accessory",
    ProductModel: Accessory,
    VariantModel: AccessoryVariant,
  },
];

// ============================================
// VERIFY SINGLE CATEGORY
// ============================================
async function verifyCategory(config) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🔍 VERIFYING: ${config.name}`);
  console.log(`${"=".repeat(70)}\n`);

  const results = {
    category: config.name,
    oldProductCount: 0,
    newProductCount: 0,
    oldVariantCount: 0,
    newVariantCount: 0,
    productMatch: false,
    variantMatch: false,
    missingProducts: [],
    missingVariants: [],
    dataIntegrityIssues: [],
  };

  try {
    // Count old products
    results.oldProductCount = await config.ProductModel.countDocuments();
    console.log(`📊 Old products: ${results.oldProductCount}`);

    // Count new products
    results.newProductCount = await UnifiedProduct.countDocuments({
      legacyCategory: config.name,
    });
    console.log(`📊 New products: ${results.newProductCount}`);

    // Check product count match
    results.productMatch = results.oldProductCount === results.newProductCount;
    if (results.productMatch) {
      console.log(`✅ Product counts match!`);
    } else {
      console.log(
        `⚠️  Product count mismatch! (${results.oldProductCount} vs ${results.newProductCount})`
      );
    }

    // Count old variants
    results.oldVariantCount = await config.VariantModel.countDocuments();
    console.log(`\n📦 Old variants: ${results.oldVariantCount}`);

    // Count new variants (via legacy fields)
    const oldProducts = await config.ProductModel.find().select("_id");
    const oldProductIds = oldProducts.map((p) => p._id);

    const newProducts = await UnifiedProduct.find({
      legacyCategory: config.name,
    }).select("_id");
    const newProductIds = newProducts.map((p) => p._id);

    results.newVariantCount = await UnifiedVariant.countDocuments({
      productId: { $in: newProductIds },
    });
    console.log(`📦 New variants: ${results.newVariantCount}`);

    // Check variant count match
    results.variantMatch = results.oldVariantCount === results.newVariantCount;
    if (results.variantMatch) {
      console.log(`✅ Variant counts match!`);
    } else {
      console.log(
        `⚠️  Variant count mismatch! (${results.oldVariantCount} vs ${results.newVariantCount})`
      );
    }

    // Find missing products
    console.log(`\n🔎 Checking for missing products...`);
    const allOldProducts = await config.ProductModel.find();

    for (const oldProduct of allOldProducts) {
      const migrated = await UnifiedProduct.findOne({
        legacyId: oldProduct._id,
        legacyCategory: config.name,
      });

      if (!migrated) {
        results.missingProducts.push({
          id: oldProduct._id,
          name: oldProduct.name,
        });
      }
    }

    if (results.missingProducts.length === 0) {
      console.log(`✅ No missing products`);
    } else {
      console.log(`⚠️  Found ${results.missingProducts.length} missing products:`);
      results.missingProducts.forEach((p) => {
        console.log(`   - ${p.name} (${p.id})`);
      });
    }

    // Verify data integrity (sample check)
    console.log(`\n🔬 Checking data integrity (sample)...`);
    const sampleSize = Math.min(5, allOldProducts.length);
    const samples = allOldProducts.slice(0, sampleSize);

    for (const oldProduct of samples) {
      const newProduct = await UnifiedProduct.findOne({
        legacyId: oldProduct._id,
      });

      if (!newProduct) continue;

      // Check basic fields
      if (oldProduct.name !== newProduct.name) {
        results.dataIntegrityIssues.push({
          product: oldProduct.name,
          field: "name",
          old: oldProduct.name,
          new: newProduct.name,
        });
      }

      if (oldProduct.model !== newProduct.model) {
        results.dataIntegrityIssues.push({
          product: oldProduct.name,
          field: "model",
          old: oldProduct.model,
          new: newProduct.model,
        });
      }

      if (oldProduct.status !== newProduct.status) {
        results.dataIntegrityIssues.push({
          product: oldProduct.name,
          field: "status",
          old: oldProduct.status,
          new: newProduct.status,
        });
      }
    }

    if (results.dataIntegrityIssues.length === 0) {
      console.log(`✅ No data integrity issues found (in ${sampleSize} samples)`);
    } else {
      console.log(`⚠️  Found ${results.dataIntegrityIssues.length} data integrity issues:`);
      results.dataIntegrityIssues.forEach((issue) => {
        console.log(
          `   - ${issue.product}: ${issue.field} (${issue.old} → ${issue.new})`
        );
      });
    }

    console.log(`\n${"─".repeat(70)}`);
    console.log(`✅ ${config.name} Verification Complete`);
    console.log(`${"─".repeat(70)}\n`);

    return results;
  } catch (error) {
    console.error(`\n❌ VERIFICATION FAILED: ${config.name}`);
    console.error(`   ${error.message}\n`);
    throw error;
  }
}

// ============================================
// MAIN VERIFICATION FUNCTION
// ============================================
async function verifyAll() {
  console.log("\n" + "=".repeat(70));
  console.log("🔍 STARTING MIGRATION VERIFICATION");
  console.log("=".repeat(70) + "\n");

  try {
    await mongoose.connect(MONGODB_URI, { dbName: "istore" });
    console.log("✅ Connected to MongoDB");
    console.log(`📂 Database Name: ${mongoose.connection.db.databaseName}\n`);

    const allResults = [];

    // Verify each category
    for (const config of VERIFICATION_MAP) {
      const result = await verifyCategory(config);
      allResults.push(result);
    }

    // ========================================
    // VERIFICATION SUMMARY
    // ========================================
    console.log("\n" + "=".repeat(70));
    console.log("📊 VERIFICATION SUMMARY");
    console.log("=".repeat(70));

    const totals = {
      oldProducts: 0,
      newProducts: 0,
      oldVariants: 0,
      newVariants: 0,
      allProductsMatch: true,
      allVariantsMatch: true,
      totalMissingProducts: 0,
      totalMissingVariants: 0,
      totalIntegrityIssues: 0,
    };

    console.log("\nPer Category:");
    allResults.forEach((result) => {
      totals.oldProducts += result.oldProductCount;
      totals.newProducts += result.newProductCount;
      totals.oldVariants += result.oldVariantCount;
      totals.newVariants += result.newVariantCount;
      totals.totalMissingProducts += result.missingProducts.length;
      totals.totalMissingVariants += result.missingVariants.length;
      totals.totalIntegrityIssues += result.dataIntegrityIssues.length;

      if (!result.productMatch) totals.allProductsMatch = false;
      if (!result.variantMatch) totals.allVariantsMatch = false;

      const productStatus = result.productMatch ? "✅" : "⚠️";
      const variantStatus = result.variantMatch ? "✅" : "⚠️";

      console.log(`\n  ${result.category}:`);
      console.log(
        `    Products: ${productStatus} ${result.newProductCount}/${result.oldProductCount}`
      );
      console.log(
        `    Variants: ${variantStatus} ${result.newVariantCount}/${result.oldVariantCount}`
      );
      if (result.missingProducts.length > 0) {
        console.log(`    Missing: ${result.missingProducts.length} products`);
      }
      if (result.dataIntegrityIssues.length > 0) {
        console.log(`    Issues: ${result.dataIntegrityIssues.length} integrity issues`);
      }
    });

    console.log("\n" + "─".repeat(70));
    console.log("\nOverall Totals:");
    console.log(`  Old Products: ${totals.oldProducts}`);
    console.log(`  New Products: ${totals.newProducts}`);
    console.log(`  Old Variants: ${totals.oldVariants}`);
    console.log(`  New Variants: ${totals.newVariants}`);
    console.log(`  Missing Products: ${totals.totalMissingProducts}`);
    console.log(`  Integrity Issues: ${totals.totalIntegrityIssues}`);

    console.log("\n" + "=".repeat(70));

    if (
      totals.allProductsMatch &&
      totals.allVariantsMatch &&
      totals.totalMissingProducts === 0 &&
      totals.totalIntegrityIssues === 0
    ) {
      console.log("\n✅ VERIFICATION PASSED: All data migrated successfully!");
      console.log("✅ Product counts match");
      console.log("✅ Variant counts match");
      console.log("✅ No missing products");
      console.log("✅ No data integrity issues");
    } else {
      console.log("\n⚠️  VERIFICATION FAILED: Issues found!");
      if (!totals.allProductsMatch) {
        console.log("❌ Product count mismatch");
      }
      if (!totals.allVariantsMatch) {
        console.log("❌ Variant count mismatch");
      }
      if (totals.totalMissingProducts > 0) {
        console.log(`❌ ${totals.totalMissingProducts} missing products`);
      }
      if (totals.totalIntegrityIssues > 0) {
        console.log(`❌ ${totals.totalIntegrityIssues} data integrity issues`);
      }
    }

    console.log("\n" + "=".repeat(70) + "\n");

    return {
      success:
        totals.allProductsMatch &&
        totals.allVariantsMatch &&
        totals.totalMissingProducts === 0 &&
        totals.totalIntegrityIssues === 0,
      totals,
      results: allResults,
    };
  } catch (error) {
    console.error("\n❌ VERIFICATION ERROR:");
    console.error(`   ${error.message}`);
    console.error("\n" + error.stack + "\n");
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB\n");
  }
}

// ============================================
// RUN VERIFICATION
// ============================================

verifyAll()
  .then((result) => {
    if (result.success) {
      console.log("✅ All verification checks passed!");
      process.exit(0);
    } else {
      console.log("⚠️  Some verification checks failed");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("❌ Verification failed:", error.message);
    process.exit(1);
  });
