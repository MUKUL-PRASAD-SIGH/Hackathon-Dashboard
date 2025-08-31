const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const debugUserHackathons = async () => {
  await connectDB();
  
  const User = require('./server/models/UserMongoDB');
  const Hackathon = require('./server/models/Hackathon');
  
  console.log('🔍 Debugging user-hackathon mismatch...\n');
  
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
  
  // Find hackathons by email field
  const hackathonsByEmail = await Hackathon.find({ email: 'mukulprasad957@gmail.com' });
  console.log(`📧 Hackathons by email field: ${hackathonsByEmail.length}`);
  hackathonsByEmail.forEach(h => {
    console.log(`   - ${h.name} (userId: ${h.userId})`);
  });
  
  // Find hackathons by userId
  const hackathonsByUserId = await Hackathon.find({ userId: user._id });
  console.log(`\n🆔 Hackathons by userId: ${hackathonsByUserId.length}`);
  hackathonsByUserId.forEach(h => {
    console.log(`   - ${h.name} (userId: ${h.userId})`);
  });
  
  // Fix: Update hackathons to have correct userId
  if (hackathonsByEmail.length > 0 && hackathonsByUserId.length === 0) {
    console.log('\n🔧 Fixing userId mismatch...');
    
    for (const hackathon of hackathonsByEmail) {
      hackathon.userId = user._id;
      await hackathon.save();
      console.log(`   ✅ Fixed: ${hackathon.name}`);
    }
    
    console.log('\n✅ All hackathons fixed!');
  }
  
  mongoose.disconnect();
};

debugUserHackathons().catch(console.error);