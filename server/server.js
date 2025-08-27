const path = require('path');
const dotenvPath = path.join(__dirname, '../.env');
console.log('🔍 Loading .env from:', dotenvPath);
require('dotenv').config({ path: dotenvPath });

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
const OtpService = require('./services/otpService');
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
const PORT = process.env.PORT || 5000;

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

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
const otpService = new OtpService();
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

// Hackathon routes
app.use('/api/hackathons', hackathonRoutes);

// Debug routes (SECURITY: development + localhost only)
if (process.env.NODE_ENV === 'development') {
  const debugRoutes = require('./routes/debug');
  app.use('/api/debug', debugRoutes);
  console.log('⚠️  Debug endpoints enabled (localhost only): /api/debug/*');
}

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

// Health check and monitoring endpoints
app.get('/health', healthCheck);
app.get('/metrics', metricsEndpoint);

// Error handling middleware (must be last)
app.use(errorHandler);

// Serve static files from React build (for production)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
} else {
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
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔒 Security middleware enabled`);
  console.log(`⚡ Rate limiting active`);
  console.log(`🛡️ Input sanitization enabled`);
  console.log(`📊 Monitoring and logging active`);
  console.log(`⚡ Performance optimizations enabled`);
});

module.exports = app;