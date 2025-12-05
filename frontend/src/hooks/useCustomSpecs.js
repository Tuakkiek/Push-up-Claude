// frontend/src/hooks/useCustomSpecs.js
import { useState, useEffect } from "react";
import { customSpecAPI } from "@/lib/api";

/**
 * Hook để fetch custom spec config cho một category
 * @param {string} category - iPhone, iPad, Mac, etc.
 * @returns {object} { config, isLoading, error, refetch }
 */
export const useCustomSpecs = (category) => {
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchConfig = async () => {
    if (!category) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await customSpecAPI.getByCategory(category);
      setConfig(response.data.data.customSpec);
    } catch (err) {
      console.error(`Failed to fetch custom specs for ${category}:`, err);
      setError(err.response?.data?.message || "Không thể tải cấu hình");
      setConfig(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [category]);

  return {
    config,
    isLoading,
    error,
    refetch: fetchConfig,
    useCustomSpecs: config?.useCustomSpecs || false,
    fields: config?.fields || [],
  };
};

export default useCustomSpecs;
