const express = require('express');
const router = express.Router();
const HackathonWorld = require('../models/HackathonWorld');
const Team = require('../models/Team');
const Message = require('../models/Message');
const UserMongoDB = require('../models/UserMongoDB');
const { asyncHandler } = require('../middleware/errorHandler');
const { verifyToken } = require('../middleware/security');

// 🔧 ADMIN - Debug users and worlds (DEVELOPMENT ONLY)
router.get('/debug-data', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ success: false, error: { message: 'Not found' } });
  }
  try {
    const UserMongoDB = require('../models/UserMongoDB');
    const users = await UserMongoDB.find().select('name email _id');
    const worlds = await HackathonWorld.find().select('name createdBy _id');

    res.json({
      success: true,
      users: users.map(u => ({ id: u._id, name: u.name, email: u.email })),
      worlds: worlds.map(w => ({ id: w._id, name: w.name, createdBy: w.createdBy })),
      userCount: users.length,
      worldCount: worlds.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}));

// 🔧 ADMIN - Fix creator data (DEVELOPMENT ONLY)
router.post('/fix-creators', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ success: false, error: { message: 'Not found' } });
  }
  try {
    const UserMongoDB = require('../models/UserMongoDB');
    const users = await UserMongoDB.find();
    const worlds = await HackathonWorld.find();

    let fixed = 0;
    for (const world of worlds) {
      let matchingUser = users.find(user =>
        user.name.toLowerCase() === world.name.toLowerCase()
      );

      if (!matchingUser && users.length > 0) {
        matchingUser = users[0];
      }

      if (matchingUser) {
        world.createdBy = matchingUser._id;
        await world.save();
        fixed++;
      }
    }

    res.json({ success: true, message: `Fixed ${fixed} creators`, fixed, total: worlds.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}));

// Middleware to extract user from JWT token
const extractUser = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'NO_TOKEN', message: 'Authentication token required' }
    });
  }

  try {
    // Verify JWT token
    const decoded = verifyToken(token);

    if (!decoded.email) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid token payload' }
      });
    }

    req.user = decoded;
    next();

  } catch (error) {
    // Fallback: try base64 for backward compatibility
    try {
      const decodedString = Buffer.from(token, 'base64').toString('utf-8');
      const decoded = JSON.parse(decodedString);
      if (!decoded.email) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid token payload' }
        });
      }
      req.user = decoded;
      next();
    } catch (fallbackError) {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_DECODE_ERROR', message: 'Invalid or expired authentication token' }
      });
    }
  }
};

// 🟢 REST API - Get all active hackathon worlds
router.get('/', asyncHandler(async (req, res) => {
  try {
    const UserMongoDB = require('../models/UserMongoDB');
    const Hackathon = require('../models/Hackathon');

    const worlds = await HackathonWorld.find({ isActive: true })
      .sort({ startDate: 1 })
      .select('-participants.skills -participants.preferredRole');

    if (!worlds || worlds.length === 0) {
      return res.json({ success: true, worlds: [] });
    }

    const processedWorlds = [];
    for (const world of worlds) {
      try {
        let createdByInfo = { name: 'Unknown', email: 'N/A' };

        if (world.createdBy) {
          const user = await UserMongoDB.findById(world.createdBy);
          if (user) {
            createdByInfo = {
              name: user.name,
              email: user.email
            };
          }
        } else {
          // Fallback: try to find matching hackathon and get user info
          const matchingHackathon = await Hackathon.findOne({
            name: world.name,
            platform: world.platform
          }).populate('userId', 'name email');

          if (matchingHackathon && matchingHackathon.userId) {
            createdByInfo = {
              name: matchingHackathon.userId.name,
              email: matchingHackathon.userId.email
            };
            // Update the world with correct createdBy
            world.createdBy = matchingHackathon.userId._id;
            await world.save();
          }
        }

        processedWorlds.push({
          id: world._id,
          name: world.name,
          description: world.description || '',
          startDate: world.startDate,
          endDate: world.endDate,
          platform: world.platform || 'Other',
          participantCount: world.participantCount || 0,
          maxTeamSize: world.maxTeamSize || 4,
          createdBy: createdByInfo,
          createdAt: world.createdAt
        });
      } catch (error) {
        console.log('🚨 Error processing world:', world._id, error.message);
        // Still add the world with Unknown creator
        processedWorlds.push({
          id: world._id,
          name: world.name,
          description: world.description || '',
          startDate: world.startDate,
          endDate: world.endDate,
          platform: world.platform || 'Other',
          participantCount: world.participantCount || 0,
          maxTeamSize: world.maxTeamSize || 4,
          createdBy: { name: 'Unknown', email: 'N/A' },
          createdAt: world.createdAt
        });
      }
    }

    res.json({ success: true, worlds: processedWorlds });

  } catch (error) {
    console.log('🚨 Complete error in /api/worlds:', error.message);
    res.json({ success: true, worlds: [] });
  }
}));

