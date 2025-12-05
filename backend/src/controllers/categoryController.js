// backend/src/controllers/categoryController.js
import Category from "../models/Category.js";

export const listCategories = async (req, res) => {
  try {
    const categories = await Category.find({}).lean();
    console.log("[Category] list =>", categories.length);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error("[Category] list error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id).lean();
    if (!category) return res.status(404).json({ success: false, message: "Không tìm thấy danh mục" });
    console.log("[Category] get =>", id);
    res.json({ success: true, data: category });
  } catch (error) {
    console.error("[Category] get error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    console.log("[Category] create request:", JSON.stringify(req.body));
    const category = await Category.create(req.body);
    console.log("[Category] created:", category._id);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error("[Category] create error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("[Category] update request:", id, JSON.stringify(req.body));
    const category = await Category.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ success: false, message: "Không tìm thấy danh mục" });
    res.json({ success: true, data: category });
  } catch (error) {
    console.error("[Category] update error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("[Category] delete:", id);
    const category = await Category.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ success: false, message: "Không tìm thấy danh mục" });
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error("[Category] delete error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

export default {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};
