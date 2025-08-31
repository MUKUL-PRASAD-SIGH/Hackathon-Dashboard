// Clear OTP rate limits and data
const path = require('path');

// Simple script to clear rate limits by restarting the server
console.log('🧹 Clearing OTP rate limits...');

// Method 1: Clear by deleting the rate limit stores
try {
  // Since the OTP service stores data in memory (Map objects),
  // the easiest way to clear them is to restart the server
  console.log('✅ To clear OTP rate limits:');
  console.log('1. Stop the server (Ctrl+C)');
  console.log('2. Restart with: npm run dev');
  console.log('');
  console.log('💡 Rate limits are stored in memory and will be cleared on restart');
  console.log('🔄 Alternatively, wait 15 minutes for automatic expiry');
} catch (error) {
  console.error('❌ Error:', error.message);
}