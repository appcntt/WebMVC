import express from 'express';
import categoryAccessoryController from '../controllers/category-accessory.controller';
import { authenticateToken } from '../middlewares/auth';
import { checkPermission } from '../middlewares/checkPermission';

const router = express.Router();

router.get('/', authenticateToken, categoryAccessoryController.getAllCategories);
router.get('/:id', authenticateToken, categoryAccessoryController.getCategoryById);

router.post('/', 
  authenticateToken, 
  checkPermission('create_category_tool'), 
  categoryAccessoryController.createCategory
);

router.put('/:id', 
  authenticateToken, 
  checkPermission('update_category_tool'), 
  categoryAccessoryController.updateCategory
);

router.delete('/:id', 
  authenticateToken, 
  checkPermission('delete_category_tool'), 
  categoryAccessoryController.deleteCategory
);

export default router;