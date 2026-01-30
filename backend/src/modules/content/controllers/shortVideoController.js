// ============================================
// FILE: backend/src/controllers/shortVideoController.js
// Complete controller for short videos
// ============================================

import ShortVideo from "../models/ShortVideo.js";
import fs from "fs";
import path from "path";

// ============================================
// GET ALL VIDEOS (Admin only - with pagination)
// ============================================
export const getAllVideos = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sort = "-createdAt",
    } = req.query;

    const query = {};

    // Filter by status
    if (status && status !== "ALL") {
      query.status = status;
    }

    // Search by title or description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const videos = await ShortVideo.find(query)
      .populate("createdBy", "fullName avatar")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ShortVideo.countDocuments(query);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get all videos error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách video",
    });
  }
};

// ============================================
// GET PUBLISHED VIDEOS (Public)
// ============================================
export const getPublishedVideos = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const videos = await ShortVideo.find({ status: "PUBLISHED" })
      .populate("createdBy", "fullName avatar")
      .populate("linkedProducts")
      .sort({ order: 1, createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: { videos },
    });
  } catch (error) {
    console.error("Get published videos error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy video",
    });
  }
};

// ============================================
// GET TRENDING VIDEOS (Public)
// ============================================
export const getTrendingVideos = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Calculate trending score: views * 0.5 + likes * 2 + shares * 3
    const videos = await ShortVideo.find({ status: "PUBLISHED" })
      .populate("createdBy", "fullName avatar")
      .populate("linkedProducts")
      .sort({ views: -1, likes: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: { videos },
    });
  } catch (error) {
    console.error("Get trending videos error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy video trending",
    });
  }
};

// ============================================
// GET VIDEO BY ID (Public)
// ============================================
export const getVideoById = async (req, res) => {
  try {
    const video = await ShortVideo.findById(req.params.id)
      .populate("createdBy", "fullName avatar")
      .populate("linkedProducts");

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    res.json({
      success: true,
      data: { video },
    });
  } catch (error) {
    console.error("Get video by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy video",
    });
  }
};

// ============================================
// CREATE VIDEO (Admin only)
// ============================================
export const createVideo = async (req, res) => {
  try {
    console.log("📥 Create video request received");
    console.log("- Body:", req.body);
    console.log("- Files:", req.files);

    const { title, description, status, linkedProducts } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!title || !title.trim()) {
      console.error("❌ Title is missing");
      return res.status(400).json({
        success: false,
        message: "Tiêu đề không được để trống",
      });
    }

    // Check files
    console.log("🔍 Checking files...");
    console.log("- req.files:", req.files);
    console.log("- req.files.video:", req.files?.video);
    console.log("- req.files.thumbnail:", req.files?.thumbnail);

    if (!req.files) {
      console.error("❌ No files uploaded");
      return res.status(400).json({
        success: false,
        message: "Vui lòng upload file",
      });
    }

    if (!req.files.video) {
      console.error("❌ Video file is missing");
      return res.status(400).json({
        success: false,
        message: "Vui lòng upload file video",
      });
    }

    if (!req.files.thumbnail) {
      console.error("❌ Thumbnail file is missing");
      return res.status(400).json({
        success: false,
        message: "Vui lòng upload ảnh thumbnail",
      });
    }

    // Get file paths
    const videoPath = `/uploads/videos/${req.files.video[0].filename}`;
    const thumbnailPath = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;

    console.log("✅ Files uploaded:");
    console.log("- Video:", videoPath);
    console.log("- Thumbnail:", thumbnailPath);

    // Get video duration
    const duration = 60; // Default

    // Find max order
    const maxOrderVideo = await ShortVideo.findOne().sort({ order: -1 });
    const order = maxOrderVideo ? maxOrderVideo.order + 1 : 1;

    // Parse linkedProducts
    let parsedLinkedProducts = [];
    if (linkedProducts) {
      try {
        parsedLinkedProducts =
          typeof linkedProducts === "string"
            ? JSON.parse(linkedProducts)
            : linkedProducts;
      } catch (e) {
        console.warn("Could not parse linkedProducts:", e);
      }
    }

    // Create video
    const video = new ShortVideo({
      title: title.trim(),
      description: description?.trim() || "",
      videoUrl: videoPath,
      thumbnailUrl: thumbnailPath,
      duration,
      status: status || "DRAFT",
      createdBy: userId,
      order,
      linkedProducts: parsedLinkedProducts,
    });

    await video.save();
    await video.populate("createdBy", "fullName avatar");

    console.log("✅ Video created successfully:", video._id);

    res.status(201).json({
      success: true,
      message: "Video đã được tạo thành công",
      data: { video },
    });
  } catch (error) {
    console.error("❌ Create video error:", error);

    // Clean up uploaded files if save fails
    if (req.files) {
      if (req.files.video) {
        fs.unlink(req.files.video[0].path, (err) => {
          if (err) console.error("Error deleting video file:", err);
        });
      }
      if (req.files.thumbnail) {
        fs.unlink(req.files.thumbnail[0].path, (err) => {
          if (err) console.error("Error deleting thumbnail file:", err);
        });
      }
    }

    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi tạo video",
      error:
        process.env.NODE_ENV === "development" ? error.toString() : undefined,
    });
  }
};

