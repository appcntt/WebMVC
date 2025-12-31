import express from 'express';
import employeeController from '../controllers/employee.controller';
import { authenticateToken } from '../middlewares/auth';
import { checkPermission } from '../middlewares/checkPermission';

const router = express.Router();

router.get('/', authenticateToken, employeeController.getAll);
router.get('/inactive', authenticateToken, employeeController.getEmployeeInactive);
router.get('/search/:keyword', authenticateToken, employeeController.search);
router.get('/:id', authenticateToken, employeeController.getById);

router.post('/', authenticateToken, checkPermission('create_employee'), employeeController.create);

router.put('/:id', authenticateToken, checkPermission('update_employee'), employeeController.update);

router.delete('/:id/soft', authenticateToken, checkPermission('delete_soft_employee'), employeeController.deleteSoft);
router.delete('/:id/permanent', authenticateToken, checkPermission('permanent_delete_employee'), employeeController.permanentDeleteEmployee);

router.post('/:id/restore', authenticateToken, checkPermission('restore_employee'), employeeController.restore);

export default router;