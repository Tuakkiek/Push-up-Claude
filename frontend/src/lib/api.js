// ============================================
// FILE: frontend/src/lib/api.js
// ✅ REFACTORED: Unified Product & Category API
// ============================================

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// ============================================
// AXIOS INSTANCE
// ============================================

const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ============================================
// INTERCEPTORS
// ============================================
api.interceptors.request.use(
  (config) => {
    const authStorage = localStorage.getItem("auth-storage");
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        const token = state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error("Error parsing auth-storage:", error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !error.config.url.includes("/auth/login")
    ) {
      localStorage.removeItem("auth-storage");
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// UNIFIED CATALOG APIs
// ============================================

export const categoryAPI = {
    getAll: () => api.get("/categories"),
    getBySlug: (slug) => api.get(`/categories/${slug}`),
    create: (data) => api.post("/categories", data),
    update: (id, data) => api.put(`/categories/${id}`, data),
    delete: (id) => api.delete(`/categories/${id}`),
};

export const productAPI = {
    getAll: (params) => api.get("/products", { params }),
    getById: (id) => api.get(`/products/${id}`),
    getBySlug: (slug) => api.get(`/products/slug/${slug}`),
    create: (data) => api.post("/products", data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
    validate: (data) => api.post("/products/validate", data),
};

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getCurrentUser: () => api.get("/auth/me"),
  changePassword: (data) => api.put("/auth/change-password", data),
  updateAvatar: (avatar) => api.put("/auth/avatar", { avatar }),
};

// ============================================
// CART API
// ============================================
export const cartAPI = {
  getCart: () => api.get("/cart"),
  addToCart: (data) => api.post("/cart", data),
  updateItem: (data) => api.put("/cart", data),
  removeItem: (itemId) => api.delete(`/cart/${itemId}`),
  clearCart: () => api.delete("/cart"),
};

// ============================================
// ORDER API
// ============================================
export const orderAPI = {
  create: (data) => api.post("/orders", data),
  getMyOrders: (params = {}) => api.get("/orders/my-orders", { params }),
  getAll: (params) => api.get("/orders/all", { params }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  cancel: (id, data = {}) => api.post(`/orders/${id}/cancel`, data),
};

// ============================================
// POS API
// ============================================
export const posAPI = {
  createOrder: (data) => api.post("/pos/create-order", data),
  getPendingOrders: (params = {}) => api.get("/pos/pending-orders", { params }),
  processPayment: (orderId, data) =>
    api.post(`/pos/orders/${orderId}/payment`, data),
  cancelOrder: (orderId, data = {}) =>
    api.post(`/pos/orders/${orderId}/cancel`, data),
  issueVAT: (orderId, data) => api.post(`/pos/orders/${orderId}/vat`, data),
  getHistory: (params = {}) => api.get("/pos/history/", { params }),
  getOrderById: (orderId) => api.get(`/pos/orders/${orderId}`),
};

// ============================================
// REVIEW API
// ============================================
export const reviewAPI = {
  canReview: (productId) => api.get(`/reviews/can-review/${productId}`),
  getByProduct: (productId, params = {}) =>
    api.get(`/reviews/product/${productId}`, { params }),
  create: (data) => api.post("/reviews", data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
  likeReview: (id) => api.post(`/reviews/${id}/like`),
  replyToReview: (id, content) => api.post(`/reviews/${id}/reply`, { content }),
  updateAdminReply: (id, content) =>
    api.put(`/reviews/${id}/reply`, { content }),
  toggleVisibility: (id) => api.patch(`/reviews/${id}/toggle-visibility`),
};

// ============================================
// PROMOTION API
// ============================================
export const promotionAPI = {
  getAll: (params = {}) => api.get("/promotions", { params }), 
  getAllPromotions: (params = {}) => api.get("/promotions/admin", { params }), 
  create: (data) => api.post("/promotions", data),
  update: (id, data) => api.put(`/promotions/${id}`, data),
  delete: (id) => api.delete(`/promotions/${id}`),
  getActive: () => api.get("/promotions/active"),
  apply: (data) => api.post("/promotions/apply", data),
};

// ============================================
// USER API
// ============================================
export const userAPI = {
  getAllShippers: () => api.get("/users/shippers"),
  updateProfile: (data) => api.put("/users/profile", data),
  addAddress: (data) => api.post("/users/addresses", data),
  updateAddress: (addressId, data) =>
    api.put(`/users/addresses/${addressId}`, data),
  deleteAddress: (addressId) => api.delete(`/users/addresses/${addressId}`),
  getAllEmployees: (params = {}) => api.get("/users/employees", { params }),
  createEmployee: (data) => api.post("/users/employees", data),
  toggleEmployeeStatus: (id) =>
    api.patch(`/users/employees/${id}/toggle-status`),
  deleteEmployee: (id) => api.delete(`/users/employees/${id}`),
  updateEmployeeAvatar: (id, avatar) =>
    api.put(`/users/employees/${id}/avatar`, { avatar }),
  updateEmployee: (id, data) => api.put(`/users/employees/${id}`, data),
};

// ============================================
// ANALYTICS API
// ============================================
export const analyticsAPI = {
  getTopSellers: (category, limit = 10) =>
    api.get(`/analytics/top-sellers/${category}`, { params: { limit } }),
  getTopSellersAll: (limit = 10) =>
    api.get("/analytics/top-sellers", { params: { limit } }),
  getProductSales: (productId, variantId = null) =>
    api.get(`/analytics/product/${productId}`, { params: { variantId } }),
  getSalesByTime: (category, startDate, endDate) =>
    api.get("/analytics/sales-by-time", {
      params: { category, startDate, endDate },
    }),
  getDashboard: (category = null) =>
    api.get("/analytics/dashboard", { params: { category } }),
};

// ============================================
// VNPAY API
// ============================================
export const vnpayAPI = {
  createPaymentUrl: (data) =>
    api.post("/payment/vnpay/create-payment-url", data),
  returnHandler: (params) => api.get("/payment/vnpay/return", { params }),
};

// ============================================
// HELPER FUNCTIONS
// ============================================
export const getTopSelling = async (category) => {
  try {
    const response = await analyticsAPI.getTopSellers(category, 10);
    return response.data?.data || [];
  } catch (error) {
    console.error("Error fetching top selling:", error);
    return [];
  }
};

export const getTopNewProducts = async () => {
  try {
    // Fetch all new products from unified API
    const response = await productAPI.getAll({ sort: '-createdAt', limit: 10 });
    return response.data?.data?.products || [];
  } catch (error) {
    console.error("Error fetching top new products:", error);
    return [];
  }
};

// ============================================
// ERROR HANDLER
// ============================================
export const handleApiError = (error) => {
  if (error.response) {
    return {
      success: false,
      message: error.response.data?.message || "Có lỗi xảy ra",
      status: error.response.status,
    };
  } else if (error.request) {
    return {
      success: false,
      message: "Không thể kết nối đến server",
      status: 0,
    };
  } else {
    return {
      success: false,
      message: error.message || "Có lỗi xảy ra",
      status: -1,
    };
  }
};

// ============================================
// HOMEPAGE LAYOUT API
// ============================================
export const homePageAPI = {
  getLayout: () => api.get("/homepage/layout"),
  updateLayout: (sections) => api.put("/homepage/layout", { sections }),
  toggleSection: (sectionId, enabled) =>
    api.patch(`/homepage/sections/${sectionId}/toggle`, { enabled }),
  reorderSections: (sectionIds) =>
    api.put("/homepage/sections/reorder", { sectionIds }),
  updateSectionConfig: (sectionId, config, title) =>
    api.patch(`/homepage/sections/${sectionId}/config`, { config, title }),
  uploadBanner: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return api.post("/homepage/upload-banner", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  deleteBanner: (imagePath) =>
    api.delete("/homepage/banner", { data: { imagePath } }),
  resetToDefault: () => api.post("/homepage/reset-default"),
};

export const searchAPI = {
  search: (params) => api.get("/search", { params }),
  autocomplete: (params) => api.get("/search/autocomplete", { params }),
};

export const shortVideoAPI = {
  getPublished: (params) => api.get("/short-videos/published", { params }),
  getTrending: (limit = 20) =>
    api.get("/short-videos/trending", { params: { limit } }),
  getById: (id) => api.get(`/short-videos/${id}`),
  incrementView: (id) => api.post(`/short-videos/${id}/view`),
  toggleLike: (id) => api.post(`/short-videos/${id}/like`),
  incrementShare: (id) => api.post(`/short-videos/${id}/share`),

  // Admin
  getAll: (params) => api.get("/short-videos", { params }),
  create: (data) => {
    return api.post("/short-videos", data, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  update: (id, data) => api.put(`/short-videos/${id}`, data),
  delete: (id) => api.delete(`/short-videos/${id}`),
  reorder: (videoIds) => api.put("/short-videos/reorder", { videoIds }),
};

export default {
  // Legacy APIs removed
  authAPI,
  cartAPI,
  orderAPI,
  posAPI,
  reviewAPI,
  promotionAPI,
  userAPI,
  analyticsAPI,
  vnpayAPI,
  categoryAPI, // ✅ NEW
  productAPI, // ✅ NEW
  getTopSelling,
  getTopNewProducts,
  handleApiError,
  homePageAPI,
  searchAPI,
  shortVideoAPI
};
