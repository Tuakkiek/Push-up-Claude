// frontend/src/pages/HomePage.jsx
// ✅ FIX: Use new aggregator API

import React, { useEffect, useState, useCallback } from "react";
import { Loading } from "@/components/shared/Loading";
import DynamicSection from "@/components/homepage/DynamicSection";
import ProductEditModal from "@/components/shared/ProductEditModal";
import { useAuthStore } from "@/store/authStore";
import { homePageAPI } from "@/lib/api";
import { toast } from "sonner";

const API_MAP = {
  iPhone: "iphones",
  iPad: "ipads",
  Mac: "macs",
  AirPods: "airpods",
  AppleWatch: "applewatches",
  Accessories: "accessories",
};

const HomePage = () => {
  const { isAuthenticated, user } = useAuthStore();

  const [layout, setLayout] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const isAdmin =
    isAuthenticated &&
    ["ADMIN", "WAREHOUSE_STAFF", "ORDER_MANAGER"].includes(user?.role);

  // ✅ FETCH HOMEPAGE LAYOUT
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

  // ✅ FETCH ALL PRODUCTS - USE AGGREGATOR API
  const fetchAllProducts = useCallback(async () => {
    try {
      console.log("📥 Fetching all products...");

      // ✅ USE NEW AGGREGATOR API
      const response = await fetch("/api/products-aggregator/all?limit=1000");
      const data = await response.json();

      console.log("📦 Response:", data);

      if (data.success) {
        console.log("✅ Products loaded:", data.data.products.length);
        setAllProducts(data.data.products);
      } else {
        console.error("❌ Failed to load products:", data.message);
        toast.error(data.message || "Không thể tải sản phẩm");
      }
    } catch (err) {
      console.error("❌ Error loading products:", err);
      toast.error("Không thể tải dữ liệu sản phẩm");
    }
  }, []);

  // ✅ INITIAL LOAD
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchLayout(), fetchAllProducts()]);
      setIsLoading(false);
    };

    loadData();
  }, [fetchLayout, fetchAllProducts]);

  // ✅ HANDLERS
  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowEditModal(true);
  };

  const handleDelete = async (productId, category) => {
    const apiEndpoint = API_MAP[category];
    if (!apiEndpoint) {
      toast.error("Không hỗ trợ xóa sản phẩm này");
      return;
    }

    try {
      const token = localStorage.getItem("auth-storage")
        ? JSON.parse(localStorage.getItem("auth-storage")).state?.token
        : null;

      const response = await fetch(`/api/${apiEndpoint}/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Xóa sản phẩm thành công");
        fetchAllProducts();
      } else {
        throw new Error("Xóa thất bại");
      }
    } catch (error) {
      toast.error(error.message || "Xóa sản phẩm thất bại");
    }
  };

  const handleSaveProduct = () => {
    fetchAllProducts();
  };

  if (isLoading) {
    return <Loading />;
  }

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
