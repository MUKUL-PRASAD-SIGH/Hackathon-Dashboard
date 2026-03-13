const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔍 Attempting MongoDB connection...');
    console.log('🔍 MongoDB URI exists:', !!process.env.MONGODB_URI);

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    // Log sanitized URI (hide credentials)
    const sanitizedUri = process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@');
    console.log('🔍 Connecting to:', sanitizedUri);

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✅ Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected successfully');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('❌ Full error:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check MONGODB_URI in .env file');
    console.log('2. Whitelist your IP in MongoDB Atlas (Network Access)');
    console.log('3. Verify username/password in connection string');
    console.log('4. Ensure the MongoDB Atlas cluster is running');
    process.exit(1);
  }
};

module.exports = connectDB;