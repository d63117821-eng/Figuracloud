const winston = require('winston');
const path = require('path');
const config = require('../config/index');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'figura-cloud-backend' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(path.dirname(config.LOG_FILE_PATH), 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: config.LOG_FILE_PATH,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Stream for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

module.exports = logger;