// 🟢 REST API - Get specific hackathon world details
router.get('/:id', asyncHandler(async (req, res) => {
  // Extract user if token provided (optional)
  let currentUser = null;
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      currentUser = verifyToken(token);
    } catch (error) {
      // Fallback to base64 for backward compatibility
      try {
        const decodedString = Buffer.from(token, 'base64').toString('utf-8');
        currentUser = JSON.parse(decodedString);
      } catch (e) {
        // Ignore token errors for public viewing
      }
    }
  }
  const UserMongoDB = require('../models/UserMongoDB');
  const world = await HackathonWorld.findById(req.params.id)
    .populate('participants.userId', 'name email')
    .populate('teams');

  if (!world) {
    return res.status(404).json({
      success: false,
      error: { code: 'WORLD_NOT_FOUND', message: 'Hackathon world not found' }
    });
  }

  let createdByInfo = { name: 'Unknown', email: 'N/A' };
  if (world.createdBy) {
    const user = await UserMongoDB.findById(world.createdBy);
    if (user) {
      createdByInfo = { name: user.name, email: user.email };
    }
  }

  const userParticipant = currentUser ? world.participants.find(p => p.email === currentUser.email) : null;

  res.json({
    success: true,
    world: {
      id: world._id,
      name: world.name,
      description: world.description,
      startDate: world.startDate,
      endDate: world.endDate,
      platform: world.platform,
      maxTeamSize: world.maxTeamSize,
      participantCount: world.participantCount,
      createdBy: createdByInfo,
      isParticipant: !!userParticipant,
      userRole: userParticipant?.role || null,
      participants: world.participants.map(p => ({
        email: p.email,
        role: p.role,
        joinedAt: p.joinedAt,
        skills: p.skills,
        preferredRole: p.preferredRole,
        experience: p.experience
      })),
      teams: world.teams,
      settings: world.settings,
      createdAt: world.createdAt
    }
  });
}));

// 🟢 REST API - Create new hackathon world
router.post('/', extractUser, asyncHandler(async (req, res) => {
  const { name, description, startDate, endDate, platform, maxTeamSize } = req.body;

  // Validation
  if (!name || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Name, start date, and end date are required' }
    });
  }

  if (new Date(startDate) >= new Date(endDate)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_DATES', message: 'Start date must be before end date' }
    });
  }

  const world = new HackathonWorld({
    name,
    description,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    platform: platform || 'Other',
    maxTeamSize: maxTeamSize || 4,
    createdBy: req.user.email
  });

  await world.save();

  // Get creator info
  const UserMongoDB = require('../models/UserMongoDB');
  const creator = await UserMongoDB.findOne({ email: req.user.email });
  const createdByInfo = creator ? { name: creator.name, email: creator.email } : { name: 'Unknown', email: 'N/A' };

  console.log(`🌍 New hackathon world created: ${name} by ${req.user.name}`);

  res.status(201).json({
    success: true,
    message: 'Hackathon world created successfully',
    world: {
      id: world._id,
      name: world.name,
      description: world.description,
      startDate: world.startDate,
      endDate: world.endDate,
      platform: world.platform,
      maxTeamSize: world.maxTeamSize,
      createdBy: createdByInfo,
      createdAt: world.createdAt
    }
  });
}));

