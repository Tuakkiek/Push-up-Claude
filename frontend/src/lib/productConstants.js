// ============================================
// FILE: frontend/src/lib/productConstants.js
// ✅ REFACTORED: Dynamic Catalog Support
// ============================================

// =========================
// INSTALLMENT BADGE OPTIONS
// =========================
export const INSTALLMENT_BADGE_OPTIONS = [
  { value: "NONE", label: "Không hiển thị" },
  { value: "Trả góp 0%", label: "Trả góp 0%" },
  { value: "Trả góp 0%, trả trước 0đ", label: "Trả góp 0%, trả trước 0đ" },
];

// =========================
// COMMON OPTIONS
// =========================
export const CONDITION_OPTIONS = [
  { value: "NEW", label: "New (Mới 100%)" },
  { value: "LIKE_NEW", label: "Like New (99%)" },
  { value: "USED", label: "Used (Đã qua sử dụng)" },
];

export const PRODUCT_STATUS = {
  AVAILABLE: "AVAILABLE",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  DISCONTINUED: "DISCONTINUED",
};

export const ORDER_STATUS = {
  PENDING: "PENDING",
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAYMENT_VERIFIED: "PAYMENT_VERIFIED",
  CONFIRMED: "CONFIRMED",
  SHIPPING: "SHIPPING",
  DELIVERED: "DELIVERED",
  RETURNED: "RETURNED",
  CANCELLED: "CANCELLED",
};

// =========================
// EMPTY TEMPLATE GENERATORS
// =========================

// ✅ Empty form structure (Generic)
export const getEmptyFormData = () => ({
  name: "",
  model: "",
  brand: "",
  category: "", // Now an ObjectId string
  slug: "",
  condition: "NEW",
  description: "",
  featuredImages: [],
  videoUrl: "",
  status: "AVAILABLE",
  
  // Dynamic Specs & Variants
  specs: {}, 
  variants: [],

  originalPrice: 0,
  price: 0,
  discount: 0,
  stock: 0,
  
  seoTitle: "",
  seoDescription: "",
});
