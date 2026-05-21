const { Sequelize } = require('sequelize');
const config = require('./index');
const logger = require('../utils/logger');

// Use SQLite for development if PostgreSQL is not available
const isDev = config.NODE_ENV === 'development';
const useSQLite = isDev && (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost:5432'));

let sequelize;

if (useSQLite) {
  logger.info('Using SQLite for development (PostgreSQL not configured or unavailable)');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './figura-cloud.db',
    logging: isDev ? (msg) => logger.debug(msg) : false,
  });
} else {
  sequelize = new Sequelize(config.DATABASE_URL, {
    dialect: 'postgres',
    logging: isDev ? (msg) => logger.debug(msg) : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  });
}

const connectDB = async () => {
  try {
    // Test connection
    await sequelize.authenticate();
    logger.info('PostgreSQL Connected successfully');

    // Sync models (in development mode, this will create tables)
    if (config.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized');
    }

    // Handle connection events
    sequelize.connectionManager.on('error', (err) => {
      logger.error(`PostgreSQL connection error: ${err.message}`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await sequelize.close();
      logger.info('PostgreSQL connection closed through app termination');
      process.exit(0);
    });

    return sequelize;
  } catch (error) {
    logger.error(`Error connecting to PostgreSQL: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
