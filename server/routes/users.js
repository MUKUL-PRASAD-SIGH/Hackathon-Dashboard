const express = require('express');
const router = express.Router();
const UserMongoDB = require('../models/UserMongoDB');
const Hackathon = require('../models/Hackathon');
const { asyncHandler } = require('../middleware/errorHandler');

// Test endpoint
router.get('/test', (req, res) => {
  console.log('✅ Users test endpoint hit');
  res.json({ success: true, message: 'Users API is working!' });
});

// Debug endpoint
router.get('/debug', (req, res) => {
  console.log('🔍 Users debug endpoint hit');
  res.json({ success: true, message: 'Users routes are loaded', timestamp: new Date() });
});

console.log('🔍 Users routes file loaded successfully');

const authMiddleware = (req, res, next) => {
  // Skip rate limiting for profile routes
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'No token provided' } });
  }
  
  try {
    const userData = JSON.parse(Buffer.from(token, 'base64').toString());
    req.user = userData;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: { message: 'Invalid token' } });
  }
};

// Get user profile
router.get('/profile/:userId?', authMiddleware, asyncHandler(async (req, res) => {
  const targetEmail = req.params.userId || req.user.email;
  const currentEmail = req.user.email;
  const isOwnProfile = targetEmail === currentEmail;
  
  console.log('Profile request - targetUserId:', targetUserId, 'currentUserId:', currentUserId);
  
  const user = await UserMongoDB.findOne({ email: targetEmail })
    .select('-password');
    
  console.log('Found user:', user ? { name: user.name, email: user.email } : 'null');
    
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }

  // Check if current user can view this profile
  const currentUser = await UserMongoDB.findOne({ email: currentEmail });
  const isFriend = currentUser.isFriendWith(targetEmail);
  const canViewProfile = isOwnProfile || user.profile.isPublic || isFriend;
  
  if (!canViewProfile) {
    return res.status(403).json({
      success: false,
      error: { message: 'Profile is private' },
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        profile: { isPublic: false }
      }
    });
  }

  // Get user's hackathons
  const leaderHackathons = await Hackathon.find({ email: targetEmail })
    .select('name platform date status teamName')
    .sort({ createdAt: -1 });

  const memberHackathons = await Hackathon.find({ 
    'teamMembers.email': user.email 
  })
    .select('name platform date status teamName')
    .sort({ createdAt: -1 });

  const allHackathons = [...leaderHackathons, ...memberHackathons];
  const wonCount = allHackathons.filter(h => h.status === 'Won').length;
  
  // Get current team info for friends
  let currentTeamInfo = null;
  if (isFriend && user.currentTeam?.hackathonEmail) {
    const currentHackathon = await Hackathon.findOne({ email: user.currentTeam.hackathonEmail })
      .select('name teamName');
    if (currentHackathon) {
      currentTeamInfo = {
        hackathonName: currentHackathon.name,
        teamName: currentHackathon.teamName || 'Solo',
        role: user.currentTeam.role
      };
    }
  }

  // Check friendship status
  let friendshipStatus = 'none';
  if (isFriend) {
    friendshipStatus = 'friends';
  } else if (currentUser.friendRequests.sent.some(r => r.email === targetEmail)) {
    friendshipStatus = 'request_sent';
  } else if (currentUser.friendRequests.received.some(r => r.email === targetEmail)) {
    friendshipStatus = 'request_received';
  }

  const responseData = {
    success: true,
    user: {
      ...user.toObject(),
      hackathonsWon: wonCount,
      hackathonsParticipated: allHackathons.length,
      currentTeam: currentTeamInfo
    },
    hackathons: allHackathons,
    friendshipStatus,
    isOwnProfile
  };
  
  console.log('Sending profile response:', { name: responseData.user.name, email: responseData.user.email });
  
  res.json(responseData);
}));

// Update user profile
router.put('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const { bio, skills, experience, linkedin, github, portfolio, location, avatar, isPublic, name, email } = req.body;
  
  console.log('Profile update request:', req.body);
  
  const updateData = {
    'profile.bio': bio || '',
    'profile.skills': skills || [],
    'profile.experience': experience || '',
    'profile.linkedin': linkedin || '',
    'profile.github': github || '',
    'profile.portfolio': portfolio || '',
    'profile.location': location || '',
    'profile.avatar': avatar || '',
    'profile.isPublic': isPublic !== undefined ? isPublic : false
  };
  
  // Update name and email if provided
  if (name) updateData.name = name;
  if (email) updateData.email = email.toLowerCase();
  
  const user = await UserMongoDB.findOneAndUpdate(
    { email: req.user.email },
    { $set: updateData },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }

  const leaderHackathons = await Hackathon.find({ email: req.user.email });
  const memberHackathons = await Hackathon.find({ 'teamMembers.email': user.email });
  const allHackathons = [...leaderHackathons, ...memberHackathons];
  const wonCount = allHackathons.filter(h => h.status === 'Won').length;
  
  console.log('Profile updated:', user.name, user.email);
  
  res.json({
    success: true,
    user: {
      ...user.toObject(),
      hackathonsWon: wonCount,
      hackathonsParticipated: allHackathons.length
    },
    message: 'Profile updated successfully'
  });
}));

// Send friend request
router.post('/friend-request', authMiddleware, asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: { message: 'Email is required' }
    });
  }
  
  const targetUser = await UserMongoDB.findOne({ email: email.toLowerCase().trim() });
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }
  
  const currentUser = await UserMongoDB.findOne({ email: req.user.email });
  
  try {
    await currentUser.sendFriendRequest(targetUser.email);
    res.json({
      success: true,
      message: 'Friend request sent successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { message: error.message }
    });
  }
}));

// Accept friend request
router.post('/friend-request/accept', authMiddleware, asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  const currentUser = await UserMongoDB.findOne({ email: req.user.email });
  
  try {
    await currentUser.acceptFriendRequest(email);
    res.json({
      success: true,
      message: 'Friend request accepted'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { message: error.message }
    });
  }
}));

// Reject friend request
router.post('/friend-request/reject', authMiddleware, asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  const currentUser = await UserMongoDB.findOne({ email: req.user.email });
  
  try {
    await currentUser.rejectFriendRequest(email);
    res.json({
      success: true,
      message: 'Friend request rejected'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { message: error.message }
    });
  }
}));

// Remove friend
router.delete('/friend/:userId', authMiddleware, asyncHandler(async (req, res) => {
  const { email } = req.params;
  
  const currentUser = await UserMongoDB.findOne({ email: req.user.email });
  
  try {
    await currentUser.removeFriend(email);
    res.json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: { message: error.message }
    });
  }
}));

// Get friends list
router.get('/friends', authMiddleware, asyncHandler(async (req, res) => {
  const user = await UserMongoDB.findOne({ email: req.user.email })
    .select('friends friendRequests');
    
  res.json({
    success: true,
    friends: user.friends,
    sentRequests: user.friendRequests.sent,
    receivedRequests: user.friendRequests.received
  });
}));

// Search users by email
router.get('/search', authMiddleware, asyncHandler(async (req, res) => {
  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: { message: 'Email parameter is required' }
    });
  }
  
  const user = await UserMongoDB.findOne({ 
    email: email.toLowerCase().trim(),
    email: { $ne: req.user.email } // Exclude current user
  }).select('name email profile.avatar');
  
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }
  
  res.json({
    success: true,
    user
  });
}));

console.log('✅ Users routes module loaded');
module.exports = router;