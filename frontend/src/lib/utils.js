// ============================================
// FILE: frontend/src/lib/utils.js
// ✅ UPDATED: Added PAYMENT_VERIFIED status
// ============================================

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  productAPI
} from "@/lib/api";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const formatPrice = (price) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};

export const getStatusColor = (status) => {
  const map = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PENDING_PAYMENT: "bg-orange-100 text-orange-800",
    PAYMENT_VERIFIED: "bg-green-100 text-green-800", // ✅ NEW
    CONFIRMED: "bg-blue-100 text-blue-800",
    SHIPPING: "bg-indigo-100 text-indigo-800",
    DELIVERED: "bg-green-100 text-green-800",
    RETURNED: "bg-red-100 text-red-800",
    CANCELLED: "bg-gray-100 text-gray-800",
    PAID: "bg-green-100 text-green-800",
    UNPAID: "bg-red-100 text-red-800",
  };
  return map[status] || "bg-gray-100 text-gray-800";
};

export const getStatusText = (status) => {
  const map = {
    PENDING: "Chờ xác nhận",
    PENDING_PAYMENT: "Chờ thanh toán",
    PAYMENT_VERIFIED: "Đã thanh toán", // ✅ NEW
    CONFIRMED: "Chờ lấy hàng",
    SHIPPING: "Đang giao hàng",
    DELIVERED: "Đã giao hàng",
    RETURNED: "Đã trả hàng",
    CANCELLED: "Đã hủy",
    PAID: "Đã thanh toán",
    UNPAID: "Chưa thanh toán",
    COD: "Thanh toán khi nhận hàng",
    BANK_TRANSFER: "Chuyển khoản",
    VNPAY: "Thanh toán VNPay",
    CASH: "Tiền mặt",
    CARD: "Thẻ",
  };
  return map[status] || status;
};

// Function to fetch all products across all categories
export const fetchAllProducts = async (params = {}) => {
  try {
    const response = await productAPI.getAll({ ...params, limit: 1000 });
    const allProducts = response?.data?.data?.products || [];

    allProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return allProducts;
  } catch (error) {
    console.error("Error fetching all products:", error);
    throw error;
  }
};

// Lấy chữ viết tắt từ 2 từ cuối của tên
export const getNameInitials = (fullName) => {
  if (!fullName) return "U";

  const words = fullName.trim().split(/\s+/);

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  // Lấy 2 chữ cuối
  const lastTwo = words.slice(-2);
  return lastTwo.map((word) => word.charAt(0).toUpperCase()).join("");
};
