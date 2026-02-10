// ============================================
// FILE: backend/scripts/migrateAllData.js
// ✅ STEP 5: Complete Data Migration Script
// Purpose: Migrate ALL products and variants to unified schema
// ============================================

import mongoose from "mongoose";
import dotenv from "dotenv";
import ProductType from "../src/models/ProductType.js";
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
// MIGRATION CONFIGURATION
// ============================================

const MIGRATION_MAP = [
  {
    name: "iPhone",
    slug: "iphone",
    ProductModel: IPhone,
    VariantModel: IPhoneVariant,
    specMapper: (product) => ({
      chip: product.specifications?.chip || "",
      ram: product.specifications?.ram || "",
      storage: product.specifications?.storage || "",
      frontCamera: product.specifications?.frontCamera || "",
      rearCamera: product.specifications?.rearCamera || "",
      screenSize: product.specifications?.screenSize || "",
      screenTech: product.specifications?.screenTech || "",
      battery: product.specifications?.battery || "",
      os: product.specifications?.os || "iOS",
    }),
    variantMapper: (variant) => ({
      versionName: variant.storage,
      legacyFields: { storage: variant.storage },
    }),
  },
  {
    name: "iPad",
    slug: "ipad",
    ProductModel: IPad,
    VariantModel: IPadVariant,
    specMapper: (product) => ({
      chip: product.specifications?.chip || "",
      ram: product.specifications?.ram || "",
      storage: product.specifications?.storage || "",
      frontCamera: product.specifications?.frontCamera || "",
      rearCamera: product.specifications?.rearCamera || "",
      screenSize: product.specifications?.screenSize || "",
      screenTech: product.specifications?.screenTech || "",
      battery: product.specifications?.battery || "",
      os: product.specifications?.os || "iPadOS",
    }),
    variantMapper: (variant) => {
      const versionName = variant.connectivity === "WiFi"
        ? variant.storage
        : `${variant.storage} ${variant.connectivity}`;
      return {
        versionName,
        legacyFields: {
          storage: variant.storage,
          connectivity: variant.connectivity,
        },
      };
    },
  },
  {
    name: "Mac",
    slug: "mac",
    ProductModel: Mac,
    VariantModel: MacVariant,
    specMapper: (product) => ({
      chip: product.specifications?.chip || "",
      gpu: product.specifications?.gpu || "",
      ram: product.specifications?.ram || "",
      storage: product.specifications?.storage || "",
      screenSize: product.specifications?.screenSize || "",
      screenResolution: product.specifications?.screenResolution || "",
      battery: product.specifications?.battery || "",
      os: product.specifications?.os || "macOS",
    }),
    variantMapper: (variant) => {
      const versionName = `${variant.cpuGpu} ${variant.ram} ${variant.storage}`.trim();
      return {
        versionName,
        legacyFields: {
          cpuGpu: variant.cpuGpu,
          ram: variant.ram,
          storage: variant.storage,
        },
      };
    },
  },
  {
    name: "AirPods",
    slug: "airpods",
    ProductModel: AirPods,
    VariantModel: AirPodsVariant,
    specMapper: (product) => ({
      chip: product.specifications?.chip || "",
      batteryLife: product.specifications?.batteryLife || "",
      waterResistance: product.specifications?.waterResistance || "",
      bluetooth: product.specifications?.bluetooth || "",
    }),
    variantMapper: (variant) => ({
      versionName: variant.variantName,
      legacyFields: { variantName: variant.variantName },
    }),
  },
  {
    name: "Apple Watch",
    slug: "apple-watch",
    ProductModel: AppleWatch,
    VariantModel: AppleWatchVariant,
    specMapper: (product) => ({
      screenSize: product.specifications?.screenSize || "",
      cpu: product.specifications?.cpu || "",
      os: product.specifications?.os || "watchOS",
      storage: product.specifications?.storage || "",
      batteryLife: product.specifications?.batteryLife || "",
      features: product.specifications?.features || "",
      healthFeatures: product.specifications?.healthFeatures || "",
    }),
    variantMapper: (variant) => ({
      versionName: variant.variantName,
      legacyFields: { 
        variantName: variant.variantName,
        bandSize: variant.bandSize || "",
      },
    }),
  },
  {
    name: "Accessory",
    slug: "accessory",
    ProductModel: Accessory,
    VariantModel: AccessoryVariant,
    specMapper: (product) => ({
      material: product.specifications?.material || "",
      weight: product.specifications?.weight || "",
      dimensions: product.specifications?.dimensions || "",
      warranty: product.specifications?.warranty || "",
      compatibility: product.specifications?.compatibility || "",
    }),
    variantMapper: (variant) => ({
      versionName: variant.variantName,
      legacyFields: { variantName: variant.variantName },
    }),
  },
];

