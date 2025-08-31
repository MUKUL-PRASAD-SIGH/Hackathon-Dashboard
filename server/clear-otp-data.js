// Direct script to clear OTP rate limits
const otpService = require('./services/otpService');

console.log('🧹 Clearing all OTP data and rate limits...');

// Clear all data using the new method
const result = otpService.clearAllLimits();

console.log('✅ Successfully cleared:');
console.log(`  - ${result.otpCount} OTPs`);
console.log(`  - ${result.rateLimitCount} rate limits`); 
console.log(`  - ${result.processingCount} processing operations`);
console.log('');
console.log('🎉 All OTP rate limits have been cleared!');
console.log('💡 You can now request OTP immediately');