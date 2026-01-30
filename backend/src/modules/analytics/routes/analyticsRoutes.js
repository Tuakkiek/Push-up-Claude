// backend/src/routes/analyticsRoutes.js
import express from "express";
import { protect, restrictTo } from "../../../shared/middleware/authMiddleware.js";
import salesAnalyticsService from "../services/salesAnalyticsService.js";
import {
  getEmployeeKPI,
  getPersonalStats,
} from "../controllers/analyticsController.js";

const router = express.Router();

// Protect all routes
router.use(protect);

/**
 * GET /api/analytics/top-sellers/:category
 * Get top 10 best sellers by category
 */
router.get("/top-sellers/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;

    const topSellers = await salesAnalyticsService.getTopSellersByCategory(
      category,
      parseInt(limit)
    );

    res.json({
      success: true,
      data: topSellers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/analytics/top-sellers
 * Get top 10 best sellers across all categories
 */
router.get("/top-sellers", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topSellers = await salesAnalyticsService.getTopSellers(
      parseInt(limit)
    );

    res.json({
      success: true,
      data: topSellers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/analytics/product/:productId
 * Get sales data for a specific product
 */
router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { variantId } = req.query;

    const salesData = await salesAnalyticsService.getProductSales(
      productId,
      variantId || null
    );

    if (!salesData) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy dữ liệu bán hàng",
      });
    }

    res.json({
      success: true,
      data: salesData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/analytics/sales-by-time
 * Get sales by time period
 */
router.get("/sales-by-time", async (req, res) => {
  try {
    const { category, startDate, endDate, period = "daily" } = req.query;

    if (!category || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Thiếu tham số: category, startDate, endDate",
      });
    }

    const salesData = await salesAnalyticsService.getSalesByTimePeriod(
      category,
      new Date(startDate),
      new Date(endDate),
      period
    );

    res.json({
      success: true,
      data: salesData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/analytics/reset/:productId
 * Reset sales data (Admin only)
 */
router.delete("/reset/:productId", restrictTo("ADMIN"), async (req, res) => {
  try {
    const { productId } = req.params;
    const { variantId } = req.query;

    await salesAnalyticsService.resetSalesData(productId, variantId || null);

    res.json({
      success: true,
      message: "Đã reset dữ liệu bán hàng",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/analytics/dashboard
 * Get dashboard statistics
 */
router.get(
  "/dashboard",
  restrictTo("ADMIN", "WAREHOUSE_STAFF"),
  async (req, res) => {
    try {
      const { category } = req.query;

      let topSellers;
      if (category) {
        topSellers = await salesAnalyticsService.getTopSellersByCategory(
          category,
          10
        );
      } else {
        topSellers = await salesAnalyticsService.getTopSellers(10);
      }

      // Calculate total revenue
      const totalRevenue = topSellers.reduce(
        (sum, item) => sum + (item.revenue?.total || 0),
        0
      );
      const totalSales = topSellers.reduce(
        (sum, item) => sum + (item.sales?.total || 0),
        0
      );

      res.json({
        success: true,
        data: {
          topSellers,
          summary: {
            totalRevenue,
            totalSales,
            averageOrderValue: totalSales > 0 ? totalRevenue / totalSales : 0,
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ============================================
// ADMIN ROUTES - Employee KPI
// ============================================
router.get(
  "/employee/kpi",
  protect,
  restrictTo("ADMIN", "ORDER_MANAGER"),
  getEmployeeKPI
);
// ============================================
// EMPLOYEE ROUTES - Personal Stats
// ============================================
router.get(
  "/employee/personal",
  protect,
  restrictTo("POS_STAFF", "SHIPPER", "CASHIER", "ADMIN"), // ← THÊM 3 ROLE NÀY
  getPersonalStats
);

export default router;
