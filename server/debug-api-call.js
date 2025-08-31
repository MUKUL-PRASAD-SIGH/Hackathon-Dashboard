const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const debugAPI = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Hackathon = require('./models/Hackathon');
  
  const userEmail = 'mukulpra48@gmail.com';
  
  console.log('🔍 Debugging API call for:', userEmail);
  
  // Test owned hackathons query
  const ownedHackathons = await Hackathon.find({ 
    email: userEmail.toLowerCase() 
  });
  
  console.log('📊 Owned hackathons:', ownedHackathons.length);
  ownedHackathons.forEach(h => {
    console.log(`   - ${h.name} (email: ${h.email})`);
  });
  
  // Test joined hackathons query  
  const joinedHackathons = await Hackathon.find({ 
    'teamMembers.email': userEmail.toLowerCase(),
    email: { $ne: userEmail.toLowerCase() }
  });
  
  console.log('🤝 Joined hackathons:', joinedHackathons.length);
  joinedHackathons.forEach(h => {
    console.log(`   - ${h.name} (owner: ${h.email})`);
  });
  
  // Check all hackathons
  const allHackathons = await Hackathon.find();
  console.log('\n📋 All hackathons:');
  allHackathons.forEach(h => {
    console.log(`   - ${h.name}: owner=${h.email}, members=${h.teamMembers?.length || 0}`);
  });
  
  mongoose.disconnect();
};

debugAPI().catch(console.error);