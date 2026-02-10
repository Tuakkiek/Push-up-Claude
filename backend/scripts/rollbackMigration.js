// ============================================
// FILE: backend/scripts/rollbackMigration.js
// ✅ STEP 5: Migration Rollback Script
// Purpose: Rollback migration (delete migrated data)
// ============================================

import mongoose from "mongoose";
import dotenv from "dotenv";
import UnifiedProduct from "../src/models/UnifiedProduct.js";
import UnifiedVariant from "../src/models/UnifiedVariant.js";
import readline from "readline";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_CONNECTIONSTRING || "mongodb://localhost:27017/istore";

// ============================================
// HELPER: Confirm action
// ============================================
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes");
    });
  });
}

// ============================================
// ROLLBACK FUNCTION
// ============================================
async function rollbackMigration() {
  console.log("\n" + "=".repeat(70));
  console.log("⚠️  MIGRATION ROLLBACK");
  console.log("=".repeat(70));
  console.log("\n⚠️  WARNING: This will DELETE all migrated data!");
  console.log("⚠️  This action CANNOT be undone!");
  console.log("⚠️  Your old data will remain intact.\n");

  try {
    await mongoose.connect(MONGODB_URI, { dbName: "istore" });
    console.log("✅ Connected to MongoDB\n");

    // Get counts before rollback
    const productCount = await UnifiedProduct.countDocuments();
    const variantCount = await UnifiedVariant.countDocuments();

    console.log("📊 Current Unified Data:");
    console.log(`   UnifiedProducts: ${productCount}`);
    console.log(`   UnifiedVariants: ${variantCount}\n`);

    if (productCount === 0 && variantCount === 0) {
      console.log("ℹ️  No migrated data found. Nothing to rollback.\n");
      return;
    }

    // Breakdown by category
    console.log("📊 Breakdown by Category:");
    const categories = [
      "iPhone",
      "iPad",
      "Mac",
      "AirPods",
      "Apple Watch",
      "Accessory",
    ];

    for (const category of categories) {
      const count = await UnifiedProduct.countDocuments({
        legacyCategory: category,
      });
      if (count > 0) {
        console.log(`   ${category}: ${count} products`);
      }
    }

    console.log("\n" + "=".repeat(70) + "\n");

    // Confirm rollback
    const confirmed = await askConfirmation(
      'Type "yes" to DELETE all migrated data: '
    );

    if (!confirmed) {
      console.log("\n❌ Rollback cancelled.\n");
      return;
    }

    console.log("\n🔄 Starting rollback...\n");

    // const session = await mongoose.startSession();
    // session.startTransaction();
    const session = null;

    try {
      // Delete all UnifiedVariants
      console.log("🗑️  Deleting UnifiedVariants...");
      const variantResult = await UnifiedVariant.deleteMany({}, { session });
      console.log(`   ✅ Deleted ${variantResult.deletedCount} variants`);

      // Delete all UnifiedProducts
      console.log("🗑️  Deleting UnifiedProducts...");
      const productResult = await UnifiedProduct.deleteMany({}, { session });
      console.log(`   ✅ Deleted ${productResult.deletedCount} products`);

      // await session.commitTransaction();
      // console.log("\n✅ Transaction committed\n");

      // Verify deletion
      const remainingProducts = await UnifiedProduct.countDocuments();
      const remainingVariants = await UnifiedVariant.countDocuments();

      console.log("📊 Verification:");
      console.log(`   UnifiedProducts remaining: ${remainingProducts}`);
      console.log(`   UnifiedVariants remaining: ${remainingVariants}`);

      if (remainingProducts === 0 && remainingVariants === 0) {
        console.log("\n✅ ROLLBACK SUCCESSFUL!");
        console.log("✅ All migrated data has been deleted");
        console.log("✅ Your old data remains intact\n");
      } else {
        console.log("\n⚠️  ROLLBACK INCOMPLETE");
        console.log("⚠️  Some data may still remain");
        console.log("⚠️  Please check manually\n");
      }
    } catch (error) {
      // await session.abortTransaction();
      throw error;
    } finally {
      // session.endSession();
    }

    console.log("=".repeat(70) + "\n");
  } catch (error) {
    console.error("\n❌ ROLLBACK FAILED:");
    console.error(`   ${error.message}`);
    console.error("\n" + error.stack + "\n");
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB\n");
  }
}

// ============================================
// ROLLBACK SPECIFIC CATEGORY
// ============================================
async function rollbackCategory(categoryName) {
  console.log("\n" + "=".repeat(70));
  console.log(`⚠️  CATEGORY ROLLBACK: ${categoryName}`);
  console.log("=".repeat(70) + "\n");

  try {
    await mongoose.connect(MONGODB_URI, { dbName: "istore" });
    console.log("✅ Connected to MongoDB\n");

    // Get count
    const productCount = await UnifiedProduct.countDocuments({
      legacyCategory: categoryName,
    });

    console.log(`📊 Found ${productCount} ${categoryName} products\n`);

    if (productCount === 0) {
      console.log(`ℹ️  No ${categoryName} products found. Nothing to rollback.\n`);
      return;
    }

    // Confirm
    const confirmed = await askConfirmation(
      `Type "yes" to DELETE ${productCount} ${categoryName} products: `
    );

    if (!confirmed) {
      console.log("\n❌ Rollback cancelled.\n");
      return;
    }

    console.log("\n🔄 Starting category rollback...\n");

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Get product IDs
      const products = await UnifiedProduct.find({
        legacyCategory: categoryName,
      })
        .select("_id")
        .session(session);

      const productIds = products.map((p) => p._id);

      // Delete variants
      console.log("🗑️  Deleting variants...");
      const variantResult = await UnifiedVariant.deleteMany(
        { productId: { $in: productIds } },
        { session }
      );
      console.log(`   ✅ Deleted ${variantResult.deletedCount} variants`);

      // Delete products
      console.log("🗑️  Deleting products...");
      const productResult = await UnifiedProduct.deleteMany(
        { legacyCategory: categoryName },
        { session }
      );
      console.log(`   ✅ Deleted ${productResult.deletedCount} products`);

      await session.commitTransaction();
      console.log("\n✅ Transaction committed\n");

      console.log(`✅ CATEGORY ROLLBACK SUCCESSFUL: ${categoryName}\n`);
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    console.log("=".repeat(70) + "\n");
  } catch (error) {
    console.error("\n❌ CATEGORY ROLLBACK FAILED:");
    console.error(`   ${error.message}`);
    console.error("\n" + error.stack + "\n");
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Disconnected from MongoDB\n");
  }
}

// ============================================
// CLI HANDLER
// ============================================

const args = process.argv.slice(2);

if (args.length === 0) {
  // Rollback all
  rollbackMigration()
    .then(() => {
      console.log("✅ Rollback completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Rollback failed:", error.message);
      process.exit(1);
    });
} else if (args[0] === "--category") {
  // Rollback specific category
  const categoryName = args[1];
  if (!categoryName) {
    console.error("\n❌ Error: Category name required");
    console.error("Usage: node rollbackMigration.js --category <CategoryName>");
    console.error('Example: node rollbackMigration.js --category "iPhone"\n');
    process.exit(1);
  }

  rollbackCategory(categoryName)
    .then(() => {
      console.log("✅ Category rollback completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Category rollback failed:", error.message);
      process.exit(1);
    });
} else {
  console.error("\n❌ Error: Invalid arguments");
  console.error("\nUsage:");
  console.error("  node rollbackMigration.js                     # Rollback all");
  console.error('  node rollbackMigration.js --category "iPhone" # Rollback specific category\n');
  process.exit(1);
}
