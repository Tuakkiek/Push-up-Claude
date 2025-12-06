// frontend/src/lib/apiDebugHelper.js

/**
 * Debug helper để log và validate API responses
 */

export const debugAPIResponse = (
  endpoint,
  response,
  expectedStructure = null
) => {
  console.group(`📡 API Response: ${endpoint}`);

  // Log basic info
  console.log("Status:", response.status || "N/A");
  console.log("Success:", response.success);

  // Log data structure
  if (response.data) {
    console.log("Data keys:", Object.keys(response.data));

    if (response.data.data) {
      console.log("Nested data keys:", Object.keys(response.data.data));
    }
  }

  // Full response
  console.log("Full response:", response);

  // Validate expected structure
  if (expectedStructure) {
    const issues = [];

    if (expectedStructure.requireSuccess && response.success !== true) {
      issues.push("❌ Missing or invalid 'success' flag");
    }

    if (expectedStructure.requireData && !response.data) {
      issues.push("❌ Missing 'data' object");
    }

    if (expectedStructure.requiredFields) {
      const dataObj = response.data?.data || response.data;
      expectedStructure.requiredFields.forEach((field) => {
        if (!(field in dataObj)) {
          issues.push(`❌ Missing required field: ${field}`);
        }
      });
    }

    if (issues.length > 0) {
      console.error("Validation issues:", issues);
    } else {
      console.log("✅ Response structure valid");
    }
  }

  console.groupEnd();

  return response;
};

/**
 * Normalize API response to consistent structure
 */
export const normalizeResponse = (response) => {
  // If already normalized
  if (response.success !== undefined && response.data) {
    return response;
  }

  // Try to extract data
  const data = response.data?.data || response.data || {};

  return {
    success: response.success ?? true,
    message: response.message || "",
    data: data,
  };
};

/**
 * Extract products array from various response structures
 */
export const extractProductsArray = (response) => {
  console.log("🔍 Extracting products from:", response);

  // Try different paths
  const paths = [
    response?.data?.data?.products,
    response?.data?.products,
    response?.products,
    response?.data?.data,
    response?.data,
  ];

  for (const path of paths) {
    if (Array.isArray(path)) {
      console.log("✅ Found products array:", path.length);
      return path;
    }
  }

  console.warn("⚠️ No products array found");
  return [];
};

/**
 * Extract total count from response
 */
export const extractTotal = (response, fallbackToArrayLength = true) => {
  // Try different paths
  const total =
    response?.data?.data?.total ?? response?.data?.total ?? response?.total;

  if (typeof total === "number") {
    return total;
  }

  if (fallbackToArrayLength) {
    const products = extractProductsArray(response);
    return products.length;
  }

  return 0;
};

/**
 * Create error from API response
 */
export const createErrorFromResponse = (
  response,
  defaultMessage = "API Error"
) => {
  const message =
    response?.data?.message ||
    response?.message ||
    response?.error ||
    defaultMessage;

  const error = new Error(message);
  error.response = response;
  error.status = response?.status;

  return error;
};

/**
 * Log API call for debugging
 */
export const logAPICall = (method, url, data = null) => {
  console.group(`🚀 API Call: ${method} ${url}`);
  if (data) {
    console.log("Request data:", data);
  }
  console.groupEnd();
};

export default {
  debugAPIResponse,
  normalizeResponse,
  extractProductsArray,
  extractTotal,
  createErrorFromResponse,
  logAPICall,
};
