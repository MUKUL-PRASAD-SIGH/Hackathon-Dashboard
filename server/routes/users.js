const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const UserMongoDB = require('../models/UserMongoDB');
const DirectMessage = require('../models/DirectMessage');
const Hackathon = require('../models/Hackathon');
const ChatPresence = require('../models/ChatPresence');
const { asyncHandler } = require('../middleware/errorHandler');
const { verifyToken } = require('../middleware/security');
const { ensureDir, addFile } = require('../utils/tempFileStore');

const normalizeEmail = (email) => (email || '').toLowerCase().trim();

const uploadDir = path.join(__dirname, '..', 'temp-uploads');
ensureDir(uploadDir);

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const unique = `${Date.now()}_${Math.round(Math.random() * 1e9)}_${safeName}`;
      cb(null, unique);
    }
  }),
  limits: { fileSize: 1 * 1024 * 1024 }
});

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
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'No token provided' } });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: { message: 'Invalid or expired token' } });
  }
};

const requireFriendship = async (currentEmail, friendEmail) => {
  const normalizedCurrent = normalizeEmail(currentEmail);
  const normalizedFriend = normalizeEmail(friendEmail);

  const currentUser = await UserMongoDB.findOne({ email: normalizedCurrent })
    .select('friends name email');

  if (!currentUser) {
    return { error: { status: 404, message: 'User not found' } };
  }

  const isFriend = currentUser.friends.some(f => normalizeEmail(f.email) === normalizedFriend);
  if (!isFriend) {
    return { error: { status: 403, message: 'You can only message friends' } };
  }

  const friendUser = await UserMongoDB.findOne({ email: normalizedFriend })
    .select('name email');

  if (!friendUser) {
    return { error: { status: 404, message: 'Friend not found' } };
  }

  return { currentUser, friendUser };
};

const getDmKey = (idA, idB) => {
  const parts = [String(idA), String(idB)].sort();
  return `dm:${parts.join(':')}`;
};

// Get user profile
router.get('/profile/:userId?', authMiddleware, asyncHandler(async (req, res) => {
  const param = req.params.userId;
  const currentEmail = normalizeEmail(req.user.email);
  const targetEmail = normalizeEmail(param || req.user.email);
  const isOwnProfile = targetEmail === currentEmail;

  console.log('Profile request - targetEmail:', targetEmail, 'currentEmail:', currentEmail);

  let user = await UserMongoDB.findOne({ email: targetEmail }).select('-password');
  if (!user && param && /^[0-9a-fA-F]{24}$/.test(param)) {
    user = await UserMongoDB.findById(param).select('-password');
  }

  console.log('Found user:', user ? { name: user.name, email: user.email } : 'null');

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }

  // Check if current user can view this profile
  const currentUser = await UserMongoDB.findOne({ email: currentEmail });
  const isFriend = currentUser?.isFriendWith(targetEmail);
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
  } else if (currentUser.friendRequests.sent.some(r => normalizeEmail(r.email) === targetEmail)) {
    friendshipStatus = 'request_sent';
  } else if (currentUser.friendRequests.received.some(r => normalizeEmail(r.email) === targetEmail)) {
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

  const normalizedEmail = normalizeEmail(email);
  const currentEmail = normalizeEmail(req.user.email);

  if (normalizedEmail === currentEmail) {
    return res.status(400).json({
      success: false,
      error: { message: 'Cannot send friend request to yourself' }
    });
  }
  const targetUser = await UserMongoDB.findOne({
    email: { $regex: new RegExp('^' + normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
  });
  if (!targetUser) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found' }
    });
  }

  const currentUser = await UserMongoDB.findOne({ email: currentEmail });

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
  const currentEmail = normalizeEmail(req.user.email);
  const user = await UserMongoDB.findOne({ email: currentEmail })
    .select('friends friendRequests');

  const friendEmails = user.friends.map(f => normalizeEmail(f.email));
  const sentEmails = user.friendRequests.sent.map(r => normalizeEmail(r.email));
  const receivedEmails = user.friendRequests.received.map(r => normalizeEmail(r.email));
  const allEmails = [...new Set([...friendEmails, ...sentEmails, ...receivedEmails])];

  const users = await UserMongoDB.find({ email: { $in: allEmails } })
    .select('name email profile.avatar');

  const userMap = new Map(users.map(u => [u.email, u]));

  const userHackathons = await Hackathon.find({
    $or: [
      { email: currentEmail },
      { 'teamMembers.email': currentEmail }
    ]
  }).select('name platform date teamMembers email');

  const getSharedHackathons = (friendEmail) => {
    const normalizedFriend = normalizeEmail(friendEmail);
    return userHackathons.filter(h => {
      if (h.email && normalizeEmail(h.email) === normalizedFriend) return true;
      return (h.teamMembers || []).some(m => normalizeEmail(m.email) === normalizedFriend);
    }).map(h => ({
      name: h.name,
      platform: h.platform,
      date: h.date
    }));
  };

  res.json({
    success: true,
    friends: user.friends.map(f => ({
      ...f.toObject?.() || f,
      user: userMap.get(f.email) || null,
      sharedHackathons: getSharedHackathons(f.email)
    })),
    sentRequests: user.friendRequests.sent.map(r => ({
      ...r.toObject?.() || r,
      user: userMap.get(r.email) || null,
      sharedHackathons: getSharedHackathons(r.email)
    })),
    receivedRequests: user.friendRequests.received.map(r => ({
      ...r.toObject?.() || r,
      user: userMap.get(r.email) || null,
      sharedHackathons: getSharedHackathons(r.email)
    }))
  });
}));

