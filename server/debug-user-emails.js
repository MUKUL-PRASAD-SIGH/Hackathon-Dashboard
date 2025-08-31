const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const debugEmails = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const User = require('./models/UserMongoDB');
  const Hackathon = require('./models/Hackathon');
  
  // Find all users
  const users = await User.find().select('name email');
  console.log('👥 All users:');
  users.forEach(u => console.log(`   ${u.name}: ${u.email}`));
  
  // Find the hackathon and its team members
  const hackathon = await Hackathon.findOne({ name: 'Mukul Prasad' });
  console.log('\n🏆 Hackathon team members:');
  hackathon.teamMembers.forEach(m => console.log(`   ${m.name}: ${m.email}`));
  
  // Check which user should see this as "joined"
  console.log('\n🔍 Email matching:');
  users.forEach(user => {
    const isTeamMember = hackathon.teamMembers.some(m => 
      m.email.toLowerCase() === user.email.toLowerCase()
    );
    console.log(`   ${user.email} → ${isTeamMember ? '✅ Should see as joined' : '❌ Won\'t see as joined'}`);
  });
  
  mongoose.disconnect();
};

debugEmails().catch(console.error);