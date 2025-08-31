require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

async function clearOrphanedHackathons() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const Hackathon = require('./models/Hackathon');
    
    // Delete all orphaned hackathons
    const deletedHackathons = await Hackathon.deleteMany({});
    console.log(`🗑️ Deleted ${deletedHackathons.deletedCount} orphaned hackathons`);
    
    mongoose.disconnect();
    console.log('✅ Cleanup complete');
    
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
  }
}

clearOrphanedHackathons();