// ============================================
// FILE: backend/src/services/productSalesService.js
// ✅ Service tự động cập nhật salesCount (Unified)
// ============================================

import Product from "../../catalog/models/Product.js";

// ============================================
// CẬP NHẬT SALES COUNT CHO SẢN PHẨM
// ============================================
export async function updateProductSalesCount(
  productId,
  variantId,
  quantity,
  category = null // Deprecated but kept for signature compatibility
) {
  try {
    const product = await Product.findById(productId);
    
    if (!product) {
      console.warn(`⚠️ Product not found: ${productId}`);
      return null;
    }

    // Update Product Sales
    product.salesCount = (product.salesCount || 0) + quantity;

    // Update Variant Sales if variantId is provided
    if (variantId) {
        const variant = product.variants.id(variantId);
        if (variant) {
            variant.salesCount = (variant.salesCount || 0) + quantity;
        }
    }

    await product.save();

    console.log(
      `✅ Updated salesCount for ${product.name}: +${quantity} = ${product.salesCount}`
    );

    return product;
  } catch (error) {
    console.error("❌ Error updating salesCount:", error);
    throw error;
  }
}

// ============================================
// XỬ LÝ ĐƠN HÀNG - CẬP NHẬT SALESCOUNT
// ============================================
export async function processOrderSales(order) {
  if (!order || !order.items || order.items.length === 0) {
    console.warn("⚠️ No items in order");
    return;
  }

  console.log(`📊 Processing sales count for order: ${order.orderNumber}`);

  const results = [];

  for (const item of order.items) {
    try {
      const productId = item.productId;
      const quantity = item.quantity;
      const variantId = item.variantId;

      const updatedProduct = await updateProductSalesCount(
        productId,
        variantId,
        quantity
      );

      if (updatedProduct) {
        results.push({
          productId,
          name: updatedProduct.name,
          quantity,
          totalSales: updatedProduct.salesCount,
        });
        console.log(`  ✅ ${updatedProduct.name}: +${quantity} sales`);
      }
    } catch (error) {
      console.error(`  ❌ Failed to update item:`, error.message);
    }
  }

  console.log(`✅ Sales count update completed for order ${order.orderNumber}`);
  return results;
}

// ============================================
// LẤY TOP SẢN PHẨM BÁN CHẠY THEO CATEGORY
// ============================================
export async function getTopSellingProducts(categorySlug, limit = 10) {
  // Assuming categorySlug matches Category model slug
  // Need to fetch category ID first if searching by category
  // Or if input is just a string name logic...
  
  // For simplicity, letting Filter handle it inside ProductController usually.
  // But here we might need manual query.
  
  // Note: This function might need Category lookup if we filter by category ref.
  // But unified approach:
  // We can join with Category to filter by slug.
  
  // Simplified: Return nothing or global top if implementation complicated without Category import
  // But we can import Category.
  
  const { default: Category } = await import("../../catalog/models/Category.js");
  const cat = await Category.findOne({ slug: categorySlug });
  
  const query = { status: "AVAILABLE" };
  if (cat) query.category = cat._id;

  return await Product.find(query)
    .sort({ salesCount: -1 })
    .limit(limit)
    .select("name brand salesCount averageRating variants")
    .lean();
}

// ============================================
// LẤY TOP SẢN PHẨM BÁN CHẠY TẤT CẢ CATEGORY
// ============================================
export async function getAllTopSellingProducts(limit = 10) {
    return await Product.find({ status: "AVAILABLE" })
      .sort({ salesCount: -1 })
      .limit(limit)
      .select("name brand salesCount averageRating variants")
      .populate("category", "name")
      .lean();
}

// ============================================
// RESET SALES COUNT (ADMIN ONLY)
// ============================================
export async function resetSalesCount(categorySlug = null) {
  const query = {};
  
  if (categorySlug) {
      const { default: Category } = await import("../../catalog/models/Category.js");
      const cat = await Category.findOne({ slug: categorySlug });
      if (cat) query.category = cat._id;
  }

  await Product.updateMany(query, { $set: { salesCount: 0, "variants.$[].salesCount": 0 } });
  console.log(`✅ Reset salesCount`);
}

// ============================================
// SYNC SALESCOUNT TỪ SALESANALYTICS (NẾU CẦN)
// ============================================
export async function syncSalesCountFromAnalytics() {
  const SalesAnalytics = (await import("../../analytics/models/SalesAnalytics.js")).default;
  const analytics = await SalesAnalytics.find().lean();
  // Implementation depends on SalesAnalytics structure 
  console.log("✅ Sales count synced from analytics (Stub)");
}

export default {
  updateProductSalesCount,
  processOrderSales,
  getTopSellingProducts,
  getAllTopSellingProducts,
  resetSalesCount,
  syncSalesCountFromAnalytics,
};
