// ============================================
// FILE: backend/src/routes/searchRoutes.js
// Routes for Full-Text Search
// ============================================

import express from "express";
import { search, autocomplete } from "../controllers/searchController.js";

const router = express.Router();

/**
 * GET /api/search?q=iphone+15&limit=20&category=iPhone
 * Full-text search with intelligent ranking
 */
router.get("/", search);

/**
 * GET /api/search/autocomplete?q=iph&limit=5
 * Autocomplete suggestions for search-as-you-type
 */
router.get("/autocomplete", autocomplete);

export default router;