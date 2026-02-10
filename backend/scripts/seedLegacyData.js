// ============================================
// FILE: backend/scripts/seedLegacyData.js
// ✅ Seed Legacy Data for Migration Testing
// ============================================

import mongoose from "mongoose";
import dotenv from "dotenv";
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

async function seedLegacyData() {
  console.log("\n🌱 Seeding Legacy Data...");
  
  try {
    await mongoose.connect(MONGODB_URI, { dbName: "istore" });
    console.log("✅ Connected to MongoDB\n");

    // Clear existing legacy data
    await IPhone.deleteMany({});
    await IPhoneVariant.deleteMany({});
    await IPad.deleteMany({});
    await IPadVariant.deleteMany({});
    await Mac.deleteMany({});
    await MacVariant.deleteMany({});
    await AirPods.deleteMany({});
    await AirPodsVariant.deleteMany({});
    await AppleWatch.deleteMany({});
    await AppleWatchVariant.deleteMany({});
    await Accessory.deleteMany({});
    await AccessoryVariant.deleteMany({});

    console.log("🧹 Cleared old legacy data\n");

    const adminId = new mongoose.Types.ObjectId();

    // 1. Seed iPhone
    const iphone15 = await IPhone.create({
      name: "iPhone 15 Pro Max",
      model: "iPhone 15 Pro Max", // Added model
      slug: "iphone-15-pro-max",
      baseSlug: "iphone-15-pro-max", // Added baseSlug
      description: "The ultimate iPhone.",
      price: 1199,
      originalPrice: 1299,
      discountPercentage: 8,
      rating: 4.8,
      reviewCount: 150,
      brand: "Apple",
      stock: 50,
      images: ["iphone15promax.jpg"],
      specifications: {
        chip: "A17 Pro",
        ram: "8GB",
        storage: "256GB",
        screenSize: "6.7 inch",
        screenTech: "Super Retina XDR", // Added required field
        battery: "4422 mAh", // Added required field
        frontCamera: "12MP", // Added required field
        rearCamera: "48MP Main", // Added required field
        os: "iOS 17", // Added required field
      },
      createdBy: adminId,
    });

    await IPhoneVariant.create({
      productId: iphone15._id,
      color: "Natural Titanium",
      storage: "256GB",
      price: 1199,
      originalPrice: 1299,
      stock: 20,
      sku: "IP15PM-NT-256",
      slug: "iphone-15-pro-max-natural-titanium-256gb", // Added slug
    });

    await IPhoneVariant.create({
      productId: iphone15._id,
      color: "Blue Titanium",
      storage: "512GB",
      price: 1399,
      originalPrice: 1499,
      stock: 15,
      sku: "IP15PM-BT-512",
      slug: "iphone-15-pro-max-blue-titanium-512gb", // Added slug
    });

    console.log("✅ Seeded iPhone");

    // 2. Seed Mac
    const macbookPro = await Mac.create({
      name: "MacBook Pro 14 M3",
      model: "MacBook Pro 14 M3", // Added model
      slug: "macbook-pro-14-m3",
      baseSlug: "macbook-pro-14-m3", // Added baseSlug
      description: "Mind-blowing. Head-turning.",
      price: 1599,
      images: ["mbp14.jpg"],
      specifications: {
        chip: "M3 Pro",
        gpu: "14-core GPU", // Added required field
        ram: "18GB",
        storage: "512GB",
        screenSize: "14.2 inch",
        screenResolution: "3024 x 1964", // Added required field
        battery: "72.4Wh", // Added required field
        os: "macOS Sonoma", // Added required field
      },
      createdBy: adminId,
    });

    await MacVariant.create({
      productId: macbookPro._id,
      color: "Space Black",
      cpuGpu: "11-core CPU, 14-core GPU",
      ram: "18GB",
      storage: "512GB",
      price: 1599,
      originalPrice: 1699, // Added originalPrice
      stock: 10,
      sku: "MBP14-M3-BLK",
      slug: "macbook-pro-14-m3-space-black-512gb",
    });

    console.log("✅ Seeded Mac");

    // 3. Seed AirPods
    const airpodsPro = await AirPods.create({
      name: "AirPods Pro (2nd Gen)",
      model: "AirPods Pro (2nd Gen)",
      slug: "airpods-pro-2",
      baseSlug: "airpods-pro-2",
      description: "Rebuilt from the sound up.",
      price: 249,
      images: ["airpodspro2.jpg"],
      specifications: {
        chip: "H2",
        batteryLife: "6 hours",
        waterResistance: "IP54", // Added required field
        bluetooth: "5.3", // Added required field
      },
      createdBy: adminId,
    });

    await AirPodsVariant.create({
      productId: airpodsPro._id,
      color: "White",
      variantName: "MagSafe Case (USB-C)",
      price: 249,
      originalPrice: 249, // Added originalPrice
      stock: 100,
      sku: "APP2-USBC",
      slug: "airpods-pro-2-white",
    });

    console.log("✅ Seeded AirPods");

    console.log("\n✅ Legacy Data Seeding Complete!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedLegacyData();
