import { Router } from 'express';
import * as subToolController from '../controllers/subtool.controller';
import { authenticateToken } from '../middlewares/auth';
import { checkPermission } from '../middlewares/checkPermission';
import { uploadSubTool, handleUploadError } from '../middlewares/upload';

const router: Router = Router();

router.post(
  '/upload-images',
  authenticateToken,
  uploadSubTool,
  subToolController.uploadImages
);

router.delete(
  '/images/:filename',
  authenticateToken,
  subToolController.deleteImage
);


router.get('/', authenticateToken, subToolController.getAll);


router.get('/parent/:parentId', authenticateToken, subToolController.getByParentTool);


router.get('/search/:keyword', authenticateToken, subToolController.search);


router.get('/:id', authenticateToken, subToolController.getById);


router.post('/', 
    authenticateToken, 
    checkPermission('create_tool'), 
    subToolController.create
);


router.put('/:id', 
    authenticateToken, 
    checkPermission('update_tool'), 
    subToolController.update
);

router.delete('/:id', 
    authenticateToken, 
    checkPermission('delete_tool'), 
    subToolController.softdelete
);


router.patch('/:id/restore', authenticateToken, subToolController.restore);


router.delete('/permanent/:id', 
    authenticateToken, 
    checkPermission('delete_tool'),
    subToolController.permanentDelete
);


router.post('/assign', authenticateToken, subToolController.assign);

router.post(
  '/revoke',
  authenticateToken,
  checkPermission('update_tool'),
  subToolController.revoke
);

export default router;