const mongoose = require('mongoose');
require('./server/config/database');

const HackathonWorld = require('./server/models/HackathonWorld');
const UserMongoDB = require('./server/models/UserMongoDB');
const Message = require('./server/models/Message');

async function fixSystem() {
  try {
    console.log('🔧 Starting system fix...');
    
    // 1. Fix creator data
    const users = await UserMongoDB.find();
    const worlds = await HackathonWorld.find();
    
    console.log(`📊 Found ${users.length} users and ${worlds.length} worlds`);
    
    let fixed = 0;
    for (const world of worlds) {
      let matchingUser = users.find(user => 
        user.name.toLowerCase() === world.name.toLowerCase()
      );
      
      if (!matchingUser && users.length > 0) {
        matchingUser = users[0];
      }
      
      if (matchingUser) {
        world.createdBy = matchingUser._id;
        await world.save();
        console.log(`✅ Fixed ${world.name} -> ${matchingUser.name}`);
        fixed++;
      }
    }
    
    console.log(`✅ Fixed ${fixed} hackathon world creators`);
    
    // 2. Ensure Message model exists
    try {
      await Message.find().limit(1);
      console.log('✅ Message model working');
    } catch (error) {
      console.log('❌ Message model issue:', error.message);
    }
    
    // 3. Test database connections
    const userCount = await UserMongoDB.countDocuments();
    const worldCount = await HackathonWorld.countDocuments();
    const messageCount = await Message.countDocuments();
    
    console.log('📊 Database Status:');
    console.log(`   Users: ${userCount}`);
    console.log(`   Worlds: ${worldCount}`);
    console.log(`   Messages: ${messageCount}`);
    
    console.log('✅ System fix completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ System fix error:', error);
    process.exit(1);
  }
}

setTimeout(fixSystem, 2000);