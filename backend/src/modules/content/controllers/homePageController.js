// ============================================
// FILE: backend/src/controllers/homePageController.js
// Controller for managing homepage layout
// ============================================

import HomePageLayout from "../models/HomePageLayout.js";
import path from "path";
import fs from "fs";

// ============================================
// GET ACTIVE LAYOUT
// ============================================
export const getActiveLayout = async (req, res) => {
  try {
    let layout = await HomePageLayout.getActiveLayout();

    if (!layout) {
      // Create default layout if none exists
      const defaultLayout = HomePageLayout.getDefaultLayout();
      layout = await HomePageLayout.create(defaultLayout);
    }

    res.json({
      success: true,
      data: { layout },
    });
  } catch (error) {
    console.error("getActiveLayout error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// UPDATE LAYOUT
// ============================================
export const updateLayout = async (req, res) => {
  try {
    const { sections } = req.body;

    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json({
        success: false,
        message: "Sections phải là một mảng",
      });
    }

    // Validate sections
    for (const section of sections) {
      if (!section.id || !section.type || section.order === undefined) {
        return res.status(400).json({
          success: false,
          message: "Mỗi section phải có id, type và order",
        });
      }
    }

    // Get current active layout
    let layout = await HomePageLayout.findOne({ isActive: true });

    if (!layout) {
      // Create new layout
      layout = await HomePageLayout.create({
        sections,
        lastUpdatedBy: req.user._id,
        isActive: true,
        version: 1,
      });
    } else {
      // Update existing layout
      layout.sections = sections;
      layout.lastUpdatedBy = req.user._id;
      await layout.save();
    }

    res.json({
      success: true,
      message: "Cập nhật giao diện thành công",
      data: { layout },
    });
  } catch (error) {
    console.error("updateLayout error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// TOGGLE SECTION
// ============================================
export const toggleSection = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { enabled } = req.body;

    const layout = await HomePageLayout.findOne({ isActive: true });

    if (!layout) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy layout",
      });
    }

    const section = layout.sections.find((s) => s.id === sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy section",
      });
    }

    section.enabled = enabled;
    layout.lastUpdatedBy = req.user._id;
    await layout.save();

    res.json({
      success: true,
      message: `Đã ${enabled ? "bật" : "tắt"} section`,
      data: { layout },
    });
  } catch (error) {
    console.error("toggleSection error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// REORDER SECTIONS
// ============================================
export const reorderSections = async (req, res) => {
  try {
    const { sectionIds } = req.body; // Array of section IDs in new order

    if (!Array.isArray(sectionIds)) {
      return res.status(400).json({
        success: false,
        message: "sectionIds phải là một mảng",
      });
    }

    const layout = await HomePageLayout.findOne({ isActive: true });

    if (!layout) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy layout",
      });
    }

    // Reorder sections based on sectionIds array
    const reorderedSections = [];

    sectionIds.forEach((id, index) => {
      const section = layout.sections.find((s) => s.id === id);
      if (section) {
        section.order = index + 1;
        reorderedSections.push(section);
      }
    });

    // Add any sections not in sectionIds array at the end
    layout.sections.forEach((section) => {
      if (!sectionIds.includes(section.id)) {
        section.order = reorderedSections.length + 1;
        reorderedSections.push(section);
      }
    });

    layout.sections = reorderedSections;
    layout.lastUpdatedBy = req.user._id;
    await layout.save();

    res.json({
      success: true,
      message: "Đã cập nhật thứ tự sections",
      data: { layout },
    });
  } catch (error) {
    console.error("reorderSections error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// UPDATE SECTION CONFIG
// ============================================
export const updateSectionConfig = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { config, title } = req.body;

    const layout = await HomePageLayout.findOne({ isActive: true });

    if (!layout) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy layout",
      });
    }

    const section = layout.sections.find((s) => s.id === sectionId);

    if (!section) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy section",
      });
    }

    if (config) {
      section.config = { ...section.config, ...config };
    }

    if (title !== undefined) {
      section.title = title;
    }

    layout.lastUpdatedBy = req.user._id;
    await layout.save();

    res.json({
      success: true,
      message: "Đã cập nhật cấu hình section",
      data: { layout },
    });
  } catch (error) {
    console.error("updateSectionConfig error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// UPLOAD BANNER IMAGE
// ============================================
export const uploadBannerImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Không có file được upload",
      });
    }

    // Trả về đường dẫn tương đối, frontend sẽ tự ghép với BASE_URL
    const imagePath = `/uploads/banners/${req.file.filename}`;

    // Log để debug
    console.log("✅ Image uploaded:", imagePath);

    res.json({
      success: true,
      message: "Upload thành công",
      data: { imagePath },
    });
  } catch (error) {
    console.error("uploadBannerImage error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// DELETE BANNER IMAGE
// ============================================
export const deleteBannerImage = async (req, res) => {
  try {
    const { imagePath } = req.body;

    if (!imagePath) {
      return res.status(400).json({
        success: false,
        message: "Cần cung cấp imagePath",
      });
    }

    // Remove /uploads/ prefix if exists
    const filePath = imagePath.replace(/^\/uploads\//, "");
    const fullPath = path.join(process.cwd(), "uploads", filePath);

    // Check if file exists
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    res.json({
      success: true,
      message: "Đã xóa ảnh",
    });
  } catch (error) {
    console.error("deleteBannerImage error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================
// RESET TO DEFAULT LAYOUT
// ============================================
export const resetToDefault = async (req, res) => {
  try {
    // Deactivate all layouts
    await HomePageLayout.updateMany({}, { isActive: false });

    // Create new default layout
    const defaultLayout = HomePageLayout.getDefaultLayout();
    const layout = await HomePageLayout.create({
      ...defaultLayout,
      lastUpdatedBy: req.user._id,
    });

    res.json({
      success: true,
      message: "Đã reset về giao diện mặc định",
      data: { layout },
    });
  } catch (error) {
    console.error("resetToDefault error:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  getActiveLayout,
  updateLayout,
  toggleSection,
  reorderSections,
  updateSectionConfig,
  uploadBannerImage,
  deleteBannerImage,
  resetToDefault,
};
