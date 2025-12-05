// backend/src/models/CustomSpecification.js
import mongoose from "mongoose";

const FieldDefinitionSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    trim: true,
  },
  label: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ["text", "number", "select", "textarea"],
    default: "text",
  },
  required: {
    type: Boolean,
    default: false,
  },
  placeholder: {
    type: String,
    trim: true,
  },
  options: [String], // Chỉ dùng cho type="select"
  order: {
    type: Number,
    default: 0,
  },
});

const CustomSpecificationSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      required: true,
      enum: ["iPhone", "iPad", "Mac", "AirPods", "AppleWatch", "Accessories"],
      unique: true,
    },
    useCustomSpecs: {
      type: Boolean,
      default: false,
    },
    fields: [FieldDefinitionSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Index
CustomSpecificationSchema.index({ category: 1 });

export default mongoose.model("CustomSpecification", CustomSpecificationSchema);
