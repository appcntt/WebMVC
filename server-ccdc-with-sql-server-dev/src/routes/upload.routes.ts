import express from 'express';
import { 
  upload, 
  uploadImage, 
  uploadImages, 
  deleteImage,
  deleteImages
} from '../controllers/image.controller';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();

// Tất cả routes đều cần authenticate
router.use(authenticateToken);

// Upload single image
// POST /api/upload/image
// Body: multipart/form-data with 'image' field
router.post('/image', upload.single('image'), uploadImage);

// Upload multiple images (max 10 files)
// POST /api/upload/images
// Body: multipart/form-data with 'images' field (multiple files)
router.post('/images', upload.array('images', 10), uploadImages);

// Delete single image
// DELETE /api/upload/image
// Body: { url: string }
router.delete('/image', deleteImage);

// Delete multiple images
// DELETE /api/upload/images
// Body: { urls: string[] }
router.delete('/images', deleteImages);

export default router;