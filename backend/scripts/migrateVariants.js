// backend/scripts/migrateVariants.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import UnifiedVariant from "../src/models/UnifiedVariant.js";
import { IPhoneVariant } from "../src/models/IPhone.js";
import { IPadVariant } from "../src/models/IPad.js";
import { MacVariant } from "../src/models/Mac.js";
import { AirPodsVariant } from "../src/models/AirPods.js";
import { AppleWatchVariant } from "../src/models/AppleWatch.js";
import { AccessoryVariant } from "../src/models/Accessory.js";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function migrateAllVariants() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Track migration stats
    const stats = {
      iPhone: 0,
      iPad: 0,
      Mac: 0,
      AirPods: 0,
      AppleWatch: 0,
      Accessory: 0,
      total: 0,
      errors: 0
    };

    // ============================================
    // MIGRATE IPHONE VARIANTS
    // ============================================
    console.log("\n🔄 Migrating iPhone variants...");
    const iPhoneVariants = await IPhoneVariant.find({});
    
    for (const oldVariant of iPhoneVariants) {
      try {
        const newData = {
          productId: oldVariant.productId,
          color: oldVariant.color,
          versionName: oldVariant.storage,
          originalPrice: oldVariant.originalPrice,
          price: oldVariant.price,
          stock: oldVariant.stock,
          images: oldVariant.images,
          sku: oldVariant.sku,
          slug: oldVariant.slug,
          salesCount: oldVariant.salesCount || 0,
          legacyFields: { storage: oldVariant.storage },
          createdAt: oldVariant.createdAt,
          updatedAt: oldVariant.updatedAt
        };
        
        await UnifiedVariant.create(newData);
        stats.iPhone++;
        stats.total++;
      } catch (error) {
        console.error(`❌ Error migrating iPhone variant ${oldVariant.sku}:`, error.message);
        stats.errors++;
      }
    }
    console.log(`✅ Migrated ${stats.iPhone} iPhone variants`);

    // ============================================
    // MIGRATE IPAD VARIANTS
    // ============================================
    console.log("\n🔄 Migrating iPad variants...");
    const iPadVariants = await IPadVariant.find({});
    
    for (const oldVariant of iPadVariants) {
      try {
        const versionName = oldVariant.connectivity === "WiFi"
          ? oldVariant.storage
          : `${oldVariant.storage} ${oldVariant.connectivity}`;
        
        const newData = {
          productId: oldVariant.productId,
          color: oldVariant.color,
          versionName: versionName,
          originalPrice: oldVariant.originalPrice,
          price: oldVariant.price,
          stock: oldVariant.stock,
          images: oldVariant.images,
          sku: oldVariant.sku,
          slug: oldVariant.slug,
          salesCount: oldVariant.salesCount || 0,
          legacyFields: {
            storage: oldVariant.storage,
            connectivity: oldVariant.connectivity
          },
          createdAt: oldVariant.createdAt,
          updatedAt: oldVariant.updatedAt
        };
        
        await UnifiedVariant.create(newData);
        stats.iPad++;
        stats.total++;
      } catch (error) {
        console.error(`❌ Error migrating iPad variant ${oldVariant.sku}:`, error.message);
        stats.errors++;
      }
    }
    console.log(`✅ Migrated ${stats.iPad} iPad variants`);

    // ============================================
    // MIGRATE MAC VARIANTS
    // ============================================
    console.log("\n🔄 Migrating Mac variants...");
    const macVariants = await MacVariant.find({});
    
    for (const oldVariant of macVariants) {
      try {
        const versionName = `${oldVariant.cpuGpu} ${oldVariant.ram} ${oldVariant.storage}`.trim();
        
        const newData = {
          productId: oldVariant.productId,
          color: oldVariant.color,
          versionName: versionName,
          originalPrice: oldVariant.originalPrice,
          price: oldVariant.price,
          stock: oldVariant.stock,
          images: oldVariant.images,
          sku: oldVariant.sku,
          slug: oldVariant.slug,
          salesCount: oldVariant.salesCount || 0,
          legacyFields: {
            cpuGpu: oldVariant.cpuGpu,
            ram: oldVariant.ram,
            storage: oldVariant.storage
          },
          createdAt: oldVariant.createdAt,
          updatedAt: oldVariant.updatedAt
        };
        
        await UnifiedVariant.create(newData);
        stats.Mac++;
        stats.total++;
      } catch (error) {
        console.error(`❌ Error migrating Mac variant ${oldVariant.sku}:`, error.message);
        stats.errors++;
      }
    }
    console.log(`✅ Migrated ${stats.Mac} Mac variants`);

    // ============================================
    // MIGRATE SIMPLE VARIANTS (AirPods/Watch/Accessory)
    // ============================================
    
    // AirPods
    console.log("\n🔄 Migrating AirPods variants...");
    const airPodsVariants = await AirPodsVariant.find({});
    for (const oldVariant of airPodsVariants) {
      try {
        await UnifiedVariant.create({
          productId: oldVariant.productId,
          color: oldVariant.color,
          versionName: oldVariant.variantName,
          originalPrice: oldVariant.originalPrice,
          price: oldVariant.price,
          stock: oldVariant.stock,
          images: oldVariant.images,
          sku: oldVariant.sku,
          slug: oldVariant.slug,
          salesCount: oldVariant.salesCount || 0,
          legacyFields: { variantName: oldVariant.variantName },
          createdAt: oldVariant.createdAt,
          updatedAt: oldVariant.updatedAt
        });
        stats.AirPods++;
        stats.total++;
      } catch (error) {
        console.error(`❌ Error migrating AirPods variant ${oldVariant.sku}:`, error.message);
        stats.errors++;
      }
    }
    console.log(`✅ Migrated ${stats.AirPods} AirPods variants`);

    // AppleWatch
    console.log("\n🔄 Migrating AppleWatch variants...");
    const appleWatchVariants = await AppleWatchVariant.find({});
    for (const oldVariant of appleWatchVariants) {
      try {
        await UnifiedVariant.create({
          productId: oldVariant.productId,
          color: oldVariant.color,
          versionName: oldVariant.variantName,
          originalPrice: oldVariant.originalPrice,
          price: oldVariant.price,
          stock: oldVariant.stock,
          images: oldVariant.images,
          sku: oldVariant.sku,
          slug: oldVariant.slug,
          salesCount: oldVariant.salesCount || 0,
          legacyFields: { variantName: oldVariant.variantName },
          createdAt: oldVariant.createdAt,
          updatedAt: oldVariant.updatedAt
        });
        stats.AppleWatch++;
        stats.total++;
      } catch (error) {
        console.error(`❌ Error migrating AppleWatch variant ${oldVariant.sku}:`, error.message);
        stats.errors++;
      }
    }
    console.log(`✅ Migrated ${stats.AppleWatch} AppleWatch variants`);

    // Accessory
    console.log("\n🔄 Migrating Accessory variants...");
    const accessoryVariants = await AccessoryVariant.find({});
    for (const oldVariant of accessoryVariants) {
      try {
        await UnifiedVariant.create({
          productId: oldVariant.productId,
          color: oldVariant.color,
          versionName: oldVariant.variantName,
          originalPrice: oldVariant.originalPrice,
          price: oldVariant.price,
          stock: oldVariant.stock,
          images: oldVariant.images,
          sku: oldVariant.sku,
          slug: oldVariant.slug,
          salesCount: oldVariant.salesCount || 0,
          legacyFields: { variantName: oldVariant.variantName },
          createdAt: oldVariant.createdAt,
          updatedAt: oldVariant.updatedAt
        });
        stats.Accessory++;
        stats.total++;
      } catch (error) {
        console.error(`❌ Error migrating Accessory variant ${oldVariant.sku}:`, error.message);
        stats.errors++;
      }
    }
    console.log(`✅ Migrated ${stats.Accessory} Accessory variants`);

    // ============================================
    // SUMMARY
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("📊 MIGRATION SUMMARY");
    console.log("=".repeat(60));
    console.log(`iPhone variants:      ${stats.iPhone}`);
    console.log(`iPad variants:        ${stats.iPad}`);
    console.log(`Mac variants:         ${stats.Mac}`);
    console.log(`AirPods variants:     ${stats.AirPods}`);
    console.log(`AppleWatch variants:  ${stats.AppleWatch}`);
    console.log(`Accessory variants:   ${stats.Accessory}`);
    console.log("─".repeat(60));
    console.log(`Total migrated:       ${stats.total}`);
    console.log(`Errors:               ${stats.errors}`);
    console.log("=".repeat(60));

    if (stats.errors === 0) {
      console.log("\n✅ ALL VARIANTS MIGRATED SUCCESSFULLY!");
    } else {
      console.log(`\n⚠️ Migration completed with ${stats.errors} errors. Check logs above.`);
    }

  } catch (error) {
    console.error("\n❌ MIGRATION FAILED:", error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run migration
migrateAllVariants();
