import mongoose from "mongoose";

// Embedded Variant Schema
const variantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, trim: true }, // Unique within product usually, or global
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    
    // Dynamic attributes based on Category.variantSchema (e.g., { color: "Red", storage: "128GB" })
    attributes: { type: mongoose.Schema.Types.Mixed, default: {} },
    
    images: [{ type: String, trim: true }],
    salesCount: { type: Number, default: 0 },
    status: { 
        type: String, 
        enum: ["AVAILABLE", "OUT_OF_STOCK", "HIDDEN"], 
        default: "AVAILABLE" 
    }
  },
  { _id: true, timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    brand: { type: String, trim: true },
    description: { type: String, trim: true },
    
    // UNIFIED CATEGORY REFERENCE
    category: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Category", 
        required: true 
    },
    
    // Snapshot of the version used used to validate this product
    schemaVersion: { type: Number, required: true },

    // DYNAMIC SPECIFICATIONS based on Category.specSchema
    // e.g., { chip: "A16", ram: "8GB", screen: "6.1" }
    specs: { type: mongoose.Schema.Types.Mixed, default: {} },

    // EMBEDDED VARIANTS
    variants: [variantSchema],

    // Common fields
    featuredImages: [{ type: String, trim: true }],
    videoUrl: { type: String, trim: true },
    
    condition: {
        type: String,
        enum: ["NEW", "LIKE_NEW"],
        default: "NEW"
    },

    status: {
        type: String,
        enum: ["AVAILABLE", "OUT_OF_STOCK", "DISCONTINUED", "PRE_ORDER"],
        default: "AVAILABLE",
    },

    // SEO / Search tags
    tags: [{ type: String, trim: true }],

    // Stats
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalReviews: { type: Number, default: 0, min: 0 },
    salesCount: { type: Number, default: 0, min: 0 },
    viewCount: { type: Number, default: 0 },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        // required: true // Can be optional depending on auth
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
productSchema.index({ slug: 1 });
productSchema.index({ category: 1 });
productSchema.index({ "variants.sku": 1 });
productSchema.index({ "variants.price": 1 });
productSchema.index({ status: 1 });

// Wildcard index for dynamic specs filtering
// Allows querying like: { "specs.screenSize": "6.1 inch" } efficiently
productSchema.index({ "specs.$**": 1 });

// Text index for search
productSchema.index({ name: "text", description: "text", brand: "text" });

const Product = mongoose.model("Product", productSchema);

export default Product;
