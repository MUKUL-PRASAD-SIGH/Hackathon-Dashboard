const express = require('express');
const mongoose = require('mongoose');
const Idea = require('../models/Idea');
const Hackathon = require('../models/Hackathon');
const { authenticateToken } = require('../middleware/security');

const router = express.Router();

const MAX_VOTES_PER_USER = 2;
const VOTE_POINTS = { 1: 10, 2: 5 };

const normalizeEmail = (email) => (email || '').toLowerCase().trim();

const isHackathonMember = (hackathon, userEmail) => {
  const normalized = normalizeEmail(userEmail);
  if (normalizeEmail(hackathon.email) === normalized) return true;
  return (hackathon.teamMembers || []).some(
    (member) => normalizeEmail(member.email) === normalized
  );
};

const ensureHackathon = async (hackathonId) => {
  if (!mongoose.Types.ObjectId.isValid(hackathonId)) return null;
  return Hackathon.findById(hackathonId);
};

// Get ideas for a hackathon (anonymous, with user-specific flags)
router.get('/:id/ideas', authenticateToken, async (req, res) => {
  try {
    const hackathon = await ensureHackathon(req.params.id);
    if (!hackathon) {
      return res.status(404).json({ success: false, error: { message: 'Hackathon not found' } });
    }

    if (!isHackathonMember(hackathon, req.user?.email)) {
      return res.status(403).json({ success: false, error: { message: 'Not a member of this hackathon' } });
    }

    const ideas = await Idea.find({ hackathonId: hackathon._id })
      .sort({ createdAt: -1 })
      .lean();

    const userId = String(req.user.id);
    const votesUsed = await Idea.countDocuments({
      hackathonId: hackathon._id,
      'votes.userId': userId
    });

    const responseIdeas = ideas.map((idea) => {
      const isOwner = String(idea.ownerId) === userId;
      const userVote = (idea.votes || []).find((vote) => String(vote.userId) === userId);
      const hasVoted = Boolean(userVote);
      const voteScore = (idea.votes || []).reduce((sum, vote) => sum + (vote.points || 0), 0);
      return {
        id: idea._id,
        title: idea.title,
        description: idea.description,
        createdAt: idea.createdAt,
        voteCount: (idea.votes || []).length,
        voteScore,
        isOwner,
        hasVoted,
        voteRank: userVote?.rank || null
      };
    });

    return res.json({
      success: true,
      ideas: responseIdeas,
      votesUsed,
      maxVotes: MAX_VOTES_PER_USER
    });
  } catch (error) {
    console.error('Idea list error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch ideas' } });
  }
});

// Get voting results for a hackathon (anonymous summary)
router.get('/:id/ideas/results', authenticateToken, async (req, res) => {
  try {
    const hackathon = await ensureHackathon(req.params.id);
    if (!hackathon) {
      return res.status(404).json({ success: false, error: { message: 'Hackathon not found' } });
    }

    if (!isHackathonMember(hackathon, req.user?.email)) {
      return res.status(403).json({ success: false, error: { message: 'Not a member of this hackathon' } });
    }

    const ideas = await Idea.find({ hackathonId: hackathon._id })
      .sort({ createdAt: -1 })
      .lean();

    const results = ideas.map((idea) => ({
      id: idea._id,
      title: idea.title,
      description: idea.description,
      voteCount: (idea.votes || []).length,
      voteScore: (idea.votes || []).reduce((sum, vote) => sum + (vote.points || 0), 0)
    }));

    const sorted = [...results].sort((a, b) => {
      if ((b.voteScore || 0) !== (a.voteScore || 0)) return (b.voteScore || 0) - (a.voteScore || 0);
      return (b.voteCount || 0) - (a.voteCount || 0);
    });

    const totalPoints = results.reduce((sum, idea) => sum + (idea.voteScore || 0), 0);
    const winner = sorted[0] && (sorted[0].voteScore || 0) > 0 ? sorted[0] : null;

    return res.json({
      success: true,
      totalPoints,
      winner,
      ideas: sorted
    });
  } catch (error) {
    console.error('Idea results error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to calculate results' } });
  }
});

