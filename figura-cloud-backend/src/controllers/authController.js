const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const config = require('../config');
const logger = require('../utils/logger');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  });
};

// Generate refresh token
const generateRefreshToken = (id) => {
  return jwt.sign({ id }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRE,
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  const userObj = user.toObject();
  delete userObj.password;

  res.status(statusCode).json({
    success: true,
    message,
    token,
    refreshToken,
    expires: config.JWT_EXPIRE,
    user: userObj,
  });
};

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, minecraftUsername } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or username',
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password,
      minecraftUsername,
    });

    // Log activity
    await ActivityLog.create({
      user: user._id,
      action: 'user.create',
      resource: { type: 'user', id: user._id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    sendTokenResponse(user, 201, res, 'User registered successfully');
  } catch (error) {
    logger.error('Register error:', error);
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated',
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Log activity
    await ActivityLog.create({
      user: user._id,
      action: 'login',
      resource: { type: 'user', id: user._id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    sendTokenResponse(user, 200, res, 'Login successful');
  } catch (error) {
    logger.error('Login error:', error);
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    // Log activity
    await ActivityLog.create({
      user: req.user._id,
      action: 'logout',
      resource: { type: 'user', id: req.user._id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error:', error);
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    logger.error('Get me error:', error);
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/v1/auth/me
// @access  Private
exports.updateMe = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      username: req.body.username,
      email: req.body.email,
      bio: req.body.bio,
      minecraftUsername: req.body.minecraftUsername,
      settings: req.body.settings,
    };

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    logger.error('Update me error:', error);
    next(error);
  }
};

// @desc    Update password
// @route   PUT /api/v1/auth/me/password
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res, 'Password updated successfully');
  } catch (error) {
    logger.error('Update password error:', error);
    next(error);
  }
};

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }

    sendTokenResponse(user, 200, res, 'Token refreshed successfully');
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
    });
  }
};

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');

    // TODO: Save hashed reset token to user and send email

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to email',
      resetToken, // Remove in production
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    next(error);
  }
};

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    // TODO: Verify token and update password

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    next(error);
  }
};
