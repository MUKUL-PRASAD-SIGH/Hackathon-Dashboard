const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectAndCheck = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the user by email
    const UserMongoDB = require('./models/UserMongoDB');
    const user = await UserMongoDB.findOne({ email: 'mukulpra48@gmail.com' });
    
    if (user) {
      console.log('✅ Found user:', {
        id: user._id,
        email: user.email,
        name: user.name
      });
      
      // Generate correct token
      const correctToken = Buffer.from(JSON.stringify({
        id: user._id.toString(),
        email: user.email,
        name: user.name
      })).toString('base64');
      
      console.log('🔑 Correct token:', correctToken);
    } else {
      console.log('❌ User not found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

connectAndCheck();