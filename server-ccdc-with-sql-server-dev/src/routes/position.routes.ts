import express from 'express';
import positionController from '../controllers/position.controller';
import { authenticateToken } from '../middlewares/auth';
import { checkPermission } from '../middlewares/checkPermission';

const router = express.Router();

router.get('/', authenticateToken, positionController.getAll);
router.get('/:id', authenticateToken, positionController.getById);
router.post('/', authenticateToken, checkPermission('create_position'), positionController.create);
router.put('/:id', authenticateToken, checkPermission('update_position'), positionController.update);
router.delete('/:id', authenticateToken, checkPermission('delete_position'), positionController.delete);

export default router;
