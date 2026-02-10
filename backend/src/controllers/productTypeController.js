// ============================================
// FILE: backend/src/controllers/productTypeController.js
// ✅ STEP 1: ProductType Controller
// Purpose: Manage product types (CRUD operations)
// ============================================

import ProductType from "../models/ProductType.js";
import UnifiedProduct from "../models/UnifiedProduct.js";

// ============================================
// CREATE PRODUCT TYPE
// ============================================
export const create = async (req, res) => {
  try {
    console.log('📥 CREATE PRODUCT TYPE - Request body:', req.body);
    const { name, slug, description, icon, specificationFields, displayOrder } =
      req.body;
    console.log('📝 Extracted fields:', { name, slug, description, icon, displayOrder });

    // Validate required fields
    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Tên loại sản phẩm là bắt buộc",
      });
    }

    // Check for duplicate name
    const existing = await ProductType.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Loại sản phẩm "${name}" đã tồn tại`,
      });
    }

    // Prepare data
    const productTypeData = {
      name: name.trim(),
      description: description?.trim() || "",
      icon: icon?.trim() || "",
      specificationFields: specificationFields || [],
      displayOrder: displayOrder || 0,
      status: "ACTIVE",
      createdBy: req.user._id,
    };

    // Add slug if provided
    if (slug?.trim()) {
      productTypeData.slug = slug.trim();
      console.log('✅ Using provided slug:', slug.trim());
    } else {
      console.log('⚠️ No slug provided, pre-save hook will generate');
    }

    console.log('💾 Creating ProductType with data:', productTypeData);

    // Create product type
    const productType = await ProductType.create(productTypeData);
    
    console.log('✅ ProductType created successfully:', productType);

    res.status(201).json({
      success: true,
      message: "Tạo loại sản phẩm thành công",
      data: { productType },
    });
  } catch (error) {
    console.error("❌ CREATE PRODUCT TYPE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi tạo loại sản phẩm",
    });
  }
};

// ============================================
// UPDATE PRODUCT TYPE
// ============================================
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, specificationFields, displayOrder, status } =
      req.body;

    const productType = await ProductType.findById(id);
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại sản phẩm",
      });
    }

    // Check for duplicate name (excluding current)
    if (name && name.trim() !== productType.name) {
      const existing = await ProductType.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
        _id: { $ne: id },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Loại sản phẩm "${name}" đã tồn tại`,
        });
      }

      productType.name = name.trim();
    }

    // Update fields
    if (description !== undefined)
      productType.description = description?.trim() || "";
    if (icon !== undefined) productType.icon = icon?.trim() || "";
    if (specificationFields !== undefined)
      productType.specificationFields = specificationFields;
    if (displayOrder !== undefined) productType.displayOrder = displayOrder;
    if (status) productType.status = status;
    productType.updatedBy = req.user._id;

    await productType.save();

    res.json({
      success: true,
      message: "Cập nhật loại sản phẩm thành công",
      data: { productType },
    });
  } catch (error) {
    console.error("❌ UPDATE PRODUCT TYPE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi cập nhật loại sản phẩm",
    });
  }
};

// ============================================
// GET ALL PRODUCT TYPES
// ============================================
export const findAll = async (req, res) => {
  try {
    const { status, includeInactive } = req.query;

    const query = {};
    if (status) query.status = status;
    else if (!includeInactive) query.status = "ACTIVE";

    const productTypes = await ProductType.find(query)
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email")
      .sort({ displayOrder: 1, name: 1 });

    // Get product counts for each type
    const typesWithCounts = await Promise.all(
      productTypes.map(async (type) => {
        const count = await UnifiedProduct.countDocuments({
          productTypeId: type._id,
        });
        return {
          ...type.toObject(),
          productCount: count,
        };
      })
    );

    res.json({
      success: true,
      data: { productTypes: typesWithCounts },
    });
  } catch (error) {
    console.error("❌ FIND ALL PRODUCT TYPES ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy danh sách loại sản phẩm",
    });
  }
};

