// ============================================
// FILE: frontend/src/components/products/UnifiedProductCard.jsx
// ✅ STEP 9: Unified Product Card
// Purpose: Type-agnostic product card
// Replaces: Category-specific product cards
// ============================================

import React from 'react';
import { Link } from 'react-router-dom';
import { useProductTypes } from '../../hooks/useProductTypes';
import { getProductPriceRange, hasStock } from '../../services/unifiedProductAPI';
import './UnifiedProductCard.css';

const UnifiedProductCard = ({ product }) => {
  const { getDisplayName, getIcon } = useProductTypes();

  // Get product type info
  const productType = product.productTypeId;
  const typeName = typeof productType === 'object' 
    ? productType.name 
    : getDisplayName(productType);
  const typeIcon = typeof productType === 'object'
    ? productType.icon
    : getIcon(productType);

  // Get price range
  const priceRange = getProductPriceRange(product);

  // Get first image
  const firstImage = product.featuredImages?.[0] 
    || product.variants?.[0]?.images?.[0]
    || '/placeholder-product.png';

  // Check stock
  const inStock = hasStock(product);

  // Get first variant for slug
  const firstVariant = product.variants?.[0];
  const productSlug = firstVariant?.slug || product.slug || product.baseSlug;

  return (
    <Link to={`/products/${productSlug}`} className="product-card">
      {/* Product Image */}
      <div className="card-image">
        <img src={firstImage} alt={product.name} />
        
        {/* Badges */}
        <div className="card-badges">
          {!inStock && (
            <span className="badge badge-out-of-stock">Out of Stock</span>
          )}
          {product.condition === 'LIKE_NEW' && (
            <span className="badge badge-condition">Like New</span>
          )}
          {product.installmentBadge === '0_PERCENT' && (
            <span className="badge badge-installment">0% Installment</span>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="card-body">
        {/* Product Type */}
        <div className="card-type">
          {typeIcon && <span className="type-icon">{typeIcon}</span>}
          <span className="type-name">{typeName}</span>
        </div>

        {/* Product Name */}
        <h3 className="card-title">{product.name}</h3>

        {/* Key Specs (first 3 specifications) */}
        {product.specifications && (
          <div className="card-specs">
            {Object.entries(product.specifications)
              .slice(0, 3)
              .map(([key, value]) => (
                <span key={key} className="spec-item">
                  {formatSpecValue(value)}
                </span>
              ))}
          </div>
        )}

        {/* Price */}
        <div className="card-price">
          <span className="price-text">{priceRange.display}</span>
        </div>

        {/* Stock Status */}
        <div className={`card-stock ${inStock ? 'in-stock' : 'out-of-stock'}`}>
          {inStock ? '✓ In Stock' : '✗ Out of Stock'}
        </div>

        {/* Variants Count */}
        {product.variants && product.variants.length > 1 && (
          <div className="card-variants">
            {product.variants.length} variants available
          </div>
        )}
      </div>
    </Link>
  );
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format specification value for display
 */
function formatSpecValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export default UnifiedProductCard;
