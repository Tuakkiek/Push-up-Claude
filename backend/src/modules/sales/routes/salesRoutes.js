// ============================================
// FILE: backend/src/routes/salesRoutes.js
// ✅ API để lấy top sản phẩm bán chạy
// ============================================

import express from 'express';
import { protect, restrictTo } from '../../../shared/middleware/authMiddleware.js';
import productSalesService from '../services/productSalesService.js';

const router = express.Router();

// ============================================
// PUBLIC ROUTES - Top sản phẩm bán chạy
// ============================================

/**
 * GET /api/sales/top-selling/:category
 * Lấy top 10 sản phẩm bán chạy theo category
 */
router.get('/top-selling/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;

    const products = await productSalesService.getTopSellingProducts(
      category,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: { products },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/sales/top-selling
 * Lấy top sản phẩm bán chạy tất cả category
 */
router.get('/top-selling', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const products = await productSalesService.getAllTopSellingProducts(
      parseInt(limit)
    );

    res.json({
      success: true,
      data: { products },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// PROTECTED ROUTES - Admin only
// ============================================

router.use(protect);
router.use(restrictTo('ADMIN'));

/**
 * POST /api/sales/reset-count
 * Reset sales count (Admin only)
 */
router.post('/reset-count', async (req, res) => {
  try {
    const { category } = req.body;

    await productSalesService.resetSalesCount(category || null);

    res.json({
      success: true,
      message: category 
        ? `Reset sales count cho ${category}` 
        : 'Reset sales count cho tất cả category',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/sales/sync-from-analytics
 * Sync sales count từ SalesAnalytics
 */
router.post('/sync-from-analytics', async (req, res) => {
  try {
    await productSalesService.syncSalesCountFromAnalytics();

    res.json({
      success: true,
      message: 'Đã sync sales count từ analytics',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;