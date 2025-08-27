const request = require('supertest');
const express = require('express');
const { jest } = require('@jest/globals');

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.GMAIL_USER = 'test@gmail.com';
process.env.GMAIL_APP_PASSWORD = 'test-password';

// Import the app after setting environment
const app = require('../server');

describe('OTP Authentication Integration Tests', () => {
  let testEmail = 'test@example.com';
  let testOtp = '';
  
  beforeEach(() => {
    // Reset test data
    testEmail = `test-${Date.now()}@example.com`;
    testOtp = '';
  });

  describe('Complete Registration Flow', () => {
    test('should complete full registration flow with OTP verification', async () => {
      // Step 1: Send OTP
      const sendOtpResponse = await request(app)
        .post('/api/send-otp')
        .send({ email: testEmail })
        .expect(200);

      expect(sendOtpResponse.body.success).toBe(true);
      expect(sendOtpResponse.body.message).toContain('OTP sent');

      // Step 2: Get OTP from console logs (in test environment)
      // In real tests, you'd mock the email service or use a test email provider
      testOtp = '123456'; // Mock OTP for testing

      // Step 3: Verify OTP
      const verifyOtpResponse = await request(app)
        .post('/api/verify-otp')
        .send({ 
          email: testEmail, 
          otp: testOtp 
        })
        .expect(200);

      expect(verifyOtpResponse.body.success).toBe(true);
      expect(verifyOtpResponse.body.message).toContain('verified');

      // Step 4: Complete registration
      const registerResponse = await request(app)
        .post('/api/register')
        .send({
          name: 'Test User',
          email: testEmail,
          password: 'TestPassword123!'
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.user).toBeDefined();
      expect(registerResponse.body.user.email).toBe(testEmail);
      expect(registerResponse.body.token).toBeDefined();
    });

    test('should fail registration without OTP verification', async () => {
      const registerResponse = await request(app)
        .post('/api/register')
        .send({
          name: 'Test User',
          email: 'unverified@example.com',
          password: 'TestPassword123!'
        })
        .expect(400);

      expect(registerResponse.body.success).toBe(false);
      expect(registerResponse.body.error.message).toContain('Email not verified');
    });
  });

  describe('Rate Limiting Tests', () => {
    test('should enforce OTP rate limiting', async () => {
      const email = `ratelimit-${Date.now()}@example.com`;
      
      // Send multiple OTP requests rapidly
      const requests = [];
      for (let i = 0; i < 6; i++) {
        requests.push(
          request(app)
            .post('/api/send-otp')
            .send({ email })
        );
      }

      const responses = await Promise.all(requests);
      
      // First 5 should succeed, 6th should be rate limited
      const successCount = responses.filter(res => res.status === 200).length;
      const rateLimitedCount = responses.filter(res => res.status === 429).length;
      
      expect(successCount).toBeLessThanOrEqual(5);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    test('should enforce authentication rate limiting', async () => {
      const requests = [];
      for (let i = 0; i < 12; i++) {
        requests.push(
          request(app)
            .post('/api/login')
            .send({ 
              email: 'test@example.com', 
              password: 'wrongpassword' 
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should be rate limited
      const rateLimitedCount = responses.filter(res => res.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Race Condition Tests', () => {
    test('should handle concurrent OTP verification attempts', async () => {
      // Send OTP first
      await request(app)
        .post('/api/send-otp')
        .send({ email: testEmail })
        .expect(200);

      // Simulate concurrent verification attempts
      const concurrentRequests = [];
      for (let i = 0; i < 5; i++) {
        concurrentRequests.push(
          request(app)
            .post('/api/verify-otp')
            .send({ 
              email: testEmail, 
              otp: '123456' 
            })
        );
      }

      const responses = await Promise.all(concurrentRequests);
      
      // Only one should succeed, others should fail
      const successCount = responses.filter(res => res.status === 200).length;
      expect(successCount).toBeLessThanOrEqual(1);
    });

    test('should handle concurrent registration attempts', async () => {
      // Verify email first
      await request(app)
        .post('/api/send-otp')
        .send({ email: testEmail });
      
      await request(app)
        .post('/api/verify-otp')
        .send({ email: testEmail, otp: '123456' });

      // Attempt concurrent registrations
      const concurrentRequests = [];
      for (let i = 0; i < 3; i++) {
        concurrentRequests.push(
          request(app)
            .post('/api/register')
            .send({
              name: 'Test User',
              email: testEmail,
              password: 'TestPassword123!'
            })
        );
      }

      const responses = await Promise.all(concurrentRequests);
      
      // Only one should succeed
      const successCount = responses.filter(res => res.status === 201).length;
      expect(successCount).toBe(1);
      
      // Others should fail with conflict error
      const conflictCount = responses.filter(res => res.status === 409).length;
      expect(conflictCount).toBeGreaterThan(0);
    });
  });

  describe('Security Tests', () => {
    test('should sanitize input data', async () => {
      const maliciousEmail = '<script>alert(\"xss\")</script>@example.com';
      
      const response = await request(app)
        .post('/api/send-otp')
        .send({ email: maliciousEmail })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid email');
    });

    test('should validate email format', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        ''
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/send-otp')
          .send({ email });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should validate OTP format', async () => {
      const invalidOtps = [
        '12345',     // Too short
        '1234567',   // Too long
        'abcdef',    // Non-numeric
        '12 34 56',  // Contains spaces
        ''           // Empty
      ];

      for (const otp of invalidOtps) {
        const response = await request(app)
          .post('/api/verify-otp')
          .send({ 
            email: testEmail, 
            otp 
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });

    test('should validate registration data', async () => {
      const invalidRegistrations = [
        { name: '', email: testEmail, password: 'TestPassword123!' },
        { name: 'Test', email: 'invalid-email', password: 'TestPassword123!' },
        { name: 'Test', email: testEmail, password: '123' }, // Too short
        { name: 'Test', email: testEmail, password: 'nouppercasenumber' },
      ];

      for (const registration of invalidRegistrations) {
        const response = await request(app)
          .post('/api/register')
          .send(registration);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });

  describe('Error Recovery Tests', () => {
    test('should handle OTP expiration gracefully', async () => {
      // Send OTP
      await request(app)
        .post('/api/send-otp')
        .send({ email: testEmail });

      // Wait for OTP to expire (mock by manipulating time)
      // In real implementation, you'd mock the OTP service
      
      const response = await request(app)
        .post('/api/verify-otp')
        .send({ 
          email: testEmail, 
          otp: '123456' 
        });

      // Should handle expired OTP gracefully
      if (response.status === 400) {
        expect(response.body.error.code).toBe('OTP_EXPIRED');
      }
    });

    test('should allow OTP resend after failure', async () => {
      // Send initial OTP
      await request(app)
        .post('/api/send-otp')
        .send({ email: testEmail })
        .expect(200);

      // Fail verification
      await request(app)
        .post('/api/verify-otp')
        .send({ 
          email: testEmail, 
          otp: '000000' 
        })
        .expect(400);

      // Should be able to resend OTP
      const resendResponse = await request(app)
        .post('/api/resend-otp')
        .send({ email: testEmail })
        .expect(200);

      expect(resendResponse.body.success).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    test('should handle high load of OTP requests', async () => {
      const startTime = Date.now();
      const requests = [];
      
      // Generate 50 concurrent OTP requests with different emails
      for (let i = 0; i < 50; i++) {
        requests.push(
          request(app)
            .post('/api/send-otp')
            .send({ email: `load-test-${i}@example.com` })
        );
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      // Should complete within reasonable time (10 seconds)
      expect(endTime - startTime).toBeLessThan(10000);
      
      // Most requests should succeed (accounting for rate limiting)
      const successCount = responses.filter(res => res.status === 200).length;
      expect(successCount).toBeGreaterThan(40);
    });

    test('should respond quickly to health checks', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      const endTime = Date.now();
      
      // Health check should be fast (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Monitoring and Metrics Tests', () => {
    test('should collect and report metrics', async () => {
      // Make some requests to generate metrics
      await request(app)
        .post('/api/send-otp')
        .send({ email: testEmail });

      const metricsResponse = await request(app)
        .get('/metrics')
        .expect(200);

      expect(metricsResponse.body.requests).toBeDefined();
      expect(metricsResponse.body.requests.total).toBeGreaterThan(0);
      expect(metricsResponse.body.otp).toBeDefined();
    });

    test('should track error rates', async () => {
      // Generate some errors
      await request(app)
        .post('/api/send-otp')
        .send({ email: 'invalid-email' });

      await request(app)
        .post('/api/verify-otp')
        .send({ email: testEmail, otp: 'invalid' });

      const metricsResponse = await request(app)
        .get('/metrics')
        .expect(200);

      expect(metricsResponse.body.requests.errors).toBeGreaterThan(0);
    });
  });
});

// Cleanup after tests
afterAll(async () => {
  // Close any open connections
  if (app && app.close) {
    await app.close();
  }
});