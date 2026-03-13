const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'server_check.txt');

let output = '';
output += 'Node version: ' + process.version + '\n';
output += 'CWD: ' + process.cwd() + '\n';

// Check .env file
const envPath = path.join(__dirname, '..', '.env');
output += '.env path: ' + envPath + '\n';
output += '.env exists: ' + fs.existsSync(envPath) + '\n';

// Check node_modules  
const nmPath = path.join(__dirname, 'node_modules');
output += 'node_modules exists: ' + fs.existsSync(nmPath) + '\n';

// Check key modules
['express', 'mongoose', 'cors', 'dotenv'].forEach(m => {
    output += '  ' + m + ': ' + fs.existsSync(path.join(nmPath, m)) + '\n';
});

// Try loading env
try {
    require('dotenv').config({ path: envPath });
    output += 'MONGO_URI set: ' + !!process.env.MONGO_URI + '\n';
    output += 'GOOGLE_CLIENT_ID set: ' + !!process.env.GOOGLE_CLIENT_ID + '\n';
} catch (e) {
    output += 'dotenv error: ' + e.message + '\n';
}

fs.writeFileSync(logFile, output);
process.exit(0);
