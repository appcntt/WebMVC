import multer from 'multer';
import path from 'path';
import fs from 'fs';

const removeVietnameseTones = (str: string): string => {
  str = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  str = str.replace(/đ/g, 'd').replace(/Đ/g, 'D');
  return str;
};

const slugifyFilename = (filename: string): string => {
  const ext = path.extname(filename);
  const nameWithoutExt = path.basename(filename, ext);

  let slug = removeVietnameseTones(nameWithoutExt);
  slug = slug.toLowerCase();
  slug = slug.replace(/[^a-z0-9]/g, '-');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-|-$/g, '');

  return slug + ext;
};

const createStorage = (folderName: string, keepOriginalName: boolean = false) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = `uploads/${folderName}`;
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      if (keepOriginalName) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const nameWithoutExt = path.basename(file.originalname, ext);
        const finalFilename = `${nameWithoutExt}${ext}`;
        cb(null, finalFilename);
      } else {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const safeFilename = slugifyFilename(file.originalname);
        const nameWithoutExt = path.basename(safeFilename, path.extname(safeFilename));
        const ext = path.extname(safeFilename);
        const maxLength = 50;
        const truncatedName = nameWithoutExt.length > maxLength
          ? nameWithoutExt.substring(0, maxLength)
          : nameWithoutExt;
        const finalFilename = `${truncatedName}-${uniqueSuffix}${ext}`;
        cb(null, finalFilename);
      }
    }
  });
};

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)'));
  }
};

const createUploader = (folderName: string, maxFiles: number = 10, keepOriginalName: boolean = false) => {
  return multer({
    storage: createStorage(folderName, keepOriginalName),
    limits: {
      fileSize: 5 * 1024 * 1024
    },
    fileFilter: fileFilter
  }).array('images', maxFiles);
};

export const uploadTool = createUploader('tools', 10, true);
export const uploadSubTool = createUploader('subtools', 10, true);
export const uploadAccessory = createUploader('accessories', 10, true);
export const uploadEmployee = createUploader('employees', 1, true);
export const uploadCategory = createUploader('categories', 1, true);


export const handleUploadError = (err: any, req: any, res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File quá lớn. Kích thước tối đa là 5MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Vượt quá số lượng file cho phép'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Lỗi upload: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

export { multer, createUploader };