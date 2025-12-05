// backend/src/routes/categoryRoutes.js
import express from 'express';
import { protect, restrictTo } from '../middleware/authMiddleware.js';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';

const router = express.Router();

router.get('/', listCategories);
router.get('/:id', getCategory);

// Admin-only modifications
router.use(protect, restrictTo('ADMIN'));
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
