// ============================================
// FILE: backend/scripts/seedProductTypes.js
// ✅ Seed Product Types for Migration
// ============================================

import mongoose from "mongoose";
import dotenv from "dotenv";
import ProductType from "../src/models/ProductType.js";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_CONNECTIONSTRING || "mongodb://localhost:27017/istore";

const PRODUCT_TYPES = [
  {
    name: "iPhone",
    slug: "iphone",
    description: "Apple Smartphones",
    icon: "iphone",
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
  },
  {
    name: "iPad",
    slug: "ipad",
    description: "Apple Tablets",
    icon: "ipad",
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
  },
  {
    name: "Mac",
    slug: "mac",
    description: "Apple Computers",
    icon: "mac",
    specificationFields: [
      { name: "chip", type: "text", required: true, label: "Chip" },
      { name: "gpu", type: "text", required: false, label: "GPU" },
      { name: "ram", type: "text", required: true, label: "RAM" },
      { name: "storage", type: "text", required: true, label: "Storage" },
      { name: "screenSize", type: "text", required: true, label: "Screen Size" },
      { name: "screenResolution", type: "text", required: false, label: "Screen Resolution" },
      { name: "battery", type: "text", required: false, label: "Battery" },
      { name: "os", type: "text", required: false, label: "OS" },
    ],
  },
  {
    name: "AirPods",
    slug: "airpods",
    description: "Apple Wireless Audio",
    icon: "headphones",
    specificationFields: [
      { name: "chip", type: "text", required: false, label: "Chip" },
      { name: "batteryLife", type: "text", required: false, label: "Battery Life" },
      { name: "waterResistance", type: "text", required: false, label: "Water Resistance" },
      { name: "bluetooth", type: "text", required: false, label: "Bluetooth" },
    ],
  },
  {
    name: "Apple Watch",
    slug: "apple-watch",
    description: "Apple Smartwatches",
    icon: "watch",
    specificationFields: [
      { name: "screenSize", type: "text", required: true, label: "Screen Size" },
      { name: "cpu", type: "text", required: false, label: "Processor" },
      { name: "os", type: "text", required: false, label: "OS" },
      { name: "storage", type: "text", required: false, label: "Storage" },
      { name: "batteryLife", type: "text", required: false, label: "Battery Life" },
      { name: "features", type: "textarea", required: false, label: "Features" },
      { name: "healthFeatures", type: "textarea", required: false, label: "Health Features" },
    ],
  },
  {
    name: "Accessory",
    slug: "accessory",
    description: "Apple Accessories",
    icon: "accessory",
    specificationFields: [
      { name: "material", type: "text", required: false, label: "Material" },
      { name: "weight", type: "text", required: false, label: "Weight" },
      { name: "dimensions", type: "text", required: false, label: "Dimensions" },
      { name: "warranty", type: "text", required: false, label: "Warranty" },
      { name: "compatibility", type: "textarea", required: false, label: "Compatibility" },
    ],
  },
];

async function seedProductTypes() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI, { dbName: "istore" });
    console.log("✅ Connected to MongoDB\n");

    const adminUser = new mongoose.Types.ObjectId(); // Dummy admin ID

    for (const type of PRODUCT_TYPES) {
      const existing = await ProductType.findOne({ slug: type.slug });
      if (existing) {
        console.log(`✅ ProductType already exists: ${type.name}`);
        continue;
      }

      await ProductType.create({
        ...type,
        status: "ACTIVE",
        displayOrder: 0,
        createdBy: adminUser,
      });
      console.log(`✅ Created ProductType: ${type.name}`);
    }

    console.log("\n✅ Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedProductTypes();
