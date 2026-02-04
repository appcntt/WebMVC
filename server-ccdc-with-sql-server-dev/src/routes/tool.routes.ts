import { Router } from 'express';
import * as toolController from '../controllers/tool.controller';
import { authenticateToken } from '../middlewares/auth';
import { checkPermission } from '../middlewares/checkPermission';
import { uploadTool, handleUploadError } from '../middlewares/upload';

const router = Router();

router.post(
  '/upload-images',
  authenticateToken,
  uploadTool,
  toolController.uploadImages
);

router.delete(
  '/images/:filename',
  authenticateToken,
  toolController.deleteImage
);


router.get('/deleted', authenticateToken, toolController.getDeleted);
router.get('/statistics', authenticateToken, toolController.getStatistics);
router.get('/', authenticateToken, toolController.getAll);
router.get('/search/:keyword', authenticateToken, toolController.search);
router.get('/employee/:employeeId', authenticateToken, toolController.getToolsByEmployee);
router.get('/:id', authenticateToken, toolController.getById);



router.post(
  '/',
  authenticateToken,
  checkPermission('create_tool'),
  toolController.create
);

router.post(
  '/assign',
  authenticateToken,
  checkPermission('update_tool'),
  toolController.assignTool
);

router.post(
  '/revoke',
  authenticateToken,
  checkPermission('update_tool'),
  toolController.revokeTool
);

router.put(
  '/:id',
  authenticateToken,
  checkPermission('update_tool'),
  toolController.update
);

router.patch(
  '/:id/restore',
  authenticateToken,
  toolController.restore
);

router.delete(
  '/:id',
  authenticateToken,
  checkPermission('delete_tool'),
  toolController.deleteTool
);

router.delete(
  '/:id/permanent',
  authenticateToken,
  toolController.permanentDelete
);

export default router;