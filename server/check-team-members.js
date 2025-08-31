const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const checkTeamMembers = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Hackathon = require('./models/Hackathon');
  
  // Find the hackathon
  const hackathon = await Hackathon.findOne({ name: 'Mukul Prasad' });
  
  if (hackathon) {
    console.log('🏆 Hackathon:', hackathon.name);
    console.log('👑 Team Leader:', hackathon.email);
    console.log('👥 Team Members:', hackathon.teamMembers?.length || 0);
    
    if (hackathon.teamMembers?.length > 0) {
      hackathon.teamMembers.forEach((member, i) => {
        console.log(`   ${i + 1}. ${member.name} (${member.email}) - ${member.role}`);
      });
    }
    
    console.log('📋 Join Requests:', hackathon.joinRequests?.length || 0);
    if (hackathon.joinRequests?.length > 0) {
      hackathon.joinRequests.forEach((req, i) => {
        console.log(`   ${i + 1}. ${req.name} (${req.email}) - Status: ${req.status}`);
      });
    }
  } else {
    console.log('❌ Hackathon not found');
  }
  
  mongoose.disconnect();
};

checkTeamMembers().catch(console.error);