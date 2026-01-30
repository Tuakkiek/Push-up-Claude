import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import { productAPI } from "@/lib/api";

// ============================================
// CATEGORY MAPPING REMOVED
// ============================================

// ============================================
// TYPO CORRECTION & TOKENIZATION
// ============================================
const TYPO_MAPPINGS = {
  // iPhone
  ip: "iphone",
  ifone: "iphone",
  iphon: "iphone",
  plus: "plus",
  pro: "pro",
  promax: "pro max",
  max: "max",
  mini: "mini",

  // iPad
  iapd: "ipad",
  pad: "ipad",
  air: "air",

  // Mac
  mac: "macbook",
  macbok: "macbook",
  mb: "macbook",
  mba: "macbook air",
  mbp: "macbook pro",

  // AirPods
  airpod: "airpods",
  aripod: "airpods",

  // Watch
  wach: "apple watch",
  wacth: "apple watch",
  aw: "apple watch",

  // Accessories
  sac: "sạc",
  cap: "cáp",
  "op lung": "ốp lưng",
};

const correctTypos = (input) => {
  if (!input) return "";
  let corrected = input.toLowerCase().trim();

  if (TYPO_MAPPINGS[corrected]) return TYPO_MAPPINGS[corrected];

  Object.keys(TYPO_MAPPINGS).forEach((key) => {
    const regex = new RegExp(`\\b${key}\\b`, "gi");
    if (regex.test(corrected)) {
      corrected = corrected.replace(regex, TYPO_MAPPINGS[key]);
    }
  });

  return corrected;
};

const tokenizeQuery = (query) => {
  if (!query) return [];

  const corrected = correctTypos(query);
  const tokens = corrected.toLowerCase().trim().split(/\s+/);

  const stopWords = ["the", "a", "an", "and", "or", "của", "cho", "với", "và"];
  return tokens.filter(
    (token) => !stopWords.includes(token) && token.length > 0
  );
};

// ============================================
// RELEVANCE SCORING
// ============================================
const calculateRelevanceScore = (productName, baseName) => {
  const name = productName.toLowerCase();
  const base = baseName.toLowerCase();

  const nameTokens = tokenizeQuery(productName);
  const baseTokens = tokenizeQuery(baseName);

  if (nameTokens.length === 0 || baseTokens.length === 0) return 0;

  let score = 0;
  let matchedTokens = 0;

  // Khớp chính xác toàn bộ
  if (name === base) return 100;

  // Tính điểm cho từng token
  baseTokens.forEach((baseToken) => {
    nameTokens.forEach((nameToken) => {
      // Khớp chính xác từ
      if (nameToken === baseToken) {
        matchedTokens++;
        score += 30;

        // Bonus nếu token xuất hiện ở đầu
        if (name.startsWith(baseToken)) {
          score += 15;
        }
      }
      // Khớp một phần
      else if (nameToken.includes(baseToken) || baseToken.includes(nameToken)) {
        matchedTokens++;
        score += 15;
      }
    });
  });

  // Tỷ lệ khớp
  const matchRatio =
    matchedTokens / Math.max(baseTokens.length, nameTokens.length);

  if (matchRatio >= 0.8) {
    score += 20;
  } else if (matchRatio >= 0.5) {
    score += 10;
  }

  // Bonus nếu base xuất hiện liên tiếp trong name
  if (name.includes(base)) {
    score += 25;
  }

  // Cùng dòng sản phẩm (iPhone 15 vs iPhone 15 Pro)
  const modelRegex = /(\w+\s+\d+)\s*(pro|max|plus|mini|air)?/i;
  const nameMatch = name.match(modelRegex);
  const baseMatch = base.match(modelRegex);

  if (nameMatch && baseMatch) {
    if (nameMatch[1] === baseMatch[1]) {
      score += 40; // Cùng dòng model
    } else if (nameMatch[1].split(" ")[0] === baseMatch[1].split(" ")[0]) {
      score += 20; // Cùng thương hiệu
    }
  }

  // Penalty nếu tên quá khác biệt
  const lengthDiff = Math.abs(name.length - base.length);
  if (lengthDiff > 30) {
    score -= 10;
  }

  return Math.min(Math.max(score, 0), 100);
};

