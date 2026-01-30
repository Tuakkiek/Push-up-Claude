// ============================================
// FILE: frontend/src/hooks/useDashboardData.js
// UPDATED: Thêm employee KPI data
// ============================================

import { useState, useEffect } from "react";
import axios from "axios";
import {
  orderAPI,
  userAPI,
  promotionAPI,
  productAPI,
} from "@/lib/api";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const useDashboardData = (timeRange) => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Tính startDate/endDate từ timeRange
      const { startDate, endDate } = getDateRange(timeRange);

      const [
        ordersRes,
        deliveredRes,
        employeesRes,
        productsRes,
        promotionsRes,
        employeeKPIRes, // ✅ NEW
      ] = await Promise.all([
        orderAPI.getAll({ limit: 1000, startDate, endDate }), // Thêm tham số ngày
        orderAPI.getAll({
          status: "DELIVERED",
          limit: 2000,
          startDate,
          endDate,
        }), // Thêm tham số ngày
        userAPI.getAllEmployees(),
        productAPI.getAll({ limit: 5000 }), // Fetch all products for stats
        promotionAPI.getAllPromotions(),
        axios.get(`${BASE_URL}/analytics/employee/kpi`, {
          params: { startDate, endDate },
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        }), // ✅ NEW
      ]);

      const processedStats = processAllData({
        ordersRes,
        deliveredRes,
        employeesRes,
        productsRes,
        promotionsRes,
        timeRange,
        employeeKPI: employeeKPIRes.data.data, // ✅ NEW
      });

      setStats(processedStats);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError(err.response?.data?.message || "Lỗi khi tải dữ liệu");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  return { stats, isLoading, error, refetch: fetchData };
};

// ============================================
// HELPER: Get date range
// ============================================
const getDateRange = (timeRange) => {
  const now = new Date();
  const endDate = new Date(now);
  let startDate = new Date(now);

  switch (timeRange) {
    case "7days":
      startDate.setDate(startDate.getDate() - 6); // Bao gồm 7 ngày
      break;
    case "30days":
      startDate.setDate(startDate.getDate() - 29);
      break;
    case "3months":
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case "1year":
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 29); // Mặc định là 30 ngày
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);
  return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
};

