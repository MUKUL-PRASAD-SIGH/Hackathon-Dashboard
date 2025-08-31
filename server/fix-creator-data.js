const mongoose = require('mongoose');
require('./config/database');

const HackathonWorld = require('./models/HackathonWorld');
const UserMongoDB = require('./models/UserMongoDB');

async function fixCreatorData() {
  try {
    console.log('🔧 Starting creator data fix...');
    
    // Get all users
    const users = await UserMongoDB.find();
    console.log(`📊 Found ${users.length} users in database`);
    
    // Get all hackathon worlds
    const worlds = await HackathonWorld.find();
    console.log(`🌍 Found ${worlds.length} hackathon worlds`);
    
    for (const world of worlds) {
      console.log(`\n🔍 Processing world: ${world.name}`);
      console.log(`   Current createdBy: ${world.createdBy}`);
      
      // Try to find a user by matching world name with user name
      const matchingUser = users.find(user => 
        user.name.toLowerCase() === world.name.toLowerCase() ||
        user.email.toLowerCase().includes(world.name.toLowerCase())
      );
      
      if (matchingUser) {
        console.log(`   ✅ Found matching user: ${matchingUser.name} (${matchingUser.email})`);
        world.createdBy = matchingUser._id;
        await world.save();
        console.log(`   💾 Updated createdBy to: ${matchingUser._id}`);
      } else {
        console.log(`   ❌ No matching user found for world: ${world.name}`);
        // Set to first user as fallback
        if (users.length > 0) {
          world.createdBy = users[0]._id;
          await world.save();
          console.log(`   🔄 Set fallback creator: ${users[0].name} (${users[0].email})`);
        }
      }
    }
    
    console.log('\n✅ Creator data fix completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fixing creator data:', error);
    process.exit(1);
  }
}

// Wait for DB connection then run
setTimeout(fixCreatorData, 2000);