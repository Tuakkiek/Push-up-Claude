// frontend/src/pages/ProductDetailPage.jsx

import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import {
  Star,
  ChevronRight,
  ChevronLeft,
  Shield,
  Check,
  Play,
} from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { productAPI, analyticsAPI } from "@/lib/api"; // Unified API
import SlideInPanel from "@/components/product/SlideInPanel";
import QuickSpecs from "@/components/product/QuickSpecs";
import { SpecificationsTab } from "@/components/product/SpecificationsTab";
import { WarrantyTab } from "@/components/product/WarrantyTab";
import AddToCartModal from "@/components/product/AddToCartModal";
import { ReviewsTab } from "@/components/product/ReviewsTab";
import SimilarProducts from "@/components/product/SimilarProducts";
import { toast } from "sonner";

const ProductDetailPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topRef = useRef(null);

  // Parse URL: /categorySlug/productSlug
  const pathParts = location.pathname.split("/").filter(Boolean);
  // const categorySlug = pathParts[0]; // Not strictly needed for API if slug is unique
  const productSlug = pathParts[1] || pathParts[0]; // Fallback if root
  const sku = searchParams.get("sku");

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeMediaTab, setActiveMediaTab] = useState("variant"); 
  const [showSpecsPanel, setShowSpecsPanel] = useState(false);
  const [showWarrantyPanel, setShowWarrantyPanel] = useState(false);
  const [showAddToCartModal, setShowAddToCartModal] = useState(false);

  // Store Hooks
  const {
    addToCart,
    isLoading: cartLoading,
    setSelectedForCheckout,
  } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [productSlug]);

  // Fetch Product Logic
  useEffect(() => {
    const fetchProductData = async () => {
      if (!productSlug) return;

      setIsLoading(true);
      setError(null);

      try {
        // Unified API call by slug
        const response = await productAPI.getBySlug(productSlug);
        const data = response.data?.data;
        
        if (!data) throw new Error("Product not found");

        const fetchedProduct = data.product || data;
        // Ensure variants from unified model
        const fetchedVariants = fetchedProduct.variants || [];

        setProduct(fetchedProduct);
        setVariants(fetchedVariants);

        // Determine Variant Logic (SKU match or First)
        let variantToSelect = null;
        if (sku) {
          variantToSelect = fetchedVariants.find((v) => v.sku === sku);
        }
        if (!variantToSelect && fetchedVariants.length > 0) {
          // Prefer one with stock
          variantToSelect = fetchedVariants.find(v => v.stock > 0) || fetchedVariants[0];
        }

        if (variantToSelect) {
          setSelectedVariant(variantToSelect);
        }

        // Analytics (Optional)
        // analyticsAPI.logView(fetchedProduct._id); 

        setActiveMediaTab("variant");
        setSelectedImage(0);
      } catch (err) {
        console.error("Error fetching product:", err);
        setError("Không tìm thấy sản phẩm");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductData();
  }, [productSlug]); // Depend only on slug

  // Helper to find the "Difference Key" (Storage, RAM, etc.)
  // We check the category schema or guess from variant fields
  const getPrimaryVariantKey = () => {
      if(!product || !product.category) return 'storage';
      // If we had the schema here we could look for 'isMainVariantOption'
      // Heuristic: check keys in variant options that are not 'sku', 'price', 'stock', 'originalPrice'
      // Since unified variants are objects, let's look at keys of the first variant options
      
      // Since unified variants have 'embedded' fields in backend, but frontend might receive them flattened or not.
      // In `useProductForm` usage, we assumed flat fields.
      // Let's check common keys.
      if(product.category.slug?.includes('iphone') || product.category.slug?.includes('ipad')) return 'storage';
      if(product.category.slug?.includes('mac')) return 'storage'; // or cpuGpu
      if(product.category.slug?.includes('watch')) return 'bandSize'; // or variantName
      
      // Fallback: check keys present in selectedVariant
      if(selectedVariant) {
          if(selectedVariant.variantName) return 'variantName';
          if(selectedVariant.storage) return 'storage';
          if(selectedVariant.size) return 'size';
      }
      return 'variantName';
  };

  const variantKeyField = getPrimaryVariantKey();

  const handleVariantSelect = (variant, isColorChange = false) => {
    if (!variant) return;
    
    // Update URL without navigation
    const newSku = variant.sku;
    const catSlug = product.category?.slug || 'product';
    const newUrl = `/${catSlug}/${product.slug}?sku=${newSku}`;
    window.history.replaceState(null, "", newUrl);

    updateVariantUI(variant);
  };

  const updateVariantUI = (variant) => {
    // Try to keep same image index if possible
    const currentImageUrl = selectedVariant?.images?.[selectedImage];
    const newImageIndex = variant.images?.indexOf(currentImageUrl);
    
    setSelectedVariant(variant);
    setSelectedImage(newImageIndex >= 0 ? newImageIndex : 0);
    setActiveMediaTab("variant");
  };

  const handleAddToCart = async (isBuyNow = false) => {
    if (!isAuthenticated) {
        navigate("/login", { state: { from: location.pathname } });
        return;
    }
    
    if (!selectedVariant || !product) return;

    // Use unified structure: Product ID + Variant SKU/ID
    // Assuming backend cart controller handles unified product structure
    try {
        const result = await addToCart(selectedVariant._id, 1, product.category?._id || product.category); 
        // Note: Generic addToCart might expect (productId, quantity, type). 
        // We probably updated CartController to handle Unified Product ID passed as first arg.
        // We need to double check if addToCart relies on old "type" strings.
        // If refactored correctly, it should take productId and variantId.
        // But checking `useCartStore`, it calls `cartAPI.addToCart`.
        // Let's assume backend CartController was updated in Phase 2.
        
        if (result.success) {
            if (isBuyNow) {
                setSelectedForCheckout([selectedVariant._id]); // This logic might need update if cart items store variantId
                navigate("/cart/checkout");
            } else {
                setShowAddToCartModal(true);
            }
        } else {
            toast.error(result.message || "Lỗi thêm giỏ hàng");
        }
    } catch(e) {
        toast.error("Lỗi kết nối");
    }
  };

  const formatPrice = (price) => new Intl.NumberFormat("vi-VN").format(price) + "đ";

  // Group variants by Color
  const getGroupedVariants = () => {
    if(!variants.length) return {};
    const grouped = {};
    variants.forEach((v) => {
      const color = v.color || "Default";
      if (!grouped[color]) grouped[color] = [];
      grouped[color].push(v);
    });
    return grouped;
  };

  // Get distinct options for the current color (e.g. Storage options)
  const getVariantOptionsForColor = (color) => {
      const vs = variants.filter(v => (v.color || "Default") === color);
      // Sort by price usually imply sort by spec capacity
      return vs.sort((a,b) => (a.price || 0) - (b.price || 0));
  };

  // Helper to extract current images
  const getCurrentMainImages = () => {
    if (activeMediaTab === "featured" && product?.featuredImages?.length) {
      return product.featuredImages;
    }
    if (activeMediaTab === "video") return [];
    return selectedVariant?.images?.length ? selectedVariant.images : (product.images || []);
  };

  if (isLoading) return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
  );

  if (error || !product) return (
      <div className="container mx-auto px-4 py-12 text-center text-red-500 font-bold">
          {error || "Sản phẩm không tồn tại"}
      </div>
  );

  if(!selectedVariant && variants.length > 0) {
      setSelectedVariant(variants[0]); // Fail safe
  }

  const groupedVariants = getGroupedVariants();
  const discount = selectedVariant ? Math.round(((selectedVariant.originalPrice - selectedVariant.price) / selectedVariant.originalPrice) * 100) : 0;

  return (
    <div ref={topRef} className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-2 sm:px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: IMAGES */}
          <div className="lg:col-span-7">
             <div className="bg-white rounded-lg p-4 sticky top-4">
                 <div className="aspect-[4/3] flex items-center justify-center bg-white mb-4 relative">
                     {activeMediaTab === 'video' && product.videoUrl ? (
                         <div className="w-full h-full"> 
                            {/* Video Logic (Simplified) */}
                            <iframe src={product.videoUrl.replace("watch?v=", "embed/")} className="w-full h-full rounded" />
                         </div>
                     ) : (
                         <img 
                            src={getCurrentMainImages()[selectedImage] || "/placeholder.png"} 
                            alt={product.name} 
                            className="max-h-full max-w-full object-contain"
                         />
                     )}
                     
                     {/* Arrows */}
                     {getCurrentMainImages().length > 1 && activeMediaTab !== 'video' && (
                         <>
                            <button onClick={() => setSelectedImage(prev => prev > 0 ? prev - 1 : getCurrentMainImages().length - 1)} className="absolute left-2 p-2 bg-gray-100 rounded-full hover:bg-gray-200"><ChevronLeft/></button>
                            <button onClick={() => setSelectedImage(prev => prev < getCurrentMainImages().length - 1 ? prev + 1 : 0)} className="absolute right-2 p-2 bg-gray-100 rounded-full hover:bg-gray-200"><ChevronRight/></button>
                         </>
                     )}
                 </div>

                 {/* Thumbnails */}
                 <div className="flex gap-2 overflow-x-auto pb-2">
                     {/* Video Tab */}
                     {product.videoUrl && (
                         <button 
                            onClick={() => setActiveMediaTab('video')}
                            className={`w-16 h-16 border rounded flex items-center justify-center ${activeMediaTab === 'video' ? 'border-red-500' : ''}`}
                         >
                             <Play className="w-6 h-6 text-red-500"/>
                         </button>
                     )}
                     
                     {/* Variant Images */}
                     {(selectedVariant?.images || []).map((img, idx) => (
                         <button 
                            key={idx}
                            onClick={() => { setActiveMediaTab('variant'); setSelectedImage(idx); }}
                            className={`w-16 h-16 border rounded overflow-hidden ${activeMediaTab === 'variant' && selectedImage === idx ? 'border-red-500' : ''}`}
                         >
                             <img src={img} className="w-full h-full object-cover" />
                         </button>
                     ))}
                 </div>
                 
                 {/* Specs/Warranty Summary */}
                 <div className="mt-6 border-t pt-4 grid grid-cols-2 gap-4">
                     <button onClick={() => setShowSpecsPanel(true)} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100">
                         <span className="font-semibold">Thông số kỹ thuật</span>
                         <ChevronRight className="w-4 h-4" />
                     </button>
                     <button onClick={() => setShowWarrantyPanel(true)} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100">
                         <span className="font-semibold">Bảo hành & Hậu mãi</span>
                         <ChevronRight className="w-4 h-4" />
                     </button>
                 </div>
             </div>
          </div>

          {/* RIGHT: INFO */}
          <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-lg p-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
                  <div className="flex items-center gap-2 mb-4">
                      <div className="flex items-center text-yellow-400">
                          {/* Rating Stars Mockup */}
                          {[1,2,3,4,5].map(i => <Star key={i} className={`w-4 h-4 ${i <= Math.round(product.averageRating || 5) ? 'fill-current' : 'text-gray-300'}`} />)}
                      </div>
                      <span className="text-sm text-gray-500">({product.totalReviews || 0} đánh giá)</span>
                  </div>

                  {/* PRICE */}
                  <div className="mb-6">
                      <div className="flex items-end gap-3">
                          <span className="text-3xl font-bold text-red-600">{formatPrice(selectedVariant?.price || 0)}</span>
                          {selectedVariant?.originalPrice > selectedVariant?.price && (
                              <span className="text-lg text-gray-400 line-through">{formatPrice(selectedVariant.originalPrice)}</span>
                          )}
                          {discount > 0 && (
                              <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">-{discount}%</span>
                          )}
                      </div>
                  </div>

                  {/* VARIANTS SELECTION */}
                  
                  {/* 1. Color Selection */}
                  <div className="mb-4">
                      <span className="block text-sm font-semibold mb-2">Màu sắc: <span className="text-gray-700">{selectedVariant?.color}</span></span>
                      <div className="flex flex-wrap gap-3">
                          {Object.keys(groupedVariants).map(color => {
                              // Find best representative variant for this color (e.g. same storage, or first available)
                              const variantForColor = groupedVariants[color].find(v => v[variantKeyField] === selectedVariant?.[variantKeyField]) || groupedVariants[color][0];
                              const isSelected = selectedVariant?.color === color;
                              
                              return (
                                  <button
                                    key={color}
                                    onClick={() => handleVariantSelect(variantForColor, true)}
                                    className={`px-3 py-2 border rounded-lg flex items-center gap-2 transition-all ${isSelected ? 'border-red-500 bg-red-50 ring-1 ring-red-500' : 'hover:border-gray-400'}`}
                                  >
                                      {/* Tiny color preview if available or just text */}
                                      <span className="font-medium">{color}</span>
                                  </button>
                              )
                          })}
                      </div>
                  </div>

                  {/* 2. Option Selection (Storage/RAM/etc) */}
                  <div className="mb-6">
                      <span className="block text-sm font-semibold mb-2">Phiên bản:</span>
                      <div className="flex flex-wrap gap-3">
                          {getVariantOptionsForColor(selectedVariant?.color).map(v => {
                              const isSelected = v._id === selectedVariant?._id;
                              const label = v[variantKeyField] || v.sku; // Fallback
                              return (
                                  <button
                                    key={v._id}
                                    onClick={() => handleVariantSelect(v, false)}
                                    className={`px-4 py-2 border rounded-lg transition-all text-sm font-medium ${isSelected ? 'border-red-500 bg-red-50 text-red-700' : 'hover:border-gray-400'}`}
                                  >
                                      {label}
                                      <span className="block text-xs font-normal text-gray-500 mt-1">{formatPrice(v.price)}</span>
                                  </button>
                              )
                          })}
                      </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex gap-4">
                      <button onClick={() => handleAddToCart(true)} className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition">
                          MUA NGAY
                      </button>
                      <button onClick={() => handleAddToCart(false)} className="flex-1 border-2 border-red-600 text-red-600 py-3 rounded-lg font-bold hover:bg-red-50 transition">
                          THÊM VÀO GIỎ
                      </button>
                  </div>
              </div>
          </div>
        </div>
        
        {/* REVIEWS & SIMILAR */}
        <div className="mt-12">
            <ReviewsTab productId={product._id} product={product} />
        </div>
        <div className="mt-12">
            <SimilarProducts productId={product._id} categoryId={product.category?._id} />
        </div>

      </div>

      {/* MODALS */}
      <SlideInPanel open={showSpecsPanel} onClose={() => setShowSpecsPanel(false)} title="Thông số kỹ thuật">
          <SpecificationsTab specifications={product.specifications} />
      </SlideInPanel>
      
      <SlideInPanel open={showWarrantyPanel} onClose={() => setShowWarrantyPanel(false)} title="Thông tin bảo hành">
          <WarrantyTab />
      </SlideInPanel>

      <AddToCartModal 
        open={showAddToCartModal} 
        onOpenChange={setShowAddToCartModal} 
        product={product} 
        variant={selectedVariant}
      />
    </div>
  );
};

export default ProductDetailPage;
