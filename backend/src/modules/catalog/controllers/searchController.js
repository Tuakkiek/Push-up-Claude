// ============================================
// FILE: backend/src/controllers/searchController.js
// ✅ FULL-TEXT SEARCH với AI-powered ranking (Unified Product Version)
// ============================================

import Product from "../models/Product.js";
import Category from "../models/Category.js";

// ============================================
// TYPO CORRECTION & SYNONYMS (Simplified for now)
// ============================================
// Note: In a real system, these might be loaded from a DB or external service
const SYNONYM_MAP = {
  laptop: ["mac", "macbook"],
  "máy tính xách tay": ["macbook", "laptop"],
  "tai nghe": ["airpods"],
  "điện thoại": ["iphone"],
  "di động": ["iphone"],
  "đồng hồ": ["watch", "apple watch"],
};

const normalizeVietnamese = (text) => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

const expandSynonyms = (originalQuery) => {
  const normalized = normalizeVietnamese(originalQuery);
  const terms = new Set([normalized]);
  Object.entries(SYNONYM_MAP).forEach(([key, synonyms]) => {
     if (normalized.includes(key)) {
         synonyms.forEach(syn => terms.add(syn));
     }
  });
  return Array.from(terms);
};

// ============================================
// MAIN SEARCH FUNCTION
// ============================================
export const search = async (req, res) => {
  try {
    const { q, limit = 20, category } = req.query;

    if (!q || q.trim().length < 1) {
      return res.status(400).json({
        success: false,
        message: "Query too short",
      });
    }

    const expandedQueries = expandSynonyms(q);
    const searchTerms = expandedQueries.join(" ");

    const query = {
        $text: { $search: searchTerms }
    };

    // If category filter is applied (assuming slug is passed)
    if (category) {
        const catDoc = await Category.findOne({ slug: category });
        if (catDoc) {
            query.category = catDoc._id;
        }
    }

    // Perform Text Search with Scoring
    const products = await Product.find(query, { score: { $meta: "textScore" } })
        .populate("category", "name slug")
        .sort({ score: { $meta: "textScore" } })
        .limit(parseInt(limit) * 2)
        .lean();

    // Re-ranking (Simple version for now, preserving existing logic structure)
    // You can re-introduce the complex calculateRelevance if needed, 
    // but MongoDB text score is usually good enough for a start.

    return res.json({
        success: true,
        data: {
            query: q,
            totalResults: products.length,
            results: products.slice(0, parseInt(limit))
        }
    });

  } catch (error) {
    console.error("Search error:", error);
    return res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message,
    });
  }
};

// ============================================
// AUTOCOMPLETE
// ============================================
export const autocomplete = async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    if (!q || q.trim().length < 2) return res.json({ success: true, data: { suggestions: [] } });

    // Regex search on Name or Brand or Category Name (via lookup if needed, but simple regex on Product name is fast)
    const regex = new RegExp(normalizeVietnamese(q), "i"); // Simplified, ideally remove accents from DB field too or use text index

    const products = await Product.find({
        name: { $regex: q, $options: "i" }
    })
    .select("name brand slug")
    .limit(parseInt(limit))
    .lean();

    const suggestions = products.map(p => ({
        text: p.name,
        type: "Product",
        slug: p.slug
    }));

    return res.json({
        success: true,
        data: {
            query: q,
            suggestions
        }
    });

  } catch (error) {
    console.error("Autocomplete error:", error);
    return res.status(500).json({ success: false, message: "Autocomplete Error" });
  }
};

export default { search, autocomplete };
