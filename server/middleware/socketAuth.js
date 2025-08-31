const jwt = require('jsonwebtoken');
const UserMongoDB = require('../models/UserMongoDB');

// Socket.IO authentication middleware
const socketAuth = async (socket, next) => {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error('Authentication token required'));
    }
    
    // Handle test tokens for development
    if (process.env.NODE_ENV === 'development' && token.startsWith('test-token')) {
      socket.userId = 'test-user';
      socket.userEmail = 'test@example.com';
      socket.userName = 'Test User';
      socket.user = {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User'
      };
      console.log(`🧪 Test socket authenticated: ${socket.userName}`);
      return next();
    }
    
    // For production tokens, use the base64 token format
    let decoded;
    
    try {
      // Try to decode as base64 (current system)
      const decodedString = Buffer.from(token, 'base64').toString('utf-8');
      decoded = JSON.parse(decodedString);
    } catch (error) {
      // If base64 fails, try JWT (future upgrade)
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      } catch (jwtError) {
        console.error('❌ Token decode failed:', error.message, jwtError.message);
        return next(new Error('Invalid authentication token'));
      }
    }
    
    if (!decoded.id || !decoded.email) {
      return next(new Error('Invalid token payload'));
    }
    
    // Verify user exists in database
    const user = await UserMongoDB.findById(decoded.id);
    if (!user) {
      return next(new Error('User not found'));
    }
    
    // Attach user info to socket
    socket.userId = decoded.id;
    socket.userEmail = decoded.email;
    socket.userName = decoded.name || user.name;
    socket.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name || user.name
    };
    
    console.log(`🔌 Socket authenticated: ${socket.userName} (${socket.userEmail})`);
    next();
    
  } catch (error) {
    console.error('❌ Socket authentication failed:', error.message);
    next(new Error('Authentication failed'));
  }
};

// Middleware to verify user is participant of hackathon world
const verifyWorldParticipant = (hackathonWorldId) => {
  return async (socket, next) => {
    try {
      const HackathonWorld = require('../models/HackathonWorld');
      
      const world = await HackathonWorld.findById(hackathonWorldId);
      if (!world) {
        return next(new Error('Hackathon world not found'));
      }
      
      const isParticipant = world.participants.some(p => p.userId.toString() === socket.userId);
      if (!isParticipant) {
        return next(new Error('User is not a participant of this hackathon world'));
      }
      
      socket.hackathonWorldId = hackathonWorldId;
      next();
      
    } catch (error) {
      console.error('❌ World participant verification failed:', error.message);
      next(new Error('World access verification failed'));
    }
  };
};

// Middleware to verify user is member of team
const verifyTeamMember = (teamId) => {
  return async (socket, next) => {
    try {
      const Team = require('../models/Team');
      
      const team = await Team.findById(teamId);
      if (!team) {
        return next(new Error('Team not found'));
      }
      
      const isLeader = team.leader.toString() === socket.userId;
      const isMember = team.members.some(m => m.userId.toString() === socket.userId);
      
      if (!isLeader && !isMember) {
        return next(new Error('User is not a member of this team'));
      }
      
      socket.teamId = teamId;
      socket.isTeamLeader = isLeader;
      next();
      
    } catch (error) {
      console.error('❌ Team member verification failed:', error.message);
      next(new Error('Team access verification failed'));
    }
  };
};

module.exports = {
  socketAuth,
  verifyWorldParticipant,
  verifyTeamMember
};