// Get direct messages with a friend
router.get('/dm/:email', authMiddleware, asyncHandler(async (req, res) => {
  const friendEmail = req.params.email;
  if (!friendEmail) {
    return res.status(400).json({ success: false, error: { message: 'Friend email is required' } });
  }

  const friendship = await requireFriendship(req.user.email, friendEmail);
  if (friendship.error) {
    return res.status(friendship.error.status).json({
      success: false,
      error: { message: friendship.error.message }
    });
  }
  const { currentUser, friendUser } = friendship;

  const chatKey = getDmKey(currentUser._id, friendUser._id);
  await ChatPresence.findOneAndUpdate(
    { chatKey, userId: currentUser._id },
    { lastSeenAt: new Date() },
    { upsert: true, new: true }
  );

  await DirectMessage.updateMany(
    {
      participants: { $all: [currentUser._id, friendUser._id] },
      sender: { $ne: currentUser._id },
      seenBy: { $ne: currentUser._id }
    },
    { $addToSet: { seenBy: currentUser._id } }
  );

  const messages = await DirectMessage.find({
    $or: [
      { sender: currentUser._id, recipient: friendUser._id },
      { sender: friendUser._id, recipient: currentUser._id }
    ]
  })
    .sort({ createdAt: 1 })
    .limit(500)
    .populate('sender', 'name email')
    .populate('recipient', 'name email')
    .populate('seenBy', 'name email');

  res.json({
    success: true,
    friend: { name: friendUser.name, email: friendUser.email },
    messages: messages.map(m => ({
      id: m._id,
      content: m.content,
      messageType: m.messageType,
      metadata: m.metadata || null,
      sender: m.sender ? { name: m.sender.name, email: m.sender.email } : null,
      recipient: m.recipient ? { name: m.recipient.name, email: m.recipient.email } : null,
      createdAt: m.createdAt,
      seenBy: (m.seenBy || []).map(u => ({
        name: u.name,
        email: u.email
      }))
    })),
    presence: await (async () => {
      const presenceDocs = await ChatPresence.find({
        chatKey,
        userId: { $in: [currentUser._id, friendUser._id] }
      }).select('userId lastSeenAt');

      const presenceMap = new Map(presenceDocs.map(p => [String(p.userId), p.lastSeenAt]));
      return [
        { name: currentUser.name, email: currentUser.email, lastSeenAt: presenceMap.get(String(currentUser._id)) || null },
        { name: friendUser.name, email: friendUser.email, lastSeenAt: presenceMap.get(String(friendUser._id)) || null }
      ];
    })()
  });
}));

