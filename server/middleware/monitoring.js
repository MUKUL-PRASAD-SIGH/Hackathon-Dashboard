const { logger, performanceTracker } = require('../utils/logger');

// System metrics collection
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byEndpoint: new Map(),
        byStatusCode: new Map()
      },
      otp: {
        generated: 0,
        verified: 0,
        failed: 0,
        expired: 0,
        resent: 0
      },
      email: {
        sent: 0,
        failed: 0,
        deliveryTime: []
      },
      performance: {
        responseTime: [],
        dbQueries: [],
        emailDelivery: []
      },
      security: {
        rateLimitHits: 0,
        accountLockouts: 0,
        suspiciousActivity: 0
      }
    };
    
    this.startTime = Date.now();
  }

  // Request metrics
  recordRequest(method, endpoint, statusCode, duration) {
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }
    
    // Track by endpoint
    const endpointKey = `${method} ${endpoint}`;
    const endpointStats = this.metrics.requests.byEndpoint.get(endpointKey) || { count: 0, totalTime: 0 };
    endpointStats.count++;
    endpointStats.totalTime += duration;
    this.metrics.requests.byEndpoint.set(endpointKey, endpointStats);
    
    // Track by status code
    const statusStats = this.metrics.requests.byStatusCode.get(statusCode) || 0;
    this.metrics.requests.byStatusCode.set(statusCode, statusStats + 1);
    
    // Record response time
    this.metrics.performance.responseTime.push(duration);
    
    // Keep only last 1000 response times
    if (this.metrics.performance.responseTime.length > 1000) {
      this.metrics.performance.responseTime.shift();
    }
  }

  // OTP metrics
  recordOtpGenerated() {
    this.metrics.otp.generated++;
  }

  recordOtpVerified(success) {
    if (success) {
      this.metrics.otp.verified++;
    } else {
      this.metrics.otp.failed++;
    }
  }

  recordOtpExpired() {
    this.metrics.otp.expired++;
  }

  recordOtpResent() {
    this.metrics.otp.resent++;
  }

  // Email metrics
  recordEmailSent(success, deliveryTime) {
    if (success) {
      this.metrics.email.sent++;
      if (deliveryTime) {
        this.metrics.email.deliveryTime.push(deliveryTime);
        // Keep only last 100 delivery times
        if (this.metrics.email.deliveryTime.length > 100) {
          this.metrics.email.deliveryTime.shift();
        }
      }
    } else {
      this.metrics.email.failed++;
    }
  }

  // Security metrics
  recordRateLimitHit() {
    this.metrics.security.rateLimitHits++;
  }

  recordAccountLockout() {
    this.metrics.security.accountLockouts++;
  }

  recordSuspiciousActivity() {
    this.metrics.security.suspiciousActivity++;
  }

  // Get summary statistics
  getSummary() {
    const uptime = Date.now() - this.startTime;
    const responseTime = this.metrics.performance.responseTime;
    
    return {
      uptime: Math.floor(uptime / 1000), // seconds
      requests: {
        ...this.metrics.requests,
        successRate: this.metrics.requests.total > 0 
          ? (this.metrics.requests.success / this.metrics.requests.total * 100).toFixed(2) + '%'
          : '0%',
        avgResponseTime: responseTime.length > 0 
          ? (responseTime.reduce((a, b) => a + b, 0) / responseTime.length).toFixed(2) + 'ms'
          : '0ms'
      },
      otp: {
        ...this.metrics.otp,
        successRate: this.metrics.otp.verified + this.metrics.otp.failed > 0
          ? (this.metrics.otp.verified / (this.metrics.otp.verified + this.metrics.otp.failed) * 100).toFixed(2) + '%'
          : '0%'
      },
      email: {
        ...this.metrics.email,
        successRate: this.metrics.email.sent + this.metrics.email.failed > 0
          ? (this.metrics.email.sent / (this.metrics.email.sent + this.metrics.email.failed) * 100).toFixed(2) + '%'
          : '0%',
        avgDeliveryTime: this.metrics.email.deliveryTime.length > 0
          ? (this.metrics.email.deliveryTime.reduce((a, b) => a + b, 0) / this.metrics.email.deliveryTime.length).toFixed(2) + 'ms'
          : '0ms'
      },
      security: this.metrics.security
    };
  }

  // Reset metrics
  reset() {
    this.metrics = {
      requests: { total: 0, success: 0, errors: 0, byEndpoint: new Map(), byStatusCode: new Map() },
      otp: { generated: 0, verified: 0, failed: 0, expired: 0, resent: 0 },
      email: { sent: 0, failed: 0, deliveryTime: [] },
      performance: { responseTime: [], dbQueries: [], emailDelivery: [] },
      security: { rateLimitHits: 0, accountLockouts: 0, suspiciousActivity: 0 }
    };
    this.startTime = Date.now();
  }
}

