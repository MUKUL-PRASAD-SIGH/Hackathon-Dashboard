const express = require('express');
const mongoose = require('mongoose');
const Idea = require('../models/Idea');
const Hackathon = require('../models/Hackathon');
const { authenticateToken } = require('../middleware/security');

const router = express.Router();

const MAX_IDEAS_PER_USER = 2;
const MAX_VOTES_PER_USER = 3;

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
      const hasVoted = (idea.votes || []).some((vote) => String(vote.userId) === userId);
      return {
        id: idea._id,
        title: idea.title,
        description: idea.description,
        createdAt: idea.createdAt,
        voteCount: (idea.votes || []).length,
        isOwner,
        hasVoted
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

// Submit a new idea (max 2 per user)
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
    const existingCount = await Idea.countDocuments({
      hackathonId: hackathon._id,
      ownerId
    });

    if (existingCount >= MAX_IDEAS_PER_USER) {
      return res.status(400).json({
        success: false,
        error: { message: `You can only submit ${MAX_IDEAS_PER_USER} ideas per hackathon` }
      });
    }

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
        isOwner: true,
        hasVoted: false
      }
    });
  } catch (error) {
    console.error('Idea create error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to submit idea' } });
  }
});

// Vote for an idea (max 3 votes per user per hackathon, no self-vote)
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

    const votesUsed = await Idea.countDocuments({
      hackathonId: hackathon._id,
      'votes.userId': userId
    });

    if (votesUsed >= MAX_VOTES_PER_USER) {
      return res.status(400).json({
        success: false,
        error: { message: `Vote limit reached (${MAX_VOTES_PER_USER})` }
      });
    }

    idea.votes.push({ userId });
    await idea.save();

    return res.json({
      success: true,
      voteCount: idea.votes.length,
      votesUsed: votesUsed + 1,
      maxVotes: MAX_VOTES_PER_USER
    });
  } catch (error) {
    console.error('Idea vote error:', error);
    return res.status(500).json({ success: false, error: { message: 'Failed to cast vote' } });
  }
});

module.exports = router;
