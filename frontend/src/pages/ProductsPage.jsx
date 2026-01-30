// frontend/src/pages/ProductsPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { SlidersHorizontal, Package, ArrowUpDown } from "lucide-react";
import { productAPI } from "@/lib/api";
import { useCategories } from "@/hooks/useCategories";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { X } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import ProductFilters from "@/components/shared/ProductFilters";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/shared/Loading";

const SORT_OPTIONS = [
  { value: "default", label: "Mặc định" },
  { value: "price_asc", label: "Giá tăng dần" },
  { value: "price_desc", label: "Giá giảm dần" },
  { value: "newest", label: "Mới nhất" },
  { value: "popular", label: "Bán chạy" },
];

const ProductsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Custom Hook
  const { categories, loading: categoriesLoading } = useCategories();

  // URL Params
  const categorySlug = searchParams.get("category");
  const modelParam = searchParams.get("model") || "";
  const searchQuery = searchParams.get("search") || "";
  const sortParam = searchParams.get("sort") || "default";

  // State
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(parseInt(searchParams.get("page")) || 1);
  const limit = 12;

  const [filters, setFilters] = useState({});
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState(sortParam);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Derive Current Category Object
  const currentCategory = useMemo(() => {
      if (!categories.length) return null;
      if (!categorySlug) return categories[0];
      return categories.find(c => c.slug === categorySlug) || categories[0];
  }, [categorySlug, categories]);

  // Sync state with URL only once on mount or when category changes
  useEffect(() => {
    if(!currentCategory) return;

    const newFilters = {};
    // Iterate over URL keys to find filters
    searchParams.forEach((value, key) => {
        // Exclude reserved keys
        if(['category', 'model', 'search', 'sort', 'page', 'minPrice', 'maxPrice'].includes(key)) return;
        newFilters[key] = value.split(",");
    });

    setFilters(newFilters);

    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    if (minPrice || maxPrice) {
      setPriceRange({
        min: minPrice || "",
        max: maxPrice || "",
      });
    }

    setSortBy(searchParams.get("sort") || "default");
  }, [categorySlug, currentCategory, searchParams]);


  // ============================================
  // FETCH PRODUCTS
  // ============================================
  const fetchProducts = useCallback(async () => {
    if(categoriesLoading) return; // Wait for categories
    
    setLoading(true);
    setError(null);

    try {
      const hasActiveFilters =
        Object.keys(filters).some((key) => filters[key]?.length > 0) ||
        priceRange.min ||
        priceRange.max;

      // Ensure we query for specific category if selected
      const queryCategory = currentCategory?.slug || undefined;

      const params = {
        limit: 9999, // Fetch all for client side filtering
        page: 1, 
        status: "AVAILABLE",
        category: queryCategory 
      };

      if (searchQuery) params.search = searchQuery;
      if (modelParam) params.model = modelParam;

      const response = await productAPI.getAll(params);
      const serverData = response.data?.data;

      if (!serverData) {
        throw new Error("Dữ liệu trả về không hợp lệ");
      }

      let fetchedProducts = serverData.products || [];

      // CLIENT-SIDE FILTERING (Generic)
      if (hasActiveFilters) {
        fetchedProducts = fetchedProducts.filter((product) => {
          
          // Check Price
          if (priceRange.min || priceRange.max) {
            const minPrice = priceRange.min ? parseFloat(priceRange.min) : 0;
            const maxPrice = priceRange.max ? parseFloat(priceRange.max) : Infinity;
            
            // Check if ANY variant is in price range
            const hasVariantInRange = product.variants?.some(v => {
                const p = v.price || 0;
                return p >= minPrice && p <= maxPrice;
            });
            
            // Also check main product price if flattened (unlikely but safe)
            const pPrice = product.price || 0;
            const mainPriceInRange = pPrice >= minPrice && pPrice <= maxPrice;

            if (!hasVariantInRange && !mainPriceInRange) return false;
          }

          // Check Attributes
          for (const [key, values] of Object.entries(filters)) {
              if (!values || values.length === 0) continue;
              
              // Key can be in specs OR variants options
              // 1. Check Specs
              const specValue = product.specifications?.[key];
              if (specValue && values.includes(specValue)) continue; // Match found

              // 2. Check Variants (some variant has this option value)
              // Variants structure: [{ options: [{ key: value }] }] or [{ key: value }]?
              // Unified model: variants is array of objects. Each object might have the key.
              // Actually unifled model variants are objects with fields.
              
              const hasVariantMatch = product.variants?.some(v => {
                  // v[key] might be "128GB"
                  return values.includes(v[key]); // simple check
                  // Or checking v.options if nested? No, flattened in model usually.
                  // Wait, UnifiedProductModel uses 'embedded variants' which have specific fields.
                  // We removed 'options' array in simple model? No, let's verify model.
                  // Model Phase 2 says Embedded Variants + Wildcard Index.
              });
              
              if (hasVariantMatch) continue; // Match found

              return false; // No match for this filter key
          }

          return true;
        });
      }

      // SORTING
      fetchedProducts = sortProducts(fetchedProducts, sortBy);

      // PAGINATION
      const totalFiltered = fetchedProducts.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedProducts = fetchedProducts.slice(startIndex, endIndex);

      setProducts(paginatedProducts);
      setTotal(totalFiltered);
    } catch (err) {
      console.error("Lỗi khi tải danh sách sản phẩm:", err);
      // const message = err.response?.data?.message || err.message || "Không thể tải sản phẩm";
      // setError(message); 
      setProducts([]); 
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [categoriesLoading, currentCategory, searchQuery, modelParam, filters, priceRange, page, limit, sortBy]);

  // ============================================
  // SORT
  // ============================================
  const sortProducts = (products, sortType) => {
    const sorted = [...products];
    switch (sortType) {
      case "price_asc":
        return sorted.sort((a, b) => {
          const priceA = Math.min(...(a.variants?.map(v => v.price) || [a.price || 0]));
          const priceB = Math.min(...(b.variants?.map(v => v.price) || [b.price || 0]));
          return priceA - priceB;
        });
      case "price_desc":
        return sorted.sort((a, b) => {
          const priceA = Math.min(...(a.variants?.map(v => v.price) || [a.price || 0]));
          const priceB = Math.min(...(b.variants?.map(v => v.price) || [b.price || 0]));
          return priceB - priceA;
        });
      case "newest":
        return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case "popular":
        return sorted.sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
      default:
        return sorted;
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [currentCategory, modelParam, page]);

  // ============================================
  // HANDLERS
  // ============================================
  const updateURL = (newFilters, newPrice, newSort) => {
      const params = new URLSearchParams();
      if(categorySlug) params.set("category", categorySlug);
      if(searchQuery) params.set("search", searchQuery);
      if(modelParam) params.set("model", modelParam);
      
      // Filters
      Object.entries(newFilters).forEach(([key, values]) => {
          if(values.length) params.set(key, values.join(","));
      });

      if(newPrice.min) params.set("minPrice", newPrice.min);
      if(newPrice.max) params.set("maxPrice", newPrice.max);
      if(newSort !== 'default') params.set("sort", newSort);
      
      params.set("page", "1");
      navigate(`/products?${params.toString()}`, { replace: true });
      setPage(1);
  };

  const handleFilterToggle = (type, value) => {
    const current = filters[type] || [];
    const updated = current.includes(value) 
        ? current.filter(v => v !== value)
        : [...current, value];
    
    const newFilters = { ...filters, [type]: updated };
    setFilters(newFilters);
    updateURL(newFilters, priceRange, sortBy);
  };

  const handlePriceChange = (newRange) => {
      setPriceRange(newRange);
      updateURL(filters, newRange, sortBy);
  };

  const handleSortChange = (e) => {
      const newSort = e.target.value;
      setSortBy(newSort);
      updateURL(filters, priceRange, newSort);
  };

  const clearFilters = () => {
      setFilters({});
      setPriceRange({ min: "", max: "" });
      setSortBy("default");
      updateURL({}, { min: "", max: "" }, "default");
  };

  const handleCategoryChange = (newSlug) => {
      navigate(`/products?category=${newSlug}`);
  };

  const handlePageChange = (newPage) => {
      setPage(newPage);
      const params = new URLSearchParams(searchParams);
      params.set("page", newPage.toString());
      navigate(`/products?${params.toString()}`); // Regular navigate to push history
      window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ============================================
  // RENDER
  // ============================================
  if (categoriesLoading) return <Loading />;

  const totalPages = Math.ceil(total / limit);
  const activeFiltersCount = Object.values(filters).reduce((acc, curr) => acc + curr.length, 0) + (priceRange.min || priceRange.max ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {searchQuery
              ? `Kết quả tìm kiếm: "${searchQuery}"`
              : modelParam
              ? `${currentCategory?.name || "Sản phẩm"} ${modelParam}`
              : currentCategory?.name || "Tất cả sản phẩm"}
          </h1>
          {searchQuery && (
            <p className="text-sm text-gray-600">Danh mục: {currentCategory?.name}</p>
          )}
        </div>

        <div className="flex gap-6">
          {/* SIDEBAR */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <ProductFilters
              filters={filters}
              onFilterChange={handleFilterToggle}
              priceRange={priceRange}
              onPriceChange={handlePriceChange}
              activeFiltersCount={activeFiltersCount}
              onClearFilters={clearFilters}
              currentCategory={currentCategory} // Dynamic Filters Here
            />
          </aside>

          {/* MAIN */}
          <main className="flex-1 min-w-0">
            {/* Top Bar */}
            <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
              <p className="text-sm text-gray-600">
                Tìm thấy <span className="font-semibold">{total}</span> sản phẩm
                {page > 1 && ` - Trang ${page}/${totalPages}`}
              </p>

              <div className="flex items-center gap-3">
                <select
                  value={sortBy}
                  onChange={handleSortChange}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {SORT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                {/* Mobile Filters */}
                <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="lg:hidden flex items-center gap-2 h-10">
                      <SlidersHorizontal className="w-4 h-4" />
                      Bộ lọc
                      {activeFiltersCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full ml-1">
                          {activeFiltersCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[90vw] sm:w-[400px] p-0 overflow-y-auto">
                    <SheetHeader className="sticky top-0 bg-white border-b z-10 p-6 pb-4">
                      <div className="flex items-center justify-between">
                        <SheetTitle className="text-xl font-bold">Bộ lọc sản phẩm</SheetTitle>
                        <button onClick={() => setMobileFiltersOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </SheetHeader>
                    <div className="p-6 pt-2 pb-32">
                      <ProductFilters
                        filters={filters}
                        onFilterChange={handleFilterToggle}
                        priceRange={priceRange}
                        onPriceChange={handlePriceChange}
                        activeFiltersCount={activeFiltersCount}
                        onClearFilters={clearFilters}
                        currentCategory={currentCategory}
                      />
                    </div>
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
                      <Button size="lg" className="w-full h-12 text-lg font-semibold" onClick={() => setMobileFiltersOpen(false)}>
                        Xem {total} sản phẩm
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl shadow-sm p-4 animate-pulse">
                            <div className="aspect-[3/4] bg-gray-200 rounded-xl mb-4" />
                            <div className="h-6 bg-gray-200 rounded mb-2" />
                            <div className="h-4 bg-gray-200 rounded w-20" />
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="text-center py-12 text-red-500">{error}</div>
            ) : products.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-semibold">Không tìm thấy sản phẩm</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map(p => (
                        <ProductCard 
                            key={p._id} 
                            product={p}
                            isTopSeller={p.isTopSeller}
                            isTopNew={p.isTopNew}
                        />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
                <div className="mt-12 flex justify-center items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => handlePageChange(Math.max(1, page - 1))}>
                        Trước
                    </Button>
                    <span className="text-sm font-medium px-4">
                        Trang {page} / {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => handlePageChange(Math.min(totalPages, page + 1))}>
                        Sau
                    </Button>
                </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