// 🟢 REST API - Join hackathon world
router.post('/:id/join', extractUser, asyncHandler(async (req, res) => {
  const { skills, preferredRole, experience, lookingFor, availability } = req.body;

  const world = await HackathonWorld.findById(req.params.id);

  if (!world) {
    return res.status(404).json({
      success: false,
      error: { code: 'WORLD_NOT_FOUND', message: 'Hackathon world not found' }
    });
  }

  if (!world.isActive) {
    return res.status(400).json({
      success: false,
      error: { code: 'WORLD_INACTIVE', message: 'This hackathon world is no longer active' }
    });
  }

  // Check if user is already a participant
  const existingParticipant = world.participants.find(p => p.email === req.user.email);
  if (existingParticipant) {
    return res.status(409).json({
      success: false,
      error: { code: 'ALREADY_JOINED', message: 'You have already joined this hackathon world' }
    });
  }

  try {
    await world.addParticipant(req.user.email, {
      role: 'explorer',
      skills: skills || [],
      preferredRole: preferredRole || 'Frontend Developer',
      experience: experience || 'Beginner',
      lookingFor: lookingFor || 'team',
      availability: availability || 'full-time'
    });

    // Refresh world to get updated participant count
    await world.save();
    const updatedWorld = await HackathonWorld.findById(world._id);

    // Emit real-time event to all connected clients in this world
    const io = req.app.get('io');
    if (io) {
      io.to(`world_${world._id}`).emit('userJoined', {
        user: {
          name: req.user.name,
          email: req.user.email
        },
        participantCount: updatedWorld.participantCount
      });
    }

    console.log(`👥 User ${req.user.name} joined hackathon world: ${world.name} (${updatedWorld.participantCount} participants)`);

    res.json({
      success: true,
      message: 'Successfully joined hackathon world',
      world: {
        id: updatedWorld._id,
        name: updatedWorld.name,
        participantCount: updatedWorld.participantCount
      }
    });

  } catch (error) {
    if (error.message.includes('already joined')) {
      return res.status(409).json({
        success: false,
        error: { code: 'ALREADY_JOINED', message: error.message }
      });
    }
    throw error;
  }
}));

// 🟢 REST API - Get teams in hackathon world
router.get('/:id/teams', extractUser, asyncHandler(async (req, res) => {
  const world = await HackathonWorld.findById(req.params.id);

  if (!world) {
    return res.status(404).json({
      success: false,
      error: { code: 'WORLD_NOT_FOUND', message: 'Hackathon world not found' }
    });
  }

  const teams = await Team.find({ hackathonWorldId: req.params.id })
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    teams: teams.map(team => ({
      id: team._id,
      name: team.name,
      leader: team.leader,
      members: team.members,
      currentSize: team.currentSize,
      maxSize: team.maxSize,
      availableSpots: team.availableSpots,
      requirements: team.requirements,
      skills: team.skills,
      lookingForMembers: team.lookingForMembers,
      status: team.status,
      projectIdea: team.projectIdea,
      createdAt: team.createdAt
    }))
  });
}));

// 🟢 REST API - Leave hackathon world
router.post('/:id/leave', extractUser, asyncHandler(async (req, res) => {
  const world = await HackathonWorld.findById(req.params.id);

  if (!world) {
    return res.status(404).json({
      success: false,
      error: { code: 'WORLD_NOT_FOUND', message: 'Hackathon world not found' }
    });
  }

  // Check if user is creator
  if (world.createdBy === req.user.email) {
    return res.status(400).json({
      success: false,
      error: { code: 'CREATOR_CANNOT_LEAVE', message: 'World creator cannot leave their own world' }
    });
  }

  try {
    await world.removeParticipant(req.user.email);

    console.log(`🚪 User ${req.user.name} left hackathon world: ${world.name}`);

    res.json({
      success: true,
      message: 'Successfully left hackathon world'
    });

  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_PARTICIPANT', message: 'You are not a participant in this world' }
      });
    }
    throw error;
  }
}));

// 🟢 REST API - Get public chat messages for hackathon world
router.get('/:id/messages', extractUser, asyncHandler(async (req, res) => {
  const world = await HackathonWorld.findById(req.params.id);

  if (!world) {
    return res.status(404).json({
      success: false,
      error: { code: 'WORLD_NOT_FOUND', message: 'Hackathon world not found' }
    });
  }

  const isCreator = world.createdBy === req.user.email;
  const isParticipant = world.participants.some(p => p.email === req.user.email);
  if (!isCreator && !isParticipant) {
    return res.status(403).json({
      success: false,
      error: { code: 'NOT_PARTICIPANT', message: 'Join the world to view chat messages' }
    });
  }

  const messages = await Message.find({
    hackathonWorldId: world._id,
    teamId: null
  })
    .populate('sender', 'name email')
    .sort({ createdAt: 1 })
    .limit(200);

  res.json({
    success: true,
    messages: messages.map(msg => ({
      id: msg._id,
      content: msg.content,
      sender: msg.sender ? { name: msg.sender.name, email: msg.sender.email } : null,
      createdAt: msg.createdAt,
      isEdited: msg.isEdited || false
    }))
  });
}));