// ============================================
// GET ACTIVE PRODUCT TYPES (PUBLIC)
// ============================================
export const findActive = async (req, res) => {
  try {
    const productTypes = await ProductType.find({ status: "ACTIVE" })
      .sort({ displayOrder: 1, name: 1 })
      .select("-createdBy -updatedBy");

    res.json({
      success: true,
      data: { types: productTypes },
    });
  } catch (error) {
    console.error("❌ FIND ACTIVE PRODUCT TYPES ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy danh sách loại sản phẩm",
    });
  }
};

// ============================================
// GET ONE PRODUCT TYPE
// ============================================
export const findOne = async (req, res) => {
  try {
    const { id } = req.params;

    const productType = await ProductType.findById(id)
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email");

    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại sản phẩm",
      });
    }

    // Get product count
    const productCount = await UnifiedProduct.countDocuments({
      productTypeId: id,
    });

    res.json({
      success: true,
      data: {
        productType: {
          ...productType.toObject(),
          productCount,
        },
      },
    });
  } catch (error) {
    console.error("❌ FIND ONE PRODUCT TYPE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy thông tin loại sản phẩm",
    });
  }
};

// ============================================
// GET BY SLUG
// ============================================
export const findBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const productType = await ProductType.findOne({ slug })
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email");

    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại sản phẩm",
      });
    }

    const productCount = await UnifiedProduct.countDocuments({
      productTypeId: productType._id,
    });

    res.json({
      success: true,
      data: {
        productType: {
          ...productType.toObject(),
          productCount,
        },
      },
    });
  } catch (error) {
    console.error("❌ FIND BY SLUG ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy thông tin loại sản phẩm",
    });
  }
};

// ============================================
// DELETE PRODUCT TYPE
// ============================================
export const deleteProductType = async (req, res) => {
  try {
    const { id } = req.params;

    const productType = await ProductType.findById(id);
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại sản phẩm",
      });
    }

    // Check if there are products using this type
    const productCount = await UnifiedProduct.countDocuments({
      productTypeId: id,
    });

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa. Có ${productCount} sản phẩm đang sử dụng loại này`,
      });
    }

    await productType.deleteOne();

    res.json({
      success: true,
      message: "Xóa loại sản phẩm thành công",
    });
  } catch (error) {
    console.error("❌ DELETE PRODUCT TYPE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi xóa loại sản phẩm",
    });
  }
};

// ============================================
// ADD SPECIFICATION FIELD
// ============================================
export const addSpecificationField = async (req, res) => {
  try {
    const { id } = req.params;
    const field = req.body;

    const productType = await ProductType.findById(id);
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại sản phẩm",
      });
    }

    // Check for duplicate field name
    const exists = productType.specificationFields.find(
      (f) => f.name === field.name
    );
    if (exists) {
      return res.status(400).json({
        success: false,
        message: `Trường "${field.name}" đã tồn tại`,
      });
    }

    await productType.addSpecificationField(field);

    res.json({
      success: true,
      message: "Thêm trường thành công",
      data: { productType },
    });
  } catch (error) {
    console.error("❌ ADD SPECIFICATION FIELD ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi thêm trường",
    });
  }
};

// ============================================
// UPDATE SPECIFICATION FIELD
// ============================================
export const updateSpecificationField = async (req, res) => {
  try {
    const { id, fieldName } = req.params;
    const updates = req.body;

    const productType = await ProductType.findById(id);
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại sản phẩm",
      });
    }

    await productType.updateSpecificationField(fieldName, updates);

    res.json({
      success: true,
      message: "Cập nhật trường thành công",
      data: { productType },
    });
  } catch (error) {
    console.error("❌ UPDATE SPECIFICATION FIELD ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi cập nhật trường",
    });
  }
};

// ============================================
// REMOVE SPECIFICATION FIELD
// ============================================
export const removeSpecificationField = async (req, res) => {
  try {
    const { id, fieldName } = req.params;

    const productType = await ProductType.findById(id);
    if (!productType) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy loại sản phẩm",
      });
    }

    await productType.removeSpecificationField(fieldName);

    res.json({
      success: true,
      message: "Xóa trường thành công",
      data: { productType },
    });
  } catch (error) {
    console.error("❌ REMOVE SPECIFICATION FIELD ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi xóa trường",
    });
  }
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================
export default {
  create,
  update,
  findAll,
  findActive,
  findOne,
  findBySlug,
  deleteProductType,
  addSpecificationField,
  updateSpecificationField,
  removeSpecificationField,
};