// Submit a new idea (no per-user limit)
router.post('/:id/ideas', authenticateToken, async (req, res) => {
  try {
    const hackathon = await ensureHackathon(req.params.id);
    if (!hackathon) {
      return res.status(404).json({ success: false, error: { message: 'Hackathon not found' } });
    }

    if (!isHackathonMember(hackathon, req.user?.email)) {
      return res.status(403).json({ success: false, error: { message: 'Not a member of this hackathon' } });
    }

    const title = (req.body.title || '').trim();
    const description = (req.body.description || '').trim();

    if (!title || title.length < 3) {
      return res.status(400).json({ success: false, error: { message: 'Idea title is required' } });
    }

    const ownerId = req.user.id;
    const idea = await Idea.create({
      hackathonId: hackathon._id,
      ownerId,
      title,
      description
    });

    return res.status(201).json({
      success: true,
      idea: {
        id: idea._id,
        title: idea.title,
        description: idea.description,
        createdAt: idea.createdAt,
        voteCount: 0,
        voteScore: 0,
        isOwner: true,
        hasVoted: false,
        voteRank: null
      }
    });
  } catch (error) {
    console.error('Idea create error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to submit idea' } });
  }
});

// Vote for an idea (2 votes per user: rank 1 = 10 pts, rank 2 = 5 pts; no self-vote)
router.post('/:id/ideas/:ideaId/vote', authenticateToken, async (req, res) => {
  try {
    const hackathon = await ensureHackathon(req.params.id);
    if (!hackathon) {
      return res.status(404).json({ success: false, error: { message: 'Hackathon not found' } });
    }

    if (!isHackathonMember(hackathon, req.user?.email)) {
      return res.status(403).json({ success: false, error: { message: 'Not a member of this hackathon' } });
    }

    const idea = await Idea.findOne({ _id: req.params.ideaId, hackathonId: hackathon._id });
    if (!idea) {
      return res.status(404).json({ success: false, error: { message: 'Idea not found' } });
    }

    const userId = String(req.user.id);
    if (String(idea.ownerId) === userId) {
      return res.status(403).json({ success: false, error: { message: 'Cannot vote for your own idea' } });
    }

    const alreadyVoted = (idea.votes || []).some((vote) => String(vote.userId) === userId);
    if (alreadyVoted) {
      return res.status(409).json({ success: false, error: { message: 'Already voted for this idea' } });
    }

    const existingVotes = await Idea.find({
      hackathonId: hackathon._id,
      'votes.userId': userId
    }).select('votes');

    const userVotes = existingVotes
      .flatMap((item) => item.votes || [])
      .filter((vote) => String(vote.userId) === userId);

    const votesUsed = userVotes.length;
    const usedRanks = new Set(userVotes.map((vote) => vote.rank));

    if (votesUsed >= MAX_VOTES_PER_USER) {
      return res.status(400).json({
        success: false,
        error: { message: `Vote limit reached (${MAX_VOTES_PER_USER})` }
      });
    }

    let requestedRank = Number(req.body?.rank);
    if (![1, 2].includes(requestedRank)) {
      requestedRank = usedRanks.has(1) ? 2 : 1;
    }

    if (usedRanks.has(requestedRank)) {
      return res.status(400).json({
        success: false,
        error: { message: `You already used vote rank ${requestedRank}` }
      });
    }

    const points = VOTE_POINTS[requestedRank];

    idea.votes.push({ userId, rank: requestedRank, points });
    await idea.save();

    return res.json({
      success: true,
      voteCount: idea.votes.length,
      voteScore: idea.votes.reduce((sum, vote) => sum + (vote.points || 0), 0),
      votesUsed: votesUsed + 1,
      maxVotes: MAX_VOTES_PER_USER,
      rankUsed: requestedRank,
      pointsAwarded: points
    });
  } catch (error) {
    console.error('Idea vote error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to cast vote' } });
  }
});

module.exports = router;
