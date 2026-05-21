const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 30],
    },
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [8],
    },
  },
  role: {
    type: DataTypes.ENUM('user', 'moderator', 'admin', 'superadmin'),
    defaultValue: 'user',
  },
  avatar: {
    type: DataTypes.STRING,
    defaultValue: null,
  },
  bio: {
    type: DataTypes.TEXT,
    validate: {
      len: [0, 500],
    },
  },
  minecraftUsername: {
    type: DataTypes.STRING,
  },
  figuraId: {
    type: DataTypes.STRING,
    unique: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  lastLogin: {
    type: DataTypes.DATE,
  },
  permissions: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      theme: 'auto',
      language: 'en',
      notifications: {
        email: true,
        push: true,
      },
    },
  },
  stats: {
    type: DataTypes.JSONB,
    defaultValue: {
      avatarsCreated: 0,
      totalDownloads: 0,
      totalViews: 0,
    },
  },
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(process.env.BCRYPT_ROUNDS || 12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(process.env.BCRYPT_ROUNDS || 12);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
  },
});

// Instance methods
User.prototype.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

User.prototype.updateLastLogin = async function() {
  this.lastLogin = new Date();
  await this.save();
};

// Virtual for fullName (handled via getter)
Object.defineProperty(User.prototype, 'fullName', {
  get() {
    return this.username;
  }
});

module.exports = User;
