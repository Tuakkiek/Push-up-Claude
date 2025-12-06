// frontend/src/pages/HomePage.jsx - FIXED VERSION
import React, { useEffect, useState, useCallback } from "react";
import { Loading } from "@/components/shared/Loading";
import DynamicSection from "@/components/homepage/DynamicSection";
import ProductEditModal from "@/components/shared/ProductEditModal";
import { useAuthStore } from "@/store/authStore";
import { homePageAPI } from "@/lib/api";
import {
  iPhoneAPI,
  iPadAPI,
  macAPI,
  airPodsAPI,
  appleWatchAPI,
  accessoryAPI,
} from "@/lib/api";
import { toast } from "sonner";

const API_MAP = {
  iPhone: iPhoneAPI,
  iPad: iPadAPI,
  Mac: macAPI,
  AirPods: airPodsAPI,
  AppleWatch: appleWatchAPI,
  Accessories: accessoryAPI,
};

const HomePage = () => {
  const { isAuthenticated, user } = useAuthStore();

  const [layout, setLayout] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const isAdmin =
    isAuthenticated &&
    ["ADMIN", "WAREHOUSE_STAFF", "ORDER_MANAGER"].includes(user?.role);

  // ============================================
  // FETCH HOMEPAGE LAYOUT
  // ============================================
  const fetchLayout = useCallback(async () => {
    try {
      const response = await homePageAPI.getLayout();
      const layoutData = response.data?.data?.layout;
      setLayout(layoutData);
    } catch (error) {
      console.error("Error fetching layout:", error);
      toast.error("Không thể tải cấu hình trang chủ");
    }
  }, []);

  // ============================================
  // ✅ FIXED: FETCH ALL PRODUCTS USING AGGREGATOR
  // ============================================
  const fetchAllProducts = useCallback(async () => {
    try {
      console.log("📥 Fetching all products via aggregator...");

      // ✅ USE AGGREGATOR API
      const response = await fetch("/api/products-aggregator/all?limit=1000");
      const data = await response.json();

      console.log("📦 Aggregator Response:", {
        success: data.success,
        productsCount: data.data?.products?.length,
        total: data.data?.total,
      });

      if (data.success && data.data?.products) {
        console.log("✅ Products loaded:", data.data.products.length);
        setAllProducts(data.data.products);
      } else {
        console.error("❌ Unexpected response structure:", data);
        toast.error(data.message || "Không thể tải sản phẩm");
        setAllProducts([]);
      }
    } catch (err) {
      console.error("❌ Error loading products:", err);
      toast.error("Không thể tải dữ liệu sản phẩm");
      setAllProducts([]);
    }
  }, []);

  // ============================================
  // INITIAL LOAD
  // ============================================
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchLayout(), fetchAllProducts()]);
      setIsLoading(false);
    };

    loadData();
  }, [fetchLayout, fetchAllProducts]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const handleDelete = async (productId, category) => {
    const api = API_MAP[category];
    if (!api?.delete) {
      toast.error("Không hỗ trợ xóa sản phẩm này");
      return;
    }

    try {
      await api.delete(productId);
      toast.success("Xóa sản phẩm thành công");
      fetchAllProducts(); // Reload products
    } catch (error) {
      toast.error(error.response?.data?.message || "Xóa sản phẩm thất bại");
    }
  };

  const handleSaveProduct = () => {
    fetchAllProducts(); // Reload products after edit
  };

  // ============================================
  // RENDER
  // ============================================
  if (isLoading) {
    return <Loading />;
  }

  // Sort sections by order
  const sortedSections =
    layout?.sections
      ?.filter((s) => s.enabled)
      ?.sort((a, b) => a.order - b.order) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {sortedSections.length > 0 ? (
        sortedSections.map((section) => (
          <DynamicSection
            key={section.id}
            section={section}
            allProducts={allProducts}
            isAdmin={isAdmin}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-gray-500 text-lg">Chưa có cấu hình trang chủ</p>
            {isAdmin && (
              <p className="text-sm text-gray-400 mt-2">
                Vào trang quản lý để thiết lập giao diện
              </p>
            )}
          </div>
        </div>
      )}

      {/* Product Edit Modal */}
      <ProductEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        mode="edit"
        product={editingProduct}
        onSave={handleSaveProduct}
      />
    </div>
  );
};

export default HomePage;
