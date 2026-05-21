const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Avatar = require('./Avatar');
const ActivityLog = require('./ActivityLog');
const ServerMetric = require('./ServerMetric');

// Export all models
module.exports = {
  sequelize,
  User,
  Avatar,
  ActivityLog,
  ServerMetric,
};
