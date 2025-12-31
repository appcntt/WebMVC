import { Router } from 'express';
import * as subToolController from '../controllers/subtool.controller';
import { authenticateToken } from '../middlewares/auth';
import { checkPermission } from '../middlewares/checkPermission';

const router: Router = Router();

// Lấy danh sách sub-tools
router.get('/', authenticateToken, subToolController.getAll);

// Lấy sub-tools theo Parent ID
router.get('/parent/:parentId', authenticateToken, subToolController.getByParentTool);

// Tìm kiếm
router.get('/search/:keyword', authenticateToken, subToolController.search);

// Lấy chi tiết theo ID
router.get('/:id', authenticateToken, subToolController.getById);

// Tạo mới
router.post('/', 
    authenticateToken, 
    checkPermission('create_tool'), 
    subToolController.create
);

// Cập nhật
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

// Bàn giao (Assign)
router.post('/assign', authenticateToken, subToolController.assign);
router.post(
  '/revoke',
  authenticateToken,
  checkPermission('update_tool'),
  subToolController.revoke
);

export default router;