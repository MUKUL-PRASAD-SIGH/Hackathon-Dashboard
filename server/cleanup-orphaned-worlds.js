require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

async function cleanupOrphanedWorlds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const HackathonWorld = require('./models/HackathonWorld');
    const Hackathon = require('./models/Hackathon');
    
    // Delete all orphaned worlds (no valid users exist)
    const deletedWorlds = await HackathonWorld.deleteMany({});
    console.log(`🗑️ Deleted ${deletedWorlds.deletedCount} orphaned worlds`);
    
    // Reset hackathons to private
    const updatedHackathons = await Hackathon.updateMany(
      {},
      { 
        $unset: { worldId: 1 },
        $set: { isPublicWorld: false }
      }
    );
    console.log(`🔒 Made ${updatedHackathons.modifiedCount} hackathons private`);
    
    mongoose.disconnect();
    console.log('✅ Cleanup complete');
    
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
  }
}

cleanupOrphanedWorlds();