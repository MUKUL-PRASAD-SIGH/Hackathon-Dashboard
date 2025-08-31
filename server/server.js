const path = require('path');
const dotenvPath = path.join(__dirname, '../.env');
console.log('🔍 Loading .env from:', dotenvPath);
const dotenvResult = require('dotenv').config({ path: dotenvPath });

if (dotenvResult.error) {
  console.error('❌ Error loading .env file:', dotenvResult.error);
} else {
  console.log('✅ .env file loaded successfully');
}

// Debug: Log environment variables
console.log('🔍 Environment Debug:');
console.log('GMAIL_USER:', process.env.GMAIL_USER ? '✅ Found' : '❌ Missing');
console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✅ Found' : '❌ Missing');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Found' : '❌ Missing');
console.log('PORT:', process.env.PORT || 'Using default 5000');
console.log('🔍 Full PORT debug:', { 
  envPORT: process.env.PORT, 
  type: typeof process.env.PORT,
  finalPORT: process.env.PORT || 5000 
});

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const validator = require('validator');
const connectDB = require('./config/database');

// Import services and models
const otpService = require('./services/otpService');
const EmailService = require('./services/emailService');
const User = require('./models/User');
const UserMongoDB = require('./models/UserMongoDB');
const hackathonRoutes = require('./routes/hackathons');

// Import middleware
const { errorHandler, asyncHandler } = require('./middleware/errorHandler');
const { validateEmail, validateOtp, validateRegistration, validateLogin } = require('./middleware/validation');
const { logger, requestLogger } = require('./utils/logger');
const { metricsMiddleware, healthCheck, metricsEndpoint, metricsCollector } = require('./middleware/monitoring');
const { requestDeduplicationMiddleware, memoryMonitor } = require('./utils/cache');

const app = express();
const PORT = 10000; // Fixed port

// Create HTTP server for Socket.IO
const { createServer } = require('http');
const server = createServer(app);

// Initialize Socket.IO with proper configuration
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: [
      'https://hackathon-dashboard-mukul.netlify.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:10000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 30000,
  pingInterval: 10000,
  connectTimeout: 45000,
  upgradeTimeout: 30000
});

// Socket.IO authentication middleware
const { socketAuth } = require('./middleware/socketAuth');
io.use(socketAuth);

