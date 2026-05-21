const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');

// Public health check
router.get('/health', monitoringController.healthCheck);

// Metrics endpoint (Prometheus format)
router.get('/metrics', monitoringController.getMetrics);

// System status
router.get('/status', monitoringController.getSystemStatus);

// Protected monitoring routes (admin only)
router.get('/dashboard', protect, authorize('admin', 'superadmin'), monitoringController.getDashboard);

router.get('/users/active', protect, authorize('admin', 'superadmin'), monitoringController.getActiveUsers);

router.get('/performance', protect, authorize('admin', 'superadmin'), monitoringController.getPerformanceMetrics);

router.get('/errors', protect, authorize('admin', 'superadmin'), monitoringController.getErrorLogs);

router.get('/database', protect, authorize('admin', 'superadmin'), monitoringController.getDatabaseStats);

router.get('/cache', protect, authorize('admin', 'superadmin'), monitoringController.getCacheStats);

module.exports = router;
