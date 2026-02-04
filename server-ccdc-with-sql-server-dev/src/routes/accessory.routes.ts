import express from 'express';
import accessoryController from '../controllers/accessory.controller';
import { authenticateToken } from '../middlewares/auth';
import { checkPermission } from '../middlewares/checkPermission';
import { uploadAccessory, handleUploadError } from '../middlewares/upload';

const router = express.Router();

router.post(
  '/upload-images',
  authenticateToken,
  uploadAccessory,
  accessoryController.uploadImages
);

router.delete(
  '/images/:filename',
  authenticateToken,
  accessoryController.deleteImage
);



router.get('/', authenticateToken, accessoryController.getAll);


router.get('/search/:keyword', authenticateToken, accessoryController.search);


router.get('/subtool/:subToolId', authenticateToken, accessoryController.getBySubTool);


router.get('/:id', authenticateToken, accessoryController.getById);


router.post('/', authenticateToken, checkPermission('create_tool'), accessoryController.create);


router.put('/:id', authenticateToken, checkPermission('update_tool'), accessoryController.update);

router.post(
  '/assign',
  authenticateToken,
  checkPermission('update_tool'),
  accessoryController.assign
);

router.post(
  '/revoke',
  authenticateToken,
  checkPermission('update_tool'),
  accessoryController.revoke
);


router.delete('/:id', authenticateToken, checkPermission('delete_tool'), accessoryController.softDelete);

router.patch('/:id/restore', authenticateToken, checkPermission('restore_tool'), accessoryController.restore);

router.delete('/permanent/:id', authenticateToken, checkPermission('permanent_delete_tool'), accessoryController.permanentDelete);

router.get('/full-config/:toolId',authenticateToken, accessoryController.getFullConfiguration );

export default router;