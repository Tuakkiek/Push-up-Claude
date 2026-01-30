// ============================================
// FILE: backend/src/controllers/analyticsController.js
// ✅ FIXED: Thêm getPersonalStats controller
// ============================================

import {
  getPOSStaffStats,
  getShipperStats,
  getCashierStats,
  getTopPerformers,
  getPersonalStats as getPersonalStatsService,
} from "../services/employeeAnalyticsService.js";

// ============================================
// GET EMPLOYEE KPI (Admin)
// ============================================
export const getEmployeeKPI = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const [
      posStaffPerformance,
      shipperPerformance,
      cashierPerformance,
      topPerformers,
    ] = await Promise.all([
      getPOSStaffStats(startDate, endDate),
      getShipperStats(startDate, endDate),
      getCashierStats(startDate, endDate),
      getTopPerformers(startDate, endDate),
    ]);

    // Prepare data for charts
    const posStaffRevenue = posStaffPerformance.map((staff) => ({
      name: staff.name,
      value: staff.revenue,
    }));

    const shipperSuccessRate = shipperPerformance.map((shipper) => ({
      name: shipper.name,
      successRate: shipper.successRate,
    }));

    res.json({
      success: true,
      data: {
        posStaffPerformance,
        shipperPerformance,
        cashierPerformance,
        ...topPerformers,
        posStaffRevenue,
        shipperSuccessRate,
      },
    });
  } catch (error) {
    console.error("Get Employee KPI error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi lấy thống kê nhân viên",
    });
  }
};

// ============================================
// ✅ GET PERSONAL STATS (POS_STAFF, SHIPPER, CASHIER)
// ============================================
export const getPersonalStats = async (req, res) => {
  try {
    const userId = req.user._id; // Lấy từ token
    const { period = "today" } = req.query;

    const stats = await getPersonalStatsService(userId, period);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get Personal Stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi lấy thống kê cá nhân",
    });
  }
};

export default {
  getEmployeeKPI,
  getPersonalStats,
};
