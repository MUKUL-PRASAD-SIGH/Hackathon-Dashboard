const EmailService = require('../services/emailService');
const nodemailer = require('nodemailer');

// Mock nodemailer
jest.mock('nodemailer');

describe('EmailService', () => {
  let emailService;
  let mockTransporter;

  beforeEach(() => {
    // Reset environment variables
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'test-password';
    process.env.NODE_ENV = 'development';

    // Mock transporter
    mockTransporter = {
      verify: jest.fn(),
      sendMail: jest.fn()
    };

    nodemailer.createTransporter = jest.fn().mockReturnValue(mockTransporter);
    nodemailer.getTestMessageUrl = jest.fn().mockReturnValue('http://test-url.com');

    emailService = new EmailService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    test('should initialize successfully with valid credentials', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const result = await emailService.initialize();

      expect(result.success).toBe(true);
      expect(emailService.isConnected).toBe(true);
      expect(nodemailer.createTransporter).toHaveBeenCalledWith({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@gmail.com',
          pass: 'test-password'
        },
        tls: {
          rejectUnauthorized: false
        }
      });
    });

    test('should handle missing credentials gracefully', async () => {
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;

      const result = await emailService.initialize();

      expect(result.success).toBe(false);
      expect(result.demoMode).toBe(true);
      expect(emailService.isConnected).toBe(false);
    });

    test('should handle SMTP verification failure', async () => {
      mockTransporter.verify.mockRejectedValue(new Error('SMTP connection failed'));

      const result = await emailService.initialize();

      expect(result.success).toBe(false);
      expect(result.demoMode).toBe(true);
      expect(emailService.isConnected).toBe(false);
    });
  });

  describe('getOtpEmailTemplate', () => {
    test('should generate OTP email template with default options', () => {
      const template = emailService.getOtpEmailTemplate('123456');

      expect(template.subject).toBe('Your OTP for HackTrack');
      expect(template.html).toContain('123456');
      expect(template.html).toContain('Hello,');
      expect(template.html).toContain('10 minutes');
      expect(template.text).toContain('123456');
    });

    test('should generate resend OTP email template', () => {
      const template = emailService.getOtpEmailTemplate('654321', { 
        isResend: true, 
        userName: 'John Doe',
        expirationMinutes: 5
      });

      expect(template.subject).toBe('Your New OTP for HackTrack');
      expect(template.html).toContain('654321');
      expect(template.html).toContain('Hello John Doe,');
      expect(template.html).toContain('5 minutes');
      expect(template.html).toContain('new OTP');
    });

    test('should include security warnings in template', () => {
      const template = emailService.getOtpEmailTemplate('123456');

      expect(template.html).toContain('never share this OTP');
      expect(template.html).toContain('security');
      expect(template.text).toContain('do not share');
    });
  });

  describe('sendOtpEmail', () => {
    beforeEach(async () => {
      mockTransporter.verify.mockResolvedValue(true);
      await emailService.initialize();
    });

    test('should send OTP email successfully', async () => {
      const mockResult = { messageId: 'test-message-id' };
      mockTransporter.sendMail.mockResolvedValue(mockResult);

      const result = await emailService.sendOtpEmail('user@example.com', '123456');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Your OTP for HackTrack',
          html: expect.stringContaining('123456')
        })
      );
    });

    test('should handle demo mode when transporter not available', async () => {
      emailService.transporter = null;

      const result = await emailService.sendOtpEmail('user@example.com', '123456');

      expect(result.success).toBe(true);
      expect(result.demoMode).toBe(true);
      expect(result.messageId).toContain('demo_');
    });

    test('should send resend OTP email with correct template', async () => {
      const mockResult = { messageId: 'resend-message-id' };
      mockTransporter.sendMail.mockResolvedValue(mockResult);

      const result = await emailService.sendOtpEmail('user@example.com', '654321', {
        isResend: true,
        userName: 'Jane Doe'
      });

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Your New OTP for HackTrack',
          html: expect.stringContaining('Jane Doe')
        })
      );
    });
  });

  describe('sendWithRetry', () => {
    beforeEach(async () => {
      mockTransporter.verify.mockResolvedValue(true);
      await emailService.initialize();
    });

    test('should succeed on first attempt', async () => {
      const mockResult = { messageId: 'success-id' };
      mockTransporter.sendMail.mockResolvedValue(mockResult);

      const mailOptions = { to: 'test@example.com', subject: 'Test' };
      const result = await emailService.sendWithRetry(mailOptions);

      expect(result).toBe(mockResult);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure and eventually succeed', async () => {
      const mockResult = { messageId: 'retry-success-id' };
      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue(mockResult);

      const mailOptions = { to: 'test@example.com', subject: 'Test' };
      const result = await emailService.sendWithRetry(mailOptions);

      expect(result).toBe(mockResult);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    });

    test('should fail after max retry attempts', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('Persistent error'));

      const mailOptions = { to: 'test@example.com', subject: 'Test' };

      await expect(emailService.sendWithRetry(mailOptions))
        .rejects.toThrow('Persistent error');
      
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    });
  });

  describe('sendWelcomeEmail', () => {
    beforeEach(async () => {
      mockTransporter.verify.mockResolvedValue(true);
      await emailService.initialize();
    });

    test('should send welcome email successfully', async () => {
      const mockResult = { messageId: 'welcome-id' };
      mockTransporter.sendMail.mockResolvedValue(mockResult);

      const result = await emailService.sendWelcomeEmail('user@example.com', 'John Doe');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('welcome-id');
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Welcome to HackTrack! 🎉',
          html: expect.stringContaining('John Doe')
        })
      );
    });

    test('should handle welcome email failure gracefully', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('Email failed'));

      const result = await emailService.sendWelcomeEmail('user@example.com', 'John Doe');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email failed');
      // Should not throw error - welcome email is not critical
    });

    test('should handle demo mode for welcome email', async () => {
      emailService.transporter = null;

      const result = await emailService.sendWelcomeEmail('user@example.com', 'John Doe');

      expect(result.success).toBe(true);
      expect(result.demoMode).toBe(true);
    });
  });

  describe('getStatus', () => {
    test('should return service status', () => {
      const status = emailService.getStatus();

      expect(status).toEqual({
        isConnected: false,
        hasTransporter: false,
        config: {
          service: 'gmail',
          host: 'smtp.gmail.com',
          port: 587
        },
        credentials: {
          hasUser: true,
          hasPassword: true
        }
      });
    });

    test('should reflect connected state after initialization', async () => {
      mockTransporter.verify.mockResolvedValue(true);
      await emailService.initialize();

      const status = emailService.getStatus();

      expect(status.isConnected).toBe(true);
      expect(status.hasTransporter).toBe(true);
    });
  });
});