// ============================================
// FILE: backend/src/services/employeeAnalyticsService.js
// ✅ FIXED: successRate trả về NUMBER thay vì STRING
// ============================================

import Order from "../../sales/models/Order.js";

/**
 * Lấy thống kê KPI của POS Staff
 */
export const getPOSStaffStats = async (startDate, endDate) => {
  const match = {
    orderSource: "IN_STORE",
    status: { $in: ["DELIVERED", "CANCELLED"] },
  };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const stats = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          staffId: "$posInfo.staffId",
          staffName: "$posInfo.staffName",
        },
        orderCount: { $sum: 1 },
        revenue: {
          $sum: {
            $cond: [{ $eq: ["$status", "DELIVERED"] }, "$totalAmount", 0],
          },
        },
        cancelledCount: {
          $sum: { $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0] },
        },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  return stats.map((s) => ({
    staffId: s._id.staffId,
    name: s._id.staffName || "Unknown",
    orderCount: s.orderCount,
    revenue: s.revenue,
    cancelledCount: s.cancelledCount,
  }));
};

/**
 * ✅ FIXED: Lấy thống kê KPI của Shipper - successRate là NUMBER
 */
export const getShipperStats = async (startDate, endDate) => {
  const match = {
    "shipperInfo.shipperId": { $exists: true },
    status: { $in: ["SHIPPING", "DELIVERED", "RETURNED"] },
  };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const stats = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          shipperId: "$shipperInfo.shipperId",
          shipperName: "$shipperInfo.shipperName",
        },
        totalOrders: { $sum: 1 },
        shipping: {
          $sum: { $cond: [{ $eq: ["$status", "SHIPPING"] }, 1, 0] },
        },
        delivered: {
          $sum: { $cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0] },
        },
        returned: {
          $sum: { $cond: [{ $eq: ["$status", "RETURNED"] }, 1, 0] },
        },
      },
    },
    { $sort: { delivered: -1 } },
  ]);

  return stats.map((s) => {
    const completed = s.delivered + s.returned;
    // ✅ TRẢ VỀ NUMBER thay vì STRING
    const successRate =
      completed > 0
        ? parseFloat(((s.delivered / completed) * 100).toFixed(2))
        : 0;

    return {
      shipperId: s._id.shipperId,
      name: s._id.shipperName || "Unknown",
      totalOrders: s.totalOrders,
      shipping: s.shipping,
      delivered: s.delivered,
      returned: s.returned,
      successRate, // ✅ Đây là NUMBER (95.50 thay vì "95.50")
    };
  });
};

/**
 * Lấy thống kê KPI của Cashier
 */
export const getCashierStats = async (startDate, endDate) => {
  const match = {
    "posInfo.cashierId": { $exists: true },
    paymentStatus: "PAID",
  };

  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = new Date(startDate);
    if (endDate) match.createdAt.$lte = new Date(endDate);
  }

  const stats = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          cashierId: "$posInfo.cashierId",
          cashierName: "$posInfo.cashierName",
        },
        transactionCount: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
        vatInvoiceCount: {
          $sum: { $cond: [{ $ne: ["$vatInvoice", null] }, 1, 0] },
        },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  return stats.map((s) => ({
    cashierId: s._id.cashierId,
    name: s._id.cashierName || "Unknown",
    transactionCount: s.transactionCount,
    totalAmount: s.totalAmount,
    vatInvoiceCount: s.vatInvoiceCount,
  }));
};

/**
 * Lấy top performer của từng vai trò
 */
export const getTopPerformers = async (startDate, endDate) => {
  const [posStats, shipperStats, cashierStats] = await Promise.all([
    getPOSStaffStats(startDate, endDate),
    getShipperStats(startDate, endDate),
    getCashierStats(startDate, endDate),
  ]);

  return {
    topPOSStaff: posStats[0] || null,
    topShipper: shipperStats[0] || null,
    topCashier: cashierStats[0] || null,
  };
};

/**
 * ✅ FIXED: Lấy thống kê cá nhân - successRate là NUMBER
 */
export const getPersonalStats = async (userId, period = "today") => {
  const now = new Date();
  let startDate;

  switch (period) {
    case "today":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "week":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.setHours(0, 0, 0, 0));
  }

  // Thống kê POS Staff
  const posOrders = await Order.countDocuments({
    "posInfo.staffId": userId,
    orderSource: "IN_STORE",
    createdAt: { $gte: startDate },
  });

  const posRevenue = await Order.aggregate([
    {
      $match: {
        "posInfo.staffId": userId,
        status: "DELIVERED",
        createdAt: { $gte: startDate },
      },
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  // Thống kê Shipper
  const shipperOrders = await Order.countDocuments({
    "shipperInfo.shipperId": userId,
    status: { $in: ["SHIPPING", "DELIVERED", "RETURNED"] },
    createdAt: { $gte: startDate },
  });

  const shipperShipping = await Order.countDocuments({
    "shipperInfo.shipperId": userId,
    status: "SHIPPING",
    createdAt: { $gte: startDate },
  });

  const shipperDelivered = await Order.countDocuments({
    "shipperInfo.shipperId": userId,
    status: "DELIVERED",
    createdAt: { $gte: startDate },
  });

  const shipperReturned = await Order.countDocuments({
    "shipperInfo.shipperId": userId,
    status: "RETURNED",
    createdAt: { $gte: startDate },
  });

  // ✅ TRẢ VỀ NUMBER thay vì STRING
  const completed = shipperDelivered + shipperReturned;
  const successRate =
    completed > 0
      ? parseFloat(((shipperDelivered / completed) * 100).toFixed(2))
      : 0;

  // Thống kê Cashier
  const cashierTransactions = await Order.countDocuments({
    "posInfo.cashierId": userId,
    paymentStatus: "PAID",
    createdAt: { $gte: startDate },
  });

  const cashierRevenue = await Order.aggregate([
    {
      $match: {
        "posInfo.cashierId": userId,
        paymentStatus: "PAID",
        createdAt: { $gte: startDate },
      },
    },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  return {
    period,
    startDate,
    pos: {
      orders: posOrders,
      revenue: posRevenue[0]?.total || 0,
    },
    shipper: {
      total: shipperOrders,
      shipping: shipperShipping,
      delivered: shipperDelivered,
      returned: shipperReturned,
      successRate, // ✅ Đây là NUMBER
    },
    cashier: {
      transactions: cashierTransactions,
      revenue: cashierRevenue[0]?.total || 0,
    },
  };
};

export default {
  getPOSStaffStats,
  getShipperStats,
  getCashierStats,
  getTopPerformers,
  getPersonalStats,
};
