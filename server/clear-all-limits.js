require('dotenv').config({ path: '../.env' });

// Clear rate limits by creating new OTP service instance
const OtpService = require('./services/otpService');

const otpService = new OtpService();

// Clear all data
otpService.rateLimitStore.clear();
otpService.otpStore.clear();

console.log('✅ All rate limits and OTP data cleared');
console.log('📊 Rate limit store size:', otpService.rateLimitStore.size);
console.log('📊 OTP store size:', otpService.otpStore.size);