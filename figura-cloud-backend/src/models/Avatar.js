const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Avatar = sequelize.define('Avatar', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [3, 100],
    },
  },
  description: {
    type: DataTypes.TEXT,
    validate: {
      len: [0, 1000],
    },
  },
  ownerId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'owner_id',
    references: {
      model: User,
      key: 'id',
    },
  },
  file: {
    luaScript: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    thumbnail: {
      type: DataTypes.STRING,
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  category: {
    type: DataTypes.ENUM('anime', 'realistic', 'cartoon', 'fantasy', 'sci-fi', 'other'),
    defaultValue: 'other',
  },
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
  },
  visibility: {
    type: DataTypes.ENUM('public', 'private', 'unlisted'),
    defaultValue: 'public',
  },
  status: {
    type: DataTypes.ENUM('active', 'pending', 'rejected', 'archived'),
    defaultValue: 'active',
  },
  version: {
    type: DataTypes.STRING,
    defaultValue: '1.0.0',
  },
  figuraVersion: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  stats: {
    type: DataTypes.JSONB,
    defaultValue: {
      views: 0,
      downloads: 0,
      likes: 0,
      comments: 0,
    },
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {
      license: 'CC BY-NC-SA 4.0',
      compatibility: [],
    },
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  timestamps: true,
  tableName: 'avatars',
});

// Associations
Avatar.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
User.hasMany(Avatar, { foreignKey: 'ownerId', as: 'avatars' });

// Instance methods
Avatar.prototype.incrementViews = async function() {
  this.stats.views = (this.stats.views || 0) + 1;
  await this.save();
};

Avatar.prototype.incrementDownloads = async function() {
  this.stats.downloads = (this.stats.downloads || 0) + 1;
  await this.save();
};

Avatar.prototype.incrementLikes = async function() {
  this.stats.likes = (this.stats.likes || 0) + 1;
  await this.save();
};

// Virtual for downloadCount
Object.defineProperty(Avatar.prototype, 'downloadCount', {
  get() {
    return this.stats?.downloads || 0;
  }
});

module.exports = Avatar;
