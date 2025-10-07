// routes/orderRoutes.js
import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware.js';  // Cập nhật đường dẫn đúng
import { createOrder, getMyOrders, cancelOrder, getAllOrders, updateOrderStatus, getOrderById } from '../controllers/orderController.js';  // Import đúng các hàm

const router = express.Router();

router.use(protect);

// Customer routes
router.post('/', restrictTo('CUSTOMER'), createOrder);
router.get('/my-orders', restrictTo('CUSTOMER'), getMyOrders);
router.post('/:id/cancel', restrictTo('CUSTOMER'), cancelOrder);

// Order Manager routes
router.get('/all', restrictTo('ORDER_MANAGER', 'ADMIN'), getAllOrders);

router.put('/:id/status', restrictTo('ORDER_MANAGER', 'ADMIN'), updateOrderStatus);

// Shared routes
router.get('/:id', getOrderById);

export default router;
