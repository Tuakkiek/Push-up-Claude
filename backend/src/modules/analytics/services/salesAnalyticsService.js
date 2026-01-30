// backend/src/services/salesAnalyticsService.js
import SalesAnalytics from '../models/SalesAnalytics.js';
import Product from "../../catalog/models/Product.js";

// ============================================
// HELPER: GET ISO WEEK NUMBER
// ============================================
function getISOWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return weekNo.toString().padStart(2, '0');
}

// ============================================
// FIND CATEGORY BY VARIANT ID
// ============================================
async function findCategoryByVariantId(variantId) {
  const product = await Product.findOne({ "variants._id": variantId }).populate("category");
  if (product) {
      return {
          category: product.category.name, // Assuming Category model has name
          productId: product._id,
          variant: product.variants.id(variantId)
      };
  }
  return null;
}

// ============================================
// UPDATE SALES
// ============================================
export async function updateSales(variantId, quantity, revenue) {
  const result = await findCategoryByVariantId(variantId);
  
  if (!result) {
    // If not found, maybe just log and return, or throw. 
    // Given the previous code threw, we can throw, but let's be safe.
    console.warn(`Variant ${variantId} not found for analytics update`);
    return null;
  }

  const { category, productId } = result;

  let analytic = await SalesAnalytics.findOne({ productId, variantId, category });
  if (!analytic) {
    analytic = new SalesAnalytics({ productId, variantId, category });
  }

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const monthStr = now.toISOString().slice(0, 7);
  const year = now.getFullYear();
  const weekStr = `${year}-W${getISOWeek(now)}`;

  // Update sales
  analytic.sales.total += quantity;
  if (!analytic.sales.daily) analytic.sales.daily = new Map();
  analytic.sales.daily.set(dateStr, (analytic.sales.daily.get(dateStr) || 0) + quantity);
  
  if (!analytic.sales.weekly) analytic.sales.weekly = new Map();
  analytic.sales.weekly.set(weekStr, (analytic.sales.weekly.get(weekStr) || 0) + quantity);

  if (!analytic.sales.monthly) analytic.sales.monthly = new Map();
  analytic.sales.monthly.set(monthStr, (analytic.sales.monthly.get(monthStr) || 0) + quantity);

  // Update revenue
  analytic.revenue.total += revenue;
  if (!analytic.revenue.daily) analytic.revenue.daily = new Map();
  analytic.revenue.daily.set(dateStr, (analytic.revenue.daily.get(dateStr) || 0) + revenue);
  
  if (!analytic.revenue.weekly) analytic.revenue.weekly = new Map();
  analytic.revenue.weekly.set(weekStr, (analytic.revenue.weekly.get(weekStr) || 0) + revenue);
  
  if (!analytic.revenue.monthly) analytic.revenue.monthly = new Map();
  analytic.revenue.monthly.set(monthStr, (analytic.revenue.monthly.get(monthStr) || 0) + revenue);

  analytic.lastUpdated = now;
  await analytic.save();

  console.log(`✅ Sales updated: ${category} - Product ${productId} - Variant ${variantId}`);
  return analytic;
}

// ============================================
// RECORD ORDER SALES
// ============================================
export async function recordOrderSales(order) {
  if (!order || !order.items || order.items.length === 0) {
    console.warn('⚠️ No items in order to record sales');
    return;
  }

  console.log(`📊 Recording sales for order: ${order.orderNumber}`);

  for (const item of order.items) {
    try {
      const quantity = item.quantity;
      const revenue = item.price * item.quantity;
      const variantId = item.variantId;

      if (!variantId) continue;

      await updateSales(variantId, quantity, revenue);
      
    } catch (error) {
      console.error(`  ❌ Failed to record item:`, error.message);
    }
  }

  console.log(`✅ Sales recording completed for order ${order.orderNumber}`);
}

// ============================================
// GET TOP PRODUCTS BY CATEGORY
// ============================================
export async function getTopProducts(category, limit = 10) {
  const top = await SalesAnalytics.aggregate([
    { $match: { category } },
    { $group: { _id: '$productId', totalSales: { $sum: '$sales.total' } } },
    { $sort: { totalSales: -1 } },
    { $limit: limit },
    { $project: { _id: 0, productId: '$_id' } },
  ]);
  
  return top.map(r => r.productId.toString());
}

// ============================================
// GET TOP SELLERS BY CATEGORY (FOR API)
// ============================================
export async function getTopSellersByCategory(category, limit = 10) {
  return await SalesAnalytics.find({ category })
    .sort({ 'sales.total': -1 })
    .limit(limit)
    .select('productId variantId sales.total revenue.total')
    .lean();
}

// ============================================
// GET TOP SELLERS ACROSS ALL CATEGORIES
// ============================================
export async function getTopSellers(limit = 10) {
  return await SalesAnalytics.find()
    .sort({ 'sales.total': -1 })
    .limit(limit)
    .select('productId variantId category sales.total revenue.total')
    .lean();
}

// ============================================
// GET PRODUCT SALES DATA
// ============================================
export async function getProductSales(productId, variantId = null) {
  const query = { productId };
  if (variantId) query.variantId = variantId;

  return await SalesAnalytics.findOne(query).lean();
}

// ============================================
// GET SALES BY TIME PERIOD
// ============================================
export async function getSalesByTimePeriod(category, startDate, endDate, period = 'daily') {
  const analytics = await SalesAnalytics.find({ category }).lean();

  const result = {};

  analytics.forEach(analytic => {
    const salesMap = analytic.sales[period];
    if (salesMap) {
        // Handle Map or Object depending on Mongoose version/schema
        // Assuming Map from schema definition in original code
        if (salesMap instanceof Map) {
             salesMap.forEach((value, key) => {
                const date = new Date(key);
                if (date >= startDate && date <= endDate) {
                    result[key] = (result[key] || 0) + value;
                }
            });
        } else if (typeof salesMap === 'object') {
             Object.entries(salesMap).forEach(([key, value]) => {
                const date = new Date(key);
                if (date >= startDate && date <= endDate) {
                    result[key] = (result[key] || 0) + value;
                }
            });
        }
    }
  });

  return result;
}

// ============================================
// RESET SALES DATA
// ============================================
export async function resetSalesData(productId, variantId = null) {
  const query = { productId };
  if (variantId) query.variantId = variantId;

  return await SalesAnalytics.deleteMany(query);
}

export default {
  updateSales,
  recordOrderSales,
  getTopProducts,
  getTopSellersByCategory,
  getTopSellers,
  getProductSales,
  getSalesByTimePeriod,
  resetSalesData,
};