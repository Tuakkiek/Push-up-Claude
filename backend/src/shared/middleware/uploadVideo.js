// ============================================
// FILE: backend/src/middleware/uploadVideo.js
// Multer middleware for video uploads
// ============================================

import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure upload directories exist
const videoDir = path.join(process.cwd(), "uploads", "videos");
const thumbnailDir = path.join(process.cwd(), "uploads", "thumbnails");

if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}

if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "video") {
      cb(null, videoDir);
    } else if (file.fieldname === "thumbnail") {
      cb(null, thumbnailDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  if (file.fieldname === "video") {
    const allowedTypes = /mp4|mov|avi|webm/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = file.mimetype.startsWith("video/");

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file video (mp4, mov, avi, webm)"));
    }
  } else if (file.fieldname === "thumbnail") {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = file.mimetype.startsWith("image/");

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file ảnh cho thumbnail"));
    }
  } else {
    cb(new Error("Invalid field name"));
  }
};

// Configure multer
export const uploadVideo = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max for videos
  },
});

export default uploadVideo;
