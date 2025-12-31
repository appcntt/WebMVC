import express from 'express';
import unitController from '../controllers/unit.controller';
import { authenticateToken } from '../middlewares/auth';
import { checkPermission } from '../middlewares/checkPermission';

const router = express.Router();

router.get('/', authenticateToken, unitController.getAll);
router.get('/:id', authenticateToken, unitController.getById);
router.post('/', authenticateToken, checkPermission('manage_units'), unitController.create);
router.put('/:id', authenticateToken, checkPermission('manage_units'), unitController.update);
router.delete('/:id', authenticateToken, checkPermission('manage_units'), unitController.delete);

export default router;