// Socket.IO connection handling with comprehensive features
io.on('connection', (socket) => {
  const userName = socket.userName || 'Anonymous';
  console.log(`🔌 User connected: ${userName} (${socket.id})`);
  
  // Send connection confirmation
  socket.emit('connected', {
    socketId: socket.id,
    userName,
    timestamp: Date.now()
  });
  
  // Join world room
  socket.on('joinWorld', ({ hackathonWorldId }) => {
    try {
      socket.join(`world_${hackathonWorldId}`);
      console.log(`🌍 ${userName} joined world: ${hackathonWorldId}`);
      socket.to(`world_${hackathonWorldId}`).emit('userJoined', {
        userName,
        socketId: socket.id,
        timestamp: Date.now()
      });
      socket.emit('worldJoined', { hackathonWorldId });
    } catch (error) {
      console.error(`❌ Error joining world ${hackathonWorldId}:`, error);
      socket.emit('error', { message: 'Failed to join world' });
    }
  });
  
  // Leave world room
  socket.on('leaveWorld', ({ hackathonWorldId }) => {
    try {
      socket.leave(`world_${hackathonWorldId}`);
      console.log(`🌍 ${userName} left world: ${hackathonWorldId}`);
      socket.to(`world_${hackathonWorldId}`).emit('userLeft', {
        userName,
        socketId: socket.id,
        timestamp: Date.now()
      });
      socket.emit('worldLeft', { hackathonWorldId });
    } catch (error) {
      console.error(`❌ Error leaving world ${hackathonWorldId}:`, error);
    }
  });
  
  // Handle chat messages
  socket.on('chatMessage', ({ hackathonWorldId, teamId, message }) => {
    try {
      const messageData = {
        id: Date.now().toString(),
        userName,
        message,
        timestamp: Date.now(),
        teamId
      };
      
      if (teamId) {
        // Private team chat
        socket.to(`team_${teamId}`).emit('newMessage', messageData);
        socket.emit('messageSent', messageData);
      } else {
        // Public world chat
        socket.to(`world_${hackathonWorldId}`).emit('newMessage', messageData);
        socket.emit('messageSent', messageData);
      }
      
      console.log(`💬 Message from ${userName} in ${teamId ? 'team' : 'world'}: ${message.substring(0, 50)}...`);
    } catch (error) {
      console.error(`❌ Error sending message:`, error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });
  
  // Handle typing indicators
  socket.on('typing', ({ hackathonWorldId, teamId, isTyping }) => {
    try {
      const room = teamId ? `team_${teamId}` : `world_${hackathonWorldId}`;
      socket.to(room).emit('userTyping', {
        userName,
        isTyping,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`❌ Error handling typing indicator:`, error);
    }
  });
  
  // Join team room
  socket.on('joinTeam', ({ teamId }) => {
    try {
      socket.join(`team_${teamId}`);
      console.log(`👥 ${userName} joined team: ${teamId}`);
      socket.emit('teamJoined', { teamId });
    } catch (error) {
      console.error(`❌ Error joining team ${teamId}:`, error);
      socket.emit('error', { message: 'Failed to join team' });
    }
  });
  
  // Leave team room
  socket.on('leaveTeam', ({ teamId }) => {
    try {
      socket.leave(`team_${teamId}`);
      console.log(`👥 ${userName} left team: ${teamId}`);
      socket.emit('teamLeft', { teamId });
    } catch (error) {
      console.error(`❌ Error leaving team ${teamId}:`, error);
    }
  });
  
  // Ping-pong for connection health
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });
  
  // Connection test
  socket.on('test', (data) => {
    console.log(`🧪 Test received from ${userName}:`, data);
    socket.emit('testResponse', { 
      received: data, 
      timestamp: Date.now(),
      socketId: socket.id 
    });
  });
  
  // Disconnect handling
  socket.on('disconnect', (reason) => {
    console.log(`🔌 User disconnected: ${userName} (${reason})`);
  });
  
  // Error handling
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${userName}:`, error.message);
  });
});

// Make io available to routes
app.set('io', io);

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 OTP requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many OTP requests. Please wait 15 minutes before trying again.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth attempts per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', generalLimiter);

// CORS configuration - Allow specific origins
app.use(cors({
  origin: [
    'https://hackathon-dashboard-mukul.netlify.app',
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Body parsing middleware with size limits
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization middleware
app.use((req, res, next) => {
  // Sanitize string inputs
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = validator.escape(obj[key].trim());
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };
  
  if (req.body) {
    sanitizeObject(req.body);
  }
  
  next();
});

// Add logging and monitoring middleware
app.use(requestLogger);
app.use(metricsMiddleware);

// Add performance optimization middleware
app.use(requestDeduplicationMiddleware);

// Initialize services
const emailService = new EmailService();

// Initialize email service
emailService.initialize().then(() => {
  console.log('📧 Email service initialized');
}).catch(error => {
  console.error('❌ Email service initialization failed:', error.message);
});

// Send OTP endpoint with thread-safe operations
app.post('/api/send-otp', otpLimiter, validateEmail, asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  console.log(`📧 SEND OTP REQUEST for ${email}`);
  
  try {
    // Check if user already exists in MongoDB
    const existingUser = await UserMongoDB.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User already registered! Please login instead.'
        }
      });
    }
    
    // Use thread-safe OTP generation
    const otpResult = await otpService.generateOtp(email);
    
    // Extract OTP from debug info or get from store
    const otp = otpResult.debug?.otp || otpService.otpStore.get(email)?.otp;
    
    // Send OTP via email
    await emailService.sendOtpEmail(email, otp);
    
    // Log successful OTP generation
    logger.audit('OTP_GENERATED', {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Update metrics
    metricsCollector.recordOtpGenerated();
    
    res.json({ 
      success: true, 
      message: 'OTP sent successfully to your email',
      expiresIn: otpResult.expiresIn
    });
    
  } catch (error) {
    console.error(`❌ OTP generation failed for ${email}:`, error.message);
    
    // Handle specific error types
    let statusCode = 500;
    let errorCode = 'OTP_GENERATION_ERROR';
    
    if (error.message.includes('Rate limit')) {
      statusCode = 429;
      errorCode = 'RATE_LIMIT_EXCEEDED';
    } else if (error.message.includes('Email service')) {
      statusCode = 503;
      errorCode = 'EMAIL_SERVICE_ERROR';
    }
    
    res.status(statusCode).json({ 
      success: false, 
      error: {
        code: errorCode,
        message: error.message
      }
    });
  }
}));

// Verify OTP endpoint with race condition protection
app.post('/api/verify-otp', authLimiter, validateEmail, validateOtp, asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  
  console.log(`🔍 VERIFY OTP REQUEST for ${email} with OTP: ${otp}`);
  
  try {
    // Use thread-safe OTP verification
    const verifyResult = await otpService.verifyOtp(email, otp);
    
    // Mark email as verified for registration
    User.markEmailAsVerified(email);
    
    // Log successful verification
    logger.audit('OTP_VERIFIED', {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Update metrics
    metricsCollector.recordOtpVerified(true);
    
    res.json({ 
      success: true, 
      message: verifyResult.message,
      verifiedAt: verifyResult.verifiedAt
    });
    
  } catch (error) {
    console.error(`❌ OTP verification failed for ${email}:`, error.message);
    
    // Update metrics
    metricsCollector.recordOtpVerified(false);
    
    // Handle specific error types
    let statusCode = 400;
    let errorCode = 'VERIFICATION_ERROR';
    
    if (error.message.includes('already in progress')) {
      statusCode = 409;
      errorCode = 'CONCURRENT_REQUEST';
    } else if (error.message.includes('expired')) {
      errorCode = 'OTP_EXPIRED';
      metricsCollector.recordOtpExpired();
    } else if (error.message.includes('used')) {
      errorCode = 'OTP_ALREADY_USED';
    } else if (error.message.includes('Invalid OTP')) {
      errorCode = 'INVALID_OTP';
    } else if (error.message.includes('No OTP found')) {
      errorCode = 'OTP_NOT_FOUND';
    }
    
    res.status(statusCode).json({ 
      success: false, 
      error: {
        code: errorCode,
        message: error.message
      }
    });
  }
}));

// Resend OTP endpoint with rate limiting
app.post('/api/resend-otp', otpLimiter, validateEmail, asyncHandler(async (req, res) => {
  const { email } = req.body;
  
  console.log(`🔄 RESEND OTP REQUEST for ${email}`);
  
  try {
    // Generate new OTP
    const otpResult = await otpService.generateOtp(email, true); // Force regenerate
    
    // Extract OTP from debug info or get from store
    const otp = otpResult.debug?.otp || otpService.otpStore.get(email)?.otp;
    
    // Send OTP via email
    await emailService.sendOtpEmail(email, otp);
    
    // Log resend event
    logger.audit('OTP_RESENT', {
      email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Update metrics
    metricsCollector.recordOtpResent();
    
    res.json({ 
      success: true, 
      message: 'New OTP sent successfully to your email',
      expiresIn: otpResult.expiresIn
    });
    
  } catch (error) {
    console.error(`❌ OTP resend failed for ${email}:`, error.message);
    
    let statusCode = 500;
    let errorCode = 'RESEND_ERROR';
    
    if (error.message.includes('Rate limit')) {
      statusCode = 429;
      errorCode = 'RATE_LIMIT_EXCEEDED';
    }
    
    res.status(statusCode).json({ 
      success: false, 
      error: {
        code: errorCode,
        message: error.message
      }
    });
  }
}));

// Register endpoint
app.post('/api/register', authLimiter, validateRegistration, asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  
  try {
    // Check email verification
    if (!User.isEmailVerified(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Email not verified. Please verify your email with OTP first.'
        }
      });
    }
    
    // Create user in MongoDB
    const user = new UserMongoDB({
      name,
      email,
      password,
      emailVerified: true
    });
    
    await user.save();
    User.removeEmailVerification(email);
    
    // Generate authentication token
    const token = Buffer.from(JSON.stringify({
      id: user._id,
      email: user.email,
      name: user.name
    })).toString('base64');
    
    console.log(`✅ New user registered: ${email}`);
    console.log(`👥 User ID: ${user._id}`);
    
    // Log audit event
    logger.audit('USER_REGISTERED', {
      userId: user._id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      registrationMethod: 'OTP',
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(email, name).catch(error => {
      logger.error('Welcome email failed', { 
        userId: user._id,
        email, 
        error: error.message 
      });
    });

    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully',
      token,
      user: user.toJSON()
    });
    
  } catch (error) {
    logger.error('Registration failed', {
      email,
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Handle specific error types
    if (error.message.includes('already exists') || error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User already registered! Please login instead.'
        }
      });
    }

    if (error.message.includes('Email not verified')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Email not verified. Please verify your email with OTP first.'
        }
      });
    }

    if (error.message.includes('required')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message
        }
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Registration failed. Please try again later.'
      }
    });
  }
}));

// Login endpoint
app.post('/api/login', authLimiter, validateLogin, asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Authenticate user using MongoDB model
    const user = await UserMongoDB.authenticate(email, password);
    
    // Generate authentication token
    const token = Buffer.from(JSON.stringify({
      id: user._id,
      email: user.email,
      name: user.name
    })).toString('base64');

    console.log(`✅ User logged in: ${email}`);
    
    // Log audit event
    logger.audit('USER_LOGIN', {
      userId: user._id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ 
      success: true, 
      message: 'Login successful',
      token,
      user: user.toJSON()
    });
    
  } catch (error) {
    logger.error('Login failed', {
      email,
      error: error.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Handle specific error types
    if (error.message.includes('Invalid email or password')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    if (error.message.includes('Account locked')) {
      return res.status(423).json({
        success: false,
        error: {
          code: 'ACCOUNT_LOCKED',
          message: error.message
        }
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Login failed. Please try again later.'
      }
    });
  }
}));

// Hackathon routes (existing personal hackathon tracking)
console.log('📊 Loading hackathon routes at /api/hackathons/*');
app.use('/api/hackathons', hackathonRoutes);
console.log('✅ Hackathon routes loaded successfully');

// 🧪 DIRECT TEST ROUTE - Public hackathons
app.get('/api/hackathons/public', asyncHandler(async (req, res) => {
  console.log('🧪 DIRECT ROUTE HIT: /api/hackathons/public');
  
  try {
    const Hackathon = require('./models/Hackathon');
    const UserMongoDB = require('./models/UserMongoDB');
    
    const publicHackathons = await Hackathon.find({ 
      isPublicWorld: true 
    }).populate('userId', 'name email').sort({ createdAt: -1 });
    
    console.log(`🌍 Found ${publicHackathons.length} public hackathons`);
    
    const processedHackathons = publicHackathons.map(h => ({
      _id: h._id,
      name: h.name,
      platform: h.platform,
      email: h.email,
      date: h.date,
      rounds: h.rounds,
      status: h.status,
      maxParticipants: h.maxParticipants || 4,
      teamMembers: h.teamMembers || [],
      joinRequests: h.joinRequests || [],
      userId: h.userId._id,
      createdBy: {
        name: h.userId.name,
        email: h.userId.email
      },
      createdAt: h.createdAt
    }));
    
    res.json({ 
      success: true, 
      hackathons: processedHackathons,
      count: processedHackathons.length,
      source: 'direct-route'
    });
    
  } catch (error) {
    console.error('❌ Direct route error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to fetch public hackathons' } 
    });
  }
}));

// Hackathon worlds routes (new social features)
const hackathonWorldRoutes = require('./routes/hackathonWorlds');
app.use('/api/worlds', hackathonWorldRoutes);

console.log('🌍 Hackathon worlds API routes initialized: /api/worlds/*');
console.log('📊 Personal hackathons API routes: /api/hackathons/*');

// Debug routes (SECURITY: development + localhost only)
if (process.env.NODE_ENV === 'development') {
  const debugRoutes = require('./routes/debug');
  app.use('/api/debug', debugRoutes);
  console.log('⚠️  Debug endpoints enabled (localhost only): /api/debug/*');
}

// Get user notifications
app.get('/api/notifications', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
  }
  
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    const Notification = require('./models/Notification');
    
    const notifications = await Notification.find({ userId: decoded.id })
      .sort({ createdAt: -1 })
      .limit(20);
    
    res.json({
      success: true,
      notifications,
      count: notifications.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch notifications' } });
  }
}));

// Legacy users endpoint (in-memory only)
app.get('/api/users', (req, res) => {
  const users = User.getAllUsers();
  
  res.json({ 
    success: true, 
    users,
    count: User.getUserCount(),
    note: 'This shows in-memory users only. Use /api/debug/users for MongoDB users.'
  });
});

// Send join request to public hackathon
app.post('/api/hackathons/:id/request-join', authLimiter, asyncHandler(async (req, res) => {
  const { message } = req.body;
  const hackathonId = req.params.id;
  
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: { message: 'Authentication required' } });
    }
    
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    const user = await UserMongoDB.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ success: false, error: { message: 'Hackathon not found' } });
    }
    
    if (!hackathon.isPublicWorld) {
      return res.status(400).json({ success: false, error: { message: 'This hackathon is private' } });
    }
    
    // Check if team is full
    if ((hackathon.teamMembers?.length || 0) >= (hackathon.maxParticipants - 1)) {
      return res.status(400).json({ success: false, error: { message: 'Team is full' } });
    }
    
    // Check if already requested or member
    const existingRequest = hackathon.joinRequests?.find(r => r.email === user.email && r.status === 'pending');
    if (existingRequest) {
      return res.status(409).json({ success: false, error: { message: 'Join request already sent' } });
    }
    
    const isMember = hackathon.teamMembers?.find(m => m.email === user.email);
    if (isMember) {
      return res.status(409).json({ success: false, error: { message: 'Already a team member' } });
    }
    
    // Add join request
    hackathon.joinRequests = hackathon.joinRequests || [];
    hackathon.joinRequests.push({
      userId: user._id,
      name: user.name,
      email: user.email,
      message: message || '',
      status: 'pending'
    });
    
    await hackathon.save();
    
    // Create notification for team leader
    const Notification = require('./models/Notification');
    await Notification.create({
      userId: hackathon.userId,
      type: 'join_request',
      title: 'New Join Request',
      message: `${user.name} wants to join your hackathon "${hackathon.name}"`,
      data: {
        hackathonId: hackathon._id,
        requesterId: user._id,
        requesterName: user.name,
        requesterEmail: user.email,
        message: message
      }
    });
    
    res.json({ success: true, message: 'Join request sent successfully' });
    
  } catch (error) {
    console.error('Join request error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to send join request' } });
  }
}));

// Accept/reject join request
app.post('/api/hackathons/:id/handle-request/:requestId', authLimiter, asyncHandler(async (req, res) => {
  const { action } = req.body; // 'accept' or 'reject'
  const { id: hackathonId, requestId } = req.params;
  
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ success: false, error: { message: 'Hackathon not found' } });
    }
    
    // Check if user is team leader
    if (hackathon.userId.toString() !== decoded.id) {
      return res.status(403).json({ success: false, error: { message: 'Only team leader can handle requests' } });
    }
    
    const request = hackathon.joinRequests?.find(r => r._id.toString() === requestId);
    if (!request) {
      return res.status(404).json({ success: false, error: { message: 'Join request not found' } });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: { message: 'Request already handled' } });
    }
    
    const requester = await UserMongoDB.findById(request.userId);
    
    if (action === 'accept') {
      // Check if team still has space
      if ((hackathon.teamMembers?.length || 0) >= (hackathon.maxParticipants - 1)) {
        return res.status(400).json({ success: false, error: { message: 'Team is now full' } });
      }
      
      // Add to team
      hackathon.teamMembers = hackathon.teamMembers || [];
      hackathon.teamMembers.push({
        name: request.name,
        email: request.email,
        role: 'Team Member',
        joinedAt: new Date()
      });
      
      request.status = 'approved';
      
      // Notify requester of acceptance
      const Notification = require('./models/Notification');
      await Notification.create({
        userId: request.userId,
        type: 'request_accepted',
        title: 'Join Request Accepted',
        message: `You've been accepted to join "${hackathon.name}"!`,
        data: { hackathonId: hackathon._id }
      });
      
      // Notify team leader
      await Notification.create({
        userId: hackathon.userId,
        type: 'member_joined',
        title: 'New Team Member',
        message: `${request.name} joined your hackathon "${hackathon.name}"`,
        data: { hackathonId: hackathon._id, memberName: request.name }
      });
      
    } else {
      request.status = 'rejected';
      
      // Notify requester of rejection
      const Notification = require('./models/Notification');
      await Notification.create({
        userId: request.userId,
        type: 'request_rejected',
        title: 'Join Request Declined',
        message: `Your request to join "${hackathon.name}" was declined`,
        data: { hackathonId: hackathon._id }
      });
    }
    
    await hackathon.save();
    
    res.json({ 
      success: true, 
      message: `Join request ${action}ed successfully`,
      teamSize: (hackathon.teamMembers?.length || 0) + 1
    });
    
  } catch (error) {
    console.error('Handle request error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to handle request' } });
  }
}));

