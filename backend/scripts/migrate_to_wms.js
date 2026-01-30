/**
 * Migration Script: Migrate to WMS Architecture
 * 
 * This script migrates the existing embedded Product.variants to:
 * 1. Separate Variant collection
 * 2. Default Warehouse and Location
 * 3. Inventory records mapping variants to locations
 * 
 * Usage: node scripts/migrate_to_wms.js
 * 
 * IMPORTANT: 
 * - Backup your database before running!
 * - Run this only once per environment
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load env from backend directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

// Import models
import Product from "../src/modules/catalog/models/Product.js";
import Variant from "../src/modules/catalog/models/Variant.js";
import Warehouse from "../src/modules/wms/models/Warehouse.js";
import Location from "../src/modules/wms/models/Location.js";
import Inventory from "../src/modules/wms/models/Inventory.js";
import StockMovement from "../src/modules/wms/models/StockMovement.js";

// Migration statistics
const stats = {
  productsProcessed: 0,
  variantsCreated: 0,
  inventoryRecordsCreated: 0,
  totalStockMigrated: 0,
  errors: [],
};

/**
 * Connect to MongoDB
 */
async function connectDB() {
  const mongoUri = process.env.MONGODB_CONNECTIONSTRING;
  if (!mongoUri) {
    throw new Error("MONGODB_CONNECTIONSTRING not found in environment variables");
  }

  console.log("📦 Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");
}

/**
 * Create default warehouse and location
 */
async function createDefaultWarehouseAndLocation() {
  console.log("\n📍 Setting up default warehouse...");

  // Check if default warehouse exists
  let warehouse = await Warehouse.findOne({ code: "WH-DEFAULT" });

  if (!warehouse) {
    warehouse = await Warehouse.create({
      code: "WH-DEFAULT",
      name: "Default Warehouse",
      description: "Auto-created during WMS migration",
      address: {
        city: "Ho Chi Minh City",
        country: "Vietnam",
      },
      status: "ACTIVE",
      isDefault: true,
    });
    console.log("✅ Created default warehouse:", warehouse.code);
  } else {
    console.log("ℹ️  Default warehouse already exists:", warehouse.code);
  }

  // Check if default location exists
  let location = await Location.findOne({ code: "WH-DEFAULT-A-01-01-01" });

  if (!location) {
    location = await Location.create({
      warehouseId: warehouse._id,
      code: "WH-DEFAULT-A-01-01-01",
      zone: "A",
      aisle: "01",
      shelf: "01",
      bin: "01",
      type: "STORAGE",
      capacity: 999999, // Unlimited capacity for migration
      currentLoad: 0,
      status: "AVAILABLE",
    });
    console.log("✅ Created default location:", location.code);
  } else {
    console.log("ℹ️  Default location already exists:", location.code);
  }

  return { warehouse, location };
}

/**
 * Migrate embedded variants to separate collection
 */