// ============================================
// HELPER: Get token
// ============================================
const getToken = () => {
  const authStorage = localStorage.getItem("auth-storage");
  if (authStorage) {
    try {
      const { state } = JSON.parse(authStorage);
      return state?.token;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// ============================================
// HELPER: Process all data
// ============================================
const processAllData = ({
  ordersRes,
  deliveredRes,
  employeesRes,
  productsRes,
  promotionsRes,
  timeRange,
  employeeKPI, // ✅ NEW
}) => {
  const { startDate, endDate } = getDateRange(timeRange); // Tính lại ở đây
  const orders = ordersRes?.data?.data?.orders || [];
  const totalOrders = ordersRes?.data?.data?.total || 0;
  const filteredOrders = orders.filter((o) => {
    const createdAt = new Date(o.createdAt);
    return (
      (!startDate || createdAt >= new Date(startDate)) &&
      (!endDate || createdAt <= new Date(endDate))
    );
  });
  const deliveredOrders = deliveredRes?.data?.data?.orders || [];
  const filteredDelivered = deliveredOrders.filter((o) => {
    const createdAt = new Date(o.createdAt);
    return (
      (!startDate || createdAt >= new Date(startDate)) &&
      (!endDate || createdAt <= new Date(endDate))
    );
  });

  // Sử dụng filteredOrders và filteredDelivered trong các phép tính
  const totalRevenue = filteredDelivered.reduce(
    (sum, order) => sum + (order.totalAmount || 0),
    0
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRevenue = filteredDelivered
    .filter((order) => new Date(order.createdAt) >= today)
    .reduce((sum, order) => sum + order.totalAmount, 0);

  const avgOrderValue =
    filteredDelivered.length > 0 ? totalRevenue / filteredDelivered.length : 0;

  // Cập nhật số lượng trạng thái đơn hàng
  const pendingOrders = filteredOrders.filter(
    (o) => o.status === "PENDING"
  ).length;
  const completedOrders = filteredDelivered.length; // Vì filteredDelivered đã được lọc theo trạng thái DELIVERED
  const cancelledOrders = filteredOrders.filter(
    (o) => o.status === "CANCELLED"
  ).length;

  // Products data processing
  const allProducts = Array.isArray(productsRes?.data?.data?.products || productsRes?.data)
    ? (productsRes?.data?.data?.products || productsRes?.data)
    : [];

  const iPhones = allProducts.filter(p => p.category?.name === 'iPhone' || p.category === 'iPhone');
  const iPads = allProducts.filter(p => p.category?.name === 'iPad' || p.category === 'iPad');
  const macs = allProducts.filter(p => p.category?.name === 'Mac' || p.category === 'Mac');
  const airPods = allProducts.filter(p => p.category?.name === 'AirPods' || p.category === 'AirPods');
  const watches = allProducts.filter(p => p.category?.name === 'AppleWatch' || p.category === 'AppleWatch');
  const accessories = allProducts.filter(p => p.category?.name === 'Accessories' || p.category === 'Accessory' || p.category === 'Accessories');
  const totalProducts = allProducts.length;

  // Stock and inventory (giữ nguyên)
  let totalStock = 0,
    totalVariants = 0,
    inventoryValue = 0;
  let totalRatings = 0,
    ratedProducts = 0,
    totalReviews = 0;

  allProducts.forEach((product) => {
    const variants = product.variants || [];
    totalVariants += variants.length;
    totalReviews += product.totalReviews || 0;

    variants.forEach((v) => {
      totalStock += v.stock || 0;
      inventoryValue += (v.price || 0) * (v.stock || 0);
    });

    if (product.averageRating > 0) {
      totalRatings += product.averageRating;
      ratedProducts++;
    }
  });

  const avgRating = ratedProducts > 0 ? totalRatings / ratedProducts : 0;

  const lowStockProducts = allProducts.filter((product) => {
    const variants = product.variants || [];
    return variants.some((v) => v.stock > 0 && v.stock < 10);
  }).length;

  const outOfStockProducts = allProducts.filter((product) => {
    const variants = product.variants || [];
    return variants.every((v) => v.stock === 0);
  }).length;

  // Category data
  const categoryStock = [
    {
      name: "iPhone",
      products: iPhones.length,
      stock: iPhones.reduce(
        (sum, p) =>
          sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
        0
      ),
      value: iPhones.reduce(
        (sum, p) =>
          sum +
          (p.variants || []).reduce(
            (s, v) => s + (v.price || 0) * (v.stock || 0),
            0
          ),
        0
      ),
    },
    {
      name: "iPad",
      products: iPads.length,
      stock: iPads.reduce(
        (sum, p) =>
          sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
        0
      ),
      value: iPads.reduce(
        (sum, p) =>
          sum +
          (p.variants || []).reduce(
            (s, v) => s + (v.price || 0) * (v.stock || 0),
            0
          ),
        0
      ),
    },
    {
      name: "Mac",
      products: macs.length,
      stock: macs.reduce(
        (sum, p) =>
          sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
        0
      ),
      value: macs.reduce(
        (sum, p) =>
          sum +
          (p.variants || []).reduce(
            (s, v) => s + (v.price || 0) * (v.stock || 0),
            0
          ),
        0
      ),
    },
    {
      name: "AirPods",
      products: airPods.length,
      stock: airPods.reduce(
        (sum, p) =>
          sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
        0
      ),
      value: airPods.reduce(
        (sum, p) =>
          sum +
          (p.variants || []).reduce(
            (s, v) => s + (v.price || 0) * (v.stock || 0),
            0
          ),
        0
      ),
    },
    {
      name: "Watch",
      products: watches.length,
      stock: watches.reduce(
        (sum, p) =>
          sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
        0
      ),
      value: watches.reduce(
        (sum, p) =>
          sum +
          (p.variants || []).reduce(
            (s, v) => s + (v.price || 0) * (v.stock || 0),
            0
          ),
        0
      ),
    },
    {
      name: "Phụ kiện",
      products: accessories.length,
      stock: accessories.reduce(
        (sum, p) =>
          sum + (p.variants || []).reduce((s, v) => s + (v.stock || 0), 0),
        0
      ),
      value: accessories.reduce(
        (sum, p) =>
          sum +
          (p.variants || []).reduce(
            (s, v) => s + (v.price || 0) * (v.stock || 0),
            0
          ),
        0
      ),
    },
  ];

  // Promotions
  const promotions = promotionsRes?.data?.data?.promotions || [];
  const now = new Date();

  const activePromotions = promotions.filter((p) => {
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    return now >= start && now <= end && p.usedCount < p.usageLimit;
  }).length;

  const usedPromotions = promotions.reduce(
    (sum, p) => sum + (p.usedCount || 0),
    0
  );

  const topPromotions = [...promotions]
    .sort((a, b) => b.usedCount - a.usedCount)
    .slice(0, 10)
    .map((p) => ({
      name: p.name,
      code: p.code,
      used: p.usedCount,
      limit: p.usageLimit,
      discount:
        p.discountType === "PERCENTAGE"
          ? `${p.discountValue}%`
          : `${p.discountValue.toLocaleString()}₫`,
    }));

  // Best selling products
  const bestSellingProducts = [...allProducts]
    .filter((p) => p.salesCount > 0)
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 20)
    .map((p) => ({
      name: p.name,
      sales: p.salesCount || 0,
      rating: p.averageRating || 0,
      reviews: p.totalReviews || 0,
      category: p.category,
    }));

  // Category revenue
  const categoryRevenue = categoryStock.map((cat) => {
    const revenue = deliveredOrders
      .flatMap((o) => o.items)
      .filter((item) => {
        if (cat.name === "Watch") return item.productType === "AppleWatch";
        if (cat.name === "Phụ kiện") return item.productType === "Accessory";
        return item.productType === cat.name;
      })
      .reduce((sum, item) => sum + item.total, 0);

    return { ...cat, revenue };
  });

  const categoryDistribution = categoryRevenue.map((cat) => ({
    name: cat.name,
    value: cat.products,
    revenue: cat.revenue,
  }));

  // Growth calculations
  const last30Days = deliveredOrders.filter((o) => {
    const orderDate = new Date(o.createdAt);
    const daysAgo = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
    return daysAgo <= 30;
  });

  const previous30Days = deliveredOrders.filter((o) => {
    const orderDate = new Date(o.createdAt);
    const daysAgo = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
    return daysAgo > 30 && daysAgo <= 60;
  });

  const currentRevenue = last30Days.reduce((sum, o) => sum + o.totalAmount, 0);
  const previousRevenue = previous30Days.reduce(
    (sum, o) => sum + o.totalAmount,
    0
  );

  const revenueGrowth =
    previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

  const orderGrowth =
    previous30Days.length > 0
      ? ((last30Days.length - previous30Days.length) / previous30Days.length) *
        100
      : 0;

  // Hourly orders
  const hourlyOrders = Array.from({ length: 24 }, (_, hour) => {
    const count = orders.filter((o) => {
      const orderHour = new Date(o.createdAt).getHours();
      return orderHour === hour;
    }).length;
    return { hour: `${hour}:00`, orders: count };
  });

  // Revenue by month
  const revenueByMonth = generateRevenueByMonth(deliveredOrders);

  // Orders by status
  const ordersByStatus = [
    { name: "Chờ xác nhận", value: pendingOrders, color: "#f59e0b" },
    { name: "Đã giao", value: completedOrders, color: "#10b981" },
    { name: "Đã hủy", value: cancelledOrders, color: "#ef4444" },
    {
      name: "Đang xử lý",
      value: orders.filter(
        (o) => o.status === "CONFIRMED" || o.status === "SHIPPING"
      ).length,
      color: "#3b82f6",
    },
  ];

  // Sales trend
  const salesTrend = generateSalesTrend(deliveredOrders);

  // Top products by revenue
  const productRevenue = new Map();
  deliveredOrders.forEach((order) => {
    order.items.forEach((item) => {
      const key = item.productName;
      productRevenue.set(key, (productRevenue.get(key) || 0) + item.total);
    });
  });

  const topProducts = Array.from(productRevenue.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, revenue]) => ({ name, revenue }));

  // Product performance
  const productPerformance = allProducts
    .map((p) => ({
      name: p.name,
      salesCount: p.salesCount || 0,
      rating: p.averageRating || 0,
      reviews: p.totalReviews || 0,
    }))
    .sort((a, b) => b.salesCount - a.salesCount)
    .slice(0, 10);

  return {
    totalOrders,
    totalProducts,
    totalEmployees: employeesRes?.data?.data?.employees?.length || 0,
    totalRevenue,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    lowStockProducts,
    avgOrderValue,
    todayRevenue,
    recentOrders: orders.slice(0, 5),
    topProducts,
    categoryDistribution,
    revenueByMonth,
    ordersByStatus,
    salesTrend,
    productPerformance,
    totalStock,
    totalVariants,
    outOfStockProducts,
    promotions,
    activePromotions,
    usedPromotions,
    topPromotions,
    categoryStock,
    revenueGrowth,
    orderGrowth,
    bestSellingProducts,
    categoryRevenue,
    hourlyOrders,
    inventoryValue,
    avgRating,
    totalReviews,
    ...employeeKPI, // ✅ NEW
  };
};

// Generate revenue by month
const generateRevenueByMonth = (orders) => {
  const monthlyData = {};
  const months = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    monthlyData[key] = 0;
    months.push({
      key,
      name: date.toLocaleDateString("vi-VN", {
        month: "short",
        year: "numeric",
      }),
    });
  }

  orders.forEach((order) => {
    const date = new Date(order.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    if (monthlyData[key] !== undefined) {
      monthlyData[key] += order.totalAmount;
    }
  });

  return months.map((m) => ({ name: m.name, revenue: monthlyData[m.key] }));
};

// Generate sales trend
const generateSalesTrend = (orders) => {
  const dailyData = {};
  const days = [];

  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0];
    dailyData[key] = { orders: 0, revenue: 0 };
    days.push({
      key,
      name: date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
      }),
    });
  }

  orders.forEach((order) => {
    const key = new Date(order.createdAt).toISOString().split("T")[0];
    if (dailyData[key]) {
      dailyData[key].orders += 1;
      dailyData[key].revenue += order.totalAmount;
    }
  });

  return days.map((d) => ({
    name: d.name,
    orders: dailyData[d.key].orders,
    revenue: dailyData[d.key].revenue,
  }));
};
