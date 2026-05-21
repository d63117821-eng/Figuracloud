const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
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
        'system.maintenance',
      ],
    },
    resource: {
      type: {
        type: String,
        enum: ['user', 'avatar', 'comment', 'system'],
        required: true,
      },
      id: mongoose.Schema.Types.ObjectId,
    },
    details: {
      type: Map,
      of: String,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'pending'],
      default: 'success',
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ 'resource.type': 1, 'resource.id': 1 });
activityLogSchema.index({ status: 1, createdAt: -1 });

// TTL index to auto-delete old logs (optional, e.g., keep for 90 days)
// activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
