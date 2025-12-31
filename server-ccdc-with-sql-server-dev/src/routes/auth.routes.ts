import express, { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth';

const router: Router = express.Router();

router.post('/login', AuthController.login);
router.post('/refresh', AuthController.refreshToken);
router.get('/me', authenticateToken, AuthController.getCurrentUser);
router.post('/change-password', authenticateToken, AuthController.changePassword);

export default router;