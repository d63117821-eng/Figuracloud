const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const avatarController = require('../controllers/avatarController');
const { protect, optionalAuth, authorize } = require('../middleware/auth');
const uploadMiddleware = require('../middleware/upload');
const { uploadLimiter, downloadLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/errorHandler');

// Extract uploadAvatar from middleware
const { uploadAvatar } = uploadMiddleware;

// Validation rules
const createAvatarValidation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Avatar name must be between 3 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  body('category')
    .optional()
    .isIn(['anime', 'realistic', 'cartoon', 'fantasy', 'sci-fi', 'other'])
    .withMessage('Invalid category'),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Tags must be an array with maximum 10 items'),
  body('visibility')
    .optional()
    .isIn(['public', 'private', 'unlisted'])
    .withMessage('Invalid visibility'),
  body('figuraVersion')
    .notEmpty()
    .withMessage('Figura version is required'),
  validate,
];

const updateAvatarValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 }),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 }),
  body('category')
    .optional()
    .isIn(['anime', 'realistic', 'cartoon', 'fantasy', 'sci-fi', 'other']),
  body('tags')
    .optional()
    .isArray({ max: 10 }),
  body('visibility')
    .optional()
    .isIn(['public', 'private', 'unlisted']),
  validate,
];

// Routes
router.get('/', optionalAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sort').optional().isIn(['createdAt', 'updatedAt', 'views', 'downloads', 'likes']),
  query('order').optional().isIn(['asc', 'desc']),
  query('category').optional().isString(),
  query('search').optional().isString(),
  validate], avatarController.getAllAvatars);

router.post('/', protect, uploadLimiter, ...uploadAvatar, ...createAvatarValidation, avatarController.createAvatar);

router.get('/:id', optionalAuth, avatarController.getAvatarById);

router.put('/:id', protect, uploadAvatar, updateAvatarValidation, avatarController.updateAvatar);

router.delete('/:id', protect, avatarController.deleteAvatar);

router.get('/:id/download', protect, downloadLimiter, avatarController.downloadAvatar);

router.post('/:id/like', protect, avatarController.likeAvatar);

router.delete('/:id/like', protect, avatarController.unlikeAvatar);

router.get('/user/:userId', optionalAuth, avatarController.getAvatarsByUser);

router.get('/featured', optionalAuth, avatarController.getFeaturedAvatars);

router.get('/search', optionalAuth, [
  query('q').notEmpty().withMessage('Search query is required'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validate,
], avatarController.searchAvatars);

// Admin routes
router.get('/admin/pending', protect, authorize('admin', 'superadmin'), avatarController.getPendingAvatars);

router.put('/:id/status', protect, authorize('admin', 'superadmin'), [
  body('status').isIn(['active', 'pending', 'rejected', 'archived']).withMessage('Invalid status'),
  body('rejectionReason').optional().isString(),
  validate,
], avatarController.updateAvatarStatus);

router.post('/:id/feature', protect, authorize('admin', 'superadmin'), avatarController.toggleFeature);

module.exports = router;
