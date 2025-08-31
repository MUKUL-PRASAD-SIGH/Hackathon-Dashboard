const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const fixUserHackathons = async () => {
  await connectDB();
  
  const User = require('./models/UserMongoDB');
  const Hackathon = require('./models/Hackathon');
  
  console.log('🔍 Fixing user-hackathon mismatch for mukulprasad957@gmail.com...\n');
  
  // Find user by email
  const user = await User.findOne({ email: 'mukulprasad957@gmail.com' });
  if (!user) {
    console.log('❌ User not found');
    return;
  }
  
  console.log('👤 User found:');
  console.log(`   ID: ${user._id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Name: ${user.name}\n`);
  
  // Find hackathons by email field (these are orphaned)
  const hackathonsByEmail = await Hackathon.find({ email: 'mukulprasad957@gmail.com' });
  console.log(`📧 Hackathons with email field: ${hackathonsByEmail.length}`);
  
  // Find hackathons by correct userId
  const hackathonsByUserId = await Hackathon.find({ userId: user._id });
  console.log(`🆔 Hackathons with correct userId: ${hackathonsByUserId.length}\n`);
  
  // Fix orphaned hackathons
  if (hackathonsByEmail.length > 0) {
    console.log('🔧 Fixing orphaned hackathons...');
    
    for (const hackathon of hackathonsByEmail) {
      console.log(`   Fixing: ${hackathon.name}`);
      hackathon.userId = user._id;
      await hackathon.save();
      console.log(`   ✅ Updated userId for: ${hackathon.name}`);
    }
    
    console.log('\n✅ All hackathons fixed!');
    
    // Verify fix
    const fixedHackathons = await Hackathon.find({ userId: user._id });
    console.log(`\n🎉 User now has ${fixedHackathons.length} hackathons in dashboard`);
  } else {
    console.log('ℹ️  No orphaned hackathons found');
  }
  
  mongoose.disconnect();
};

fixUserHackathons().catch(console.error);