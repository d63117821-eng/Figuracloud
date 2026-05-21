const rateLimit = require('express-rate-limit');
const config = require('../config');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS, // 15 minutes
  max: config.RATE_LIMIT_MAX_REQUESTS, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
  skipSuccessfulRequests: true,
});

// Upload rate limiter
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit each IP to 20 uploads per hour
  message: {
    success: false,
    message: 'Too many upload requests, please try again later.',
  },
});

// Download rate limiter
const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // limit each IP to 100 downloads per hour
  message: {
    success: false,
    message: 'Too many download requests, please try again later.',
  },
});

// API rate limiter for specific routes
const createRouteLimiter = (options = {}) => {
  return rateLimit({
    windowMs: options.windowMs || config.RATE_LIMIT_WINDOW_MS,
    max: options.max || config.RATE_LIMIT_MAX_REQUESTS,
    message: options.message || {
      success: false,
      message: 'Too many requests, please try again later.',
    },
    ...options,
  });
};

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  downloadLimiter,
  createRouteLimiter,
};
