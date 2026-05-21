const Avatar = require('../models/Avatar');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const config = require('../config');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Calculate file hash
const calculateHash = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// @desc    Get all avatars with filtering, sorting, and pagination
// @route   GET /api/v1/avatars
// @access  Public (with optional auth)
exports.getAllAvatars = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Avatar.countDocuments();

    // Build query
    let query = { visibility: 'public', status: 'active' };

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // If user is authenticated, include their private avatars
    if (req.user) {
      query.$or = [
        query,
        { owner: req.user._id, visibility: { $in: ['private', 'unlisted'] } },
      ];
    }

    // Sort
    let sortOption = {};
    if (req.query.sort) {
      const sortOrder = req.query.order === 'asc' ? 1 : -1;
      sortOption[req.query.sort] = sortOrder;
    } else {
      sortOption = { createdAt: -1 };
    }

    const avatars = await Avatar.find(query)
      .populate('owner', 'username avatar')
      .sort(sortOption)
      .limit(limit)
      .skip(startIndex);

    // Pagination result
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: endIndex < total,
      hasPrevPage: startIndex > 0,
    };

    res.status(200).json({
      success: true,
      count: avatars.length,
      pagination,
      data: avatars,
    });
  } catch (error) {
    logger.error('Get all avatars error:', error);
    next(error);
  }
};

// @desc    Get single avatar
// @route   GET /api/v1/avatars/:id
// @access  Public (with optional auth)
exports.getAvatarById = async (req, res, next) => {
  try {
    const avatar = await Avatar.findById(req.params.id).populate(
      'owner',
      'username avatar minecraftUsername'
    );

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found',
      });
    }

    // Check permissions
    if (
      avatar.visibility !== 'public' &&
      (!req.user ||
        (avatar.owner._id.toString() !== req.user._id.toString() &&
          !['admin', 'superadmin'].includes(req.user.role)))
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this avatar',
      });
    }

    // Increment views
    await avatar.incrementViews();

    res.status(200).json({
      success: true,
      data: avatar,
    });
  } catch (error) {
    logger.error('Get avatar by ID error:', error);
    next(error);
  }
};

// @desc    Create new avatar
// @route   POST /api/v1/avatars
// @access  Private
exports.createAvatar = async (req, res, next) => {
  try {
    const { name, description, category, tags, visibility, figuraVersion } =
      req.body;

    // Check if files were uploaded
    if (!req.files || !req.files.luaScript) {
      return res.status(400).json({
        success: false,
        message: 'Lua script file is required',
      });
    }

    const luaFile = req.files.luaScript[0];
    const thumbnailFile = req.files.thumbnail?.[0];

    // Calculate file hash
    const hash = await calculateHash(luaFile.path);

    // Create avatar document
    const avatarData = {
      name,
      description,
      owner: req.user._id,
      file: {
        luaScript: luaFile.path,
        thumbnail: thumbnailFile ? thumbnailFile.path : null,
        size: luaFile.size,
        hash,
      },
      category: category || 'other',
      tags: tags || [],
      visibility: visibility || 'public',
      figuraVersion,
      metadata: {
        author: req.user.username,
      },
    };

    const avatar = await Avatar.create(avatarData);

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.avatarsCreated': 1 },
    });

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'avatar.create',
      resource: { type: 'avatar', id: avatar._id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(201).json({
      success: true,
      message: 'Avatar created successfully',
      data: avatar,
    });
  } catch (error) {
    logger.error('Create avatar error:', error);

    // Clean up uploaded files on error
    if (req.files) {
      Object.values(req.files).flat().forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    next(error);
  }
};

