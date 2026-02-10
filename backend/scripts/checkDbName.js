// ============================================
// FILE: backend/scripts/checkDbName.js
// ✅ Debug: Check active database name
// ============================================

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_CONNECTIONSTRING || "mongodb://localhost:27017/istore";

async function checkDb() {
  console.log("\n" + "=".repeat(70));
  console.log("🔍 DEBUG: Checking Active Database");
  console.log("=".repeat(70));
  
  // Mask password for safety
  const safeURI = MONGODB_URI.replace(/:([^:@]+)@/, ":****@");
  console.log(`URI: ${safeURI}\n`);

  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    console.log(`📂 Active Database Name: "${mongoose.connection.db.databaseName}"`);
    console.log("=".repeat(70) + "\n");
    
  } catch (error) {
    console.error("\n❌ FAILED:");
    console.error(`   ${error.message}`);
  } finally {
    await mongoose.connection.close();
  }
}

checkDb();
