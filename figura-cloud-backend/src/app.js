const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const path = require('path');

const config = require('./config');
const logger = require('./utils/logger');
const { connectDB } = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimiter');
const { trackHttpRequest } = require('./controllers/monitoringController');

// Import routes
const authRoutes = require('./routes/auth');
const avatarRoutes = require('./routes/avatars');
const monitoringRoutes = require('./routes/monitoring');

// Import error handler
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet()); // Set security HTTP headers
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
})); // Enable CORS
app.use(compression()); // Compress responses
app.use(mongoSanitize()); // Prevent NoSQL injection
app.use(xss()); // Prevent XSS attacks
app.use(hpp()); // Prevent HTTP parameter pollution

// Rate limiting
app.use(`/api/${config.API_VERSION}`, apiLimiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Track HTTP requests for metrics
app.use(trackHttpRequest);

// Mount routes
app.use(`/api/${config.API_VERSION}/auth`, authRoutes);
app.use(`/api/${config.API_VERSION}/avatars`, avatarRoutes);
app.use(`/api/${config.API_VERSION}/monitoring`, monitoringRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Figura Cloud Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// API documentation route (placeholder)
app.get(`/api/${config.API_VERSION}`, (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Figura Cloud API',
    version: config.API_VERSION,
    endpoints: {
      auth: `/api/${config.API_VERSION}/auth`,
      avatars: `/api/${config.API_VERSION}/avatars`,
      monitoring: `/api/${config.API_VERSION}/monitoring`,
    },
    documentation: '/api/docs',
  });
});

// Serve static files (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Resource not found',
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered',
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      success: false,
      message,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  // Default error
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(config.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

module.exports = app;