// 🟢 REST API - Send public chat message to hackathon world
router.post('/:id/messages', extractUser, asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: { code: 'EMPTY_MESSAGE', message: 'Message cannot be empty' }
    });
  }

  const world = await HackathonWorld.findById(req.params.id);
  if (!world) {
    return res.status(404).json({
      success: false,
      error: { code: 'WORLD_NOT_FOUND', message: 'Hackathon world not found' }
    });
  }

  const isCreator = world.createdBy === req.user.email;
  const isParticipant = world.participants.some(p => p.email === req.user.email);
  if (!isCreator && !isParticipant) {
    return res.status(403).json({
      success: false,
      error: { code: 'NOT_PARTICIPANT', message: 'Join the world to send chat messages' }
    });
  }

  const sender = await UserMongoDB.findOne({ email: req.user.email });
  if (!sender) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found in database' }
    });
  }

  const newMessage = new Message({
    content: message.trim(),
    sender: sender._id,
    hackathonWorldId: world._id,
    teamId: null,
    messageType: 'text'
  });

  await newMessage.save();
  await newMessage.populate('sender', 'name email');

  const io = req.app.get('io');
  if (io) {
    io.to(`world_${world._id}`).emit('newMessage', {
      id: newMessage._id,
      content: newMessage.content,
      sender: { name: newMessage.sender.name, email: newMessage.sender.email },
      createdAt: newMessage.createdAt,
      messageType: newMessage.messageType
    });
  }

  res.json({
    success: true,
    message: 'Message sent successfully',
    data: {
      id: newMessage._id,
      content: newMessage.content,
      sender: { name: newMessage.sender.name, email: newMessage.sender.email },
      createdAt: newMessage.createdAt
    }
  });
}));

// 🟢 REST API - Create team in hackathon world
router.post('/:id/teams', extractUser, asyncHandler(async (req, res) => {
  const { name, maxSize, requirements, skills, projectIdea } = req.body;

  const world = await HackathonWorld.findById(req.params.id);
  if (!world) {
    return res.status(404).json({
      success: false,
      error: { code: 'WORLD_NOT_FOUND', message: 'Hackathon world not found' }
    });
  }

  const team = new Team({
    name,
    hackathonWorldId: req.params.id,
    leader: req.user.email,
    maxSize: maxSize || 4,
    requirements: requirements || '',
    skills: skills || []
  });

  await team.save();
  // No need to populate since leader is now email string

  res.status(201).json({
    success: true,
    message: 'Team created successfully',
    team: {
      id: team._id,
      name: team.name,
      leader: team.leader,
      members: team.members,
      currentSize: team.currentSize,
      maxSize: team.maxSize,
      requirements: team.requirements,
      skills: team.skills,
      lookingForMembers: team.lookingForMembers,
      status: team.status,
      createdAt: team.createdAt
    }
  });
}));

// 🟢 REST API - Update hackathon world (toggle visibility)
router.put('/:id', extractUser, asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const world = await HackathonWorld.findById(req.params.id);

  if (!world) {
    return res.status(404).json({
      success: false,
      error: { code: 'WORLD_NOT_FOUND', message: 'Hackathon world not found' }
    });
  }

  // Check if user is the creator
  if (world.createdBy !== req.user.email) {
    return res.status(403).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Only the creator can modify this world' }
    });
  }

  world.isActive = isActive;
  await world.save();

  console.log(`🌍 Hackathon world visibility changed: ${world.name} - Active: ${isActive}`);

  res.json({
    success: true,
    message: `Hackathon world ${isActive ? 'made public' : 'made private'} successfully`
  });
}));

// Delete hackathon world (admin cleanup)
router.delete('/cleanup/:hackathonName', extractUser, asyncHandler(async (req, res) => {
  const { hackathonName } = req.params;

  console.log(`🗑️ Cleanup request for hackathon: ${hackathonName}`);

  // Delete from HackathonWorld collection
  const HackathonWorld = require('../models/HackathonWorld');
  const deletedWorlds = await HackathonWorld.deleteMany({
    name: { $regex: hackathonName, $options: 'i' }
  });

  // Reset hackathons to private
  const updatedHackathons = await Hackathon.updateMany(
    { name: { $regex: hackathonName, $options: 'i' } },
    {
      $unset: { worldId: 1 },
      $set: { isPublicWorld: false }
    }
  );

  console.log(`🗑️ Deleted ${deletedWorlds.deletedCount} worlds`);
  console.log(`🔒 Made ${updatedHackathons.modifiedCount} hackathons private`);

  res.json({
    success: true,
    message: `Cleaned up ${deletedWorlds.deletedCount} worlds and ${updatedHackathons.modifiedCount} hackathons`,
    deletedWorlds: deletedWorlds.deletedCount,
    updatedHackathons: updatedHackathons.modifiedCount
  });
}));



module.exports = router;
