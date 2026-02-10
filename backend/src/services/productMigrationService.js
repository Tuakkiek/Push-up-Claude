// ============================================
// FILE: backend/src/services/productMigrationService.js
// ✅ STEP 2: Product Migration Service
// Purpose: Migrate products from old models to UnifiedProduct
// ============================================

import mongoose from "mongoose";
import UnifiedProduct from "../models/UnifiedProduct.js";
import ProductType from "../models/ProductType.js";

/**
 * Generic product migration function
 * Works for ANY old product model
 */
export const migrateProducts = async (
  OldModel,
  productTypeName,
  specificationMapping
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🔄 Migrating ${productTypeName} products...`);
    console.log(`${"=".repeat(60)}\n`);

    // 1. Get ProductType
    const productType = await ProductType.findOne({ name: productTypeName });
    if (!productType) {
      throw new Error(`ProductType "${productTypeName}" not found`);
    }
    console.log(`✅ Found ProductType: ${productType.name} (${productType._id})`);

    // 2. Get all products from old model
    const oldProducts = await OldModel.find().session(session);
    console.log(`📦 Found ${oldProducts.length} ${productTypeName} products to migrate\n`);

    if (oldProducts.length === 0) {
      console.log(`⚠️  No products to migrate`);
      await session.commitTransaction();
      return { migrated: 0, skipped: 0 };
    }

    let migrated = 0;
    let skipped = 0;

    for (const oldProduct of oldProducts) {
      try {
        // Check if already migrated
        const existing = await UnifiedProduct.findOne({
          legacyModel: OldModel.modelName,
          legacyId: oldProduct._id,
        }).session(session);

        if (existing) {
          console.log(`⏭️  Skipped: ${oldProduct.name} (already migrated)`);
          skipped++;
          continue;
        }

        // 3. Map specifications using provided mapping function
        const specifications = specificationMapping(oldProduct);

        // 4. Create base slug
        const baseSlug = (oldProduct.model || oldProduct.name)
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "-")
          .replace(/[^\w\-]+/g, "")
          .replace(/\-\-+/g, "-")
          .replace(/^-+/, "")
          .replace(/-+$/, "");

        // 5. Create UnifiedProduct
        const unifiedProduct = new UnifiedProduct({
          name: oldProduct.name,
          model: oldProduct.model || oldProduct.name,
          slug: oldProduct.slug || baseSlug,
          baseSlug: baseSlug,
          description: oldProduct.description || "",
          productTypeId: productType._id,
          specifications,
          condition: oldProduct.condition || "NEW",
          brand: oldProduct.brand || "Apple",
          status: oldProduct.status || "AVAILABLE",
          installmentBadge: oldProduct.installmentBadge || "NONE",
          featuredImages: oldProduct.featuredImages || [],
          videoUrl: oldProduct.videoUrl || "",
          variants: [], // Will be migrated separately
          createdBy: oldProduct.createdBy,
          updatedBy: oldProduct.updatedBy,
          legacyModel: OldModel.modelName,
          legacyId: oldProduct._id,
          createdAt: oldProduct.createdAt,
          updatedAt: oldProduct.updatedAt,
        });

        await unifiedProduct.save({ session });
        migrated++;

        console.log(`✅ Migrated: ${oldProduct.name}`);
        console.log(`   Legacy ID: ${oldProduct._id}`);
        console.log(`   New ID: ${unifiedProduct._id}`);
        console.log(`   Specifications: ${Object.keys(specifications).join(", ")}\n`);
      } catch (error) {
        console.error(`❌ Failed to migrate ${oldProduct.name}:`, error.message);
        skipped++;
      }
    }

    await session.commitTransaction();

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ Migration complete for ${productTypeName}`);
    console.log(`${"=".repeat(60)}`);
    console.log(`✅ Migrated: ${migrated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`📊 Total: ${oldProducts.length}\n`);

    return { migrated, skipped, total: oldProducts.length };
  } catch (error) {
    await session.abortTransaction();
    console.error(`\n❌ Migration failed for ${productTypeName}:`, error);
    throw error;
  } finally {
    session.endSession();
  }
};

// ============================================
// SPECIFICATION MAPPING FUNCTIONS
// ============================================

/**
 * iPhone specification mapping
 */
export const mapIPhoneSpecifications = (oldProduct) => ({
  chip: oldProduct.chip || "",
  ram: oldProduct.ram || "",
  storage: oldProduct.storage || "",
  frontCamera: oldProduct.frontCamera || "",
  rearCamera: oldProduct.rearCamera || "",
  screenSize: oldProduct.screenSize || "",
  screenTech: oldProduct.screenTech || "",
  battery: oldProduct.battery || "",
  os: oldProduct.os || "iOS",
});

/**
 * iPad specification mapping
 */
export const mapIPadSpecifications = (oldProduct) => ({
  chip: oldProduct.chip || "",
  ram: oldProduct.ram || "",
  storage: oldProduct.storage || "",
  frontCamera: oldProduct.frontCamera || "",
  rearCamera: oldProduct.rearCamera || "",
  screenSize: oldProduct.screenSize || "",
  screenTech: oldProduct.screenTech || "",
  battery: oldProduct.battery || "",
  os: oldProduct.os || "iPadOS",
  connectivity: oldProduct.connectivity || "",
});

/**
 * Mac specification mapping
 */
export const mapMacSpecifications = (oldProduct) => ({
  chip: oldProduct.chip || "",
  gpu: oldProduct.gpu || "",
  ram: oldProduct.ram || "",
  storage: oldProduct.storage || "",
  screenSize: oldProduct.screenSize || "",
  screenResolution: oldProduct.screenResolution || "",
  ports: oldProduct.ports || "",
  keyboard: oldProduct.keyboard || "",
  os: oldProduct.os || "macOS",
});

/**
 * AirPods specification mapping
 */
export const mapAirPodsSpecifications = (oldProduct) => ({
  batteryLife: oldProduct.batteryLife || "",
  chargingCase: oldProduct.chargingCase || "",
  noiseCancellation: oldProduct.noiseCancellation || "",
  connectivity: oldProduct.connectivity || "Bluetooth",
  waterResistance: oldProduct.waterResistance || "",
});

/**
 * Apple Watch specification mapping
 */
export const mapAppleWatchSpecifications = (oldProduct) => ({
  chip: oldProduct.chip || "",
  displaySize: oldProduct.displaySize || "",
  displayType: oldProduct.displayType || "",
  batteryLife: oldProduct.batteryLife || "",
  waterResistance: oldProduct.waterResistance || "",
  sensors: oldProduct.sensors || "",
  connectivity: oldProduct.connectivity || "",
  os: oldProduct.os || "watchOS",
});

/**
 * Accessory specification mapping
 */
export const mapAccessorySpecifications = (oldProduct) => ({
  compatibility: oldProduct.compatibility || "",
  material: oldProduct.material || "",
  features: oldProduct.features || "",
  color: oldProduct.color || "",
  dimensions: oldProduct.dimensions || "",
});

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Migrate iPhone products
 */
export const migrateIPhones = async (IPhoneModel) => {
  return migrateProducts(IPhoneModel, "iPhone", mapIPhoneSpecifications);
};

/**
 * Migrate iPad products
 */
export const migrateIPads = async (IPadModel) => {
  return migrateProducts(IPadModel, "iPad", mapIPadSpecifications);
};

/**
 * Migrate Mac products
 */
export const migrateMacs = async (MacModel) => {
  return migrateProducts(MacModel, "Mac", mapMacSpecifications);
};

/**
 * Migrate AirPods products
 */
export const migrateAirPods = async (AirPodsModel) => {
  return migrateProducts(AirPodsModel, "AirPods", mapAirPodsSpecifications);
};

/**
 * Migrate Apple Watch products
 */
export const migrateAppleWatches = async (AppleWatchModel) => {
  return migrateProducts(AppleWatchModel, "Apple Watch", mapAppleWatchSpecifications);
};

/**
 * Migrate Accessory products
 */
export const migrateAccessories = async (AccessoryModel) => {
  return migrateProducts(AccessoryModel, "Accessory", mapAccessorySpecifications);
};

// ============================================
// EXPORT
// ============================================
export default {
  migrateProducts,
  migrateIPhones,
  migrateIPads,
  migrateMacs,
  migrateAirPods,
  migrateAppleWatches,
  migrateAccessories,
};
