// ============================================
// FILE: frontend/src/pages/pos-staff/POSDashboard.jsx
// ✅ V3: Fixed - Chọn sản phẩm → Tạo đơn → Chuyển Thu ngân
// ============================================

import React, { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/store/authStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  ShoppingCart,
  Plus,
  Trash2,
  User,
  ArrowRight,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ProductVariantSelector from "@/components/product/ProductVariantSelector";
import {
  productAPI,
  promotionAPI,
  posAPI,
} from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PersonalStatsWidget from "@/components/employee/PersonalStatsWidget";

const POSDashboard = () => {
  const { user } = useAuthStore();
  // ============================================
  // STATE
  // ============================================
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("iPhone");
  const [isLoading, setIsLoading] = useState(false);

  // Cart state
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Product selection dialog
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);

  // Promotion state
  const [promotionCode, setPromotionCode] = useState("");
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);

  // ============================================
  // HELPER FOR IMAGE URL
  // ============================================
  const getImageUrl = (path) => {
    if (!path) return "https://via.placeholder.com/128?text=No+Image";
    if (path.startsWith("http")) return path;
    return `${import.meta.env.VITE_API_URL}${
      path.startsWith("/") ? "" : "/"
    }${path}`;
  };

  // ============================================
  // TÍNH TOÁN GIẢM GIÁ THEO TỶ LỆ
  // ============================================
  const checkoutItemsWithFinalPrice = useMemo(() => {
    if (cart.length === 0) return [];

    const discountAmount = appliedPromotion?.discountAmount || 0;

    if (discountAmount === 0) {
      return cart.map((item) => ({
        ...item,
        originalPrice: item.price,
        finalizedPrice: item.price,
      }));
    }

    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    let remainingDiscount = discountAmount;

    return cart.map((item, index) => {
      const itemSubtotal = item.price * item.quantity;
      const ratio = itemSubtotal / subtotal;
      let itemDiscount = Math.round(ratio * discountAmount);

      if (index === cart.length - 1) {
        itemDiscount = remainingDiscount;
      } else {
        remainingDiscount -= itemDiscount;
      }

      const finalPricePerUnit = Math.max(
        0,
        item.price - Math.round(itemDiscount / item.quantity)
      );

      return {
        ...item,
        originalPrice: item.price,
        finalizedPrice: finalPricePerUnit,
      };
    });
  }, [cart, appliedPromotion?.discountAmount]);

  // ============================================
  // CALCULATIONS
  // ============================================
  const getTotal = () => {
    return checkoutItemsWithFinalPrice.reduce(
      (sum, item) =>
        sum + (item.finalizedPrice || item.originalPrice) * item.quantity,
      0
    );
  };

  // ============================================
  // PROMOTION HANDLERS
  // ============================================
  const handleApplyPromotion = async () => {
    if (!promotionCode.trim()) {
      toast.error("Vui lòng nhập mã giảm giá");
      return;
    }

    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    if (subtotal === 0) {
      toast.error("Giỏ hàng trống");
      return;
    }

    setIsApplyingPromo(true);
    try {
      const response = await promotionAPI.apply({
        code: promotionCode.trim().toUpperCase(),
        totalAmount: subtotal,
      });

      setAppliedPromotion(response.data.data);
      toast.success(
        `Áp dụng mã thành công! Giảm ${formatPrice(
          response.data.data.discountAmount
        )}`
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Mã giảm giá không hợp lệ");
      console.error("Lỗi áp dụng mã:", error);
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const handleRemovePromotion = () => {
    setAppliedPromotion(null);
    setPromotionCode("");
    toast.info("Đã xóa mã giảm giá");
  };

  // ============================================
  // FETCH PRODUCTS
  // ============================================
  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      // Use Unified productAPI
      // Note: We might need to ensure backend supports filtering by 'category' name/slug
      // If selectedCategory matches the slug or name needed by backend
      const response = await productAPI.getAll({ 
        limit: 50, 
        category: selectedCategory // Assuming backend filters by category slug/name
      });

      const productData = response?.data?.data?.products || [];
      setProducts(
        Array.isArray(productData)
          ? productData.map((p) => ({ ...p, category: selectedCategory }))
          : []
      );
    } catch (error) {
      console.error("Lỗi tải sản phẩm:", error);
      toast.error("Không thể tải sản phẩm");
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // PRODUCT SELECTION
  // ============================================
  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setSelectedVariant(null);
    setShowProductDialog(true);
  };

  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast.error("Vui lòng chọn phiên bản");
      return;
    }

    if (selectedVariant.stock === 0) {
      toast.error("Sản phẩm đã hết hàng");
      return;
    }

    const existingIndex = cart.findIndex(
      (item) => item.variantId === selectedVariant._id
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      if (newCart[existingIndex].quantity >= selectedVariant.stock) {
        toast.error("Không đủ hàng trong kho");
        return;
      }
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
      toast.success("Đã tăng số lượng");
    } else {
      setCart([
        ...cart,
        {
          productId: selectedProduct._id,
          variantId: selectedVariant._id,
          productType: selectedProduct.category,
          productName: selectedProduct.name,
          variantSku: selectedVariant.sku,
          variantColor: selectedVariant.color,
          variantStorage: selectedVariant.storage || "",
          variantConnectivity: selectedVariant.connectivity || "",
          variantName: selectedVariant.variantName || "",
          variantCpuGpu: selectedVariant.cpuGpu || "",
          variantRam: selectedVariant.ram || "",
          price: selectedVariant.price,
          quantity: 1,
          stock: selectedVariant.stock,
          image: getImageUrl(selectedVariant.images?.[0]),
        },
      ]);
      toast.success("Đã thêm vào giỏ hàng");
    }

    setShowProductDialog(false);
  };

  // ============================================
  // CART MANAGEMENT
  // ============================================
  const updateQuantity = (variantId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(variantId);
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.variantId === variantId) {
          if (newQuantity > item.stock) {
            toast.error("Không đủ hàng trong kho");
            return item;
          }
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const removeFromCart = (variantId) => {
    setCart(cart.filter((item) => item.variantId !== variantId));
    toast.success("Đã xóa khỏi giỏ hàng");
  };

  const clearCart = () => {
    if (window.confirm("Xóa tất cả sản phẩm?")) {
      setCart([]);
      setAppliedPromotion(null);
      setPromotionCode("");
      toast.success("Đã xóa giỏ hàng");
    }
  };

  // ============================================
  // CREATE ORDER
  // ============================================
  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      toast.error("Giỏ hàng trống");
      return;
    }

    if (!customerName.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }

    if (!customerPhone.trim()) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }

    setIsLoading(true);
    try {
      const totalAmount = checkoutItemsWithFinalPrice.reduce(
        (sum, item) =>
          sum + (item.finalizedPrice || item.originalPrice) * item.quantity,
        0
      );

      // ✅ SỬA: Dùng posAPI.createOrder thay vì axios.post
      const response = await posAPI.createOrder({
        orderSource: "IN_STORE",
        items: checkoutItemsWithFinalPrice.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          productType: item.productType,
          quantity: item.quantity,
          price: item.finalizedPrice || item.originalPrice,
          originalPrice: item.originalPrice,
        })),
        customerInfo: {
          fullName: customerName.trim(),
          phoneNumber: customerPhone.trim(),
        },
        totalAmount,
        storeLocation: "Ninh Kiều iStore",
        promotionCode: appliedPromotion?.code || null,
      });

      toast.success(
        "Tạo đơn thành công! Đơn hàng đã được chuyển sang Thu ngân."
      );

      // Reset form
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setAppliedPromotion(null);
      setPromotionCode("");
    } catch (error) {
      console.error("Lỗi tạo đơn:", error);
      toast.error(error.response?.data?.message || "Tạo đơn hàng thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 h-screen overflow-hidden">
        {/* LEFT: Product List */}
        <div className="lg:col-span-2 space-y-4 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle>Chọn sản phẩm</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Category Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {[
                  "iPhone",
                  "iPad",
                  "Mac",
                  "AirPods",
                  "AppleWatch",
                  "Accessory",
                ].map((cat) => (
                  <Button
                    key={cat}
                    size="sm"
                    variant={selectedCategory === cat ? "default" : "outline"}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm sản phẩm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Product Grid */}
              {isLoading ? (
                <p className="text-center py-8">Đang tải...</p>
              ) : filteredProducts.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Không có sản phẩm
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredProducts.map((product) => (
                    <Card
                      key={product._id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <CardContent className="p-3">
                        <div className="relative pb-[125%] mb-2">
                          <img
                            src={getImageUrl(
                              product.variants?.[0]?.images?.[0]
                            )}
                            alt={product.name}
                            className="absolute top-0 left-0 w-full h-full object-contain rounded"
                            onError={(e) => {
                              e.target.src =
                                "https://via.placeholder.com/128?text=No+Image";
                            }}
                          />
                        </div>
                        <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                          {product.name}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {product.variants?.length} phiên bản
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Cart & Customer Info */}
        <div className="space-y-4 overflow-y-auto">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Thông tin khách hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Tên khách hàng *</Label>
                <Input
                  placeholder="Nguyễn Văn A"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <Label>Số điện thoại *</Label>
                <Input
                  placeholder="0912345678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Giỏ hàng ({cart.length})
                </span>
                {cart.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={clearCart}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Chưa có sản phẩm
                </p>
              ) : (
                checkoutItemsWithFinalPrice.map((item) => (
                  <div
                    key={item.variantId}
                    className="flex gap-3 border-b pb-3"
                  >
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.productName}
                      className="w-16 h-16 object-contain rounded"
                      onError={(e) => {
                        e.target.src =
                          "https://via.placeholder.com/64?text=No+Image";
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm line-clamp-1">
                        {item.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.variantColor}
                        {item.variantStorage && ` • ${item.variantStorage}`}
                      </p>

                      {appliedPromotion ? (
                        <div>
                          <p className="text-xs line-through text-muted-foreground">
                            {formatPrice(item.originalPrice)}
                          </p>
                          <p className="text-sm font-bold text-red-600">
                            {formatPrice(item.finalizedPrice)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm font-bold text-primary">
                          {formatPrice(item.price)}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2"
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity - 1)
                          }
                        >
                          -
                        </Button>
                        <span className="text-sm font-medium w-8 text-center">
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2"
                          onClick={() =>
                            updateQuantity(item.variantId, item.quantity + 1)
                          }
                        >
                          +
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 ml-auto"
                          onClick={() => removeFromCart(item.variantId)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Promotion Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Mã giảm giá</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!appliedPromotion ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nhập mã giảm giá"
                      value={promotionCode}
                      onChange={(e) =>
                        setPromotionCode(e.target.value.toUpperCase())
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleApplyPromotion()
                      }
                      disabled={isApplyingPromo || cart.length === 0}
                      className="uppercase"
                    />
                    <Button
                      onClick={handleApplyPromotion}
                      disabled={
                        isApplyingPromo ||
                        !promotionCode.trim() ||
                        cart.length === 0
                      }
                      variant="outline"
                      size="sm"
                    >
                      {isApplyingPromo ? "..." : "Áp dụng"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-green-700">
                        Mã: {appliedPromotion.code}
                      </p>
                      <p className="text-sm text-green-600">
                        Giảm: {formatPrice(appliedPromotion.discountAmount)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePromotion}
                      className="text-red-600 hover:bg-red-50"
                    >
                      Xóa
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total & Submit */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>
                    {formatPrice(
                      cart.reduce(
                        (sum, item) => sum + item.price * item.quantity,
                        0
                      )
                    )}
                  </span>
                </div>

                {appliedPromotion && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Giảm giá ({appliedPromotion.code}):</span>
                    <span>-{formatPrice(appliedPromotion.discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Tổng cộng:</span>
                  <span className="text-primary">
                    {formatPrice(getTotal())}
                  </span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCreateOrder}
                disabled={isLoading || cart.length === 0}
              >
                <ArrowRight className="w-5 h-5 mr-2" />
                {isLoading ? "Đang xử lý..." : "Tạo đơn & Chuyển Thu ngân"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Product Selection Dialog */}
        <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Chọn phiên bản sản phẩm</DialogTitle>
              <DialogDescription>
                Vui lòng chọn màu sắc và cấu hình
              </DialogDescription>
            </DialogHeader>

            {selectedProduct && (
              <div className="space-y-4">
                <ProductVariantSelector
                  product={selectedProduct}
                  onVariantChange={setSelectedVariant}
                  selectedVariant={selectedVariant}
                />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowProductDialog(false)}
                  >
                    Hủy
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAddToCart}
                    disabled={!selectedVariant || selectedVariant.stock === 0}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm vào giỏ
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default POSDashboard;
