// backend/src/controllers/categoryController.js
import Category from "../models/Category.js";

export const listCategories = async (req, res) => {
  try {
    const { active } = req.query;
    const query = active !== undefined ? { active: active === "true" } : {};

    const categories = await Category.find(query).sort({ name: 1 });

    res.json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category không tồn tại",
      });
    }

    res.json({ success: true, data: { category } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, slug, skuPrefix, productFields, variantFields } = req.body;

    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        message: "Name và slug là bắt buộc",
      });
    }

    // Check duplicate slug
    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Slug đã tồn tại",
      });
    }

    const category = new Category({
      name,
      slug,
      skuPrefix: skuPrefix || "PRODUCT",
      productFields: productFields || [],
      variantFields: variantFields || [],
      active: true,
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: "Tạo category thành công",
      data: { category },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if slug is being changed and if it conflicts
    if (updates.slug) {
      const existing = await Category.findOne({
        slug: updates.slug,
        _id: { $ne: id },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Slug đã tồn tại",
        });
      }
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category không tồn tại",
      });
    }

    res.json({
      success: true,
      message: "Cập nhật category thành công",
      data: { category },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category không tồn tại",
      });
    }

    // Check if it's a fixed category (optional protection)
    const fixedCategories = [
      "iphone",
      "ipad",
      "mac",
      "airpods",
      "applewatch",
      "accessories",
    ];
    if (fixedCategories.includes(category.slug)) {
      return res.status(403).json({
        success: false,
        message: "Không thể xóa category cố định",
      });
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: "Xóa category thành công",
    });
  } catch (error) {
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
