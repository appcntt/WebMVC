import express from 'express';
import departmentController from '../controllers/department.controller';
import { authenticateToken } from '../middlewares/auth';
import { checkPermission } from '../middlewares/checkPermission';

const router = express.Router();

router.get('/', authenticateToken, departmentController.getAll);
router.get('/:id', authenticateToken, departmentController.getById);
router.post('/', authenticateToken, checkPermission('[create_departments]'), departmentController.create);
router.put('/:id', authenticateToken, checkPermission('[update_departments]'), departmentController.update);
router.delete('/:id', authenticateToken, checkPermission('[delete_departments]'), departmentController.delete);

export default router;