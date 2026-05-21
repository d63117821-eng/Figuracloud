const mongoose = require('mongoose');

const avatarSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Avatar name is required'],
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    file: {
      luaScript: {
        type: String,
        required: true,
      },
      thumbnail: {
        type: String,
      },
      size: {
        type: Number,
        required: true,
      },
      hash: {
        type: String,
        required: true,
      },
    },
    category: {
      type: String,
      enum: ['anime', 'realistic', 'cartoon', 'fantasy', 'sci-fi', 'other'],
      default: 'other',
    },
    tags: [String],
    visibility: {
      type: String,
      enum: ['public', 'private', 'unlisted'],
      default: 'public',
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'rejected', 'archived'],
      default: 'active',
    },
    version: {
      type: String,
      default: '1.0.0',
    },
    figuraVersion: {
      type: String,
      required: true,
    },
    stats: {
      views: { type: Number, default: 0 },
      downloads: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
    },
    metadata: {
      author: String,
      license: {
        type: String,
        default: 'CC BY-NC-SA 4.0',
      },
      sourceUrl: String,
      compatibility: [String],
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
avatarSchema.index({ owner: 1, createdAt: -1 });
avatarSchema.index({ visibility: 1, status: 1 });
avatarSchema.index({ category: 1, tags: 1 });
avatarSchema.index({ name: 'text', description: 'text', tags: 'text' });
avatarSchema.index({ 'stats.views': -1 });
avatarSchema.index({ 'stats.downloads': -1 });
avatarSchema.index({ 'stats.likes': -1 });
avatarSchema.index({ isFeatured: 1, createdAt: -1 });

// Virtual for download count
avatarSchema.virtual('downloadCount').get(function () {
  return this.stats.downloads;
});

// Methods
avatarSchema.methods.incrementViews = function () {
  this.stats.views += 1;
  return this.save();
};

avatarSchema.methods.incrementDownloads = function () {
  this.stats.downloads += 1;
  return this.save();
};

avatarSchema.methods.incrementLikes = function () {
  this.stats.likes += 1;
  return this.save();
};

// Static methods
avatarSchema.statics.search = function (query) {
  return this.find({
    $text: { $search: query },
    visibility: 'public',
    status: 'active',
  });
};

module.exports = mongoose.model('Avatar', avatarSchema);