// ============================================
// HELPER: Create slug
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
// MIGRATE SINGLE CATEGORY
// ============================================
async function migrateCategory(config, session) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`📦 MIGRATING: ${config.name}`);
  console.log(`${"=".repeat(70)}\n`);

  const stats = {
    category: config.name,
    productsFound: 0,
    productsMigrated: 0,
    productsSkipped: 0,
    variantsMigrated: 0,
    errors: [],
  };

  try {
    // Get ProductType
    const productType = await ProductType.findOne({ slug: config.slug }).session(session);
    if (!productType) {
      throw new Error(`ProductType "${config.name}" not found. Run seed first!`);
    }
    console.log(`✅ ProductType: ${productType.name} (${productType._id})`);

    // Get all old products
    const oldProducts = await config.ProductModel.find().session(session);
    stats.productsFound = oldProducts.length;
    console.log(`📊 Found ${oldProducts.length} products\n`);

    if (oldProducts.length === 0) {
      console.log("⚠️  No products to migrate\n");
      return stats;
    }

    // Migrate each product
    for (const oldProduct of oldProducts) {
      try {
        // Check if already migrated
        const existing = await UnifiedProduct.findOne({
          legacyCategory: config.name,
          legacyId: oldProduct._id,
        }).session(session);

        if (existing) {
          console.log(`⏭️  SKIPPED: ${oldProduct.name} (already migrated)`);
          stats.productsSkipped++;
          continue;
        }

        // Map specifications
        const specifications = config.specMapper(oldProduct);

        // Create base slug
        const baseSlug = createSlug(oldProduct.model || oldProduct.name);

        // Create UnifiedProduct
        const unifiedProduct = new UnifiedProduct({
          name: oldProduct.name,
          model: oldProduct.model || oldProduct.name,
          slug: oldProduct.slug || baseSlug,
          baseSlug: oldProduct.baseSlug || baseSlug,
          description: oldProduct.description || "",
          productTypeId: productType._id,
          specifications,
          condition: oldProduct.condition || "NEW",
          brand: oldProduct.brand || "Apple",
          status: oldProduct.status || "AVAILABLE",
          installmentBadge: oldProduct.installmentBadge || "NONE",
          featuredImages: oldProduct.featuredImages || [],
          videoUrl: oldProduct.videoUrl || "",
          variants: [],
          createdBy: oldProduct.createdBy,
          legacyCategory: config.name,
          legacyId: oldProduct._id,
          createdAt: oldProduct.createdAt,
          updatedAt: oldProduct.updatedAt,
        });

        await unifiedProduct.save({ session });
        stats.productsMigrated++;

        console.log(`✅ PRODUCT: ${oldProduct.name}`);
        console.log(`   Old ID: ${oldProduct._id}`);
        console.log(`   New ID: ${unifiedProduct._id}`);
        console.log(`   Slug: ${unifiedProduct.baseSlug}`);

        // Migrate variants
        const oldVariants = await config.VariantModel.find({
          productId: oldProduct._id,
        }).session(session);

        console.log(`   📦 Migrating ${oldVariants.length} variants...`);

        const variantIds = [];
        for (const oldVariant of oldVariants) {
          try {
            const { versionName, legacyFields } = config.variantMapper(oldVariant);

            const versionSlug = createSlug(versionName);
            const variantSlug = `${unifiedProduct.baseSlug}-${versionSlug}`;

            const unifiedVariant = new UnifiedVariant({
              productId: unifiedProduct._id,
              color: oldVariant.color,
              versionName,
              originalPrice: oldVariant.originalPrice,
              price: oldVariant.price,
              stock: oldVariant.stock,
              images: oldVariant.images || [],
              sku: oldVariant.sku,
              slug: oldVariant.slug || variantSlug,
              salesCount: oldVariant.salesCount || 0,
              viewCount: 0,
              legacyFields: new Map(Object.entries(legacyFields)),
              createdAt: oldVariant.createdAt,
              updatedAt: oldVariant.updatedAt,
            });

            await unifiedVariant.save({ session });
            variantIds.push(unifiedVariant._id);
            stats.variantsMigrated++;

            console.log(`      ✓ ${oldVariant.color} - ${versionName} (${oldVariant.sku})`);
          } catch (variantError) {
            console.error(`      ✗ Variant error: ${variantError.message}`);
            stats.errors.push({
              product: oldProduct.name,
              variant: oldVariant.sku,
              error: variantError.message,
            });
          }
        }

        // Update product with variant references
        unifiedProduct.variants = variantIds;
        await unifiedProduct.save({ session });

        console.log(`   ✅ Linked ${variantIds.length} variants\n`);
      } catch (productError) {
        console.error(`❌ Product error: ${oldProduct.name}`);
        console.error(`   ${productError.message}\n`);
        stats.errors.push({
          product: oldProduct.name,
          error: productError.message,
        });
        stats.productsSkipped++;
      }
    }

    console.log(`\n${"─".repeat(70)}`);
    console.log(`✅ ${config.name} Migration Complete`);
    console.log(`   Products: ${stats.productsMigrated}/${stats.productsFound} migrated`);
    console.log(`   Variants: ${stats.variantsMigrated}`);
    console.log(`   Errors: ${stats.errors.length}`);
    console.log(`${"─".repeat(70)}\n`);

    return stats;
  } catch (error) {
    console.error(`\n❌ CATEGORY MIGRATION FAILED: ${config.name}`);
    console.error(`   ${error.message}\n`);
    throw error;
  }
}

