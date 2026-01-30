import express from "express";
import { protect } from "../../../shared/middleware/authMiddleware.js";
import {
  createPaymentUrl,
  vnpayIPN,
  vnpayReturn,
} from "../controllers/vnpayController.js";

const router = express.Router();

// Tạo payment URL (cần auth)
router.post("/create-payment-url", protect, createPaymentUrl);

// IPN - webhook từ VNPay (không cần auth)
router.get("/ipn", vnpayIPN);

// Return URL - user quay lại (không cần auth vì là GET redirect)
router.get("/return", vnpayReturn);

export default router;
