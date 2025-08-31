const crypto = require('crypto');

class OtpService {
  constructor() {
    // Thread-safe OTP storage with atomic operations
    this.otpStore = new Map();
    this.rateLimitStore = new Map();
    this.processingStore = new Set(); // Track processing operations
    
    // Configuration
    this.config = {
      otpLength: 6,
      expirationTime: 10 * 60 * 1000, // 10 minutes
      maxAttempts: 5,
      rateLimitWindow: 15 * 60 * 1000, // 15 minutes
      maxRequestsPerWindow: 3,
      cleanupInterval: 60 * 1000 // 1 minute
    };
    
    // Start cleanup process
    this.startCleanupProcess();
    
    console.log('🔧 OtpService initialized with thread-safe operations');
  }

  /**
   * Generate a cryptographically secure OTP
   */
  generateSecureOtp() {
    const min = Math.pow(10, this.config.otpLength - 1);
    const max = Math.pow(10, this.config.otpLength) - 1;
    
    // Use crypto for secure random generation
    const randomBytes = crypto.randomBytes(4);
    const randomNumber = randomBytes.readUInt32BE(0);
    const otp = (randomNumber % (max - min + 1)) + min;
    
    return otp.toString().padStart(this.config.otpLength, '0');
  }

  /**
   * Check if email is rate limited
   */
  isRateLimited(email) {
    const now = Date.now();
    const rateLimitData = this.rateLimitStore.get(email);
    
    if (!rateLimitData) {
      return false;
    }
    
    // Check if window has expired
    if (now - rateLimitData.windowStart > this.config.rateLimitWindow) {
      this.rateLimitStore.delete(email);
      return false;
    }
    
    // Check if blocked
    if (rateLimitData.blocked && now < rateLimitData.blockedUntil) {
      return {
        blocked: true,
        blockedUntil: rateLimitData.blockedUntil,
        remainingTime: Math.ceil((rateLimitData.blockedUntil - now) / 1000)
      };
    }
    
    // Check request count
    if (rateLimitData.requests >= this.config.maxRequestsPerWindow) {
      // Block for remaining window time
      const blockedUntil = rateLimitData.windowStart + this.config.rateLimitWindow;
      rateLimitData.blocked = true;
      rateLimitData.blockedUntil = blockedUntil;
      
      return {
        blocked: true,
        blockedUntil,
        remainingTime: Math.ceil((blockedUntil - now) / 1000)
      };
    }
    
    return false;
  }

  /**
   * Update rate limiting data
   */
  updateRateLimit(email) {
    const now = Date.now();
    let rateLimitData = this.rateLimitStore.get(email);
    
    if (!rateLimitData || (now - rateLimitData.windowStart > this.config.rateLimitWindow)) {
      // Start new window
      rateLimitData = {
        requests: 1,
        windowStart: now,
        blocked: false,
        blockedUntil: 0
      };
    } else {
      // Increment requests in current window
      rateLimitData.requests++;
    }
    
    this.rateLimitStore.set(email, rateLimitData);
    console.log(`📊 Rate limit updated for ${email}: ${rateLimitData.requests}/${this.config.maxRequestsPerWindow} requests`);
  }

  /**
   * Generate and store OTP with atomic operations
   */
  async generateOtp(email, options = {}) {
    const operationId = `generate_${email}_${Date.now()}`;
    
    try {
      // Prevent concurrent operations for same email
      if (this.processingStore.has(email)) {
        throw new Error('OTP generation already in progress for this email');
      }
      
      this.processingStore.add(email);
      console.log(`🔧 Starting OTP generation for ${email} (${operationId})`);
      
      // Rate limiting temporarily disabled
      // const rateLimitCheck = this.isRateLimited(email);
      // if (rateLimitCheck) {
      //   throw new Error(`Rate limit exceeded. Try again in ${rateLimitCheck.remainingTime} seconds`);
      // }
      
      // Generate new OTP
      const otp = this.generateSecureOtp();
      const now = Date.now();
      const expiresAt = now + this.config.expirationTime;
      
      // Store OTP data atomically
      const otpData = {
        email,
        otp,
        createdAt: now,
        expiresAt,
        attempts: 0,
        used: false,
        usedAt: null,
        resendCount: this.otpStore.has(email) ? this.otpStore.get(email).resendCount + 1 : 0,
        lastResendAt: now,
        operationId
      };
      
      this.otpStore.set(email, otpData);
      // this.updateRateLimit(email); // Temporarily disabled
      
      console.log(`✅ OTP generated successfully for ${email}`);
      console.log(`🔐 OTP: ${otp} (expires in ${Math.ceil(this.config.expirationTime / 60000)} minutes)`);
      console.log(`📊 OTP store size: ${this.otpStore.size}`);
      
      return {
        success: true,
        message: 'OTP generated successfully',
        expiresAt,
        resendCount: otpData.resendCount,
        debug: process.env.NODE_ENV === 'development' ? { otp } : undefined
      };
      
    } catch (error) {
      console.error(`❌ OTP generation failed for ${email}:`, error.message);
      throw error;
    } finally {
      this.processingStore.delete(email);
    }
  }

