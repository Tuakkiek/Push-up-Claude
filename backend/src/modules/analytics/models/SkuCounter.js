// backend/src/models/SkuCounter.js
import mongoose from "mongoose";

const skuCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // "global"
  seq: { type: Number, default: 0 },
});

export default mongoose.models.SkuCounter || mongoose.model("SkuCounter", skuCounterSchema);