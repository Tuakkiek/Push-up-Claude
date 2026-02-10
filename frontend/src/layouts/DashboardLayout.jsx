// ============================================
// FILE: src/layouts/DashboardLayout.jsx
// ✅ UPDATED: Thêm menu cho POS_STAFF và CASHIER
// ============================================
import React from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingBag,
  Tag,
  Truck,
  LogOut,
  Menu,
  X,
  Receipt,
  FileText,
  TrendingUp,
  History,
  Video,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Layout } from "lucide-react";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // ============================================
  // MENU ITEMS THEO ROLE - ✅ CẬP NHẬT
  // ============================================
  const getNavigationItems = () => {
    const items = [];

    if (user?.role === "ADMIN") {
      items.push(
        { path: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { path: "/admin/employees", icon: Users, label: "Quản lý nhân viên" },
        { path: "/admin/product-types", icon: Layers, label: "Loại sản phẩm" },
        { path: "/admin/promotions", icon: Tag, label: "Khuyến mãi" },
        { path: "/admin/homepage-editor", icon: Layout, label: "Giao diện trang chủ" },
        { path: "/admin/short-videos", icon: Video, label: "Video ngắn" },
        { path: "/warehouse/products", icon: Package, label: "Sản phẩm" },
        { path: "/order-manager/orders", icon: ShoppingBag, label: "Đơn hàng" },
        { path: "/shipper/dashboard", icon: Truck, label: "Giao hàng" },
        { path: "/pos/dashboard", icon: Receipt, label: "POS - Bán hàng" },

        // ✅ THÊM 2 DÒNG NÀY
        { path: "/pos/orders", icon: History, label: "Lịch sử POS" },
        {
          path: "/CASHIER/vat-invoices",
          icon: FileText,
          label: "Hóa đơn",
        },

        { path: "/CASHIER/dashboard", icon: TrendingUp, label: "Thu ngân" }
      );
    } else if (user?.role === "WAREHOUSE_STAFF") {
      items.push({
        path: "/warehouse/products",
        icon: Package,
        label: "Quản lý sản phẩm",
      });
    } else if (user?.role === "ORDER_MANAGER") {
      items.push({
        path: "/order-manager/orders",
        icon: ShoppingBag,
        label: "Quản lý đơn hàng",
      });
    } else if (user?.role === "SHIPPER") {
      items.push({
        path: "/shipper/dashboard",
        icon: Truck,
        label: "Giao hàng",
      });
    }
    // ✅ MỚI: POS_STAFF MENU
    else if (user?.role === "POS_STAFF") {
      items.push(
        {
          path: "/pos/dashboard",
          icon: Receipt,
          label: "Bán hàng",
        },
        {
          path: "/pos/orders",
          icon: History,
          label: "Lịch sử đơn hàng",
        }
      );
    }
    // ✅ MỚI: CASHIER MENU
    else if (user?.role === "CASHIER") {
      items.push(
        {
          path: "/CASHIER/dashboard",
          icon: TrendingUp,
          label: "Doanh thu",
        },
        {
          path: "/CASHIER/vat-invoices",
          icon: FileText,
          label: "Hóa đơn",
        }
      );
    }

    return items;
  };

  const navigationItems = getNavigationItems();

  // ============================================
  // HIỂN thị tên vai trò tiếng Việt
  // ============================================
  const getRoleLabel = (role) => {
    const roleMap = {
      ADMIN: "Quản trị viên",
      WAREHOUSE_STAFF: "Nhân viên kho",
      ORDER_MANAGER: "Quản lý đơn hàng",
      SHIPPER: "Nhân viên giao hàng",
      POS_STAFF: "Nhân viên bán hàng", // ✅ MỚI
      CASHIER: "Thu ngân", // ✅ MỚI
    };
    return roleMap[role] || role;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo + Close Button (Mobile) */}
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <Link to="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl">Trang chủ</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const Icon = item.icon;

              // ✅ LOGIC KIỂM TRA ACTIVE
              let isActive = false;

              if (item.path === "/admin") {
                isActive =
                  location.pathname === "/admin" ||
                  location.pathname === "/admin/dashboard";
              } else if (item.path === "/shipper/dashboard") {
                isActive =
                  location.pathname === "/shipper/dashboard" ||
                  location.pathname === "/shipper";
              } else if (item.path === "/pos/dashboard") {
                // POS Dashboard active khi ở /pos/dashboard
                isActive = location.pathname === "/pos/dashboard";
              } else if (item.path === "/CASHIER/dashboard") {
                // CASHIER Dashboard active khi ở /CASHIER/dashboard
                isActive = location.pathname === "/CASHIER/dashboard";
              } else {
                // Các trang khác dùng startsWith để highlight cả trang con
                isActive = location.pathname.startsWith(item.path);
              }

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Info + Logout */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {getRoleLabel(user?.role)}
                </p>
              </div>

              {/* XÁC NHẬN ĐĂNG XUẤT */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Đăng xuất</span>
                  </Button>
                </AlertDialogTrigger>

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Bạn có chắc chắn muốn đăng xuất?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng hệ thống.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLogout}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Đăng xuất
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b flex items-center px-4 bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="ml-4 font-semibold">Dashboard</span>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