  /**
   * Verify OTP with race condition protection
   */
  async verifyOtp(email, otp) {
    const operationId = `verify_${email}_${Date.now()}`;
    
    try {
      // Prevent concurrent verification for same email
      if (this.processingStore.has(`verify_${email}`)) {
        throw new Error('OTP verification already in progress');
      }
      
      this.processingStore.add(`verify_${email}`);
      console.log(`🔍 Starting OTP verification for ${email} (${operationId})`);
      console.log(`📊 Current OTP store contents:`, Array.from(this.otpStore.entries()).map(([k, v]) => ({
        email: k,
        otp: v.otp,
        used: v.used,
        expired: v.expiresAt < Date.now()
      })));
      
      // Validate input
      if (!email || !otp) {
        throw new Error('Email and OTP are required');
      }
      
      if (otp.length !== this.config.otpLength) {
        throw new Error(`OTP must be ${this.config.otpLength} digits`);
      }
      
      // Get OTP data
      const otpData = this.otpStore.get(email);
      if (!otpData) {
        throw new Error('No OTP found for this email. Please request a new OTP');
      }
      
      // Check if already used
      if (otpData.used) {
        throw new Error('OTP has already been used. Please request a new OTP');
      }
      
      // Check expiration
      const now = Date.now();
      if (otpData.expiresAt < now) {
        this.otpStore.delete(email);
        throw new Error('OTP has expired. Please request a new OTP');
      }
      
      // Check max attempts
      if (otpData.attempts >= this.config.maxAttempts) {
        this.otpStore.delete(email);
        throw new Error('Maximum verification attempts exceeded. Please request a new OTP');
      }
      
      // Increment attempts
      otpData.attempts++;
      
      // Verify OTP using constant-time comparison
      if (!this.constantTimeCompare(otpData.otp, otp)) {
        console.log(`❌ Invalid OTP for ${email}. Expected: ${otpData.otp}, Got: ${otp} (Attempt ${otpData.attempts}/${this.config.maxAttempts})`);
        
        if (otpData.attempts >= this.config.maxAttempts) {
          this.otpStore.delete(email);
          throw new Error('Invalid OTP. Maximum attempts exceeded. Please request a new OTP');
        }
        
        throw new Error(`Invalid OTP. ${this.config.maxAttempts - otpData.attempts} attempts remaining`);
      }
      
      // Mark as used and delete from store
      otpData.used = true;
      otpData.usedAt = now;
      this.otpStore.delete(email);
      
      console.log(`✅ OTP verified successfully for ${email}`);
      console.log(`📊 OTP store size after verification: ${this.otpStore.size}`);
      
      return {
        success: true,
        message: 'OTP verified successfully',
        verifiedAt: now,
        user: { email }
      };
      
    } catch (error) {
      console.error(`❌ OTP verification failed for ${email}:`, error.message);
      throw error;
    } finally {
      this.processingStore.delete(`verify_${email}`);
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  constantTimeCompare(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * Resend OTP with rate limiting
   */
  async resendOtp(email) {
    console.log(`🔄 Resend OTP requested for ${email}`);
    
    // Check if there's an existing valid OTP
    const existingOtp = this.otpStore.get(email);
    if (existingOtp && !existingOtp.used && existingOtp.expiresAt > Date.now()) {
      console.log(`⚠️ Valid OTP already exists for ${email}, generating new one`);
    }
    
    // Generate new OTP (this will replace the existing one)
    return await this.generateOtp(email, { isResend: true });
  }

  /**
   * Clean up expired OTPs and rate limit data
   */
  cleanupExpiredOtps() {
    const now = Date.now();
    let otpCleanedCount = 0;
    let rateLimitCleanedCount = 0;
    
    // Clean expired OTPs
    for (const [email, otpData] of this.otpStore.entries()) {
      if (otpData.expiresAt < now || otpData.used) {
        this.otpStore.delete(email);
        otpCleanedCount++;
      }
    }
    
    // Clean expired rate limit data
    for (const [email, rateLimitData] of this.rateLimitStore.entries()) {
      if (now - rateLimitData.windowStart > this.config.rateLimitWindow && !rateLimitData.blocked) {
        this.rateLimitStore.delete(email);
        rateLimitCleanedCount++;
      }
    }
    
    if (otpCleanedCount > 0 || rateLimitCleanedCount > 0) {
      console.log(`🧹 Cleanup completed: ${otpCleanedCount} OTPs, ${rateLimitCleanedCount} rate limits removed`);
    }
    
    return { otpCleanedCount, rateLimitCleanedCount };
  }

  /**
   * Start automatic cleanup process
   */
  startCleanupProcess() {
    setInterval(() => {
      this.cleanupExpiredOtps();
    }, this.config.cleanupInterval);
    
    console.log(`🧹 Automatic cleanup started (interval: ${this.config.cleanupInterval / 1000}s)`);
  }

  /**
   * Clear all rate limits and OTP data
   */
  clearAllLimits() {
    const otpCount = this.otpStore.size;
    const rateLimitCount = this.rateLimitStore.size;
    const processingCount = this.processingStore.size;
    
    this.otpStore.clear();
    this.rateLimitStore.clear();
    this.processingStore.clear();
    
    console.log(`🧹 Cleared all limits: ${otpCount} OTPs, ${rateLimitCount} rate limits, ${processingCount} processing`);
    return { otpCount, rateLimitCount, processingCount };
  }

  /**
   * Get service statistics
   */
  getStats() {
    const now = Date.now();
    const activeOtps = Array.from(this.otpStore.values()).filter(otp => 
      !otp.used && otp.expiresAt > now
    ).length;
    
    return {
      totalOtps: this.otpStore.size,
      activeOtps,
      rateLimitedEmails: this.rateLimitStore.size,
      processingOperations: this.processingStore.size,
      config: this.config
    };
  }
}

// Export singleton instance for easy clearing
const otpServiceInstance = new OtpService();
module.exports = otpServiceInstance;
module.exports.OtpService = OtpService;