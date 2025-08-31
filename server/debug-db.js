require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

async function debugDatabase() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    console.log('🔍 MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Missing');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('📊 Collections:', collections.map(c => c.name));
    
    // Check UserMongoDB collection
    const UserMongoDB = require('./models/UserMongoDB');
    const users = await UserMongoDB.find({});
    console.log('👥 Users count:', users.length);
    console.log('👥 Users:', users.map(u => ({ id: u._id, name: u.name, email: u.email })));
    
    // Check HackathonWorld collection
    const HackathonWorld = require('./models/HackathonWorld');
    const worlds = await HackathonWorld.find({});
    console.log('🌍 Worlds count:', worlds.length);
    console.log('🌍 Worlds:', worlds.map(w => ({ id: w._id, name: w.name, createdBy: w.createdBy })));
    
    // Check Hackathon collection
    const Hackathon = require('./models/Hackathon');
    const hackathons = await Hackathon.find({});
    console.log('🏆 Hackathons count:', hackathons.length);
    console.log('🏆 Hackathons:', hackathons.map(h => ({ id: h._id, name: h.name, userId: h.userId })));
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

debugDatabase();