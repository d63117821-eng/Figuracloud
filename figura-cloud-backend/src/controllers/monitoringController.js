const express = require('express');
const os = require('os');
const promClient = require('prom-client');
const User = require('../models/User');
const Avatar = require('../models/Avatar');
const ActivityLog = require('../models/ActivityLog');
const ServerMetric = require('../models/ServerMetric');
const config = require('../config');
const logger = require('../utils/logger');

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const activeUsersGauge = new promClient.Gauge({
  name: 'active_users',
  help: 'Number of active users',
});

const totalAvatarsGauge = new promClient.Gauge({
  name: 'total_avatars',
  help: 'Total number of avatars',
});

register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestDuration);
register.registerMetric(activeUsersGauge);
register.registerMetric(totalAvatarsGauge);

// @desc    Health check
// @route   GET /api/v1/monitoring/health
// @access  Public
const healthCheck = async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
    };

    // Check database connection
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    health.database = dbState === 1 ? 'connected' : 'disconnected';

    if (dbState !== 1) {
      health.status = 'unhealthy';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      ...health,
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: error.message,
    });
  }
};

// @desc    Get Prometheus metrics
// @route   GET /api/v1/monitoring/metrics
// @access  Public
const getMetrics = async (req, res) => {
  try {
    // Update custom metrics
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalAvatars = await Avatar.countDocuments();

    activeUsersGauge.set(activeUsers);
    totalAvatarsGauge.set(totalAvatars);

    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Get metrics error:', error);
    res.status(500).send('Error collecting metrics');
  }
};

// @desc    Get system status
// @route   GET /api/v1/monitoring/status
// @access  Public
const getSystemStatus = async (req, res) => {
  try {
    const mongoose = require('mongoose');

    const status = {
      application: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0',
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg(),
      },
      database: {
        connected: mongoose.connection.readyState === 1,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      },
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    logger.error('Get system status error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get monitoring dashboard data
// @route   GET /api/v1/monitoring/dashboard
// @access  Private (Admin)
const getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalAvatars,
      publicAvatars,
      recentActivity,
      metrics24h,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Avatar.countDocuments(),
      Avatar.countDocuments({ visibility: 'public', status: 'active' }),
      ActivityLog.find({ createdAt: { $gte: last24Hours } })
        .sort({ createdAt: -1 })
        .limit(50),
      ServerMetric.find({ timestamp: { $gte: last24Hours } }).sort({
        timestamp: -1,
      }),
    ]);

    res.json({
      success: true,
      overview: {
        totalUsers,
        activeUsers,
        totalAvatars,
        publicAvatars,
      },
      recentActivity,
      metrics24h,
    });
  } catch (error) {
    logger.error('Get dashboard error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get active users
// @route   GET /api/v1/monitoring/users/active
// @access  Private (Admin)
const getActiveUsers = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const activeUsers = await User.find({ isActive: true })
      .select('username email role lastLogin createdAt')
      .sort({ lastLogin: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: activeUsers.length,
      users: activeUsers,
    });
  } catch (error) {
    logger.error('Get active users error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get performance metrics
// @route   GET /api/v1/monitoring/performance
// @access  Private (Admin)
const getPerformanceMetrics = async (req, res) => {
  try {
    const { period = '24h' } = req.query;

    let startTime;
    const now = new Date();

    switch (period) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const metrics = await ServerMetric.getAverageMetrics(startTime, now);

    res.json({
      success: true,
      period,
      metrics: metrics[0] || {},
    });
  } catch (error) {
    logger.error('Get performance metrics error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get error logs
// @route   GET /api/v1/monitoring/errors
// @access  Private (Admin)
const getErrorLogs = async (req, res) => {
  try {
    const { limit = 100, status = 'failure' } = req.query;

    const errors = await ActivityLog.find({ status })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('user', 'username email');

    res.json({
      success: true,
      count: errors.length,
      errors,
    });
  } catch (error) {
    logger.error('Get error logs error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get database statistics
// @route   GET /api/v1/monitoring/database
// @access  Private (Admin)
const getDatabaseStats = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    const stats = await db.admin().serverStatus();

    res.json({
      success: true,
      stats: {
        uptime: stats.uptime,
        connections: stats.connections,
        memory: stats.mem,
        operations: {
          insert: stats.opcounters.insert,
          query: stats.opcounters.query,
          update: stats.opcounters.update,
          delete: stats.opcounters.delete,
        },
      },
    });
  } catch (error) {
    logger.error('Get database stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get cache statistics
// @route   GET /api/v1/monitoring/cache
// @access  Private (Admin)
const getCacheStats = async (req, res) => {
  try {
    // TODO: Implement Redis cache stats
    res.json({
      success: true,
      stats: {
        enabled: !!config.REDIS_HOST,
        message: 'Cache statistics will be available when Redis is configured',
      },
    });
  } catch (error) {
    logger.error('Get cache stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Middleware to track HTTP requests
const trackHttpRequest = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });

    httpRequestDuration.observe(
      {
        method: req.method,
        route,
      },
      duration
    );
  });

  next();
};

module.exports = {
  register,
  healthCheck,
  getMetrics,
  getSystemStatus,
  getDashboard,
  getActiveUsers,
  getPerformanceMetrics,
  getErrorLogs,
  getDatabaseStats,
  getCacheStats,
  trackHttpRequest,
};
