const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const ActivityLog = sequelize.define('ActivityLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    references: {
      model: User,
      key: 'id',
    },
  },
  action: {
    type: DataTypes.ENUM(
      'login',
      'logout',
      'avatar.create',
      'avatar.update',
      'avatar.delete',
      'avatar.download',
      'avatar.like',
      'avatar.comment',
      'user.update',
      'user.delete',
      'admin.ban',
      'admin.unban',
      'admin.feature',
      'system.maintenance'
    ),
    allowNull: false,
  },
  resourceType: {
    type: DataTypes.ENUM('user', 'avatar', 'comment', 'system'),
    allowNull: false,
    field: 'resource_type',
  },
  resourceId: {
    type: DataTypes.UUID,
    field: 'resource_id',
  },
  details: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  ipAddress: {
    type: DataTypes.STRING,
    field: 'ip_address',
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent',
  },
  status: {
    type: DataTypes.ENUM('success', 'failure', 'pending'),
    defaultValue: 'success',
  },
  errorMessage: {
    type: DataTypes.TEXT,
    field: 'error_message',
  },
}, {
  timestamps: true,
  tableName: 'activity_logs',
});

// Associations
ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(ActivityLog, { foreignKey: 'userId', as: 'activityLogs' });

module.exports = ActivityLog;
