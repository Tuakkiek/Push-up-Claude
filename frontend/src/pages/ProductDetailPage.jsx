// ============================================
// FILE: frontend/src/pages/ProductDetailPage.jsx
// ✅ STEP 9: Product Detail Page
// Purpose: Main page for product details
// Route: /products/:slug
// ============================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProductBySlug } from '../services/unifiedProductAPI';
import UnifiedProductDetail from '../components/products/UnifiedProductDetail';
import './ProductDetailPage.css';

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  const fetchProduct = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getProductBySlug(slug);
      setProduct(data);
    } catch (err) {
      console.error('Error fetching product:', err);
      setError(err.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading product...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-detail-page">
        <div className="error-state">
          <span className="error-icon">⚠️</span>
          <h2>Product Not Found</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/products')} className="btn-back">
            ← Back to Products
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-page">
        <div className="error-state">
          <span className="error-icon">📦</span>
          <h2>Product Not Found</h2>
          <p>The product you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/products')} className="btn-back">
            ← Back to Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <button onClick={() => navigate('/products')} className="breadcrumb-link">
          Products
        </button>
        <span className="breadcrumb-separator">/</span>
        <button 
          onClick={() => navigate(`/products/type/${product.productTypeId?.slug}`)} 
          className="breadcrumb-link"
        >
          {product.productTypeId?.name || 'Product Type'}
        </button>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">{product.name}</span>
      </div>

      {/* Product Detail */}
      <UnifiedProductDetail product={product} />
    </div>
  );
};

export default ProductDetailPage;
