const OtpService = require('../services/otpService');

describe('OtpService', () => {
  let otpService;

  beforeEach(() => {
    otpService = new OtpService();
    // Override config for faster testing
    otpService.config.expirationTime = 1000; // 1 second
    otpService.config.rateLimitWindow = 2000; // 2 seconds
    otpService.config.maxRequestsPerWindow = 2;
  });

  afterEach(() => {
    // Clean up any intervals
    if (otpService.cleanupInterval) {
      clearInterval(otpService.cleanupInterval);
    }
  });

  describe('generateOtp', () => {
    test('should generate valid 6-digit OTP', async () => {
      const result = await otpService.generateOtp('test@example.com');
      
      expect(result.success).toBe(true);
      expect(result.debug.otp).toMatch(/^\d{6}$/);
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    test('should prevent concurrent generation for same email', async () => {
      const email = 'test@example.com';
      
      // Start first generation
      const promise1 = otpService.generateOtp(email);
      
      // Try concurrent generation
      await expect(otpService.generateOtp(email))
        .rejects.toThrow('OTP generation already in progress');
      
      // First should complete successfully
      await expect(promise1).resolves.toMatchObject({ success: true });
    });

    test('should enforce rate limiting', async () => {
      const email = 'test@example.com';
      
      // First two requests should succeed
      await otpService.generateOtp(email);
      await otpService.generateOtp(email);
      
      // Third should fail
      await expect(otpService.generateOtp(email))
        .rejects.toThrow('Rate limit exceeded');
    });

    test('should increment resend count', async () => {
      const email = 'test@example.com';
      
      const result1 = await otpService.generateOtp(email);
      expect(result1.resendCount).toBe(0);
      
      const result2 = await otpService.generateOtp(email);
      expect(result2.resendCount).toBe(1);
    });
  });

  describe('verifyOtp', () => {
    test('should verify valid OTP', async () => {
      const email = 'test@example.com';
      const generateResult = await otpService.generateOtp(email);
      const otp = generateResult.debug.otp;
      
      const verifyResult = await otpService.verifyOtp(email, otp);
      
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.user.email).toBe(email);
    });

    test('should reject invalid OTP', async () => {
      const email = 'test@example.com';
      await otpService.generateOtp(email);
      
      await expect(otpService.verifyOtp(email, '000000'))
        .rejects.toThrow('Invalid OTP');
    });

    test('should reject expired OTP', async () => {
      const email = 'test@example.com';
      const generateResult = await otpService.generateOtp(email);
      const otp = generateResult.debug.otp;
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      await expect(otpService.verifyOtp(email, otp))
        .rejects.toThrow('OTP has expired');
    });

    test('should reject used OTP', async () => {
      const email = 'test@example.com';
      const generateResult = await otpService.generateOtp(email);
      const otp = generateResult.debug.otp;
      
      // First verification should succeed
      await otpService.verifyOtp(email, otp);
      
      // Second should fail
      await expect(otpService.verifyOtp(email, otp))
        .rejects.toThrow('No OTP found for this email');
    });

    test('should prevent concurrent verification', async () => {
      const email = 'test@example.com';
      const generateResult = await otpService.generateOtp(email);
      const otp = generateResult.debug.otp;
      
      // Start first verification
      const promise1 = otpService.verifyOtp(email, otp);
      
      // Try concurrent verification
      await expect(otpService.verifyOtp(email, otp))
        .rejects.toThrow('OTP verification already in progress');
      
      // First should complete successfully
      await expect(promise1).resolves.toMatchObject({ success: true });
    });

    test('should enforce max attempts', async () => {
      const email = 'test@example.com';
      await otpService.generateOtp(email);
      
      // Make max attempts with wrong OTP
      for (let i = 0; i < otpService.config.maxAttempts; i++) {
        try {
          await otpService.verifyOtp(email, '000000');
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Next attempt should indicate max attempts exceeded
      await expect(otpService.verifyOtp(email, '000000'))
        .rejects.toThrow('No OTP found for this email');
    });
  });

  describe('resendOtp', () => {
    test('should generate new OTP for resend', async () => {
      const email = 'test@example.com';
      
      const result1 = await otpService.generateOtp(email);
      const result2 = await otpService.resendOtp(email);
      
      expect(result2.success).toBe(true);
      expect(result2.resendCount).toBe(1);
      expect(result2.debug.otp).toMatch(/^\d{6}$/);
    });
  });

  describe('cleanupExpiredOtps', () => {
    test('should remove expired OTPs', async () => {
      const email = 'test@example.com';
      await otpService.generateOtp(email);
      
      expect(otpService.otpStore.size).toBe(1);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      const result = otpService.cleanupExpiredOtps();
      
      expect(result.otpCleanedCount).toBe(1);
      expect(otpService.otpStore.size).toBe(0);
    });
  });

  describe('constantTimeCompare', () => {
    test('should return true for identical strings', () => {
      expect(otpService.constantTimeCompare('123456', '123456')).toBe(true);
    });

    test('should return false for different strings', () => {
      expect(otpService.constantTimeCompare('123456', '654321')).toBe(false);
    });

    test('should return false for different length strings', () => {
      expect(otpService.constantTimeCompare('123456', '12345')).toBe(false);
    });
  });

  describe('getStats', () => {
    test('should return service statistics', async () => {
      const email = 'test@example.com';
      await otpService.generateOtp(email);
      
      const stats = otpService.getStats();
      
      expect(stats.totalOtps).toBe(1);
      expect(stats.activeOtps).toBe(1);
      expect(stats.config).toBeDefined();
    });
  });
});