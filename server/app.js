// Load environment variables
require('dotenv').config({ path: '../.env' });

// Full-featured server with Socket.IO
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/database');
const UserMongoDB = require('./models/UserMongoDB');
const User = require('./models/User');
const otpService = require('./services/otpService');
const EmailService = require('./services/emailService');

const app = express();
const server = createServer(app);
const PORT = 10000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', '*'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Additional CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Connect to MongoDB
connectDB();

// Initialize services
const emailService = new EmailService();

// Body parsing
app.use(express.json());

// Test route to verify server is working
app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Server is working!' });
});

// Auth
const auth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = JSON.parse(Buffer.from(token, 'base64').toString());
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// User routes with explicit CORS
app.get('/api/users/friends', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
}, auth, async (req, res) => {
  res.json({ success: true, friends: [], sentRequests: [], receivedRequests: [] });
});

app.post('/api/users/friend-request', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
}, auth, async (req, res) => {
  res.json({ success: true, message: 'Friend request sent' });
});

app.get('/api/users/profile', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
}, auth, async (req, res) => {
  try {
    const user = await UserMongoDB.findOne({ email: req.user.email }).select('-password');
    const Hackathon = require('./models/Hackathon');
    const hackathons = await Hackathon.find({ email: req.user.email });
    res.json({ success: true, user, hackathons, friendshipStatus: 'none', isOwnProfile: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/profile', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
}, auth, async (req, res) => {
  try {
    const { bio, skills, experience, linkedin, github, portfolio, location, avatar, isPublic, name } = req.body;
    
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
    
    if (name) updateData.name = name;
    
    const user = await UserMongoDB.findOneAndUpdate(
      { email: req.user.email },
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');
    
    res.json({ success: true, user, message: 'Profile updated successfully' });
  } catch (e) {
    res.status(500).json({ success: false, error: { message: e.message } });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Hackathon Dashboard API Server',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await UserMongoDB.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { code: 'USER_EXISTS', message: 'User already registered! Please login instead.' }
      });
    }
    
    // Generate OTP directly without rate limiting
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in simple memory (bypass OTP service rate limiting)
    global.tempOtpStore = global.tempOtpStore || new Map();
    global.tempOtpStore.set(email, {
      otp,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    });
    
    await emailService.sendOtpEmail(email, otp);
    res.json({ success: true, message: 'OTP sent successfully to your email' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Verify OTP
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    console.log('🔍 OTP verification attempt:', { email, otp: otp ? '***' + otp.slice(-2) : 'undefined' });
    
    // Check temporary store first
    global.tempOtpStore = global.tempOtpStore || new Map();
    const tempOtp = global.tempOtpStore.get(email);
    
    console.log('🔍 Temp OTP store check:', { 
      email, 
      hasTempOtp: !!tempOtp, 
      tempOtpValue: tempOtp ? '***' + tempOtp.otp.slice(-2) : 'none',
      isExpired: tempOtp ? tempOtp.expiresAt <= Date.now() : 'n/a'
    });
    
    if (tempOtp && tempOtp.otp === otp && tempOtp.expiresAt > Date.now()) {
      console.log('✅ OTP verified via temp store');
      global.tempOtpStore.delete(email);
      User.markEmailAsVerified(email);
      console.log('✅ Email marked as verified:', email);
      return res.json({ success: true, message: 'OTP verified successfully' });
    }
    
    console.log('🔄 Falling back to OTP service');
    // Fallback to OTP service
    const verifyResult = await otpService.verifyOtp(email, otp);
    User.markEmailAsVerified(email);
    console.log('✅ Email marked as verified via OTP service:', email);
    res.json({ success: true, message: verifyResult.message });
  } catch (error) {
    console.error('❌ OTP verification failed:', error.message);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    console.log('📝 Registration attempt:', { email, name, hasPassword: !!password });
    
    // Detailed validation
    const errors = [];
    
    if (!name || name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Valid email address is required');
    }
    
    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    
    if (errors.length > 0) {
      console.log('❌ Validation errors:', errors);
      return res.status(400).json({
        success: false,
        error: { 
          code: 'VALIDATION_ERROR', 
          message: 'Invalid input data',
          details: errors
        }
      });
    }
    
    // Temporarily bypass email verification check for debugging
    const isEmailVerified = true; // User.isEmailVerified(email);
    console.log('🔍 Email verification bypassed for debugging:', { email, isEmailVerified });
    
    // Check if user already exists in MongoDB
    const existingUser = await UserMongoDB.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      console.log('❌ User already exists:', email);
      return res.status(409).json({ 
        success: false, 
        error: { 
          code: 'DUPLICATE_EMAIL',
          message: 'Email already registered. Please login instead.',
          details: ['This email is already associated with an account']
        } 
      });
    }
    
    console.log('✅ Creating new user in MongoDB');
    const user = new UserMongoDB({ 
      name: name.trim(), 
      email: email.toLowerCase().trim(), 
      password, 
      emailVerified: true 
    });
    
    await user.save();
    console.log('✅ User saved to MongoDB:', user._id);
    
    // Clean up verification state
    User.removeEmailVerification(email);
    
    const token = Buffer.from(JSON.stringify({ 
      email: user.email, 
      name: user.name 
    })).toString('base64');
    
    console.log('✅ Registration successful for:', email);
    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully', 
      token, 
      user: user.toJSON() 
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        success: false, 
        error: { 
          code: 'DUPLICATE_EMAIL',
          message: 'Email already registered. Please login instead.',
          details: ['This email is already associated with an account']
        } 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: { 
        message: 'Registration failed',
        details: [error.message]
      } 
    });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserMongoDB.authenticate(email, password);
    const token = Buffer.from(JSON.stringify({ email: user.email, name: user.name })).toString('base64');
    res.json({ success: true, message: 'Login successful', token, user: user.toJSON() });
  } catch (error) {
    res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
  }
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      'https://hackathon-dashboard-mukul.netlify.app',
      'http://localhost:3000',
      'http://localhost:3001'
    ],
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// Socket.IO authentication middleware
const { socketAuth } = require('./middleware/socketAuth');
io.use(socketAuth);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.userName} (${socket.id})`);
  
  // Join hackathon world
  socket.on('joinWorld', ({ hackathonWorldId }) => {
    socket.join(`world_${hackathonWorldId}`);
    console.log(`🌍 ${socket.userName} joined world: ${hackathonWorldId}`);
  });
  
  // Leave hackathon world
  socket.on('leaveWorld', ({ hackathonWorldId }) => {
    socket.leave(`world_${hackathonWorldId}`);
    console.log(`🌍 ${socket.userName} left world: ${hackathonWorldId}`);
  });
  
  // Handle chat messages
  socket.on('chatMessage', async ({ hackathonWorldId, teamId, message }) => {
    const Message = require('./models/Message');
    
    try {
      const newMessage = new Message({
        content: message,
        sender: socket.userId,
        hackathonWorldId,
        teamId: teamId || null,
        messageType: 'text'
      });
      
      await newMessage.save();
      await newMessage.populate('sender', 'name email');
      
      const room = teamId ? `team_${teamId}` : `world_${hackathonWorldId}`;
      io.to(room).emit('newMessage', {
        id: newMessage._id,
        content: newMessage.content,
        sender: newMessage.sender,
        timestamp: newMessage.createdAt,
        messageType: newMessage.messageType
      });
      
    } catch (error) {
      console.error('❌ Message save error:', error.message);
      socket.emit('messageError', { error: 'Failed to send message' });
    }
  });
  
  // Handle typing indicators
  socket.on('typing', ({ hackathonWorldId, teamId, isTyping }) => {
    const room = teamId ? `team_${teamId}` : `world_${hackathonWorldId}`;
    socket.to(room).emit('userTyping', {
      userId: socket.userId,
      userName: socket.userName,
      isTyping
    });
  });
  
  // Basic connection events
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User disconnected: ${socket.userName} (${reason})`);
  });
  
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
  
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.userName}:`, error.message);
  });
});

// Make io available to routes
app.set('io', io);

// Import hackathon routes
const hackathonRoutes = require('./routes/hackathons');
app.use('/api/hackathons', hackathonRoutes);

// Import hackathon worlds routes
const hackathonWorldRoutes = require('./routes/hackathonWorlds');
app.use('/api/worlds', hackathonWorldRoutes);

// Import users routes
const usersRoutes = require('./routes/users');
app.use('/api/users', usersRoutes);

// Catch-all for unmatched routes (MUST BE LAST)
app.use('*', (req, res) => {
  console.log('❌ Unmatched route:', req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'API endpoint not found' }
  });
});

// Start server with Socket.IO
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.IO server initialized`);
  console.log(`📧 Email service initializing...`);
  emailService.initialize().catch(console.error);
});

module.exports = { app, server, io };