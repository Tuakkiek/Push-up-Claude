// ============================================
// FILE: frontend/src/pages/ProductListPage.jsx
// ✅ STEP 9: Product List Page
// Purpose: Main page for product listings
// Routes: /products, /products/:productTypeSlug
// ============================================

import React from 'react';
import { useParams } from 'react-router-dom';
import UnifiedProductList from '../components/products/UnifiedProductList';
import './ProductListPage.css';

const ProductListPage = () => {
  const { productTypeSlug } = useParams();

  return (
    <div className="product-list-page">
      <UnifiedProductList productTypeSlug={productTypeSlug} />
    </div>
  );
};

export default ProductListPage;
