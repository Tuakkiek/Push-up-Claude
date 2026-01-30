import Category from "../models/Category.js";
import { AppError } from "../../../shared/utils/AppError.js";
import { logEvent } from "../../../shared/infrastructure/logger.js";

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, specSchema, variantSchema } = req.body;
    
    console.log("📝 [CREATE CATEGORY] Received data:", {
      name,
      slug,
      description,
      specSchemaLength: specSchema?.length || 0,
      variantSchemaLength: variantSchema?.length || 0
    });

    const categoryExists = await Category.findOne({ slug });
    if (categoryExists) {
      console.log("❌ [CREATE CATEGORY] Category already exists:", slug);
      throw new AppError("Category already exists", 400);
    }

    const category = await Category.create({
      name,
      slug,
      description,
      specSchema,
      variantSchema,
    });

    console.log("✅ [CREATE CATEGORY] Successfully created:", {
      id: category._id,
      name: category.name,
      slug: category.slug
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("❌ [CREATE CATEGORY] Error:", error.message);
    next(error);
  }
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req, res, next) => {
  try {
    // Include schemas for admin category management
    const categories = await Category.find({ isActive: true });

    logEvent("category.list", {
      requestId: req.requestId,
      adminId: req.user?._id,
      filter: { isActive: true },
      returnedCount: categories.length,
    });
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get category details (incl. schema)
// @route   GET /api/categories/:slug
// @access  Public
export const getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug });
    
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategory = async (req, res, next) => {
  try {
    const { name, slug, description, specSchema, variantSchema } = req.body;
    
    console.log("📝 [UPDATE CATEGORY] Updating category ID:", req.params.id);
    console.log("📝 [UPDATE CATEGORY] Received data:", {
      name,
      slug,
      description,
      specSchemaLength: specSchema?.length || 0,
      variantSchemaLength: variantSchema?.length || 0
    });

    const category = await Category.findById(req.params.id);
    if (!category) {
      console.log("❌ [UPDATE CATEGORY] Category not found:", req.params.id);
      throw new AppError("Category not found", 404);
    }

    console.log("🔍 [UPDATE CATEGORY] Found existing category:", {
      id: category._id,
      name: category.name,
      slug: category.slug
    });

    // Check if slug is being changed and if new slug already exists
    if (slug && slug !== category.slug) {
      const slugExists = await Category.findOne({ slug });
      if (slugExists) {
        console.log("❌ [UPDATE CATEGORY] Slug already exists:", slug);
        throw new AppError("Category with this slug already exists", 400);
      }
    }

    category.name = name || category.name;
    category.slug = slug || category.slug;
    category.description = description !== undefined ? description : category.description;
    category.specSchema = specSchema || category.specSchema;
    category.variantSchema = variantSchema || category.variantSchema;
    category.version = (category.version || 1) + 1; // Increment version

    console.log("💾 [UPDATE CATEGORY] Saving changes...");
    await category.save();
    console.log("✅ [UPDATE CATEGORY] Successfully saved:", {
      id: category._id,
      name: category.name,
      slug: category.slug,
      version: category.version
    });

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error("❌ [UPDATE CATEGORY] Error:", error.message);
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    // Soft delete by setting isActive to false
    category.isActive = false;
    await category.save();

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
