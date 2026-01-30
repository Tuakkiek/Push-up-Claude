// FILE: frontend/src/components/shared/ProductCard.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart, Edit2, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ============================================================================
// ÁNH XẠ: category (UI hiển thị) → productType (Backend API)
// ============================================================================
const CATEGORY_TO_TYPE_MAP = {
  iPhone: "iPhone",
  iPad: "iPad",
  Mac: "Mac",
  AirPods: "AirPods",
  AppleWatch: "AppleWatch",
  Accessories: "Accessory", // ← Accessories (UI) → Accessory (Backend)
};

// ============================================================================
// Trường key hiển thị variant theo từng loại sản phẩm
// ============================================================================
const VARIANT_KEY_FIELD = {
  iPhone: "storage", // iPhone: 128GB, 256GB...
  iPad: "storage", // iPad: 128GB, 256GB...
  Mac: "storage", // Mac: 512GB, 1TB...
  AirPods: "variantName", // AirPods: Gen 2, Gen 3...
  AppleWatch: "variantName",
  Accessories: "variantName",
};

// ============================================================================
// COMPONENT CON: Hiển thị sao đánh giá
// ============================================================================
const StarRating = ({ rating, reviewCount = 0 }) => {
  const roundedRating = Math.round(rating);
  const totalReviews = `(${reviewCount || 0})`;
  return (
    // Đã thêm md:gap-[1px]
    <div className="flex items-center gap-0">
      {[...Array(1)].map((_, i) => (
        <Star
          key={i}
          // Đã thêm md:w-3 md:h-3 (nhỏ hơn trên mobile)
          className={`w-2 h-2 md:w-3 md:h-3 ${
            i < roundedRating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
      <span className="text-[10px] font-semibold ml-1">
        {rating.toFixed(1)}
      </span>
      {/* Đã thêm md:text-xs (nhỏ hơn trên mobile) */}
      <span className="text-[10px] text-gray-500 ml-1 md:text-xs">
        {totalReviews}
      </span>
    </div>
  );
};
// ============================================================================
// COMPONENT CHÍNH: ProductCard
// ============================================================================
const ProductCard = ({
  product, // Dữ liệu sản phẩm từ parent
  isTopNew = false, // Badge "Mới"
  isTopSeller = false, // Badge "Bán chạy"
  onEdit, // Callback sửa sản phẩm (Admin)
  onDelete, // Callback xóa sản phẩm (Admin)
}) => {
  const navigate = useNavigate();
  const { addToCart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();

  // ==========================================================================
  // STATE
  // ==========================================================================
  const [isAdding, setIsAdding] = useState(false); // Loading nút thêm giỏ
  const [selectedVariant, setSelectedVariant] = useState(null); // Variant đang chọn
  const [showDeleteDialog, setShowDeleteDialog] = useState(false); // Dialog xóa
  const [isVariantReady, setIsVariantReady] = useState(false); // Sẵn sàng navigate

  // Kiểm tra quyền Admin/Kho
  const isAdmin = user?.role === "ADMIN" || user?.role === "WAREHOUSE_STAFF";

  // Đảm bảo variants luôn là array
  const safeVariants = Array.isArray(product?.variants) ? product.variants : [];

  // ==========================================================================
  // 1. TỰ ĐỘNG CHỌN VARIANT MẶC ĐỊNH (Ưu tiên stock > 0)
  // ==========================================================================
  useEffect(() => {
    if (!safeVariants.length) {
      setSelectedVariant(null);
      setIsVariantReady(false);
      return;
    }

    // Variants don't have slug field - use product.slug
    let variant = safeVariants.find((v) => v.stock > 0 && v.sku);
    if (!variant) variant = safeVariants.find((v) => v.sku);
    if (!variant) variant = safeVariants[0];

    setSelectedVariant(variant);
    // Use product.slug since variants don't have slug field
    setIsVariantReady(!!(variant?.sku && product.slug));
  }, [product.variants, product.slug, product.name, safeVariants]);

  // ==========================================================================
  // 2. DỮ LIỆU HIỂN THỊ HIỆN TẠI
  // ==========================================================================
  const current = selectedVariant || {};
  const displayPrice = current.price || product.price || 0;
  const displayOriginalPrice =
    current.originalPrice || product.originalPrice || 0;
  const rating = product.averageRating || 0;
  const reviewCount = product.reviewCount || 0;

  const displayImage =
    current?.images?.[0] ||
    (Array.isArray(product.images) ? product.images[0] : null) ||
    product.image ||
    "/placeholder.png";

  const discountPercent =
    displayOriginalPrice > displayPrice
      ? Math.round(
          ((displayOriginalPrice - displayPrice) / displayOriginalPrice) * 100
        )
      : 0;
  // ==========================================================================
  // 3. BADGE GÓC PHẢI (Mới/Bán chạy)
  // ==========================================================================
  const getRightBadge = () => {
    if (isTopNew)
      return {
        text: "Mới",
        color: "bg-green-500 hover:bg-green-500 text-white",
      };
    if (isTopSeller)
      return {
        text: "Bán chạy",
        color: "bg-green-500 hover:bg-green-500 text-white",
      };
    return null;
  };
  const rightBadge = getRightBadge();
  const installmentText =
    product.installmentBadge &&
    product.installmentBadge.toLowerCase() !== "none"
      ? product.installmentBadge
      : null;

  // ==========================================================================
  // 4. DANH SÁCH NÚT CHỌN VARIANT (128GB, 256GB, 1TB...)
  // ==========================================================================
  const catName = typeof product.category === 'object' ? product.category?.name : product.category;
  const keyField = VARIANT_KEY_FIELD[catName] || "variantName";

  // Hàm chuẩn hóa dung lượng: chuyển TB → GB để so sánh đúng
  const normalizeStorage = (value) => {
    if (!value) return 0;
    const str = String(value).trim().toUpperCase();
    const num = parseInt(str);
    if (isNaN(num)) return 0;
    return str.includes("TB") ? num * 1024 : num; // 1TB = 1024GB
  };

  const variantKeyOptions = Array.from(
    new Set(
      safeVariants.filter((v) => v && v[keyField]).map((v) => v[keyField])
    )
  )
    // SẮP XẾP ĐÚNG: 128GB → 256GB → 512GB → 1TB → 2TB
    .sort((a, b) => normalizeStorage(a) - normalizeStorage(b));

  const totalStock = safeVariants.reduce((sum, v) => sum + (v?.stock || 0), 0);

  // ==========================================================================
  // 5. EVENT HANDLERS
  // ==========================================================================
  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================
  
  // Helper to safely get category slug/name
  const getCategoryInfo = () => {
    const cat = product.category;
    if (typeof cat === 'object' && cat !== null) {
        return { slug: cat.slug, name: cat.name, id: cat._id };
    }
    return { slug: cat, name: cat, id: cat };
  };

  const handleVariantKeyClick = (e, keyValue) => {
    e.stopPropagation();
    let variant = safeVariants.find(
      (v) => v[keyField] === keyValue && v.stock > 0 && v.slug
    );
    if (!variant)
      variant = safeVariants.find((v) => v[keyField] === keyValue && v.slug);
    if (variant) {
      setSelectedVariant(variant);
      setIsVariantReady(!!(variant.sku && variant.slug));
    }
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    e.preventDefault();

    if (!isAuthenticated || user?.role !== "CUSTOMER") {
      navigate("/login");
      return;
    }

    if (!selectedVariant) {
      toast.error("Vui lòng chọn phiên bản");
      return;
    }
    if (selectedVariant.stock <= 0) {
      toast.error("Sản phẩm tạm hết hàng");
      return;
    }

    setIsAdding(true);
    try {
      const { name, id } = getCategoryInfo();
      // Fallback to name/id if type map fails, but preferably use what backend expects
      const productType = CATEGORY_TO_TYPE_MAP[name] || name || id;

      const result = await addToCart(
        selectedVariant._id, // variantId
        1, // quantity
        productType
      );

      if (result?.success) {
        toast.success("Đã thêm vào giỏ hàng", {
          description: `${product.name} • ${getVariantLabel(selectedVariant)}`,
        });
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      toast.error("Không thể thêm vào giỏ hàng");
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    onEdit?.(product);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    onDelete?.(product._id);
    setShowDeleteDialog(false);
  };

  const handleCardClick = () => {
    const { slug, name } = getCategoryInfo();

    // Use the category slug directly from the populated category
    const categoryPath = slug || 'products';

    // Safe path construction
    const basePath = `/${categoryPath}`;

    // Use product.slug since variants don't have slug field
    if (selectedVariant?.sku && product.slug) {
      const url = `${basePath}/${product.slug}?sku=${selectedVariant.sku}`;
      navigate(url);
      return;
    }

    // Fallback to product slug
    navigate(`${basePath}/${product.slug || product._id}`);
  };

  const getVariantLabel = (variant) => {
    if (!variant) return "";
    const cat = product?.category;
    if (cat === "iPhone") return variant.storage;
    if (cat === "iPad") return `${variant.storage} ${variant.connectivity}`;
    if (cat === "Mac")
      return `${variant.cpuGpu} • ${variant.ram} • ${variant.storage}`;
    return variant.variantName || variant.storage || "";
  };

  // ==========================================================================
  // 8. RENDER UI
  // ==========================================================================
  return (
    <>
      <Card
        className="w-full max-w-[280px] h-[600px] mx-auto overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 bg-white border-0 relative group"
        onClick={isVariantReady ? handleCardClick : undefined}
        style={{ cursor: isVariantReady ? "pointer" : "default" }}
      >
        {!isVariantReady && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-50">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
          </div>
        )}

        {/* DEBUG UI: CHỈ ADMIN */}
        {isAdmin && (
          <div className="absolute top-12 left-3 z-10 bg-black/90 text-white text-[7px] px-2 py-1 rounded font-mono space-y-1 max-w-[200px] opacity-80">
            <div className="truncate">
              Base:{" "}
              <code className="text-blue-400">
                {product.baseSlug || "NULL"}
              </code>
            </div>
            <div className="truncate">
              Var:{" "}
              <code className="text-green-400">
                {selectedVariant?.slug || "NULL"}
              </code>
            </div>
            <div className="truncate">
              SKU:{" "}
              <code className="text-yellow-400">
                {selectedVariant?.sku || "NULL"}
              </code>
            </div>
          </div>
        )}

        {isAdmin && (
          <>
            <div className="absolute bottom-3 right-12 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-white shadow-md"
                onClick={handleEditClick}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="absolute bottom-3 right-1 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8 bg-red-500 hover:bg-red-600"
                onClick={handleDeleteClick}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        {discountPercent > 0 && (
          <div className="absolute top-3 left-3 z-20">
            <Badge className="bg-red-600 hover:bg-red-600 text-white font-bold text-xs px-2 py-1 rounded-md shadow-md">
              -{discountPercent}%
            </Badge>
          </div>
        )}

        {rightBadge && (
          <div className="absolute top-3 right-3 z-20">
            <Badge
              className={`${rightBadge.color} font-bold text-xs px-2 py-1 rounded-md shadow-md`}
            >
              {rightBadge.text}
            </Badge>
          </div>
        )}

        <div className="relative aspect-[3/4] bg-white overflow-hidden p-6 pt-10">
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
          />

          {!isAdmin &&
            isAuthenticated &&
            user?.role === "CUSTOMER" &&
            totalStock > 0 && (
              <Button
                size="sm"
                className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white text-gray-900 hover:bg-gray-100 shadow-lg"
                onClick={handleAddToCart}
                disabled={isAdding}
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                {isAdding ? "..." : "Thêm"}
              </Button>
            )}
        </div>

        {/* =====================================================
             THÔNG TIN SẢN PHẨM - LUÔN CÂN BẰNG
             ==================================================== */}
        <div className="px-4 bg-white">
          <h3 className="font-bold text-lg product-title">{product.name}</h3>

          {/* BADGE TRẢ GÓP: LUÔN CHIẾM 1 DÒNG */}
          <div className="min-h-[1.5rem] mt-1 flex items-center">
            {installmentText && (
              <Badge
                variant="outline"
                className="bg-gray-200 text-gray-700 font-medium text-xs px-2 py-0.5 rounded-md border-0"
              >
                {installmentText}
              </Badge>
            )}
          </div>

          {/* GIÁ: LUÔN CHIẾM 2 DÒNG */}
          <div className="mt-1">
            {/* Dòng 1: Giá gốc - luôn chiếm chỗ */}
            <div className="min-h-[1.25rem] flex items-center">
              {displayOriginalPrice > displayPrice ? (
                <p className="text-sm text-gray-500 line-through">
                  {formatPrice(displayOriginalPrice)}
                </p>
              ) : (
                <span className="invisible text-sm select-none">—</span>
              )}
            </div>

            {/* Dòng 2: Giá hiện tại */}
            <p className="text-2xl font-bold text-red-600">
              {formatPrice(displayPrice)}
            </p>
          </div>

          <div className="mt-3">
            <StarRating rating={product.averageRating} reviewCount={product.totalReviews} />
            <div className="mt-2 border-b border-gray-200"></div>
          </div>

          {variantKeyOptions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {variantKeyOptions.map((keyValue) => (
                <button
                  key={keyValue}
                  onClick={(e) => handleVariantKeyClick(e, keyValue)}
                  className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                    current[keyField] === keyValue
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
                  }`}
                >
                  {keyValue}
                </button>
              ))}
            </div>
          )}

          {totalStock === 0 && (
            <p className="text-xs text-red-600 font-medium mt-2">Hết hàng</p>
          )}
          {totalStock > 0 && totalStock <= 5 && (
            <p className="text-xs text-orange-600 font-medium mt-2">
              Chỉ còn {totalStock} sản phẩm!
            </p>
          )}
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa sản phẩm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa <strong>{product.name}</strong> không?{" "}
              <br />
              <span className="text-red-600 font-medium">
                Hành động này không thể hoàn tác.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Xóa vĩnh viễn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSS: Tên sản phẩm luôn 2 dòng */}
      <style>{`
        .product-title {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4rem;
          max-height: 2.8rem;
          min-height: 2.8rem;
          text-overflow: ellipsis;
        }
      `}</style>
    </>
  );
};

export default ProductCard;