// ============================================
// UPDATE VIDEO (Admin only)
// ============================================
export const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, linkedProducts } = req.body;

    const video = await ShortVideo.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    // Update text fields
    if (title) video.title = title.trim();
    if (description !== undefined) video.description = description.trim();
    if (status) video.status = status;
    if (linkedProducts) {
      video.linkedProducts =
        typeof linkedProducts === "string"
          ? JSON.parse(linkedProducts)
          : linkedProducts;
    }

    // Update video file if provided
    if (req.files && req.files.video) {
      // Delete old video file
      const oldVideoPath = path.join(process.cwd(), video.videoUrl);
      if (fs.existsSync(oldVideoPath)) {
        fs.unlinkSync(oldVideoPath);
      }

      video.videoUrl = `/uploads/videos/${req.files.video[0].filename}`;
    }

    // Update thumbnail if provided
    if (req.files && req.files.thumbnail) {
      // Delete old thumbnail
      const oldThumbnailPath = path.join(process.cwd(), video.thumbnailUrl);
      if (fs.existsSync(oldThumbnailPath)) {
        fs.unlinkSync(oldThumbnailPath);
      }

      video.thumbnailUrl = `/uploads/thumbnails/${req.files.thumbnail[0].filename}`;
    }

    // Update publishedAt if status changes to PUBLISHED
    if (status === "PUBLISHED" && video.status !== "PUBLISHED") {
      video.publishedAt = new Date();
    }

    await video.save();
    await video.populate("createdBy", "fullName avatar");

    res.json({
      success: true,
      message: "Video đã được cập nhật",
      data: { video },
    });
  } catch (error) {
    console.error("Update video error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật video",
    });
  }
};

// ============================================
// DELETE VIDEO (Admin only)
// ============================================
export const deleteVideo = async (req, res) => {
  try {
    const video = await ShortVideo.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    // Delete video file
    const videoPath = path.join(process.cwd(), video.videoUrl);
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    // Delete thumbnail
    const thumbnailPath = path.join(process.cwd(), video.thumbnailUrl);
    if (fs.existsSync(thumbnailPath)) {
      fs.unlinkSync(thumbnailPath);
    }

    await video.deleteOne();

    res.json({
      success: true,
      message: "Video đã được xóa",
    });
  } catch (error) {
    console.error("Delete video error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi xóa video",
    });
  }
};

// ✅ THÊM LOG CHI TIẾT HƠN
// console.log("✅ Files uploaded:");
// console.log("- Video Path:", videoPath);
// console.log("- Thumbnail Path:", thumbnailPath);
// console.log(
//   "- Video exists:",
//   fs.existsSync(path.join(process.cwd(), videoPath))
// );
// console.log(
//   "- Thumbnail exists:",
//   fs.existsSync(path.join(process.cwd(), thumbnailPath))
// );

// ============================================
// INCREMENT VIEW COUNT (Public)
// ============================================
export const incrementView = async (req, res) => {
  try {
    const video = await ShortVideo.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    res.json({
      success: true,
      data: { views: video.views },
    });
  } catch (error) {
    console.error("Increment view error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật lượt xem",
    });
  }
};

// ============================================
// TOGGLE LIKE (Requires authentication)
// ============================================
export const toggleLike = async (req, res) => {
  try {
    const userId = req.user._id;
    const videoId = req.params.id;

    const video = await ShortVideo.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    const hasLiked = video.likedBy.includes(userId);

    if (hasLiked) {
      // Unlike
      video.likedBy = video.likedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
      video.likes = Math.max(0, video.likes - 1);
    } else {
      // Like
      video.likedBy.push(userId);
      video.likes += 1;
    }

    await video.save();

    res.json({
      success: true,
      data: {
        likes: video.likes,
        isLiked: !hasLiked,
      },
    });
  } catch (error) {
    console.error("Toggle like error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi toggle like",
    });
  }
};

// ============================================
// INCREMENT SHARE COUNT (Public)
// ============================================
export const incrementShare = async (req, res) => {
  try {
    const video = await ShortVideo.findByIdAndUpdate(
      req.params.id,
      { $inc: { shares: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy video",
      });
    }

    res.json({
      success: true,
      data: { shares: video.shares },
    });
  } catch (error) {
    console.error("Increment share error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi cập nhật lượt chia sẻ",
    });
  }
};

// ============================================
// REORDER VIDEOS (Admin only)
// ============================================
export const reorderVideos = async (req, res) => {
  try {
    const { videoIds } = req.body;

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Danh sách video không hợp lệ",
      });
    }

    // Update order for each video
    const updatePromises = videoIds.map((id, index) =>
      ShortVideo.findByIdAndUpdate(id, { order: index + 1 })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: "Đã cập nhật thứ tự video",
    });
  } catch (error) {
    console.error("Reorder videos error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi sắp xếp lại video",
    });
  }
};
