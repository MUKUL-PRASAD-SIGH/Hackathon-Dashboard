require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const HackathonWorld = require('./models/HackathonWorld');
const Hackathon = require('./models/Hackathon');
const UserMongoDB = require('./models/UserMongoDB');

async function fixHackathonWorlds() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all HackathonWorld entries with null createdBy
    const worldsToFix = await HackathonWorld.find({ 
      $or: [
        { createdBy: null },
        { createdBy: { $exists: false } }
      ]
    });

    console.log(`🔍 Found ${worldsToFix.length} worlds to fix`);

    for (const world of worldsToFix) {
      console.log(`\n🌍 Fixing world: ${world.name}`);

      // Try to find matching hackathon
      const matchingHackathon = await Hackathon.findOne({
        name: world.name,
        platform: world.platform
      });

      if (matchingHackathon) {
        console.log(`📋 Found matching hackathon owned by: ${matchingHackathon.userId}`);
        
        // Update the world with correct createdBy
        world.createdBy = matchingHackathon.userId;
        await world.save();
        
        console.log(`✅ Updated world ${world.name} with createdBy: ${matchingHackathon.userId}`);
      } else {
        // If no matching hackathon, try to find the first user (fallback)
        const firstUser = await UserMongoDB.findOne({});
        if (firstUser) {
          world.createdBy = firstUser._id;
          await world.save();
          console.log(`⚠️ No matching hackathon found, assigned to first user: ${firstUser.name}`);
        } else {
          console.log(`❌ No users found, skipping world: ${world.name}`);
        }
      }
    }

    console.log('\n🎉 Database fix completed!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error fixing database:', error);
    process.exit(1);
  }
}

fixHackathonWorlds();