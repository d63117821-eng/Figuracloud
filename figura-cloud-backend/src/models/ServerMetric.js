const mongoose = require('mongoose');

const serverMetricSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    cpu: {
      usage: { type: Number, required: true }, // percentage
      cores: { type: Number, required: true },
      load: [Number], // 1min, 5min, 15min
    },
    memory: {
      total: { type: Number, required: true },
      used: { type: Number, required: true },
      free: { type: Number, required: true },
      percentage: { type: Number, required: true },
    },
    disk: {
      total: { type: Number, required: true },
      used: { type: Number, required: true },
      free: { type: Number, required: true },
      percentage: { type: Number, required: true },
    },
    network: {
      bytesReceived: { type: Number, default: 0 },
      bytesTransmitted: { type: Number, default: 0 },
      connections: { type: Number, default: 0 },
    },
    application: {
      uptime: { type: Number, required: true },
      activeUsers: { type: Number, default: 0 },
      activeConnections: { type: Number, default: 0 },
      requestsPerMinute: { type: Number, default: 0 },
      averageResponseTime: { type: Number, default: 0 },
      errorRate: { type: Number, default: 0 },
    },
    database: {
      connections: { type: Number, default: 0 },
      queriesPerMinute: { type: Number, default: 0 },
      averageQueryTime: { type: Number, default: 0 },
    },
    cache: {
      hits: { type: Number, default: 0 },
      misses: { type: Number, default: 0 },
      hitRate: { type: Number, default: 0 },
      memoryUsage: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
serverMetricSchema.index({ timestamp: -1 });
serverMetricSchema.index({ createdAt: -1 });

// TTL index to auto-delete old metrics (e.g., keep for 30 days)
serverMetricSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 });

// Static methods
serverMetricSchema.statics.getAverageMetrics = function (startTime, endTime) {
  return this.aggregate([
    {
      $match: {
        timestamp: {
          $gte: new Date(startTime),
          $lte: new Date(endTime),
        },
      },
    },
    {
      $group: {
        _id: null,
        avgCpuUsage: { $avg: '$cpu.usage' },
        avgMemoryPercentage: { $avg: '$memory.percentage' },
        avgDiskPercentage: { $avg: '$disk.percentage' },
        avgActiveUsers: { $avg: '$application.activeUsers' },
        avgRequestsPerMinute: { $avg: '$application.requestsPerMinute' },
        avgResponseTime: { $avg: '$application.averageResponseTime' },
      },
    },
  ]);
};

module.exports = mongoose.model('ServerMetric', serverMetricSchema);
