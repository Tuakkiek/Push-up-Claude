// ============================================
// FILE: frontend/src/components/shared/CategoryDropdown.jsx
// ✅ REFACTORED: Dynamic Categories
// ============================================
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Package, X, ChevronRight } from "lucide-react";

// API imports
import { productAPI } from "@/lib/api";
import { useCategories } from "@/hooks/useCategories"; // New Hook
import { useTopSellers } from "@/hooks/useTopSellers";

const CategoryDropdown = ({
  isMobileMenu = false,
  isOpen: controlledIsOpen,
  onClose = () => {},
}) => {
  const navigate = useNavigate();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [categoryData, setCategoryData] = useState({}); // Cache loaded data
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  
  // Use custom hook to fetch categories
  const { categories, loading: loadingCategories } = useCategories();
  const { topSellers: displayBestSellers, calculateTopSellers } = useTopSellers();

  // Use controlled state if provided (for mobile), otherwise use internal state (for desktop)
  const isOpen = isMobileMenu ? controlledIsOpen : internalIsOpen;
  const setIsOpen = isMobileMenu ? () => {} : setInternalIsOpen;

  // Selected Category Object
  const selectedCategory = categories[selectedCategoryIndex];

  // Effect to calculate top sellers globally from cache
  useEffect(() => {
    if (!isOpen) return;

    const loadedCategories = Object.values(categoryData).filter(
      (cat) => cat?.allProducts?.length > 0
    );

    if (loadedCategories.length >= 1) { // If at least 1 category loaded
      const allProducts = loadedCategories
        .flatMap((cat) => cat.allProducts)
        .filter(Boolean);

      calculateTopSellers(allProducts);
    }
  }, [isOpen, categoryData, calculateTopSellers]);

  // Helper to get series/grouping key (Simple grouping by Name prefix for now)
  const getSeriesKey = (productName = "") => {
    if (!productName) return "Khác";
    // Simple heuristic: First 2 words or specific logic if needed
    // Dynamic grouping is hard without backend support, so we try to group by Model/Brand logic if possible.
    // For now, let's group by "Model" field if available, or just fallback.
    return "Sản phẩm"; 
  };

  // Group products by "Series" or Model to mimic old UI
  const groupBySeries = (products) => {
    const groups = {};
    products.forEach((product) => {
      // Use Model as Series Name if available, else 'General'
      const seriesKey = product.model || "Sản phẩm khác";
      
      if (!groups[seriesKey]) {
        groups[seriesKey] = { seriesName: seriesKey, products: [], image: "" };
      }
      groups[seriesKey].products.push(product);
    });

    return Object.values(groups)
      .map((group) => ({
        ...group,
        image: group.products[0]?.images?.[0] || group.products[0]?.featuredImage || "",
      }))
      .slice(0, 6); // Limit to 6 groups for UI
  };

  const fetchCategoryData = useCallback(
    async (categorySlug) => {
      if (!categorySlug) return;
      if (categoryData[categorySlug]) return; // Use cache

      setLoading(true);
      try {
        const response = await productAPI.getAll({ 
            limit: 50, 
            category: categorySlug,
            sort: '-createdAt' 
        });
        const products = response.data?.data?.products || [];
        const series = groupBySeries(products);
        
        setCategoryData((prev) => ({
          ...prev,
          [categorySlug]: { series, allProducts: products },
        }));
      } catch (error) {
        console.error(`Error loading ${categorySlug}:`, error);
      } finally {
        setLoading(false);
      }
    },
    [categoryData]
  );

  // Initial load
  useEffect(() => {
    if (isOpen && categories.length > 0) {
      // Load first category if data missing
      const firstCat = categories[0];
      if (firstCat && !categoryData[firstCat.slug]) {
        fetchCategoryData(firstCat.slug);
        setSelectedCategoryIndex(0);
      }
    }
  }, [isOpen, categories, categoryData, fetchCategoryData]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        if (!isMobileMenu) {
          setInternalIsOpen(false);
        }
      }
    };
    if (isOpen && !isMobileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isMobileMenu]);

  const handleCategoryHover = (slug, idx) => {
    setSelectedCategoryIndex(idx);
    fetchCategoryData(slug);
  };

  const navigateToProductDetail = (product) => {
    if (!product) return;
    const catSlug = product.category?.slug || selectedCategory?.slug || "general";
    const slug = product.slug || product._id;
    // Assuming first variant
    const variant = product.variants?.[0];
    const targetUrl = variant?.sku
      ? `/${catSlug}/${slug}?sku=${variant.sku}`
      : `/${catSlug}/${slug}`;

    setIsOpen(false);
    if (isMobileMenu) onClose();
    navigate(targetUrl);
  };

  const currentData = selectedCategory ? categoryData[selectedCategory.slug] : null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button - Desktop only */}
      {!isMobileMenu && (
        <button
          onMouseEnter={() => setInternalIsOpen(true)}
          className="hidden md:flex bg-white text-black rounded-full px-6 py-3 items-center gap-2 transition-all duration-300 hover:bg-gray-100 hover:scale-105 shadow-sm font-medium"
        >
          <Menu className="w-5 h-5" />
          Danh mục
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <>
          {isMobileMenu && (
            <div
              className="md:hidden fixed inset-0 z-40"
              onClick={() => {
                setIsOpen(false);
                onClose();
              }}
            />
          )}

          <div
            className={`
              ${
                isMobileMenu
                  ? "fixed bottom-16 left-0 right-0 h-[66vh] z-50 bg-white rounded-t-3xl shadow-2xl overflow-hidden"
                  : "fixed inset-0 top-20 z-50 bg-white overflow-y-auto"
              }
              md:inset-auto md:top-20 md:left-1/2 md:-translate-x-1/2 md:w-[1200px] md:h-[600px] md:rounded-3xl md:shadow-2xl md:overflow-hidden md:bg-white/40 md:backdrop-blur-3xl md:border md:border-white/20
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Header */}
            {isMobileMenu && (
              <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex flex-col items-center flex-shrink-0">
                <div className="w-12 h-1 bg-gray-300 rounded-full mb-2" />
                <div className="flex items-center justify-between w-full">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Danh mục sản phẩm
                  </h2>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      onClose();
                    }}
                    className="text-gray-700 hover:text-black"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
            )}

            <div
              className={`flex h-full ${
                isMobileMenu ? "flex-col" : "flex-col md:flex-row"
              }`}
            >
              {/* Left: Categories List */}
              <div
                className={`w-full bg-gray-50 p-2 md:w-80 md:p-6 md:overflow-y-auto ${
                  isMobileMenu ? "flex-shrink-0" : ""
                }`}
              >
                <div className="flex gap-2 overflow-x-auto md:flex-col md:space-y-1 md:overflow-x-hidden pb-2 md:pb-0 scrollbar-hide">
                  {categories.map((cat, idx) => (
                    <button
                      key={cat._id}
                      onClick={() => handleCategoryHover(cat.slug, idx)}
                      onMouseEnter={() => handleCategoryHover(cat.slug, idx)}
                      className={`flex-shrink-0 w-24 p-2 flex flex-col items-center gap-1 rounded-xl 
                                  md:w-full md:flex-row md:items-center md:gap-3 md:px-4 md:py-3 md:text-left font-medium transition-all ${
                                    selectedCategoryIndex === idx
                                      ? "bg-white text-black shadow-sm"
                                      : "text-gray-600 hover:bg-gray-100"
                                  }`}
                    >
                      {/* Icon Placeholder or Image */}
                      <div className="w-10 h-10 md:w-8 md:h-8 bg-gray-200 rounded-full flex items-center justify-center">
                         {cat.image ? (
                             <img src={cat.image} alt={cat.name} className="w-full h-full object-cover rounded-full" />
                         ) : (
                             <span className="text-xs font-bold text-gray-500">{cat.name.charAt(0)}</span>
                         )}
                      </div>
                      <span className="text-center text-xs md:text-left md:text-base line-clamp-1">
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: Content Area */}
              <div className="flex-1 p-4 overflow-y-auto md:p-8 bg-white md:bg-transparent pb-6">
                {loading || !currentData ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-pulse">
                          <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto"></div>
                          <div className="h-3 bg-gray-200 rounded mt-2 w-16 mx-auto"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Top Sellers (Global or Category Specific if we filter bestsellers by cat logic) 
                        For now display internal best sellers if calculation logic in effect 
                    */}
                    {/* 
                    <div className="mb-6 md:mb-10">
                      <h3 className="text-base md:text-lg font-bold mb-4 md:mb-5 flex items-center gap-2 text-gray-900">
                        <span className="inline-flex items-center justify-center w-7 h-7 md:w-8 md:h-8 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                          HOT
                        </span>
                        Sản phẩm nổi bật
                      </h3>
                       // Render logic similar to before, simplified for brevity 
                    </div>
                    */}

                    {/* Series/Grouping Grid */}
                    <h3 className="text-sm text-black font-semibold mb-3 md:mb-4 md:text-lg">
                      {selectedCategory?.name}
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-6">
                      {currentData.series.map((group, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                              navigate(`/products?category=${selectedCategory.slug}&model=${group.seriesName}`);
                              setIsOpen(false);
                              if(isMobileMenu) onClose();
                          }}
                          className="bg-white rounded-xl border border-gray-200 p-3 hover:shadow-lg transition-all text-left group md:p-4"
                        >
                          <div className="flex gap-3 items-start mb-3">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                              {group.image ? (
                                <img
                                  src={group.image}
                                  alt={group.seriesName}
                                  className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Package className="w-6 h-6 md:w-8 md:h-8" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-sm text-gray-900 md:text-base mb-1">
                                {group.seriesName}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {group.products.length} sản phẩm
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryDropdown;

// Mobile Helper
export const useCategoryDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    openMenu: () => setIsOpen(true),
    closeMenu: () => setIsOpen(false),
  };
};
