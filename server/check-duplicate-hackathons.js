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

const checkDuplicates = async () => {
  await connectDB();
  
  const User = require('./models/UserMongoDB');
  const Hackathon = require('./models/Hackathon');
  
  const user = await User.findOne({ email: 'mukulprasad957@gmail.com' });
  console.log(`👤 User ID: ${user._id}\n`);
  
  // Find all hackathons for this user
  const hackathons = await Hackathon.find({ userId: user._id });
  console.log(`📊 Total hackathons: ${hackathons.length}\n`);
  
  hackathons.forEach((h, index) => {
    console.log(`${index + 1}. ${h.name}`);
    console.log(`   ID: ${h._id}`);
    console.log(`   Email: ${h.email}`);
    console.log(`   Platform: ${h.platform}`);
    console.log(`   Date: ${h.date}`);
    console.log('');
  });
  
  // Check for duplicates by name
  const names = hackathons.map(h => h.name);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  
  if (duplicates.length > 0) {
    console.log('⚠️  Duplicate hackathons found:', duplicates);
    
    // Remove duplicates (keep the first one)
    for (const dupName of [...new Set(duplicates)]) {
      const dupsToRemove = hackathons.filter(h => h.name === dupName).slice(1);
      for (const dup of dupsToRemove) {
        await Hackathon.findByIdAndDelete(dup._id);
        console.log(`🗑️  Removed duplicate: ${dup.name} (${dup._id})`);
      }
    }
    
    console.log('\n✅ Duplicates removed!');
  } else {
    console.log('✅ No duplicates found');
  }
  
  mongoose.disconnect();
};

checkDuplicates().catch(console.error);