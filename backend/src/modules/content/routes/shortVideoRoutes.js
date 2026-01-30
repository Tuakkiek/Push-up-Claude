// ============================================
// FILE: backend/src/routes/shortVideoRoutes.js
// ✅ FIXED: Using correct middleware names
// ============================================

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { protect, restrictTo } from "../../../shared/middleware/authMiddleware.js"; // ✅ FIXED
import {
  getAllVideos,
  getPublishedVideos,
  getTrendingVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  incrementView,
  toggleLike,
  incrementShare,
  reorderVideos,
} from "../controllers/shortVideoController.js";

const router = express.Router();

// ============================================
// MULTER CONFIGURATION
// ============================================

const ensureUploadDirs = () => {
  const dirs = ["uploads/videos", "uploads/thumbnails"];
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

ensureUploadDirs();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "video") {
      cb(null, "uploads/videos/");
    } else if (file.fieldname === "thumbnail") {
      cb(null, "uploads/thumbnails/");
    } else {
      cb(new Error("Invalid field name"), false);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9]/g, "_");
    cb(null, `${file.fieldname}-${sanitizedBasename}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "video") {
    const allowedVideoTypes = [
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-flv",
      "video/webm",
    ];

    if (allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Chỉ chấp nhận file video (MP4, MOV, AVI, FLV, WebM)!"),
        false
      );
    }
  } else if (file.fieldname === "thumbnail") {
    const allowedImageTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file ảnh (JPG, PNG, WebP)!"), false);
    }
  } else {
    cb(new Error("Invalid field name"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File quá lớn! Video tối đa 100MB, ảnh tối đa 5MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Lỗi upload: ${err.message}`,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Lỗi khi upload file",
    });
  }
  next();
};

// ============================================
// PUBLIC ROUTES
// ============================================

router.get("/published", getPublishedVideos);
router.get("/trending", getTrendingVideos);
router.get("/:id", getVideoById);
router.post("/:id/view", incrementView);
router.post("/:id/like", protect, toggleLike); // ✅ FIXED
router.post("/:id/share", incrementShare);

// ============================================
// ADMIN ROUTES
// ============================================

router.get("/", protect, restrictTo("ADMIN"), getAllVideos); // ✅ FIXED

router.post(
  "/",
  protect, // ✅ FIXED
  restrictTo("ADMIN"), // ✅ FIXED
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  handleMulterError,
  createVideo
);

router.put(
  "/:id",
  protect, // ✅ FIXED
  restrictTo("ADMIN"), // ✅ FIXED
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  handleMulterError,
  updateVideo
);

router.delete("/:id", protect, restrictTo("ADMIN"), deleteVideo); // ✅ FIXED

router.put("/reorder", protect, restrictTo("ADMIN"), reorderVideos); // ✅ FIXED

export default router;
