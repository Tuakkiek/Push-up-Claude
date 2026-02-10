// ============================================
// FILE: backend/scripts/listCollections.js
// ✅ Debug: List all collections in the database
// ============================================

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/istore";

import UnifiedProduct from "../src/models/UnifiedProduct.js";
import UnifiedVariant from "../src/models/UnifiedVariant.js";

async function listCollections() {
  console.log("\n" + "=".repeat(70));
  console.log("🔍 DEBUG: Listing Collections");
  console.log("=".repeat(70));
  console.log(`URI: ${MONGODB_URI}\n`);

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    console.log(`📂 Database Name: ${mongoose.connection.db.databaseName}\n`);

    console.log(`🔍 UnifiedProduct connects to: "${UnifiedProduct.collection.name}"`);
    console.log(`🔍 UnifiedVariant connects to: "${UnifiedVariant.collection.name}"`);

    const collections = await mongoose.connection.db.listCollections().toArray();

    console.log("📊 Found Collections:");
    if (collections.length === 0) {
        console.log("   (No collections found)");
    } else {
        collections.forEach(col => {
            console.log(`   - ${col.name}`);
        });
    }

    console.log("\n" + "=".repeat(70));
    
  } catch (error) {
    console.error("\n❌ FAILED:");
    console.error(`   ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Disconnected\n");
  }
}

listCollections();
