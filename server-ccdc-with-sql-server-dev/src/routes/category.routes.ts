import express from 'express';
import categoryController from '../controllers/category.controller';
import { authenticateToken } from '../middlewares/auth';
import { checkPermission } from '../middlewares/checkPermission';

const router = express.Router();

router.get('/', authenticateToken, categoryController.getAllCategories);
router.get('/:id', authenticateToken, categoryController.getCategoryById);

router.post('/', 
  authenticateToken, 
  checkPermission('create_category_tool'), 
  categoryController.createCategory
);

router.put('/:id', 
  authenticateToken, 
  checkPermission('update_category_tool'), 
  categoryController.updateCategory
);

router.delete('/:id', 
  authenticateToken, 
  checkPermission('delete_category_tool'), 
  categoryController.deleteCategory
);

export default router;