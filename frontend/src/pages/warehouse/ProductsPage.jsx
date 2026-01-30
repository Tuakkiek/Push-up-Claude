// frontend/src/pages/warehouse/ProductsPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Search, Package } from "lucide-react";
import { productAPI, analyticsAPI } from "@/lib/api"; // Unified API
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
import JsonProductCreator from "@/components/shared/JsonProductCreator"; // ✅ NEW
import { useCategories } from "@/hooks/useCategories"; // New Hook

const ProductsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { categories, loading: loadingCategories } = useCategories();
  
  const [activeTab, setActiveTab] = useState(null); // Category Slug
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentMode, setCurrentMode] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [addMode, setAddMode] = useState("normal");
  const [showJsonForm, setShowJsonForm] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [showCSVImporter, setShowCSVImporter] = useState(false);
  const LIMIT = 12;

  // Set default tab when categories load
  useEffect(() => {
    if (categories.length > 0 && !activeTab) {
      setActiveTab(categories[0].slug);
    }
  }, [categories, activeTab]);

  const pagination = {
    currentPage: page,
    totalPages: Math.ceil(total / LIMIT),
    hasPrev: page > 1,
    hasNext: page < Math.ceil(total / LIMIT),
  };

  useEffect(() => {
    if (activeTab) {
      fetchProducts();
    }
  }, [activeTab, page, searchQuery]);

  // Reset page on tab/search change
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  // ============================================
  // FETCH PRODUCTS
  // ============================================
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      // API unified call
      const response = await productAPI.getAll({
        page,
        limit: LIMIT,
        search: searchQuery || undefined,
        category: activeTab, // Filter by category slug
        populate: 'category' // Ensure we get category details if needed
      });

      const data = response?.data?.data;
      if (!data) throw new Error("Không có dữ liệu");

      const productsList = data.products || [];
      const totalCount = data.total || productsList.length;

      // Tính top 10 mới nhất
      const sortedByDate = [...productsList].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      const top10NewIds = sortedByDate.slice(0, 10).map((p) => p._id);

      // Top 10 bán chạy (Optional - có thể bỏ nếu API nặng)
      let top10SellerIds = [];
      try {
        const res = await analyticsAPI.getTopSellers(activeTab, 10);
        top10SellerIds = res.data.data.map((s) => s.productId);
      } catch (err) {
        // console.warn("Top seller analytics fetch failed or skipped");
      }

      const productsWithFlags = productsList.map((p) => ({
        ...p,
        isTopNew: top10NewIds.includes(p._id),
        isTopSeller: top10SellerIds.includes(p._id),
      }));

      setProducts(productsWithFlags);
      setTotal(totalCount);

    } catch (error) {
      toast.error(error.response?.data?.message || "Lỗi tải sản phẩm");
      setProducts([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  };

  // CRUD OPERATIONS
  const handleCreate = (mode) => {
    if (mode === "full") {
      navigate("/admin/products/editor");
      return;
    }
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
    // Navigate to full page editor for editing
    navigate(`/admin/products/editor/${product._id}`);
    
    // Legacy modal edit (commented out or kept as fallback if needed)
    // setCurrentMode("edit");
    // setCurrentProduct(product);
    // setShowModal(true);
  };

  const handleDelete = async (productId) => {
    if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
    
    setIsLoading(true);
    try {
      await productAPI.delete(productId);
      toast.success("Xóa sản phẩm thành công");
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Xóa thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  // Get active category object for Schema
  const activeCategoryObject = useMemo(() => 
    categories.find(c => c.slug === activeTab), 
  [categories, activeTab]);

  const handleSubmitJson = async (e) => {
    // JSON logic logic needs update to use unified schema but keeping basic for now
    e.preventDefault();
    // Implementation omitted for brevity, logic remains similar but targeting unified API
    toast.info("Tính năng JSON đang được cập nhật");
  };

  if (loadingCategories) return <Loading />;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quản lý sản phẩm</h1>
          <p className="text-muted-foreground">
            Quản lý kho hàng và thông tin sản phẩm
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={addMode} onValueChange={setAddMode}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Chọn kiểu thêm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Bình thường (Modal)</SelectItem>
              <SelectItem value="full">Chi tiết (Full Page)</SelectItem>
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
        <TabsList className="flex w-full overflow-x-auto justify-start">
          {categories.map((cat) => (
            <TabsTrigger key={cat._id} value={cat.slug}>
              {cat.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* SEARCH */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Tìm kiếm tên, model, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <p className="text-sm text-muted-foreground">
            Tìm thấy <span className="font-semibold">{total}</span> sản phẩm
            {total > 0 && ` • Trang ${page} / ${pagination.totalPages}`}
          </p>
        </div>

        {/* PRODUCTS GRID */}
        {/* We use one TabsContent because we control content via state */}
        <div className="mt-6">
            {isLoading ? (
              <Loading />
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? "Không tìm thấy sản phẩm" : "Chưa có sản phẩm nào"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => {
                  const isAdmin = user?.role === "ADMIN" || user?.role === "WAREHOUSE_STAFF";
                  return (
                    <div key={product._id} className="relative group">
                      <ProductCard
                        product={product}
                        isTopNew={product.isTopNew}
                        isTopSeller={product.isTopSeller}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onUpdate={fetchProducts}
                        showVariantsBadge={true}
                        showAdminActions={isAdmin}
                      />
                    </div>
                  );
                })}
              </div>
            )}
        </div>

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
      </Tabs>

      {/* SHARED EDIT/CREATE MODAL */}
      {showModal && (
        <ProductEditModal
            open={showModal}
            onOpenChange={setShowModal}
            mode={currentMode}
            category={activeCategoryObject} // PASS FULL CATEGORY WITH SCHEMA
            product={currentProduct}
            onSave={(newId) => {
            fetchProducts();
            }}
        />
      )}

      {/* JSON PRODUCT CREATOR */}
      {showJsonForm && (
        <JsonProductCreator
            open={showJsonForm}
            onOpenChange={setShowJsonForm}
            defaultCategoryId={activeCategoryObject?._id}
            onSuccess={() => {
                fetchProducts();
                // Optional: set active tab to match created product if backend returns category
            }}
        />
      )}

      {/* CSV IMPORTER */}
      {showCSVImporter && activeCategoryObject && (
        <CSVImporter
          category={activeCategoryObject}
          api={productAPI}
          onSuccess={() => {
            setShowCSVImporter(false);
            fetchProducts();
          }}
        />
      )}
    </div>
  );
};

export default ProductsPage;