// @desc    Update avatar
// @route   PUT /api/v1/avatars/:id
// @access  Private
exports.updateAvatar = async (req, res, next) => {
  try {
    let avatar = await Avatar.findById(req.params.id);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found',
      });
    }

    // Check ownership or admin role
    if (
      avatar.owner.toString() !== req.user._id.toString() &&
      !['admin', 'superadmin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this avatar',
      });
    }

    // Update fields
    const updateFields = {
      name: req.body.name,
      description: req.body.description,
      category: req.body.category,
      tags: req.body.tags,
      visibility: req.body.visibility,
      version: req.body.version,
    };

    // Handle file updates if new files are uploaded
    if (req.files) {
      const luaFile = req.files.luaScript?.[0];
      const thumbnailFile = req.files.thumbnail?.[0];

      if (luaFile) {
        // Delete old file
        if (avatar.file.luaScript && fs.existsSync(avatar.file.luaScript)) {
          fs.unlinkSync(avatar.file.luaScript);
        }

        const hash = await calculateHash(luaFile.path);
        updateFields['file.luaScript'] = luaFile.path;
        updateFields['file.size'] = luaFile.size;
        updateFields['file.hash'] = hash;
      }

      if (thumbnailFile) {
        // Delete old thumbnail
        if (avatar.file.thumbnail && fs.existsSync(avatar.file.thumbnail)) {
          fs.unlinkSync(avatar.file.thumbnail);
        }
        updateFields['file.thumbnail'] = thumbnailFile.path;
      }
    }

    avatar = await Avatar.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
      runValidators: true,
    });

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'avatar.update',
      resource: { type: 'avatar', id: avatar._id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: new Map(Object.entries(updateFields)),
    });

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      data: avatar,
    });
  } catch (error) {
    logger.error('Update avatar error:', error);
    next(error);
  }
};

// @desc    Delete avatar
// @route   DELETE /api/v1/avatars/:id
// @access  Private
exports.deleteAvatar = async (req, res, next) => {
  try {
    const avatar = await Avatar.findById(req.params.id);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found',
      });
    }

    // Check ownership or admin role
    if (
      avatar.owner.toString() !== req.user._id.toString() &&
      !['admin', 'superadmin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this avatar',
      });
    }

    // Delete files
    if (avatar.file.luaScript && fs.existsSync(avatar.file.luaScript)) {
      fs.unlinkSync(avatar.file.luaScript);
    }
    if (avatar.file.thumbnail && fs.existsSync(avatar.file.thumbnail)) {
      fs.unlinkSync(avatar.file.thumbnail);
    }

    await avatar.deleteOne();

    // Update user stats
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.avatarsCreated': -1 },
    });

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'avatar.delete',
      resource: { type: 'avatar', id: avatar._id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Avatar deleted successfully',
    });
  } catch (error) {
    logger.error('Delete avatar error:', error);
    next(error);
  }
};

// @desc    Download avatar
// @route   GET /api/v1/avatars/:id/download
// @access  Private
exports.downloadAvatar = async (req, res, next) => {
  try {
    const avatar = await Avatar.findById(req.params.id);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found',
      });
    }

    // Check permissions
    if (
      avatar.visibility !== 'public' &&
      (!req.user || avatar.owner.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this avatar',
      });
    }

    // Check if file exists
    if (!fs.existsSync(avatar.file.luaScript)) {
      return res.status(404).json({
        success: false,
        message: 'Avatar file not found',
      });
    }

    // Increment downloads
    await avatar.incrementDownloads();

    // Update user stats
    await User.findByIdAndUpdate(avatar.owner, {
      $inc: { 'stats.totalDownloads': 1 },
    });

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'avatar.download',
      resource: { type: 'avatar', id: avatar._id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Send file
    res.download(avatar.file.luaScript, `${avatar.name}.lua`);
  } catch (error) {
    logger.error('Download avatar error:', error);
    next(error);
  }
};

// @desc    Like avatar
// @route   POST /api/v1/avatars/:id/like
// @access  Private
exports.likeAvatar = async (req, res, next) => {
  try {
    const avatar = await Avatar.findById(req.params.id);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found',
      });
    }

    await avatar.incrementLikes();

    res.status(200).json({
      success: true,
      message: 'Avatar liked successfully',
      likes: avatar.stats.likes,
    });
  } catch (error) {
    logger.error('Like avatar error:', error);
    next(error);
  }
};