// Send direct message to a friend
router.post('/dm/:email', authMiddleware, asyncHandler(async (req, res) => {
  const friendEmail = req.params.email;
  const content = (req.body?.content || '').trim();

  if (!friendEmail) {
    return res.status(400).json({ success: false, error: { message: 'Friend email is required' } });
  }
  if (!content) {
    return res.status(400).json({ success: false, error: { message: 'Message cannot be empty' } });
  }

  const friendship = await requireFriendship(req.user.email, friendEmail);
  if (friendship.error) {
    return res.status(friendship.error.status).json({
      success: false,
      error: { message: friendship.error.message }
    });
  }
  const { currentUser, friendUser } = friendship;

  const newMessage = await DirectMessage.create({
    participants: [currentUser._id, friendUser._id],
    sender: currentUser._id,
    recipient: friendUser._id,
    content,
    messageType: 'text',
    seenBy: [currentUser._id]
  });

  await newMessage.populate('sender', 'name email');
  await newMessage.populate('recipient', 'name email');

  const chatKey = getDmKey(currentUser._id, friendUser._id);
  await ChatPresence.findOneAndUpdate(
    { chatKey, userId: currentUser._id },
    { lastSeenAt: new Date() },
    { upsert: true, new: true }
  );

  res.status(201).json({
    success: true,
    message: {
      id: newMessage._id,
      content: newMessage.content,
      messageType: newMessage.messageType,
      metadata: newMessage.metadata || null,
      sender: newMessage.sender ? { name: newMessage.sender.name, email: newMessage.sender.email } : null,
      recipient: newMessage.recipient ? { name: newMessage.recipient.name, email: newMessage.recipient.email } : null,
      createdAt: newMessage.createdAt,
      seenBy: [{ name: newMessage.sender.name, email: newMessage.sender.email }]
    }
  });
}));

// Send file via direct message (max 1MB, expires in 6 hours)
router.post('/dm/:email/file', authMiddleware, upload.single('file'), asyncHandler(async (req, res) => {
  const friendEmail = req.params.email;

  if (!req.file) {
    return res.status(400).json({ success: false, error: { message: 'File is required (max 1MB)' } });
  }

  const friendship = await requireFriendship(req.user.email, friendEmail);
  if (friendship.error) {
    fs.unlinkSync(req.file.path);
    return res.status(friendship.error.status).json({
      success: false,
      error: { message: friendship.error.message }
    });
  }
  const { currentUser, friendUser } = friendship;

  const { token, expiresAt } = addFile({
    filePath: req.file.path,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    allowedUserIds: [currentUser._id, friendUser._id]
  });

  const fileUrl = `/api/files/${token}`;

  const newMessage = await DirectMessage.create({
    participants: [currentUser._id, friendUser._id],
    sender: currentUser._id,
    recipient: friendUser._id,
    content: req.file.originalname,
    messageType: 'file',
    metadata: {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      fileUrl,
      expiresAt
    },
    seenBy: [currentUser._id]
  });

  await newMessage.populate('sender', 'name email');
  await newMessage.populate('recipient', 'name email');

  const chatKey = getDmKey(currentUser._id, friendUser._id);
  await ChatPresence.findOneAndUpdate(
    { chatKey, userId: currentUser._id },
    { lastSeenAt: new Date() },
    { upsert: true, new: true }
  );

  res.status(201).json({
    success: true,
    message: {
      id: newMessage._id,
      content: newMessage.content,
      messageType: newMessage.messageType,
      metadata: newMessage.metadata || null,
      sender: newMessage.sender ? { name: newMessage.sender.name, email: newMessage.sender.email } : null,
      recipient: newMessage.recipient ? { name: newMessage.recipient.name, email: newMessage.recipient.email } : null,
      createdAt: newMessage.createdAt,
      seenBy: [{ name: newMessage.sender.name, email: newMessage.sender.email }]
    }
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

  const normalizedEmail = normalizeEmail(email);
  const currentEmail = normalizeEmail(req.user.email);
  const user = await UserMongoDB.findOne({
    $and: [
      { email: normalizedEmail },
      { email: { $ne: currentEmail } }
    ]
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
