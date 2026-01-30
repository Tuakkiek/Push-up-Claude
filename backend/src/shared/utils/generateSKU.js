// backend/src/lib/generateSKU.js
import SkuCounter from "../../modules/analytics/models/SkuCounter.js";

/**
 * Sinh SKU toàn cục 8 chữ số: 00000001, 00000002,...
 */
export const getNextSku = async () => {
  const counter = await SkuCounter.findByIdAndUpdate(
    "global",
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return String(counter.seq).padStart(8, "0");
};

/**
 * Chuyển tiếng Việt có dấu → không dấu + tạo slug cực sạch cho SKU
 * (Dùng Unicode NFD – chuẩn 100%, không cần thư viện)
 */
const toCleanSlug = (text) => {
  if (!text) return "";
  return String(text)
    .normalize("NFD")                    // Tách dấu ra khỏi chữ (chuẩn Unicode)
    .replace(/[\u0300-\u036f]/g, "")     // Xóa hết dấu (â, ê, ô, ơ, ư, ă...)
    .replace(/đ/g, "d")                  // đ → d (xử lý riêng vì không decompose)
    .replace(/Đ/g, "D")                  // Đ → D
    .toLowerCase()
    .replace(/\s+/g, "-")                // Space → -
    .replace(/[^a-z0-9-]/g, "")          // Xóa ký tự đặc biệt
    .replace(/-+/g, "-")                 // Gộp nhiều dấu gạch
    .replace(/^-+|-+$/g, "");            // Xóa gạch đầu/cuối
};

// Phần còn lại giữ nguyên...
/**
 * Sinh SKU theo format đẹp: IPHONE-15-PRO-MAX-XANHLA-256GB
 */
export const generateSKU = (category, model, color, ...rest) => {
  const modelSlug = toCleanSlug(model).toUpperCase();
  const colorSlug = color ? toCleanSlug(color).toUpperCase().replace(/-/g, "") : "";

  const restSlug = rest
    .map((item) => {
      if (!item) return "";
      if (typeof item === "string") return toCleanSlug(item).toUpperCase().replace(/-/g, "");
      if (typeof item === "object" && item !== null) {
        return Object.values(item)
          .map((v) => toCleanSlug(v).toUpperCase().replace(/-/g, ""))
          .filter(Boolean)
          .join("");
      }
      return "";
    })
    .filter(Boolean)
    .join("-");

  const prefixMap = {
    iphone: "IPHONE",
    ipad: "IPAD",
    mac: "MAC",
    macbook: "MAC",
    airpods: "AIRPOD",
    applewatch: "APPLEWATCH",
    watch: "APPLEWATCH",
    accessories: "ACCESSORY",
    phukien: "ACCESSORY",
    default: "PRODUCT",
  };

  const key = category?.toLowerCase().trim() || "default";
  const prefix = prefixMap[key] || prefixMap.default;

  const parts = [prefix, modelSlug, colorSlug, restSlug].filter(Boolean);
  return parts.join("-");
};

/**
 * (Bonus) Sinh SKU đơn giản kiểu SP00000001 nếu cần
 */
export const generateSimpleSKU = async (prefix = "SP") => {
  const seq = await getNextSku();
  return `${prefix}${seq}`;
};