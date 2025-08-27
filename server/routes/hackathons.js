const express = require('express');
const router = express.Router();
const Hackathon = require('../models/Hackathon');
const { asyncHandler } = require('../middleware/errorHandler');

// Simple auth middleware (extract user from token)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'No token provided' } });
  }
  
  // Simple token decode (in production, use proper JWT verification)
  try {
    const userData = JSON.parse(Buffer.from(token, 'base64').toString());
    req.user = userData;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: { message: 'Invalid token' } });
  }
};

// Get all hackathons for authenticated user
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  console.log('🔍 GET hackathons - User ID:', req.user.id);
  console.log('🔍 User object:', req.user);
  
  const hackathons = await Hackathon.find({ userId: req.user.id })
    .sort({ createdAt: -1 });
  
  console.log('🔍 Found hackathons:', hackathons.length);
  
  res.json({
    success: true,
    hackathons,
    count: hackathons.length,
    debug: {
      userId: req.user.id,
      userEmail: req.user.email
    }
  });
}));

// Create new hackathon
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  console.log('🚀 CREATE hackathon - User ID:', req.user.id);
  console.log('🚀 User object:', req.user);
  console.log('🚀 Hackathon data:', req.body);
  
  const hackathonData = {
    ...req.body,
    userId: req.user.id
  };
  
  const hackathon = new Hackathon(hackathonData);
  await hackathon.save();
  
  console.log('✅ Hackathon saved with ID:', hackathon._id);
  
  res.status(201).json({
    success: true,
    message: 'Hackathon created successfully',
    hackathon,
    debug: {
      userId: req.user.id,
      hackathonId: hackathon._id
    }
  });
}));

// Update hackathon
router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    req.body,
    { new: true, runValidators: true }
  );
  
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found' }
    });
  }
  
  res.json({
    success: true,
    message: 'Hackathon updated successfully',
    hackathon
  });
}));

// Delete hackathon
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.findOneAndDelete({ 
    _id: req.params.id, 
    userId: req.user.id 
  });
  
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found' }
    });
  }
  
  res.json({
    success: true,
    message: 'Hackathon deleted successfully'
  });
}));

module.exports = router;