// Global metrics collector instance
const metricsCollector = new MetricsCollector();

// Middleware for collecting request metrics
const metricsMiddleware = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  // Override res.json to capture metrics
  const originalJson = res.json;
  res.json = function(data) {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    metricsCollector.recordRequest(req.method, req.route?.path || req.path, res.statusCode, duration);
    
    return originalJson.call(this, data);
  };
  
  next();
};

// Health check endpoint
const healthCheck = (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    metrics: metricsCollector.getSummary()
  };
  
  // Check critical systems
  const checks = {
    memory: process.memoryUsage().heapUsed < 500 * 1024 * 1024, // Less than 500MB
    uptime: process.uptime() > 0,
    responseTime: true // Could add more sophisticated checks
  };
  
  const allHealthy = Object.values(checks).every(check => check);
  
  res.status(allHealthy ? 200 : 503).json({
    ...health,
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks
  });
};

// Detailed metrics endpoint
const metricsEndpoint = (req, res) => {
  const summary = metricsCollector.getSummary();
  
  res.json({
    timestamp: new Date().toISOString(),
    ...summary
  });
};

// Alert system for monitoring critical events
class AlertSystem {
  constructor() {
    this.thresholds = {
      errorRate: 10, // 10% error rate
      responseTime: 5000, // 5 seconds
      failedOtpRate: 50, // 50% failed OTP rate
      emailFailureRate: 20 // 20% email failure rate
    };
    
    this.alerts = [];
    this.lastCheck = Date.now();
  }

  checkAlerts() {
    const now = Date.now();
    const summary = metricsCollector.getSummary();
    const newAlerts = [];

    // Check error rate
    const errorRate = parseFloat(summary.requests.successRate.replace('%', ''));
    if (100 - errorRate > this.thresholds.errorRate) {
      newAlerts.push({
        type: 'HIGH_ERROR_RATE',
        message: `Error rate is ${100 - errorRate}%, threshold is ${this.thresholds.errorRate}%`,
        severity: 'critical',
        timestamp: now
      });
    }

    // Check response time
    const avgResponseTime = parseFloat(summary.requests.avgResponseTime.replace('ms', ''));
    if (avgResponseTime > this.thresholds.responseTime) {
      newAlerts.push({
        type: 'HIGH_RESPONSE_TIME',
        message: `Average response time is ${avgResponseTime}ms, threshold is ${this.thresholds.responseTime}ms`,
        severity: 'warning',
        timestamp: now
      });
    }

    // Check OTP failure rate
    const otpSuccessRate = parseFloat(summary.otp.successRate.replace('%', ''));
    if (100 - otpSuccessRate > this.thresholds.failedOtpRate) {
      newAlerts.push({
        type: 'HIGH_OTP_FAILURE_RATE',
        message: `OTP failure rate is ${100 - otpSuccessRate}%, threshold is ${this.thresholds.failedOtpRate}%`,
        severity: 'critical',
        timestamp: now
      });
    }

    // Check email failure rate
    const emailSuccessRate = parseFloat(summary.email.successRate.replace('%', ''));
    if (100 - emailSuccessRate > this.thresholds.emailFailureRate) {
      newAlerts.push({
        type: 'HIGH_EMAIL_FAILURE_RATE',
        message: `Email failure rate is ${100 - emailSuccessRate}%, threshold is ${this.thresholds.emailFailureRate}%`,
        severity: 'warning',
        timestamp: now
      });
    }

    // Log new alerts
    newAlerts.forEach(alert => {
      logger.warn(`ALERT: ${alert.type}`, alert);
      this.alerts.push(alert);
    });

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    this.lastCheck = now;
    return newAlerts;
  }

  getActiveAlerts() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return this.alerts.filter(alert => alert.timestamp > oneHourAgo);
  }
}

const alertSystem = new AlertSystem();

// Run alert checks every 5 minutes
setInterval(() => {
  alertSystem.checkAlerts();
}, 5 * 60 * 1000);

module.exports = {
  metricsCollector,
  metricsMiddleware,
  healthCheck,
  metricsEndpoint,
  alertSystem,
  MetricsCollector,
  AlertSystem
};