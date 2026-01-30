// backend/src/models/SalesAnalytics.js
import mongoose from "mongoose";

const salesAnalyticsSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    category: {
      type: String,
      required: true,
      // enum removed
    },

    sales: {
      total: { type: Number, default: 0, min: 0 },
      monthly: { type: Map, of: Number, default: {} },
      weekly: { type: Map, of: Number, default: {} },
      daily: { type: Map, of: Number, default: {} },
    },

    revenue: {
      total: { type: Number, default: 0, min: 0 },
      monthly: { type: Map, of: Number, default: {} },
      weekly: { type: Map, of: Number, default: {} },
      daily: { type: Map, of: Number, default: {} },
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

salesAnalyticsSchema.index({ category: 1, "sales.total": -1 });
salesAnalyticsSchema.index(
  { productId: 1, variantId: 1 },
  { unique: true, sparse: true }
);

salesAnalyticsSchema.statics.getTopSellersByCategory = async function (
  category,
  limit = 10
) {
  return this.find({ category })
    .sort({ "sales.total": -1 })
    .limit(limit)
    .select("productId variantId sales.total revenue.total");
};

salesAnalyticsSchema.statics.getTopSellers = async function (limit = 10) {
  return this.find()
    .sort({ "sales.total": -1 })
    .limit(limit)
    .select("productId variantId category sales.total revenue.total");
};

salesAnalyticsSchema.methods.recordSale = function (
  quantity,
  amount,
  date = new Date()
) {
  const year = date.getFullYear();
  const month = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  const week = `${year}-W${String(Math.ceil(date.getDate() / 7)).padStart(
    2,
    "0"
  )}`;
  const day = date.toISOString().split("T")[0];

  this.sales.total += quantity;

  const monthlyMap = new Map(this.sales.monthly);
  monthlyMap.set(month, (monthlyMap.get(month) || 0) + quantity);
  this.sales.monthly = monthlyMap;

  const weeklyMap = new Map(this.sales.weekly);
  weeklyMap.set(week, (weeklyMap.get(week) || 0) + quantity);
  this.sales.weekly = weeklyMap;

  const dailyMap = new Map(this.sales.daily);
  dailyMap.set(day, (dailyMap.get(day) || 0) + quantity);
  this.sales.daily = dailyMap;

  this.revenue.total += amount;

  const revenueMonthlyMap = new Map(this.revenue.monthly);
  revenueMonthlyMap.set(month, (revenueMonthlyMap.get(month) || 0) + amount);
  this.revenue.monthly = revenueMonthlyMap;

  const revenueWeeklyMap = new Map(this.revenue.weekly);
  revenueWeeklyMap.set(week, (revenueWeeklyMap.get(week) || 0) + amount);
  this.revenue.weekly = revenueWeeklyMap;

  const revenueDailyMap = new Map(this.revenue.daily);
  revenueDailyMap.set(day, (revenueDailyMap.get(day) || 0) + amount);
  this.revenue.daily = revenueDailyMap;

  this.lastUpdated = date;

  return this.save();
};

export default mongoose.models.SalesAnalytics || mongoose.model("SalesAnalytics", salesAnalyticsSchema);
