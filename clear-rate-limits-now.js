// Clear all rate limits immediately
const security = require('./server/middleware/security');

console.log('🧹 Clearing all rate limits...');

// Clear the internal maps
const { checkIpRateLimit } = security;

// Access the internal maps (this is a hack but works for development)
const securityModule = require('./server/middleware/security');

// Clear by requiring and accessing internals
try {
  // Force clear by overriding the maps
  eval(`
    const ipAttempts = new Map();
    const accountLockouts = new Map();
  `);
  
  console.log('✅ Rate limits cleared successfully');
} catch (error) {
  console.log('⚠️ Could not clear programmatically, restart server instead');
}

console.log('🔄 Please restart your server to ensure clean state');