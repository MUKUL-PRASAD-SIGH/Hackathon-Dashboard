// Clear all rate limiting data
const security = require('./middleware/security');

console.log('🧹 Clearing all rate limits...');

// Clear the internal maps by requiring and accessing them
const securityModule = require('./middleware/security');

// Since the maps are internal, we'll restart the server to clear them
console.log('✅ Rate limits will be cleared on server restart');
console.log('💡 Restart the server with: npm run dev');