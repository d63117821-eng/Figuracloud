require('dotenv').config();

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const PORT = config.PORT || 3000;

// Start server
const server = app.listen(PORT, () => {
  logger.info(
    `Figura Cloud Backend running in ${config.NODE_ENV} mode on port ${PORT}`
  );
  logger.info(`API Version: ${config.API_VERSION}`);
  logger.info(`Health Check: http://localhost:${PORT}/health`);
  logger.info(`API Endpoint: http://localhost:${PORT}/api/${config.API_VERSION}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated');
  });
});

module.exports = server;
