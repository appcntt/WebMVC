import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export interface AuthRequest extends Request {
  employee?: any;
  user?: any;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'tools');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {

    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});


const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WebP)'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  }
});

// ============================================
// UPLOAD SINGLE IMAGE
// ============================================

export const uploadImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Không có file được upload'
      });
      return;
    }

    const currentUserId = req.user?.id || req.employee?.id;
    if (!currentUserId) {
      // Xóa file đã upload nếu không có user
      fs.unlinkSync(req.file.path);
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    // Tạo URL tương đối
    const imageUrl = `/uploads/tools/${req.file.filename}`;

    res.json({
      success: true,
      url: imageUrl,
      data: {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        url: imageUrl
      },
      message: 'Upload ảnh thành công'
    });
  } catch (error: any) {
    console.error('Upload image error:', error);
    
    // Xóa file nếu có lỗi
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi upload ảnh'
    });
  }
};

// ============================================
// UPLOAD MULTIPLE IMAGES
// ============================================

export const uploadImages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Không có file được upload'
      });
      return;
    }

    const currentUserId = req.user?.id || req.employee?.id;
    if (!currentUserId) {
      // Xóa tất cả files đã upload
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      
      res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
      return;
    }

    const uploadedFiles = req.files.map(file => ({
      fileName: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      url: `/uploads/tools/${file.filename}`
    }));

    const urls = uploadedFiles.map(f => f.url);

    res.json({
      success: true,
      urls,
      data: uploadedFiles,
      count: uploadedFiles.length,
      message: `Upload ${uploadedFiles.length} ảnh thành công`
    });
  } catch (error: any) {
    console.error('Upload images error:', error);
    
    // Xóa tất cả files nếu có lỗi
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi upload ảnh'
    });
  }
};

// ============================================
// DELETE SINGLE IMAGE
// ============================================

export const deleteImage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { url } = req.body;

    if (!url) {
      res.status(400).json({
        success: false,
        message: 'Thiếu URL ảnh'
      });
      return;
    }

    // Extract filename from URL
    // URL format: /uploads/tools/filename.jpg
    const filename = path.basename(url);
    const filePath = path.join(process.cwd(), 'uploads', 'tools', filename);

    // Xóa file vật lý
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: 'Xóa ảnh thành công'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Không tìm thấy file'
      });
    }
  } catch (error: any) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi xóa ảnh'
    });
  }
};

// ============================================
// DELETE MULTIPLE IMAGES
// ============================================

export const deleteImages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { urls } = req.body;

    if (!urls || urls.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Thiếu danh sách URL ảnh'
      });
      return;
    }

    const deletedCount = { success: 0, failed: 0 };
    const errors = [];

    for (const url of urls) {
      try {
        const filename = path.basename(url);
        const filePath = path.join(process.cwd(), 'uploads', 'tools', filename);

        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deletedCount.success++;
        } else {
          errors.push({ url, error: 'Không tìm thấy file' });
          deletedCount.failed++;
        }
      } catch (error: any) {
        console.error(`Error deleting ${url}:`, error);
        errors.push({ url, error: error.message });
        deletedCount.failed++;
      }
    }

    res.json({
      success: deletedCount.success > 0,
      message: `Xóa ${deletedCount.success}/${urls.length} ảnh thành công`,
      data: deletedCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Delete images error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi khi xóa ảnh'
    });
  }
};

// ============================================
// EXPORTS
// ============================================

export default {
  upload,
  uploadImage,
  uploadImages,
  deleteImage,
  deleteImages
};