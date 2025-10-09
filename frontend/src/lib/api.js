// FILE: src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Request interceptor - Lấy token từ localStorage
api.interceptors.request.use(
  (config) => {
    // Đọc từ localStorage (zustand persist lưu ở đây)
    const authStorage = localStorage.getItem('auth-storage');
    
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        const token = state?.token;
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log("✅ Token attached:", token.substring(0, 20) + "...");
        } else {
          console.warn("⚠️ No token found in auth-storage");
        }
      } catch (error) {
        console.error("❌ Error parsing auth-storage:", error);
      }
    } else {
      console.warn("⚠️ auth-storage not found in localStorage");
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("🔒 401 Unauthorized - Token invalid or expired");
      
      // Chỉ clear storage nếu không phải endpoint login
      if (!error.config.url.includes("/auth/login")) {
        localStorage.removeItem("auth-storage");
        // Redirect to login nếu cần
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// AUTH API
export const authAPI = {
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  logout: () => api.post("/auth/logout"),
  getCurrentUser: () => api.get("/auth/me"),
  changePassword: (data) => api.put("/auth/change-password", data),
};

// PRODUCT API
export const productAPI = {
  getAll: (params) => api.get("/products", { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post("/products", data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  updateQuantity: (id, quantity) => api.patch(`/products/${id}/quantity`, { quantity }),
};

// CART API
export const cartAPI = {
  get: () => api.get("/cart"),
  add: (data) => api.post("/cart/add", data),
  update: (data) => api.put("/cart/update", data),
  remove: (productId) => api.delete(`/cart/remove/${productId}`),
  clear: () => api.delete("/cart/clear"),
};

// ORDER API
export const orderAPI = {
  create: (data) => api.post("/orders", data),
  getMyOrders: (params) => api.get("/orders/my-orders", { params }),
  getAll: (params) => api.get("/orders/all", { params }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
};

// REVIEW API
export const reviewAPI = {
  getByProduct: (productId) => api.get(`/reviews/product/${productId}`),
  create: (data) => api.post("/reviews", data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
};

// PROMOTION API
export const promotionAPI = {
  getAll: () => api.get("/promotions"),
  getActive: () => api.get("/promotions/active"),
  create: (data) => api.post("/promotions", data),
  update: (id, data) => api.put(`/promotions/${id}`, data),
  delete: (id) => api.delete(`/promotions/${id}`),
};

// USER API
export const userAPI = {
  updateProfile: (data) => api.put("/users/profile", data),
  addAddress: (data) => api.post("/users/addresses", data),
  updateAddress: (id, data) => api.put(`/users/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/users/addresses/${id}`),
  getEmployees: () => api.get("/users/employees"),
  createEmployee: (data) => api.post("/users/employees", data),
  toggleEmployeeStatus: (id) => api.patch(`/users/employees/${id}/toggle-status`),
  deleteEmployee: (id) => api.delete(`/users/employees/${id}`),
};