// frontend/src/pages/admin/AdminDashboard.jsx
// ✅ UPDATED: Thêm tab "Nhân viên" để hiển thị KPI

import React, { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Box,
  ShoppingBag,
  Package,
  Gift,
  Users,
} from "lucide-react";

// Import các component con
import StatsCards from "@/components/admin/dashboard/StatsCards";
import RevenueCharts from "@/components/admin/dashboard/RevenueCharts";
import ProductCharts from "@/components/admin/dashboard/ProductCharts";
import InventoryCharts from "@/components/admin/dashboard/InventoryCharts";
import PromotionCharts from "@/components/admin/dashboard/PromotionCharts";
import OrderCharts from "@/components/admin/dashboard/OrderCharts";
import EmployeeKPICharts from "@/components/admin/dashboard/EmployeeKPICharts"; // ✅ NEW

// Import hook để fetch data
import { useDashboardData } from "@/hooks/useDashboardData";


const AdminDashboard = () => {
  const [timeRange, setTimeRange] = useState("30days");
  const [activeTab, setActiveTab] = useState("overview");
  const { stats, isLoading, error, refetch } = useDashboardData(timeRange);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard Tổng quan</h1>
          <p className="text-muted-foreground">
            Phân tích chi tiết về hoạt động kinh doanh
          </p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="7days">7 ngày qua</option>
          <option value="30days">30 ngày qua</option>
          <option value="3months">3 tháng qua</option>
          <option value="1year">1 năm qua</option>
        </select>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Tabs với các biểu đồ chi tiết */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Tổng quan
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <Box className="w-4 h-4 mr-2" />
            Kho hàng
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Đơn hàng
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="w-4 h-4 mr-2" />
            Sản phẩm
          </TabsTrigger>
          <TabsTrigger value="promotions">
            <Gift className="w-4 h-4 mr-2" />
            Khuyến mãi
          </TabsTrigger>
          {/* ✅ NEW TAB */}
          <TabsTrigger value="employees">
            <Users className="w-4 h-4 mr-2" />
            Nhân viên
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <RevenueCharts stats={stats} />
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <InventoryCharts stats={stats} />
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <OrderCharts stats={stats} />
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <ProductCharts stats={stats} />
        </TabsContent>

        {/* Promotions Tab */}
        <TabsContent value="promotions" className="space-y-6">
          <PromotionCharts stats={stats} />
        </TabsContent>

        {/* ✅ NEW: Employees Tab */}
        <TabsContent value="employees" className="space-y-6">
          <EmployeeKPICharts stats={stats} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
