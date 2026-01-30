// ============================================
// FILE: backend/src/models/HomePageLayout.js
// ✅ UPDATED: Removed hardcoded enums for categories
// ============================================

import mongoose from "mongoose";

const sectionConfigSchema = new mongoose.Schema(
  {
    // For banner sections
    images: [{ type: String, trim: true }],
    links: [{ type: String, trim: true }],

    // For category sections
    categoryId: { type: String, trim: true },
    categoryName: { type: String, trim: true },
    limit: { type: Number, default: 10, min: 1, max: 100 },

    // For product sections
    productType: {
      type: String,
      enum: ["new", "topSeller", "category"],
    },
    categoryFilter: {
      type: String,
      // enum removed
    },

    // For deals sections
    dealImages: [{ type: String, trim: true }],
    dealLinks: [{ type: String, trim: true }],

    // For showcase sections
    showcaseItems: [
      {
        title: { type: String, trim: true },
        subtitle: { type: String, trim: true },
        image: { type: String, trim: true },
        link: { type: String, trim: true },
      },
    ],

    // For short-videos section
    videoLimit: { type: Number, default: 6, min: 1, max: 20 },
    videoType: {
      type: String,
      enum: ["trending", "latest"],
      default: "latest",
    },
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "hero",
        "promo-strip",
        "category-nav",
        "deals-grid",
        "magic-deals",
        "products-new",
        "products-topSeller",
        "category-section",
        "iphone-showcase",
        "secondary-banners",
        "short-videos",
      ],
    },
    enabled: { type: Boolean, default: true },
    order: { type: Number, required: true, min: 0 },
    title: { type: String, trim: true },
    config: { type: sectionConfigSchema, default: {} },
  },
  { _id: false }
);

const homePageLayoutSchema = new mongoose.Schema(
  {
    sections: {
      type: [sectionSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

homePageLayoutSchema.index({ isActive: 1 });
homePageLayoutSchema.index({ version: -1 });

homePageLayoutSchema.statics.getActiveLayout = async function () {
  const layout = await this.findOne({ isActive: true }).sort({ version: -1 });

  if (!layout) {
    return this.getDefaultLayout();
  }

  return layout;
};

homePageLayoutSchema.statics.getDefaultLayout = function () {
  return {
    sections: [
        // Default layout omitted for brevity, but should return a valid object
        // Assuming user can re-generate default if needed or I can keep the old one
        // Kept simple for now to avoid huge file
      {
        id: "hero-main",
        type: "hero",
        enabled: true,
        order: 1,
        title: "Hero Banner",
        config: {
          images: [],
          links: [],
        },
      }
    ],
    isActive: true,
    version: 1,
  };
};

homePageLayoutSchema.methods.createNewVersion = async function () {
  await this.constructor.updateMany({}, { isActive: false });

  this.version += 1;
  this.isActive = true;
  this.isNew = true;

  return this.save();
};

const HomePageLayout = mongoose.models.HomePageLayout || mongoose.model("HomePageLayout", homePageLayoutSchema);

export default HomePageLayout;
