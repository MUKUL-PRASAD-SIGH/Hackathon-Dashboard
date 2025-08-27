const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Password hashing
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// JWT token management
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token required'
      }
    });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Invalid or expired token'
      }
    });
  }
};

// Generate secure random string
const generateSecureRandom = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Account lockout tracking
const accountLockouts = new Map();

const checkAccountLockout = (identifier) => {
  const lockoutData = accountLockouts.get(identifier);
  
  if (!lockoutData) {
    return { locked: false };
  }
  
  const now = Date.now();
  
  // Check if lockout has expired
  if (lockoutData.lockedUntil < now) {
    accountLockouts.delete(identifier);
    return { locked: false };
  }
  
  return {
    locked: true,
    lockedUntil: lockoutData.lockedUntil,
    remainingTime: Math.ceil((lockoutData.lockedUntil - now) / 1000)
  };
};

const recordFailedAttempt = (identifier, maxAttempts = 5, lockoutDuration = 15 * 60 * 1000) => {
  const now = Date.now();
  let lockoutData = accountLockouts.get(identifier);
  
  if (!lockoutData) {
    lockoutData = {
      attempts: 1,
      firstAttempt: now,
      lockedUntil: 0
    };
  } else {
    lockoutData.attempts++;
  }
  
  // Lock account if max attempts exceeded
  if (lockoutData.attempts >= maxAttempts) {
    lockoutData.lockedUntil = now + lockoutDuration;
    console.log(`🔒 Account locked: ${identifier} for ${lockoutDuration / 1000} seconds`);
  }
  
  accountLockouts.set(identifier, lockoutData);
  
  return {
    attempts: lockoutData.attempts,
    maxAttempts,
    locked: lockoutData.lockedUntil > now,
    lockedUntil: lockoutData.lockedUntil
  };
};

const clearFailedAttempts = (identifier) => {
  accountLockouts.delete(identifier);
};

// IP-based rate limiting
const ipAttempts = new Map();

const checkIpRateLimit = (ip, maxAttempts = 20, windowMs = 15 * 60 * 1000) => {
  const now = Date.now();
  let ipData = ipAttempts.get(ip);
  
  if (!ipData || (now - ipData.windowStart) > windowMs) {
    ipData = {
      attempts: 1,
      windowStart: now
    };
  } else {
    ipData.attempts++;
  }
  
  ipAttempts.set(ip, ipData);
  
  return {
    attempts: ipData.attempts,
    maxAttempts,
    blocked: ipData.attempts >= maxAttempts,
    remainingTime: Math.max(0, windowMs - (now - ipData.windowStart))
  };
};

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  
  // Clean up account lockouts
  for (const [key, data] of accountLockouts.entries()) {
    if (data.lockedUntil < now) {
      accountLockouts.delete(key);
    }
  }
  
  // Clean up IP attempts
  for (const [key, data] of ipAttempts.entries()) {
    if ((now - data.windowStart) > windowMs) {
      ipAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  authenticateToken,
  generateSecureRandom,
  checkAccountLockout,
  recordFailedAttempt,
  clearFailedAttempts,
  checkIpRateLimit
};