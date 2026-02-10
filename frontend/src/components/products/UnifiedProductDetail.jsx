// ============================================
// FILE: frontend/src/components/products/UnifiedProductDetail.jsx
// ✅ STEP 9: Unified Product Detail
// Purpose: Product detail page for any type
// ============================================

import React, { useState, useEffect } from 'react';
import { useProductTypes } from '../../hooks/useProductTypes';
import { 
  getAvailableColors, 
  getAvailableVersions, 
  getVariantByColorAndVersion 
} from '../../services/unifiedProductAPI';
import './UnifiedProductDetail.css';

const UnifiedProductDetail = ({ product }) => {
  const { getSpecificationFields } = useProductTypes();
  
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [currentImage, setCurrentImage] = useState(0);

  const productType = product.productTypeId;
  const specFields = getSpecificationFields(
    typeof productType === 'object' ? productType._id : productType
  );

  // Get available colors and versions
  const colors = getAvailableColors(product);
  const versions = getAvailableVersions(product);

  // Initialize selection
  useEffect(() => {
    if (product.variants && product.variants.length > 0) {
      const firstVariant = product.variants[0];
      setSelectedColor(firstVariant.color);
      setSelectedVersion(firstVariant.versionName);
      setSelectedVariant(firstVariant);
    }
  }, [product]);

  // Update variant when color/version changes
  useEffect(() => {
    if (selectedColor && selectedVersion) {
      const variant = getVariantByColorAndVersion(
        product,
        selectedColor,
        selectedVersion
      );
      setSelectedVariant(variant);
    }
  }, [selectedColor, selectedVersion, product]);

  // Get current images
  const images = selectedVariant?.images || product.featuredImages || [];

  return (
    <div className="product-detail">
      <div className="detail-container">
        {/* Images Section */}
        <div className="detail-images">
          {/* Main Image */}
          <div className="main-image">
            <img 
              src={images[currentImage] || '/placeholder-product.png'} 
              alt={product.name} 
            />
          </div>

          {/* Thumbnail Images */}
          {images.length > 1 && (
            <div className="thumbnail-images">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  className={`thumbnail ${idx === currentImage ? 'active' : ''}`}
                  onClick={() => setCurrentImage(idx)}
                >
                  <img src={img} alt={`${product.name} ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="detail-info">
          {/* Product Type */}
          <div className="product-type">
            {typeof productType === 'object' && (
              <>
                {productType.icon && <span>{productType.icon}</span>}
                <span>{productType.name}</span>
              </>
            )}
          </div>

          {/* Product Name */}
          <h1 className="product-name">{product.name}</h1>

          {/* Price */}
          {selectedVariant && (
            <div className="product-price">
              {selectedVariant.originalPrice > selectedVariant.price && (
                <span className="original-price">
                  {selectedVariant.originalPrice.toLocaleString()}₫
                </span>
              )}
              <span className="current-price">
                {selectedVariant.price.toLocaleString()}₫
              </span>
              {selectedVariant.originalPrice > selectedVariant.price && (
                <span className="discount-badge">
                  {selectedVariant.discountPercent}% OFF
                </span>
              )}
            </div>
          )}

          {/* Stock Status */}
          {selectedVariant && (
            <div className={`stock-status ${selectedVariant.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
              {selectedVariant.stock > 0 ? (
                <>✓ In Stock ({selectedVariant.stock} available)</>
              ) : (
                <>✗ Out of Stock</>
              )}
            </div>
          )}

          {/* Color Selection */}
          {colors.length > 0 && (
            <div className="selection-group">
              <label>Color</label>
              <div className="color-options">
                {colors.map((color) => (
                  <button
                    key={color}
                    className={`color-option ${selectedColor === color ? 'active' : ''}`}
                    onClick={() => setSelectedColor(color)}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Version Selection */}
          {versions.length > 0 && (
            <div className="selection-group">
              <label>Version</label>
              <div className="version-options">
                {versions.map((version) => (
                  <button
                    key={version}
                    className={`version-option ${selectedVersion === version ? 'active' : ''}`}
                    onClick={() => setSelectedVersion(version)}
                  >
                    {version}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Add to Cart Button */}
          <button 
            className="btn-add-to-cart"
            disabled={!selectedVariant || selectedVariant.stock === 0}
          >
            {selectedVariant?.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
          </button>

          {/* Description */}
          {product.description && (
            <div className="product-description">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>
          )}

          {/* Specifications */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="product-specifications">
              <h3>Specifications</h3>
              <table className="spec-table">
                <tbody>
                  {specFields.map((field) => {
                    const value = product.specifications[field.name];
                    if (!value) return null;

                    return (
                      <tr key={field.name}>
                        <td className="spec-label">{field.label}</td>
                        <td className="spec-value">
                          {formatSpecValue(value)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Video Section */}
      {product.videoUrl && (
        <div className="product-video">
          <h3>Product Video</h3>
          {product.videoUrl.includes('youtube.com') || product.videoUrl.includes('youtu.be') ? (
            <iframe
              src={getYouTubeEmbedUrl(product.videoUrl)}
              title={product.name}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={product.videoUrl} controls />
          )}
        </div>
      )}
    </div>
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

/**
 * Get YouTube embed URL
 */
function getYouTubeEmbedUrl(url) {
  const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

export default UnifiedProductDetail;
