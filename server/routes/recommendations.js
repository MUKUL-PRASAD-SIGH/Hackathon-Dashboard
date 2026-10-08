const express = require('express');
const router = express.Router();
const Hackathon = require('../models/Hackathon');
const UserMongoDB = require('../models/UserMongoDB');
const { asyncHandler } = require('../middleware/errorHandler');
const { verifyToken } = require('../middleware/security');
const {
  buildUserProfile,
  recommendHackathons,
  recommendTeammates
} = require('../services/recommendationEngine');

const normalizeEmail = (email) => (email || '').toLowerCase().trim();

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'No token provided' } });
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: { message: 'Invalid or expired token' } });
  }
};

const parseLimit = (value, fallback = 6) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 20) : fallback;
};

const loadProfile = async (email) => {
  const user = await UserMongoDB.findOne({ email: normalizeEmail(email) })
    .select('name email profile friends hackathonsWon')
    .lean();
  if (!user) return null;
  const mine = await Hackathon.find({
    $or: [{ email: user.email }, { 'teamMembers.email': user.email }]
  }).select('name platform status team').lean();
  return { user, profile: buildUserProfile(mine, user) };
};

// Public hackathons (teams recruiting) ranked for the current user
router.get('/hackathons', authMiddleware, asyncHandler(async (req, res) => {
  const loaded = await loadProfile(req.user.email);
  if (!loaded) {
    return res.status(404).json({ success: false, error: { message: 'User not found' } });
  }

  const publicHackathons = await Hackathon.find({ isPublicWorld: true })
    .select('name platform email date status teamMembers maxParticipants')
    .lean();

  const recommendations = recommendHackathons(
    publicHackathons, loaded.profile, loaded.user.email, { limit: parseLimit(req.query.limit) }
  );
  res.json({ success: true, recommendations });
}));

// Teammates with public profiles ranked by how well they complement the user
router.get('/teammates', authMiddleware, asyncHandler(async (req, res) => {
  const loaded = await loadProfile(req.user.email);
  if (!loaded) {
    return res.status(404).json({ success: false, error: { message: 'User not found' } });
  }

  const candidates = await UserMongoDB.find({
    'profile.isPublic': true,
    email: { $ne: loaded.user.email },
    isTemporary: { $ne: true }
  }).select('name email profile hackathonsWon').limit(200).lean();

  const friendEmails = new Set((loaded.user.friends || []).map(f => normalizeEmail(f.email)));
  const recommendations = recommendTeammates(
    candidates, loaded.profile, loaded.user.email,
    { friendEmails, limit: parseLimit(req.query.limit) }
  );
  res.json({ success: true, recommendations });
}));

module.exports = router;
