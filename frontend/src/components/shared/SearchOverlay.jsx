// ============================================
// FILE: frontend/src/components/shared/SearchOverlay.jsx
// ✅ UPDATED: Logic Upgrade (Typo Fix + Smart Sort + Debounce) - UI Preserved
// ============================================
import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, ChevronRight } from "lucide-react";
import { productAPI } from "@/lib/api";
// ============================================
// 1. TYPO DICTIONARY & HELPER
// ============================================
const TYPO_MAPPINGS = {
  // iPhone
  ip: "iphone",
  ifone: "iphone",
  iphon: "iphone",
  iphoen: "iphone",
  ipone: "iphone",
  "ai phôn": "iphone",
  "dt ip": "iphone",
  ip15: "iphone 15",
  ip14: "iphone 14",
  ip13: "iphone 13",
  "15pm": "iphone 15 pro max",

  // THÊM MỚI - Các biến thể phổ biến
  plus: "plus",
  pls: "plus",
  pluss: "plus",
  pro: "pro",
  promax: "pro max",
  "pro max": "pro max",
  max: "max",
  mini: "mini",

  // Màu sắc
  den: "đen",
  trang: "trắng",
  xanh: "xanh",
  do: "đỏ",
  tim: "tím",
  hong: "hồng",

  // Dung lượng
  "128gb": "128gb",
  "256gb": "256gb",
  "512gb": "512gb",
  "1tb": "1tb",

  // iPad
  iapd: "ipad",
  pad: "ipad",
  taplet: "ipad",
  "may tinh bang": "ipad",
  air: "air",

  // Mac
  mac: "macbook",
  macbok: "macbook",
  macboo: "macbook",
  "lap top": "macbook",
  mb: "macbook",
  mba: "macbook air",
  mbp: "macbook pro",

  // AirPods
  airpod: "airpods",
  aripod: "airpods",
  "tai nghe": "airpods",
  ap2: "airpods 2",
  ap3: "airpods 3",

  // Watch
  wach: "apple watch",
  wacth: "apple watch",
  "dong ho": "apple watch",
  aw: "apple watch",

  // Accessories
  sac: "sạc",
  cap: "cáp",
  "op lung": "ốp lưng",
  chuot: "chuột",
  "ban phim": "bàn phím",
};
const correctTypos = (input) => {
  if (!input) return "";
  let corrected = input.toLowerCase().trim();
  // Check khớp từ chính xác
  if (TYPO_MAPPINGS[corrected]) return TYPO_MAPPINGS[corrected];
  // Check thay thế từ trong câu
  Object.keys(TYPO_MAPPINGS).forEach((key) => {
    const regex = new RegExp(`\\b${key}\\b`, "gi");
    if (regex.test(corrected)) {
      corrected = corrected.replace(regex, TYPO_MAPPINGS[key]);
    }
  });
  return corrected;
};
/**
 * Tách query thành các tokens có ý nghĩa
 */
const tokenizeQuery = (query) => {
  if (!query) return [];

  const corrected = correctTypos(query);
  const tokens = corrected.toLowerCase().trim().split(/\s+/);

  // Lọc bỏ stop words
  const stopWords = ["the", "a", "an", "and", "or", "của", "cho", "với", "và"];
  return tokens.filter(
    (token) => !stopWords.includes(token) && token.length > 0
  );
};
// ============================================
// 2. RELEVANCE SCORING - THAY THẾ HOÀN TOÀN
// ============================================
const calculateRelevanceScore = (productName, query) => {
  const name = productName.toLowerCase();
  const queryTokens = tokenizeQuery(query);

  if (queryTokens.length === 0) return 0;

  let score = 0;
  let matchedTokens = 0;

  // Khớp chính xác toàn bộ query
  if (name === query.toLowerCase()) {
    return 100;
  }

  // Tính điểm cho từng token
  queryTokens.forEach((token) => {
    // Khớp chính xác từ độc lập (word boundary)
    const wordBoundaryRegex = new RegExp(`\\b${token}\\b`, "i");
    if (wordBoundaryRegex.test(name)) {
      matchedTokens++;
      score += 30; // Điểm cao cho khớp chính xác

      // Thêm điểm nếu token xuất hiện ở đầu
      if (name.startsWith(token)) {
        score += 15;
      }
    }
    // Khớp một phần từ
    else if (name.includes(token)) {
      matchedTokens++;
      score += 15; // Điểm thấp hơn cho khớp một phần
    }
  });

  // Tính tỷ lệ khớp
  const matchRatio = matchedTokens / queryTokens.length;

  // Thêm điểm bonus nếu khớp nhiều từ
  if (matchRatio >= 0.8) {
    score += 20;
  } else if (matchRatio >= 0.5) {
    score += 10;
  }

  // Thêm điểm nếu query xuất hiện liên tiếp trong name
  if (name.includes(query.toLowerCase())) {
    score += 25;
  }

  // Penalty nếu tên sản phẩm quá dài so với query
  const lengthDiff = Math.abs(name.length - query.length);
  if (lengthDiff > 20) {
    score -= 5;
  }

  return Math.min(score, 100); // Cap tối đa 100 điểm
};

