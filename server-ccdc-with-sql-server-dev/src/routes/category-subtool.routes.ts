import express from 'express';
import categorySubToolController from '../controllers/category-subtool.controller';
import { authenticateToken } from '../middlewares/auth';
import { checkPermission } from '../middlewares/checkPermission';

const router = express.Router();

router.get('/', authenticateToken, categorySubToolController.getAllCategories);
router.get('/:id', authenticateToken, categorySubToolController.getCategoryById);

router.post('/', 
  authenticateToken, 
  checkPermission('create_category_tool'), 
  categorySubToolController.createCategory
);

router.put('/:id', 
  authenticateToken, 
  checkPermission('update_category_tool'), 
  categorySubToolController.updateCategory
);

router.delete('/:id', 
  authenticateToken, 
  checkPermission('delete_category_tool'), 
  categorySubToolController.deleteCategory
);

export default router;