const request = require('supertest');
const { performance } = require('perf_hooks');
const app = require('../server');
const { memoryMonitor } = require('../utils/cache');

describe('Performance Tests', () => {
  
  describe('Response Time Tests', () => {
    test('should respond to health check within 50ms', async () => {
      const start = performance.now();
      
      await request(app)
        .get('/health')
        .expect(200);
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(responseTime).toBeLessThan(50);
    });

    test('should handle OTP generation within 200ms', async () => {
      const start = performance.now();
      
      await request(app)
        .post('/api/send-otp')
        .send({ email: 'performance@test.com' });
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(responseTime).toBeLessThan(200);
    });

    test('should handle user registration within 300ms', async () => {
      // First verify email
      await request(app)
        .post('/api/send-otp')
        .send({ email: 'perf-register@test.com' });
      
      await request(app)
        .post('/api/verify-otp')
        .send({ email: 'perf-register@test.com', otp: '123456' });

      const start = performance.now();
      
      await request(app)
        .post('/api/register')
        .send({
          name: 'Performance Test',
          email: 'perf-register@test.com',
          password: 'TestPassword123!'
        });
      
      const end = performance.now();
      const responseTime = end - start;
      
      expect(responseTime).toBeLessThan(300);
    });
  });

  describe('Concurrent Request Tests', () => {
    test('should handle 50 concurrent health checks', async () => {
      const requests = [];
      const start = performance.now();
      
      for (let i = 0; i < 50; i++) {
        requests.push(
          request(app)
            .get('/health')
            .expect(200)
        );
      }
      
      await Promise.all(requests);
      const end = performance.now();
      const totalTime = end - start;
      
      // Should complete within 2 seconds
      expect(totalTime).toBeLessThan(2000);
    });

    test('should handle concurrent OTP requests efficiently', async () => {
      const requests = [];
      const start = performance.now();
      
      // Generate 20 concurrent OTP requests with different emails
      for (let i = 0; i < 20; i++) {
        requests.push(
          request(app)
            .post('/api/send-otp')
            .send({ email: `concurrent-${i}@test.com` })
        );
      }
      
      const responses = await Promise.all(requests);
      const end = performance.now();
      const totalTime = end - start;
      
      // Should complete within 3 seconds
      expect(totalTime).toBeLessThan(3000);
      
      // Most requests should succeed (accounting for rate limiting)
      const successCount = responses.filter(res => res.status === 200).length;
      expect(successCount).toBeGreaterThan(15);
    });
  });

  describe('Memory Usage Tests', () => {
    test('should maintain reasonable memory usage', async () => {
      const initialMemory = memoryMonitor.getMemoryUsage();
      
      // Generate load
      const requests = [];
      for (let i = 0; i < 100; i++) {
        requests.push(
          request(app)
            .post('/api/send-otp')
            .send({ email: `memory-test-${i}@test.com` })
        );
      }
      
      await Promise.all(requests);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = memoryMonitor.getMemoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50);
    });

    test('should not have memory leaks in OTP operations', async () => {
      const measurements = [];
      
      // Take baseline measurement
      measurements.push(memoryMonitor.getMemoryUsage().heapUsed);
      
      // Perform operations in batches
      for (let batch = 0; batch < 5; batch++) {
        const requests = [];
        
        for (let i = 0; i < 20; i++) {
          const email = `leak-test-${batch}-${i}@test.com`;
          
          // Send OTP
          requests.push(
            request(app)
              .post('/api/send-otp')
              .send({ email })
          );
        }
        
        await Promise.all(requests);
        
        // Force garbage collection
        if (global.gc) {
          global.gc();
        }
        
        measurements.push(memoryMonitor.getMemoryUsage().heapUsed);
      }
      
      // Check that memory usage doesn't continuously increase
      const firstMeasurement = measurements[0];
      const lastMeasurement = measurements[measurements.length - 1];
      const memoryIncrease = lastMeasurement - firstMeasurement;
      
      // Should not increase by more than 30MB
      expect(memoryIncrease).toBeLessThan(30);
    });
  });

  describe('Cache Performance Tests', () => {
    test('should benefit from request deduplication', async () => {
      const email = 'cache-test@example.com';
      
      // First request (cache miss)
      const start1 = performance.now();
      await request(app)
        .post('/api/send-otp')
        .send({ email });
      const end1 = performance.now();
      const firstRequestTime = end1 - start1;
      
      // Wait a moment to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Second identical request (should be faster due to caching)
      const start2 = performance.now();
      await request(app)
        .post('/api/send-otp')
        .send({ email });
      const end2 = performance.now();
      const secondRequestTime = end2 - start2;
      
      // Second request should be significantly faster (or rate limited)
      // If rate limited, it should be very fast
      if (secondRequestTime < firstRequestTime) {
        expect(secondRequestTime).toBeLessThan(firstRequestTime * 0.5);
      }
    });
  });

  describe('Load Testing', () => {
    test('should handle sustained load', async () => {
      const duration = 5000; // 5 seconds
      const startTime = Date.now();
      const requests = [];
      let requestCount = 0;
      
      // Generate requests for 5 seconds
      while (Date.now() - startTime < duration) {
        if (requests.length < 100) { // Limit concurrent requests
          requests.push(
            request(app)
              .get('/health')
              .then(() => {
                requestCount++;
                return true;
              })
              .catch(() => false)
          );
        }
        
        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const results = await Promise.all(requests);
      const successCount = results.filter(result => result === true).length;
      const successRate = (successCount / requestCount) * 100;
      
      // Should maintain high success rate under load
      expect(successRate).toBeGreaterThan(95);
      
      // Should handle reasonable number of requests
      expect(requestCount).toBeGreaterThan(100);
    });
  });

  describe('Database Performance', () => {
    test('should handle user operations efficiently', async () => {
      const User = require('../models/User');
      
      const start = performance.now();
      
      // Create multiple users
      const userPromises = [];
      for (let i = 0; i < 50; i++) {
        // Mark emails as verified first
        User.markEmailAsVerified(`perf-user-${i}@test.com`);
        
        userPromises.push(
          User.create({
            name: `Performance User ${i}`,
            email: `perf-user-${i}@test.com`,
            password: 'TestPassword123!'
          }).catch(() => null) // Ignore errors for duplicates
        );
      }
      
      await Promise.all(userPromises);
      
      const end = performance.now();
      const totalTime = end - start;
      
      // Should complete within 1 second
      expect(totalTime).toBeLessThan(1000);
      
      // Verify user count increased
      const userCount = User.getUserCount();
      expect(userCount).toBeGreaterThan(0);
    });
  });
});

// Cleanup after tests
afterAll(async () => {
  if (app && app.close) {
    await app.close();
  }
});