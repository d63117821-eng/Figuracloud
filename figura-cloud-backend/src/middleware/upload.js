const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.UPLOAD_PATH);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = config.ALLOWED_FILE_TYPES;
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not allowed`), false);
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
  },
  fileFilter: fileFilter,
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File size exceeds the maximum limit of ${config.MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};

// Middleware for avatar uploads
exports.uploadAvatar = [
  upload.fields([
    { name: 'luaScript', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  handleMulterError,
  (req, res, next) => {
    if (!req.files || !req.files.luaScript) {
      return res.status(400).json({
        success: false,
        message: 'Lua script file is required',
      });
    }
    next();
  },
];

// Middleware for single file uploads
exports.uploadSingle = (fieldName) => {
  return [
    upload.single(fieldName),
    handleMulterError,
  ];
};

// Middleware for multiple file uploads
exports.uploadMultiple = (fieldName, maxCount = 10) => {
  return [
    upload.array(fieldName, maxCount),
    handleMulterError,
  ];
};

module.exports = {
  upload,
  handleMulterError,
};