// ============================================
// CATEGORY CONFIG (Increased Limits)
// ============================================
// CATEGORIES CONFIG REMOVED
const QUICK_LINKS = [
  { name: "iPhone", path: "/dien-thoai" },
  { name: "iPad", path: "/may-tinh-bang" },
  { name: "Mac", path: "/macbook" },
  { name: "AirPods", path: "/tai-nghe" },
  { name: "Apple Watch", path: "/apple-watch" },
];
// ============================================
// SEARCH SERVICE (Updated Logic)
// ============================================
const searchProducts = async (rawQuery) => {
  if (!rawQuery?.trim()) return [];

  const correctedQuery = correctTypos(rawQuery);
  // const queryTokens = tokenizeQuery(correctedQuery);

  try {
    // Single Global Search
    const response = await productAPI.getAll({
        search: correctedQuery,
        limit: 20
    });
    
    let products = response.data?.data?.products || [];

    // Calculate Scores locally for frontend display sorting (optional if backend sorts by score)
    const results = products.map((product) => ({
      ...product,
      // Generic category route if populated, else 'products'
      _category: product.category?.slug || 'products',
      _categoryName: product.category?.name || 'Sản phẩm',
      _score: calculateRelevanceScore(
        product.name || product.model,
        correctedQuery
      ),
    }));

    // Sắp xếp theo điểm số (Cao -> Thấp)
    results.sort((a, b) => b._score - a._score);

    // Lấy 10 kết quả tốt nhất
    return results.slice(0, 10);
  } catch (error) {
    console.error("❌ Search error:", error);
    return [];
  }
};
// ============================================
// SEARCH RESULT ITEM COMPONENT (UI Unchanged)
// ============================================
const SearchResultItem = ({ product, category, onClose }) => {
  const navigate = useNavigate();
  const firstVariant =
    product.variants?.find((v) => v.stock > 0) || product.variants?.[0];
  const displayImage = firstVariant?.images?.[0] || product.images?.[0];
  const displayPrice = firstVariant?.price || product.price || 0;

  const getProductPath = () => {
    if (firstVariant?.slug && firstVariant?.sku) {
      return `/${category}/${firstVariant.slug}?sku=${firstVariant.sku}`;
    }
    return `/${category}/${product.baseSlug || product.slug}`;
  };

  const handleClick = () => {
    const path = getProductPath();
    navigate(path);
    onClose();
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-4 p-3 bg-gray-900/30 rounded-lg hover:bg-gray-900/50 transition-all text-left w-full group"
    >
      <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <Search className="w-6 h-6 text-gray-500" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        {/* THAY ĐỔI Ở ĐÂY - Thêm highlight */}
        <h4
          className="text-white font-medium text-sm group-hover:text-blue-400 transition-colors truncate"
          dangerouslySetInnerHTML={{
            __html: highlightMatch(
              product.model || product.name,
              product._searchQuery || ""
            ),
          }}
        />
        <p className="text-blue-400 text-sm font-semibold mt-1">
          {new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
          }).format(displayPrice)}
        </p>
      </div>
      <div className="text-gray-600 group-hover:text-blue-400 transition-colors">
        →
      </div>
    </button>
  );
};
// ============================================
// HELPER FUNCTION FOR HIGHLIGHT
// ============================================
// THÊM MỚI - Highlight function
const highlightMatch = (text, query) => {
  const tokens = tokenizeQuery(query);
  let highlighted = text;

  tokens.forEach((token) => {
    const regex = new RegExp(`(${token})`, "gi");
    highlighted = highlighted.replace(
      regex,
      '<mark class="bg-blue-500/20 text-blue-400 px-0.5 rounded">$1</mark>'
    );
  });

  return highlighted;
};
// ============================================
// MAIN SEARCH OVERLAY COMPONENT
// ============================================
const SearchOverlay = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);
  // Handle View All Navigation
  const handleViewAll = () => {
    const corrected = correctTypos(searchQuery);
    if (corrected) {
      navigate(`/tim-kiem?s=${encodeURIComponent(corrected)}`);
      onClose();
    }
  };
  // Debounce Effect (500ms)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    // Set loading immediately when typing starts
    setIsSearching(true);
    const delaySearch = setTimeout(async () => {
      if (isOpen) {
        try {
          const results = await searchProducts(searchQuery);
          setSearchResults(results);
        } catch (error) {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }
    }, 500); // Chờ 500ms
    return () => clearTimeout(delaySearch);
  }, [searchQuery, isOpen]);
  // Auto Focus
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);
  // Keyboard Shortcuts (Updated with Enter)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
      if (e.key === "Enter" && isOpen) {
        handleViewAll();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, searchQuery]);
  // Reset on Close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [isOpen]);
  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />
      {/* Search Container */}
      <div
        className={`absolute top-0 left-0 right-0 bg-black shadow-2xl transform transition-all duration-500 ease-out ${
          isOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="relative z-10">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Search Input */}
            <div className="relative mb-8">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Tìm kiếm sản phẩm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-900/50 text-gray-300 rounded-lg py-4 pl-12 pr-6 focus:outline-none focus:bg-gray-900 placeholder-gray-500 transition-colors"
                  />
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            {/* Quick Links */}
            {!searchQuery && (
              <div className="mb-8">
                <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4">
                  Danh mục sản phẩm
                </h3>
                <div className="space-y-1">
                  {QUICK_LINKS.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={onClose}
                      className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors py-2.5 px-2 rounded-lg hover:bg-gray-900/30 group"
                    >
                      <span className="text-gray-600 group-hover:text-blue-500 transition-colors text-sm">
                        →
                      </span>
                      <span className="text-sm">{link.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {/* Search Results */}
            {searchQuery && (
              <div>
                <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4">
                  {isSearching
                    ? "Đang tìm kiếm..."
                    : `Kết quả cho "${correctTypos(searchQuery)}"`}
                </h3>
                {isSearching ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    <div className="mb-4 flex justify-between items-center">
                      <p className="text-sm text-gray-400">
                        Tìm thấy {searchResults.length} sản phẩm
                      </p>
                      <button
                        onClick={handleViewAll}
                        className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                      >
                        Xem tất cả kết quả
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {searchResults.map((product) => (
                        <SearchResultItem
                          key={product._id}
                          product={{ ...product, _searchQuery: searchQuery }}
                          category={product._category}
                          onClose={onClose}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">
                      Không tìm thấy sản phẩm phù hợp với "{searchQuery}"
                    </p>
                    <p className="text-gray-600 text-xs mt-2">
                      Thử tìm kiếm với từ khóa khác
                    </p>
                  </div>
                )}
                {/* Suggestions when no results */}
                {searchQuery && searchResults.length === 0 && !isSearching && (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm mb-4">
                      Không tìm thấy sản phẩm phù hợp với "{searchQuery}"
                    </p>

                    {/* THÊM SUGGESTIONS */}
                    <div className="mt-6">
                      <p className="text-xs text-gray-500 mb-3">
                        Gợi ý tìm kiếm:
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[
                          "iPhone 15 Pro",
                          "iPhone 15 Plus",
                          "iPad Pro",
                          "MacBook Air",
                          "AirPods Pro",
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => setSearchQuery(suggestion)}
                            className="px-3 py-1.5 bg-gray-900/30 hover:bg-gray-900/50 rounded-full text-xs text-gray-400 hover:text-white transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default SearchOverlay;
