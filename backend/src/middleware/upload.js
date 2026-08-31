import multer from 'multer';
import ApiError from '../utils/apiError.js';

// Configure Memory Storage (buffers kept in memory for Cloudinary upload)
const storage = multer.memoryStorage();

// File filter: accept image types only
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'INVALID_FILE_TYPE', 'Only image files (jpeg, jpg, png, webp) are allowed'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

export default upload;