// ============================================
// MAIN MIGRATION FUNCTION
// ============================================
async function migrateAll() {
  console.log("\n" + "=".repeat(70));
  console.log("🚀 STARTING COMPLETE DATA MIGRATION");
  console.log("=".repeat(70));
  console.log(`Database: ${MONGODB_URI}`);
  console.log(`Categories: ${MIGRATION_MAP.length}`);
  console.log("=".repeat(70) + "\n");

  await mongoose.connect(MONGODB_URI, { dbName: "istore" });
  console.log("✅ Connected to MongoDB\n");

  // const session = await mongoose.startSession();
  // session.startTransaction();
  const session = null; // Standalone MongoDB doesn't support transactions

  try {
    const allStats = [];

    // Migrate each category
    for (const config of MIGRATION_MAP) {
      const stats = await migrateCategory(config, session);
      allStats.push(stats);
    }

    // Commit transaction
    // await session.commitTransaction();
    // console.log("\n✅ Transaction committed successfully\n");

    // ========================================
    // MIGRATION SUMMARY
    // ========================================
    console.log("\n" + "=".repeat(70));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(70));

    const totals = allStats.reduce(
      (acc, stat) => ({
        productsFound: acc.productsFound + stat.productsFound,
        productsMigrated: acc.productsMigrated + stat.productsMigrated,
        productsSkipped: acc.productsSkipped + stat.productsSkipped,
        variantsMigrated: acc.variantsMigrated + stat.variantsMigrated,
        errors: acc.errors + stat.errors.length,
      }),
      {
        productsFound: 0,
        productsMigrated: 0,
        productsSkipped: 0,
        variantsMigrated: 0,
        errors: 0,
      }
    );

    console.log("\nPer Category:");
    allStats.forEach((stat) => {
      console.log(`\n  ${stat.category}:`);
      console.log(`    Products: ${stat.productsMigrated}/${stat.productsFound}`);
      console.log(`    Variants: ${stat.variantsMigrated}`);
      console.log(`    Errors: ${stat.errors.length}`);
    });

    console.log("\n" + "─".repeat(70));
    console.log("\nTotals:");
    console.log(`  Products Found: ${totals.productsFound}`);
    console.log(`  Products Migrated: ${totals.productsMigrated}`);
    console.log(`  Products Skipped: ${totals.productsSkipped}`);
    console.log(`  Variants Migrated: ${totals.variantsMigrated}`);
    console.log(`  Total Errors: ${totals.errors}`);
    console.log("\n" + "=".repeat(70));

    if (totals.errors > 0) {
      console.log("\n⚠️  ERRORS OCCURRED:");
      allStats.forEach((stat) => {
        if (stat.errors.length > 0) {
          console.log(`\n  ${stat.category}:`);
          stat.errors.forEach((err, idx) => {
            console.log(`    ${idx + 1}. ${err.product}: ${err.error}`);
          });
        }
      });
      console.log("\n" + "=".repeat(70));
    }

    if (totals.errors === 0) {
      console.log("\n✅ ALL DATA MIGRATED SUCCESSFULLY!");
    } else {
      console.log(`\n⚠️  MIGRATION COMPLETED WITH ${totals.errors} ERRORS`);
    }

    console.log("\n" + "=".repeat(70) + "\n");

    return {
      success: totals.errors === 0,
      totals,
      stats: allStats,
    };
  } catch (error) {
    // await session.abortTransaction();
    console.error("\n❌ MIGRATION FAILED:");
    console.error(`   ${error.message}`);
    console.error("\n" + error.stack + "\n");
    throw error;
  } finally {
    // session.endSession();
    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB\n");
  }
}

// ============================================
// RUN MIGRATION
// ============================================

console.log("\n⚠️  WARNING: This will migrate ALL products and variants!");
console.log("⚠️  Make sure you have a backup of your database!");
console.log("⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");

// setTimeout(() => {
  migrateAll()
    .then((result) => {
      if (result.success) {
        console.log("✅ Migration completed successfully!");
        process.exit(0);
      } else {
        console.log("⚠️  Migration completed with errors");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Migration failed:", error.message);
      process.exit(1);
    });
// }, 5000);
