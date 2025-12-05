// backend/src/controllers/customSpecController.js
import CustomSpecification from "../models/CustomSpecification.js";

// ============================================
// GET Custom Specs by Category
// ============================================
export const getByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    let customSpec = await CustomSpecification.findOne({ category })
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email");

    // Nếu chưa có, trả về config mặc định
    if (!customSpec) {
      return res.json({
        success: true,
        data: {
          customSpec: {
            category,
            useCustomSpecs: false,
            fields: [],
          },
        },
      });
    }

    res.json({
      success: true,
      data: { customSpec },
    });
  } catch (error) {
    console.error("getByCategory error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
};

// ============================================
// UPDATE Custom Specs
// ============================================
export const update = async (req, res) => {
  try {
    const { category } = req.params;
    const { useCustomSpecs, fields } = req.body;
    const userId = req.user._id;

    // Validate fields
    if (useCustomSpecs && (!fields || !Array.isArray(fields))) {
      return res.status(400).json({
        success: false,
        message: "Cần có danh sách fields khi bật custom specs",
      });
    }

    // Validate field structure
    if (fields && Array.isArray(fields)) {
      for (const field of fields) {
        if (!field.key || !field.label) {
          return res.status(400).json({
            success: false,
            message: "Mỗi field cần có key và label",
          });
        }
      }
    }

    let customSpec = await CustomSpecification.findOne({ category });

    if (customSpec) {
      // Update existing
      customSpec.useCustomSpecs = useCustomSpecs;
      customSpec.fields = fields || [];
      customSpec.updatedBy = userId;
      await customSpec.save();
    } else {
      // Create new
      customSpec = new CustomSpecification({
        category,
        useCustomSpecs,
        fields: fields || [],
        createdBy: userId,
      });
      await customSpec.save();
    }

    await customSpec.populate("createdBy", "fullName email");
    await customSpec.populate("updatedBy", "fullName email");

    res.json({
      success: true,
      message: "Cập nhật thành công",
      data: { customSpec },
    });
  } catch (error) {
    console.error("update error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi cập nhật",
    });
  }
};

// ============================================
// GET ALL Custom Specs (Admin)
// ============================================
export const getAll = async (req, res) => {
  try {
    const customSpecs = await CustomSpecification.find()
      .populate("createdBy", "fullName email")
      .populate("updatedBy", "fullName email")
      .sort({ category: 1 });

    res.json({
      success: true,
      data: { customSpecs },
    });
  } catch (error) {
    console.error("getAll error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi server",
    });
  }
};

// ============================================
// RESET to Default (Tắt custom specs)
// ============================================
export const resetToDefault = async (req, res) => {
  try {
    const { category } = req.params;

    const customSpec = await CustomSpecification.findOne({ category });

    if (customSpec) {
      customSpec.useCustomSpecs = false;
      customSpec.updatedBy = req.user._id;
      await customSpec.save();
    }

    res.json({
      success: true,
      message: `Đã reset ${category} về specs mặc định`,
    });
  } catch (error) {
    console.error("resetToDefault error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi reset",
    });
  }
};

export default {
  getByCategory,
  update,
  getAll,
  resetToDefault,
};
