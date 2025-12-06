// frontend/src/pages/warehouse/ProductsPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Search, Package } from "lucide-react";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";
import { analyticsAPI } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loading } from "@/components/shared/Loading";
import ProductCard from "@/components/shared/ProductCard";
import ProductEditModal from "@/components/shared/ProductEditModal";
import CSVImporter from "@/components/shared/CSVImporter";
import { Label } from "@/components/ui/label";
import { isFixedCategory } from "@/lib/categoryHelpers";
import {
  extractProductsArray,
  extractTotal,
  debugAPIResponse,
} from "@/lib/apiDebugHelper";

// ============================================
// API MAPPING - FIXED CATEGORIES ONLY
// ============================================
const FIXED_API_MAP = {
  iPhone: iPhoneAPI,
  iPad: iPadAPI,
  Mac: macAPI,
  AirPods: airPodsAPI,
  AppleWatch: appleWatchAPI,
  Accessories: accessoryAPI,
};

// ✅ DYNAMIC API CREATOR
const createDynamicAPI = (categorySlug) => {
  const BASE_URL = import.meta.env.VITE_API_URL || "/api";

  const getToken = () => {
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        return state?.token;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  });

  return {
    async getAll(params) {
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(
        `${BASE_URL}/categories/${categorySlug}/products?${queryString}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
    async create(data) {
      const response = await fetch(
        `${BASE_URL}/categories/${categorySlug}/products`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error("Failed to create product");
      return response.json();
    },
    async update(id, data) {
      const response = await fetch(
        `${BASE_URL}/categories/${categorySlug}/products/${id}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) throw new Error("Failed to update product");
      return response.json();
    },
    async delete(id) {
      const response = await fetch(
        `${BASE_URL}/categories/${categorySlug}/products/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) throw new Error("Failed to delete product");
      return response.json();
    },
  };
};

const ProductsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const categoryFromUrl = searchParams.get("category");
  const [activeTab, setActiveTab] = useState(categoryFromUrl || "iPhone");

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentMode, setCurrentMode] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [justCreatedProductId, setJustCreatedProductId] = useState(null);
  const [addMode, setAddMode] = useState("normal");
  const [showJsonForm, setShowJsonForm] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [showCSVImporter, setShowCSVImporter] = useState(false);

  const LIMIT = 12;

  const pagination = {
    currentPage: page,
    totalPages: Math.ceil(total / LIMIT),
    hasPrev: page > 1,
    hasNext: page < Math.ceil(total / LIMIT),
  };

  // ✅ Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // ✅ Update activeTab when URL changes
  useEffect(() => {
    if (categoryFromUrl && categories.some((c) => c.slug === categoryFromUrl)) {
      setActiveTab(categoryFromUrl);
    }
  }, [categoryFromUrl, categories]);

  useEffect(() => {
    if (categories.length > 0) {
      fetchProducts();
    }
  }, [activeTab, page, searchQuery, justCreatedProductId, categories]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  // ✅ Load categories from API
  const loadCategories = async () => {
    console.log("📥 Loading categories...");
    setLoadingCategories(true);
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();

      if (data.success) {
        const activeCats = data.data.categories
          .filter((cat) => cat.active)
          .map((cat) => ({
            value: cat.name,
            label: cat.name,
            slug: cat.slug,
            isFixed: isFixedCategory(cat.name),
          }));

        console.log("✅ Categories loaded:", activeCats);
        setCategories(activeCats);

        if (!activeTab && activeCats.length > 0) {
          setActiveTab(activeCats[0].value);
        }
      }
    } catch (error) {
      console.error("❌ Load categories error:", error);
      toast.error("Lỗi khi tải danh sách category");
    } finally {
      setLoadingCategories(false);
    }
  };

  // ✅ Get API based on category (fixed or dynamic)
  const getAPI = () => {
    const currentCategory = categories.find((c) => c.value === activeTab);
    if (!currentCategory) {
      console.error("❌ Category not found:", activeTab);
      return null;
    }

    console.log("🔍 Getting API for:", {
      category: activeTab,
      isFixed: currentCategory.isFixed,
      slug: currentCategory.slug,
    });

    // Use fixed API for fixed categories
    if (currentCategory.isFixed) {
      console.log("✅ Using FIXED API");
      return FIXED_API_MAP[activeTab];
    }

    // Use dynamic API for new categories
    console.log("✅ Using DYNAMIC API with slug:", currentCategory.slug);
    return createDynamicAPI(currentCategory.slug);
  };

  // ============================================
  // FETCH PRODUCTS - ✅ IMPROVED WITH DEBUG HELPER
  // ============================================
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const api = getAPI();
      if (!api?.getAll) {
        throw new Error("API không hợp lệ");
      }

      const response = await api.getAll({
        page,
        limit: LIMIT,
        search: searchQuery || undefined,
      });

      // ✅ DEBUG RESPONSE
      debugAPIResponse(`GET /categories/${activeTab}/products`, response, {
        requireSuccess: true,
        requireData: true,
        requiredFields: ["products", "total"],
      });

      // ✅ CHECK SUCCESS FLAG
      if (response.success === false) {
        throw new Error(response.message || "Không thể tải sản phẩm");
      }

      // ✅ USE HELPER TO EXTRACT DATA
      const productsList = extractProductsArray(response);
      const totalCount = extractTotal(response, true);

      console.log("✅ Extracted:", {
        products: productsList.length,
        total: totalCount,
      });

      const sortedByDate = [...productsList].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      const top10NewIds = sortedByDate.slice(0, 10).map((p) => p._id);

      let top10SellerIds = [];
      try {
        const res = await analyticsAPI.getTopSellers(activeTab, 10);
        top10SellerIds = res.data.data.map((s) => s.productId);
      } catch (err) {
        console.warn("Top seller không có dữ liệu");
      }

      const productsWithFlags = productsList.map((p) => ({
        ...p,
        isTopNew: top10NewIds.includes(p._id),
        isTopSeller: top10SellerIds.includes(p._id),
        category: activeTab,
      }));

      setProducts(productsWithFlags);
      setTotal(totalCount);

      if (justCreatedProductId) {
        const newProduct = productsWithFlags.find(
          (p) => p._id === justCreatedProductId
        );
        if (newProduct) {
          handleEdit(newProduct);
          setJustCreatedProductId(null);
        }
      }
    } catch (error) {
      console.error("❌ Fetch products error:", error);
      toast.error(error.message || "Lỗi tải sản phẩm");
      setProducts([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const handleCreate = (mode) => {
    setAddMode(mode);
    if (mode === "json") {
      setJsonInput("");
      setShowJsonForm(true);
    } else if (mode === "csv") {
      setShowCSVImporter(true);
    } else {
      setCurrentMode("create");
      setCurrentProduct(null);
      setShowModal(true);
    }
  };

  const handleEdit = (product) => {
    setCurrentMode("edit");
    setCurrentProduct(product);
    setShowModal(true);
  };

  const handleDelete = async (productId) => {
    if (!productId) {
      console.error("❌ Product ID is missing");
      toast.error("Không thể xóa: ID sản phẩm không hợp lệ");
      return;
    }

    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) {
      return;
    }

    setIsLoading(true);
    try {
      const api = getAPI();
      if (!api || !api.delete) {
        throw new Error(`API for ${activeTab} is not properly configured`);
      }

      console.log(`✅ Deleting product ID: ${productId}`);
      await api.delete(productId);
      toast.success("Xóa sản phẩm thành công");

      if (products.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchProducts();
      }
    } catch (error) {
      console.error("❌ Delete error:", error);
      toast.error(error.message || "Xóa sản phẩm thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const getCreatedBy = () => {
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        return state?.user?._id || state?.user?.id;
      } catch (error) {
        console.error("❌ Error parsing auth-storage:", error);
      }
    }
    return null;
  };

  const handleSubmitJson = async (e) => {
    e.preventDefault();

    let payload;
    try {
      const rawData = JSON.parse(jsonInput);

      payload = {
        ...rawData,
        createdBy: getCreatedBy(),
        category: activeTab,
        condition: rawData.condition || "NEW",
        status: rawData.status || "AVAILABLE",
        installmentBadge: rawData.installmentBadge || "NONE",
      };

      if (!payload.name?.trim()) throw new Error("Tên sản phẩm bắt buộc");
      if (!payload.model?.trim()) throw new Error("Model bắt buộc");
      if (!payload.variants?.length) throw new Error("Cần ít nhất 1 variant");

      console.log("✅ JSON PAYLOAD:", JSON.stringify(payload, null, 2));
    } catch (error) {
      toast.error("JSON không hợp lệ: " + error.message);
      return;
    }

    setIsLoading(true);
    try {
      const api = getAPI();
      const response = await api.create(payload);
      const newId = response?.data?._id || response?.data?.id;
      toast.success("Tạo sản phẩm thành công!");
      setShowJsonForm(false);
      setJustCreatedProductId(newId);
      fetchProducts();
    } catch (error) {
      console.error("❌ ERROR:", error);
      toast.error(error.message || "Lưu sản phẩm thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.model?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loadingCategories) {
    return <Loading />;
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý sản phẩm</h1>
          <p className="text-muted-foreground">
            Quản lý sản phẩm theo từng danh mục ({categories.length} categories)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={addMode} onValueChange={setAddMode}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Chọn kiểu thêm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Bình thường</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
              <SelectItem value="csv">CSV</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => handleCreate(addMode)}>
            <Plus className="w-4 h-4 mr-2" /> Thêm sản phẩm
          </Button>
        </div>
      </div>

      {/* CATEGORY TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${categories.length}, 1fr)` }}
        >
          {categories.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              {cat.label}
              {!cat.isFixed && (
                <span className="ml-1 text-xs opacity-60">*</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* SEARCH */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tên hoặc model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Tìm thấy <span className="font-semibold">{total}</span> sản phẩm
            {total > 0 && ` • Trang ${page} / ${Math.ceil(total / LIMIT)}`}
          </p>
        </div>

        {/* PRODUCTS GRID */}
        {categories.map((cat) => (
          <TabsContent key={cat.value} value={cat.value}>
            {isLoading ? (
              <Loading />
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Không tìm thấy sản phẩm"
                    : "Chưa có sản phẩm nào"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                  const isAdmin =
                    user?.role === "ADMIN" || user?.role === "WAREHOUSE_STAFF";

                  return (
                    <div key={product._id} className="relative group">
                      <ProductCard
                        product={product}
                        isTopNew={product.isTopNew}
                        isTopSeller={product.isTopSeller}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onUpdate={() => fetchProducts()}
                        showVariantsBadge={true}
                        showAdminActions={isAdmin}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* PAGINATION */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-8 mt-12">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1 || isLoading}
                  onClick={() => setPage(page - 1)}
                >
                  Trước
                </Button>

                <div className="text-sm font-medium min-w-[140px] text-center">
                  Trang {pagination.currentPage} / {pagination.totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === pagination.totalPages || isLoading}
                  onClick={() => setPage(page + 1)}
                >
                  Sau
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* MODALS */}
      {showJsonForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-6xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Thêm sản phẩm mới bằng JSON - {activeTab}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowJsonForm(false)}
              >
                ✕
              </Button>
            </div>

            <form onSubmit={handleSubmitJson}>
              <div className="p-6">
                <div className="space-y-2">
                  <Label>Nhập JSON sản phẩm</Label>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    rows={20}
                    className="w-full px-3 py-2 border rounded-md font-mono"
                    placeholder="Nhập JSON ở đây..."
                  />
                </div>
              </div>

              <div className="p-6 border-t flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowJsonForm(false)}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Đang lưu..." : "Tạo mới"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCSVImporter && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">
                Import từ CSV - {activeTab}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCSVImporter(false)}
              >
                ✕
              </Button>
            </div>

            <CSVImporter
              category={activeTab}
              api={getAPI()}
              onSuccess={() => {
                setShowCSVImporter(false);
                fetchProducts();
              }}
            />
          </div>
        </div>
      )}

      <ProductEditModal
        open={showModal}
        onOpenChange={setShowModal}
        mode={currentMode}
        category={activeTab}
        product={currentProduct}
        onSave={(newId) => {
          fetchProducts();
          if (currentMode === "create" && newId) {
            setJustCreatedProductId(newId);
          }
        }}
      />
    </div>
  );
};

export default ProductsPage;