async function migrateVariants(defaultLocation, adminUserId) {
  console.log("\n🔄 Migrating product variants...");

  // Get all products with embedded variants
  const products = await Product.find({ variants: { $exists: true, $ne: [] } });
  console.log(`📊 Found ${products.length} products with variants to migrate`);

  for (const product of products) {
    try {
      console.log(`\n  Processing: ${product.name} (${product.variants?.length || 0} variants)`);

      for (const embeddedVariant of product.variants || []) {
        // Check if variant already migrated (by SKU)
        const existingVariant = await Variant.findOne({ sku: embeddedVariant.sku });
        
        if (existingVariant) {
          console.log(`    ⏭️  Variant ${embeddedVariant.sku} already exists, skipping`);
          continue;
        }

        // Create new Variant document
        const variant = await Variant.create({
          productId: product._id,
          sku: embeddedVariant.sku,
          price: embeddedVariant.price,
          originalPrice: embeddedVariant.originalPrice,
          attributes: embeddedVariant.attributes || {},
          images: embeddedVariant.images || [],
          totalStock: embeddedVariant.stock || 0,
          reservedStock: 0,
          salesCount: embeddedVariant.salesCount || 0,
          status: embeddedVariant.stock > 0 ? "ACTIVE" : "OUT_OF_STOCK",
        });

        stats.variantsCreated++;

        // Create inventory record if there's stock
        if (embeddedVariant.stock > 0) {
          await Inventory.create({
            variantId: variant._id,
            locationId: defaultLocation._id,
            quantity: embeddedVariant.stock,
            reservedQuantity: 0,
            receivedAt: new Date(),
          });

          // Create initial stock movement for audit trail
          await StockMovement.create({
            type: "INBOUND",
            variantId: variant._id,
            sku: variant.sku,
            toLocationId: defaultLocation._id,
            toLocationCode: defaultLocation.code,
            quantity: embeddedVariant.stock,
            referenceType: "SYSTEM",
            referenceNumber: "MIGRATION-WMS-INIT",
            performedBy: adminUserId || new mongoose.Types.ObjectId(),
            notes: "Initial stock migration from embedded variant",
            previousQuantity: 0,
            newQuantity: embeddedVariant.stock,
            status: "COMPLETED",
          });

          stats.inventoryRecordsCreated++;
          stats.totalStockMigrated += embeddedVariant.stock;
        }

        console.log(`    ✅ Migrated ${variant.sku} (stock: ${embeddedVariant.stock || 0})`);
      }

      // Update product variantCount
      const migratedVariantCount = await Variant.countDocuments({ productId: product._id });
      product.variantCount = migratedVariantCount;
      await product.save();

      stats.productsProcessed++;
    } catch (error) {
      stats.errors.push({
        productId: product._id,
        productName: product.name,
        error: error.message,
      });
      console.error(`    ❌ Error processing ${product.name}:`, error.message);
    }
  }

  // Update default location currentLoad
  const totalInventory = await Inventory.aggregate([
    { $match: { locationId: defaultLocation._id } },
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]);

  if (totalInventory.length > 0) {
    await Location.updateOne(
      { _id: defaultLocation._id },
      { currentLoad: totalInventory[0].total }
    );
  }
}

/**
 * Verify migration results
 */
async function verifyMigration() {
  console.log("\n🔍 Verifying migration...");

  const variantCount = await Variant.countDocuments();
  const inventoryCount = await Inventory.countDocuments();
  const movementCount = await StockMovement.countDocuments();

  console.log(`   📊 Variants in database: ${variantCount}`);
  console.log(`   📊 Inventory records: ${inventoryCount}`);
  console.log(`   📊 Stock movements: ${movementCount}`);

  // Verify stock consistency
  const inventoryTotal = await Inventory.aggregate([
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]);
  const variantTotal = await Variant.aggregate([
    { $group: { _id: null, total: { $sum: "$totalStock" } } },
  ]);

  const invTotal = inventoryTotal[0]?.total || 0;
  const varTotal = variantTotal[0]?.total || 0;

  if (invTotal === varTotal) {
    console.log(`   ✅ Stock consistency check PASSED (Total: ${invTotal})`);
  } else {
    console.log(`   ⚠️  Stock mismatch! Inventory: ${invTotal}, Variants: ${varTotal}`);
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("   WMS MIGRATION SCRIPT - SmartMobileStore                 ");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`   Started at: ${new Date().toISOString()}`);

  try {
    // Connect to database
    await connectDB();

    // Create default warehouse and location
    const { warehouse, location } = await createDefaultWarehouseAndLocation();

    // Migrate variants
    await migrateVariants(location, null);

    // Verify results
    await verifyMigration();

    // Print summary
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("   MIGRATION SUMMARY                                       ");
    console.log("═══════════════════════════════════════════════════════════");
    console.log(`   Products processed:      ${stats.productsProcessed}`);
    console.log(`   Variants created:        ${stats.variantsCreated}`);
    console.log(`   Inventory records:       ${stats.inventoryRecordsCreated}`);
    console.log(`   Total stock migrated:    ${stats.totalStockMigrated}`);
    console.log(`   Errors:                  ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log("\n   ⚠️  ERRORS:");
      stats.errors.forEach((err, i) => {
        console.log(`      ${i + 1}. ${err.productName}: ${err.error}`);
      });
    }

    console.log("\n   ✅ MIGRATION COMPLETED SUCCESSFULLY");
    console.log("═══════════════════════════════════════════════════════════\n");

    // Important note about next steps
    console.log("📝 NEXT STEPS:");
    console.log("   1. Verify the migration in your database");
    console.log("   2. Test the WMS APIs");
    console.log("   3. After verification, you can optionally remove the");
    console.log("      embedded 'variants' field from Product documents");
    console.log("   4. Update Cart/Order logic to use Variant collection\n");

  } catch (error) {
    console.error("\n❌ MIGRATION FAILED:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log("📦 Database connection closed");
  }
}

// Run the migration
runMigration();