// @desc    Unlike avatar
// @route   DELETE /api/v1/avatars/:id/like
// @access  Private
exports.unlikeAvatar = async (req, res, next) => {
  try {
    const avatar = await Avatar.findById(req.params.id);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found',
      });
    }

    if (avatar.stats.likes > 0) {
      avatar.stats.likes -= 1;
      await avatar.save();
    }

    res.status(200).json({
      success: true,
      message: 'Avatar unliked successfully',
      likes: avatar.stats.likes,
    });
  } catch (error) {
    logger.error('Unlike avatar error:', error);
    next(error);
  }
};

// @desc    Get avatars by user
// @route   GET /api/v1/avatars/user/:userId
// @access  Public
exports.getAvatarsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;

    let query = { owner: userId, visibility: 'public', status: 'active' };

    // If authenticated user is requesting their own avatars, include all
    if (req.user && req.user._id.toString() === userId) {
      query = { owner: userId };
    }

    const avatars = await Avatar.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: avatars.length,
      data: avatars,
    });
  } catch (error) {
    logger.error('Get avatars by user error:', error);
    next(error);
  }
};

// @desc    Get featured avatars
// @route   GET /api/v1/avatars/featured
// @access  Public
exports.getFeaturedAvatars = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const avatars = await Avatar.find({
      isFeatured: true,
      visibility: 'public',
      status: 'active',
    })
      .populate('owner', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: avatars.length,
      data: avatars,
    });
  } catch (error) {
    logger.error('Get featured avatars error:', error);
    next(error);
  }
};

// @desc    Search avatars
// @route   GET /api/v1/avatars/search
// @access  Public
exports.searchAvatars = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    const searchQuery = {
      $text: { $search: q },
      visibility: 'public',
      status: 'active',
    };

    const avatars = await Avatar.find(searchQuery)
      .populate('owner', 'username avatar')
      .sort({ score: { $meta: 'textScore' } })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.status(200).json({
      success: true,
      count: avatars.length,
      data: avatars,
    });
  } catch (error) {
    logger.error('Search avatars error:', error);
    next(error);
  }
};

// @desc    Get pending avatars (Admin)
// @route   GET /api/v1/avatars/admin/pending
// @access  Private (Admin)
exports.getPendingAvatars = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const avatars = await Avatar.find({ status: 'pending' })
      .populate('owner', 'username email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: avatars.length,
      data: avatars,
    });
  } catch (error) {
    logger.error('Get pending avatars error:', error);
    next(error);
  }
};

// @desc    Update avatar status (Admin)
// @route   PUT /api/v1/avatars/:id/status
// @access  Private (Admin)
exports.updateAvatarStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;

    const avatar = await Avatar.findByIdAndUpdate(
      req.params.id,
      {
        status,
        metadata: {
          rejectionReason: rejectionReason || null,
        },
      },
      { new: true }
    );

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found',
      });
    }

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'admin.update',
      resource: { type: 'avatar', id: avatar._id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: new Map([['status', status]]),
    });

    res.status(200).json({
      success: true,
      message: `Avatar ${status} successfully`,
      data: avatar,
    });
  } catch (error) {
    logger.error('Update avatar status error:', error);
    next(error);
  }
};

// @desc    Toggle featured status (Admin)
// @route   POST /api/v1/avatars/:id/feature
// @access  Private (Admin)
exports.toggleFeature = async (req, res, next) => {
  try {
    const avatar = await Avatar.findById(req.params.id);

    if (!avatar) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found',
      });
    }

    avatar.isFeatured = !avatar.isFeatured;
    await avatar.save();

    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'admin.feature',
      resource: { type: 'avatar', id: avatar._id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: new Map([['isFeatured', avatar.isFeatured]]),
    });

    res.status(200).json({
      success: true,
      message: `Avatar ${avatar.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: avatar,
    });
  } catch (error) {
    logger.error('Toggle feature error:', error);
    next(error);
  }
};
