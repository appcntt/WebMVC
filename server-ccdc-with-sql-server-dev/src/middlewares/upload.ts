import multer from 'multer';
import { Request } from 'express';

// Cấu hình lưu trữ trong memory
const storage = multer.memoryStorage();

// Kiểm tra loại file
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Chỉ chấp nhận file ảnh
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (JPEG, PNG, GIF, WEBP)'));
  }
};

// Cấu hình multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Giới hạn 5MB mỗi file
    files: 10 // Tối đa 10 files
  }
});

// Middleware xử lý upload nhiều ảnh
export const uploadToolImages = upload.array('images', 10);

// Middleware xử lý upload 1 ảnh
export const uploadSingleImage = upload.single('image');

// Middleware xử lý lỗi upload
export const handleUploadError = (error: any, req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Kích thước file vượt quá giới hạn 5MB'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Số lượng file vượt quá giới hạn 10 files'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Tên trường file không đúng'
      });
    }
  }
  
  if (error.message) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

// Helper function để validate images
export const validateImages = (files: Express.Multer.File[] | undefined): { valid: boolean; message?: string } => {
  if (!files || files.length === 0) {
    return { valid: true }; // Ảnh không bắt buộc
  }

  // Kiểm tra số lượng
  if (files.length > 10) {
    return {
      valid: false,
      message: 'Tối đa 10 ảnh'
    };
  }

  // Kiểm tra kích thước từng file
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      return {
        valid: false,
        message: `File ${file.originalname} vượt quá 5MB`
      };
    }
  }

  return { valid: true };
};

// Helper function để convert file thành buffer data cho database
export const prepareImageForDB = (file: Express.Multer.File) => {
  return {
    imageData: file.buffer,
    imageName: file.originalname,
    imageType: file.mimetype,
    imageSize: file.size
  };
};

export default upload;