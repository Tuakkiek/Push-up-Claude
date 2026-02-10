// ============================================
// FILE: frontend/src/routes/routes.jsx
// ✅ STEP 9: Example Router Configuration
// Purpose: Shows how to integrate new product routes
// ============================================

import { Routes, Route, Navigate } from 'react-router-dom';
import ProductListPage from '../pages/ProductListPage';
import ProductDetailPage from '../pages/ProductDetailPage';

// ============================================
// EXAMPLE ROUTER CONFIGURATION
// ============================================

/**
 * This is an example of how to integrate the new unified product routes.
 * Adapt this to your existing router structure.
 */

const AppRoutes = () => {
  return (
    <Routes>
      {/* ============================================
          NEW UNIFIED ROUTES (Step 9)
          ============================================ */}
      
      {/* All Products */}
      <Route path="/products" element={<ProductListPage />} />
      
      {/* Products by Type */}
      <Route path="/products/type/:productTypeSlug" element={<ProductListPage />} />
      
      {/* Product Detail */}
      <Route path="/products/:slug" element={<ProductDetailPage />} />

      {/* ============================================
          LEGACY REDIRECTS (Optional)
          Redirect old category URLs to new unified routes
          ============================================ */}
      
      {/* Old iPhone routes */}
      <Route path="/dien-thoai" element={<Navigate to="/products/type/iphone" replace />} />
      <Route path="/dien-thoai/:slug" element={<ProductDetailPage />} />
      
      {/* Old iPad routes */}
      <Route path="/may-tinh-bang" element={<Navigate to="/products/type/ipad" replace />} />
      <Route path="/may-tinh-bang/:slug" element={<ProductDetailPage />} />
      
      {/* Old Mac routes */}
      <Route path="/macbook" element={<Navigate to="/products/type/mac" replace />} />
      <Route path="/macbook/:slug" element={<ProductDetailPage />} />
      
      {/* Old AirPods routes */}
      <Route path="/tai-nghe" element={<Navigate to="/products/type/airpods" replace />} />
      <Route path="/tai-nghe/:slug" element={<ProductDetailPage />} />
      
      {/* Old Apple Watch routes */}
      <Route path="/apple-watch" element={<Navigate to="/products/type/apple-watch" replace />} />
      <Route path="/apple-watch/:slug" element={<ProductDetailPage />} />
      
      {/* Old Accessory routes */}
      <Route path="/phu-kien" element={<Navigate to="/products/type/accessory" replace />} />
      <Route path="/phu-kien/:slug" element={<ProductDetailPage />} />

      {/* ============================================
          OTHER ROUTES
          Add your other application routes here
          ============================================ */}
      
      {/* Home */}
      <Route path="/" element={<HomePage />} />
      
      {/* Cart */}
      <Route path="/cart" element={<CartPage />} />
      
      {/* Checkout */}
      <Route path="/checkout" element={<CheckoutPage />} />
      
      {/* Admin */}
      <Route path="/admin/*" element={<AdminRoutes />} />
      
      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default AppRoutes;

// ============================================
// ALTERNATIVE: Nested Routes Structure
// ============================================

/**
 * If you prefer a nested routes structure, you can use this approach:
 */

const AlternativeRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Products Routes */}
        <Route path="products">
          <Route index element={<ProductListPage />} />
          <Route path="type/:productTypeSlug" element={<ProductListPage />} />
          <Route path=":slug" element={<ProductDetailPage />} />
        </Route>
        
        {/* Other Routes */}
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        
        {/* Admin Routes */}
        <Route path="admin/*" element={<AdminRoutes />} />
      </Route>
    </Routes>
  );
};

// ============================================
// NAVIGATION HELPERS
// ============================================

/**
 * Helper functions for generating product URLs
 */

export const productUrls = {
  /**
   * Get URL for all products
   */
  allProducts: () => '/products',
  
  /**
   * Get URL for products of a specific type
   * @param {string} typeSlug - Product type slug
   */
  productsByType: (typeSlug) => `/products/type/${typeSlug}`,
  
  /**
   * Get URL for product detail
   * @param {string} slug - Product slug
   */
  productDetail: (slug) => `/products/${slug}`,
  
  /**
   * Get URL for product detail with SKU
   * @param {string} slug - Product slug
   * @param {string} sku - Variant SKU
   */
  productDetailWithSku: (slug, sku) => `/products/${slug}?sku=${sku}`,
};

// ============================================
// USAGE EXAMPLES
// ============================================

/**
 * Example: Navigate to product listing
 * 
 * import { useNavigate } from 'react-router-dom';
 * import { productUrls } from './routes';
 * 
 * const navigate = useNavigate();
 * navigate(productUrls.allProducts());
 * navigate(productUrls.productsByType('iphone'));
 * navigate(productUrls.productDetail('iphone-15-pro-max'));
 */

/**
 * Example: Link to product
 * 
 * import { Link } from 'react-router-dom';
 * import { productUrls } from './routes';
 * 
 * <Link to={productUrls.productDetail(product.slug)}>
 *   View Product
 * </Link>
 */
