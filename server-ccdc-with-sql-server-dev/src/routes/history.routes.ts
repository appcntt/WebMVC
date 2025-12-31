import express from 'express';
import historyController from '../controllers/history.controller';
import { authenticateToken } from '../middlewares/auth';
import { checkPermission } from '../middlewares/checkPermission';

const router = express.Router();


router.get('/', historyController.getAllHistory);


router.get('/stats', historyController.getHistoryStats);


router.get('/upgrade-history', historyController.getUpgradeHistory);


router.get('/:id', historyController.getHistoryById);


router.get('/tool/:toolId', historyController.getHistoryByTool);


router.get('/employee/:employeeId', historyController.getHistoryByEmployee);


router.get('/timeline/:toolId', historyController.getToolTimeline);


router.get('/subtool/:subToolId/history', historyController.getSubToolHistory);


router.get('/accessory/:accessoryId/history', historyController.getAccessoryHistory);

router.post('/', authenticateToken, historyController.createHistory);


router.put('/:id', authenticateToken, historyController.updateHistory);

router.delete('/:id', authenticateToken, checkPermission('delete_history'), historyController.deleteHistory);

export default router;