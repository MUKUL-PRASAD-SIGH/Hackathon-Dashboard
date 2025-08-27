const express = require('express');
const router = express.Router();
const UserMongoDB = require('../models/UserMongoDB');
const Hackathon = require('../models/Hackathon');
const { asyncHandler } = require('../middleware/errorHandler');

// Security middleware - only allow localhost in development
const debugSecurity = (req, res, next) => {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ success: false, error: { message: 'Not found' } });
  }
  
  // Only allow localhost
  const clientIP = req.ip || req.connection.remoteAddress;
  const allowedIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
  
  if (!allowedIPs.includes(clientIP)) {
    return res.status(403).json({ 
      success: false, 
      error: { message: 'Access denied - localhost only' } 
    });
  }
  
  next();
};

// Apply security to all debug routes
router.use(debugSecurity);

// Get all users in MongoDB (DEVELOPMENT ONLY)
router.get('/users', asyncHandler(async (req, res) => {
  const users = await UserMongoDB.find({}, '-password -loginAttempts -lockUntil').sort({ createdAt: -1 });
  
  res.json({
    success: true,
    users: users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt
    })),
    count: users.length,
    warning: 'DEBUG ENDPOINT - DEVELOPMENT ONLY'
  });
}));

// Get all hackathons in MongoDB (DEVELOPMENT ONLY)
router.get('/hackathons', asyncHandler(async (req, res) => {
  const hackathons = await Hackathon.find({})
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });
  
  res.json({
    success: true,
    hackathons,
    count: hackathons.length,
    warning: 'DEBUG ENDPOINT - DEVELOPMENT ONLY'
  });
}));

// Database stats (DEVELOPMENT ONLY)
router.get('/stats', asyncHandler(async (req, res) => {
  const userCount = await UserMongoDB.countDocuments();
  const hackathonCount = await Hackathon.countDocuments();
  
  res.json({
    success: true,
    stats: {
      users: userCount,
      hackathons: hackathonCount,
      environment: process.env.NODE_ENV
    },
    warning: 'DEBUG ENDPOINT - DEVELOPMENT ONLY'
  });
}));

module.exports = router;