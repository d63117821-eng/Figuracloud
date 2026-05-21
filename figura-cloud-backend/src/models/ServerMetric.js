const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ServerMetric = sequelize.define('ServerMetric', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  cpu: {
    type: DataTypes.JSONB,
    defaultValue: {
      usage: 0,
      cores: 1,
      load: [0, 0, 0],
    },
  },
  memory: {
    type: DataTypes.JSONB,
    defaultValue: {
      total: 0,
      used: 0,
      free: 0,
      percentage: 0,
    },
  },
  disk: {
    type: DataTypes.JSONB,
    defaultValue: {
      total: 0,
      used: 0,
      free: 0,
      percentage: 0,
    },
  },
  network: {
    type: DataTypes.JSONB,
    defaultValue: {
      bytesReceived: 0,
      bytesTransmitted: 0,
      connections: 0,
    },
  },
  application: {
    type: DataTypes.JSONB,
    defaultValue: {
      uptime: 0,
      activeUsers: 0,
      activeConnections: 0,
      requestsPerMinute: 0,
      averageResponseTime: 0,
      errorRate: 0,
    },
  },
  database: {
    type: DataTypes.JSONB,
    defaultValue: {
      connections: 0,
      queriesPerMinute: 0,
      averageQueryTime: 0,
    },
  },
  cache: {
    type: DataTypes.JSONB,
    defaultValue: {
      hits: 0,
      misses: 0,
      hitRate: 0,
      memoryUsage: 0,
    },
  },
}, {
  timestamps: true,
  tableName: 'server_metrics',
});

module.exports = ServerMetric;