// ============================================
// MAIN COMPONENT
// ============================================
const SimilarProducts = ({ productId, category, currentProduct }) => {
  const [similarProducts, setSimilarProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollContainerRef = React.useRef(null);

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      if (!productId || !category) {
        console.log("[SimilarProducts] Missing productId or category");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log("[SimilarProducts] Fetching for:", {
          productId,
          category,
          currentProductName: currentProduct?.name,
        });

        // Fetch tất cả sản phẩm cùng category
        // Note: category prop is now expected to be the SLUG or ID if possible, 
        // or we use the string passed if backend supports it.
        const response = await productAPI.getAll({
          limit: 100,
          status: "AVAILABLE",
          category: category // Pass current category filter
        });

        let products = response.data?.data?.products || [];

        if (!Array.isArray(products)) {
          console.warn("[SimilarProducts] Invalid products data");
          products = [];
        }

        // Loại bỏ sản phẩm hiện tại
        products = products.filter((p) => p._id !== productId);

        console.log(`[SimilarProducts] Found ${products.length} products`);

        // Tính điểm liên quan
        const productsWithScore = products.map((product) => ({
          ...product,
          _relevanceScore: calculateRelevanceScore(
            product.name || product.model,
            currentProduct?.name || currentProduct?.model || ""
          ),
          _category: product.category?.slug || 'products', // Generic fallback
          _categoryName: product.category?.name || category,
        }));

        // Sắp xếp theo điểm số, rating, và salesCount
        productsWithScore.sort((a, b) => {
          // Ưu tiên điểm liên quan
          if (b._relevanceScore !== a._relevanceScore) {
            return b._relevanceScore - a._relevanceScore;
          }

          // Sau đó là rating
          if ((b.averageRating || 0) !== (a.averageRating || 0)) {
            return (b.averageRating || 0) - (a.averageRating || 0);
          }

          // Cuối cùng là lượt bán
          if ((b.salesCount || 0) !== (a.salesCount || 0)) {
            return (b.salesCount || 0) - (a.salesCount || 0);
          }

          return 0;
        });

        // Lấy top 10 sản phẩm
        const topProducts = productsWithScore.slice(0, 10);

        console.log(
          "[SimilarProducts] Top products:",
          topProducts.map((p) => ({
            name: p.name,
            score: p._relevanceScore,
            rating: p.averageRating,
            sales: p.salesCount,
          }))
        );

        setSimilarProducts(topProducts);
      } catch (err) {
        console.error("[SimilarProducts] Error:", err);
        setError(err.message);
        setSimilarProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSimilarProducts();
  }, [productId, category, currentProduct]);

  const scroll = (direction) => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 300;
    const newPosition =
      direction === "left"
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;

    scrollContainerRef.current.scrollTo({
      left: newPosition,
      behavior: "smooth",
    });
    setScrollPosition(newPosition);
  };

  const handleProductClick = (product) => {
    console.log("[SimilarProducts] Product clicked:", {
      name: product.name,
      baseSlug: product.baseSlug,
    });

    if (!product.baseSlug) {
      console.warn("[SimilarProducts] Product missing baseSlug");
      return;
    }

    // Chọn variant đầu tiên có stock
    const selectedVariant =
      product.variants?.find((v) => v.stock > 0) || product.variants?.[0];
    const sku = selectedVariant?.sku;

    let url = `/${product._category}/${product.baseSlug}`;
    if (sku) {
      url += `?sku=${sku}`;
    }

    console.log("[SimilarProducts] Navigating to:", url);
    window.location.href = url;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    console.warn("[SimilarProducts] Error state:", error);
    return null;
  }

  // Empty state
  if (!similarProducts || similarProducts.length === 0) {
    console.log("[SimilarProducts] No similar products to display");
    return null;
  }

  return (
    <div className="py-8 bg-white rounded-lg">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Có thể bạn cũng thích
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => scroll("left")}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Products Carousel */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {similarProducts.map((product) => (
            <div
              key={product._id}
              className="flex-shrink-0 w-[280px] cursor-pointer"
              onClick={() => handleProductClick(product)}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Hide scrollbar */}
        <style>{`
          div::-webkit-scrollbar {
            display: none;
          }
        `}</style>
      </div>
    </div>
  );
};

export default SimilarProducts;
