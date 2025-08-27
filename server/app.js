// Load environment variables
require('dotenv').config({ path: '../.env' });

// Simple API-only server
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const UserMongoDB = require('./models/UserMongoDB');
const User = require('./models/User');
const OtpService = require('./services/otpService');
const EmailService = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 10000;

// Connect to MongoDB
connectDB();

// Initialize services
const otpService = new OtpService();
const emailService = new EmailService();

// CORS - Allow all origins for development
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests
app.options('*', cors());

// Body parsing
app.use(express.json());

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
    const otpResult = await otpService.generateOtp(email);
    const otp = otpResult.debug?.otp || otpService.otpStore.get(email)?.otp;
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
    const verifyResult = await otpService.verifyOtp(email, otp);
    User.markEmailAsVerified(email);
    res.json({ success: true, message: verifyResult.message });
  } catch (error) {
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!User.isEmailVerified(email)) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_NOT_VERIFIED', message: 'Email not verified. Please verify your email with OTP first.' }
      });
    }
    const user = new UserMongoDB({ name, email, password, emailVerified: true });
    await user.save();
    User.removeEmailVerification(email);
    const token = Buffer.from(JSON.stringify({ id: user._id, email: user.email, name: user.name })).toString('base64');
    res.status(201).json({ success: true, message: 'User registered successfully', token, user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserMongoDB.authenticate(email, password);
    const token = Buffer.from(JSON.stringify({ id: user._id, email: user.email, name: user.name })).toString('base64');
    res.json({ success: true, message: 'Login successful', token, user: user.toJSON() });
  } catch (error) {
    res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } });
  }
});

// Import hackathon routes
const hackathonRoutes = require('./routes/hackathons');
app.use('/api/hackathons', hackathonRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`📧 Email service initializing...`);
  emailService.initialize().catch(console.error);
});

module.exports = app;