// Recovery endpoint to find hackathons by email
app.get('/api/recover-hackathons/:email', asyncHandler(async (req, res) => {
  const email = req.params.email;
  const Hackathon = require('./models/Hackathon');
  
  try {
    // Search by email field
    const hackathonsByEmail = await Hackathon.find({ 
      email: { $regex: email, $options: 'i' } 
    });
    
    // Search by user email in User collection
    const user = await UserMongoDB.findOne({ 
      email: { $regex: email, $options: 'i' } 
    });
    
    let hackathonsByUserId = [];
    if (user) {
      hackathonsByUserId = await Hackathon.find({ userId: user._id });
    }
    
    res.json({
      success: true,
      email: email,
      user: user ? { id: user._id, email: user.email, name: user.name } : null,
      hackathonsByEmail: hackathonsByEmail.length,
      hackathonsByUserId: hackathonsByUserId.length,
      hackathons: [...hackathonsByEmail, ...hackathonsByUserId]
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// Health check and monitoring endpoints
app.get('/health', healthCheck);
app.get('/metrics', metricsEndpoint);

// Error handling middleware (must be last)
app.use(errorHandler);

// API-only server - frontend is deployed separately
if (process.env.NODE_ENV !== 'production') {
  // 404 handler for development (API routes only)
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'API endpoint not found'
      }
    });
  });
  
    // Root endpoint for development
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Hackathon Dashboard API Server',
      version: '2.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        worlds: '/api/worlds',
        hackathons: '/api/hackathons'
      }
    });
  });
  
  // For non-API routes in development, return a helpful message
  app.use('*', (req, res) => {
    // Only show this message for non-API routes
    if (!req.originalUrl.startsWith('/api/')) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'This is the backend server. Frontend should be running on port 3001.'
        }
      });
    } else {
      res.status(404).json({
        success: false,
        error: {
          code: 'API_NOT_FOUND',
          message: `API endpoint ${req.originalUrl} not found`
        }
      });
    }
  });
} else {
  // Production: Root endpoint
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'Hackathon Dashboard API Server',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        api: '/api/*'
      }
    });
  });
  
  // API 404 handler
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'API_NOT_FOUND',
        message: `API endpoint ${req.originalUrl} not found`
      }
    });
  });
  
  // Catch all other routes
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'This is the API server. Frontend is deployed separately.'
      }
    });
  });
}

// Start server with Socket.IO
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔒 Security middleware enabled`);
  console.log(`⚡ Rate limiting active`);
  console.log(`🛡️ Input sanitization enabled`);
  console.log(`📊 Monitoring and logging active`);
  console.log(`⚡ Performance optimizations enabled`);
  console.log(`🔌 Socket.IO server initialized`);
  console.log(`🌐 CORS configured for Socket.IO`);
  console.log(`🔗 WebSocket URL: http://localhost:${PORT}`);
  console.log(`📡 Transports: polling, websocket`);
});

module.exports = app;