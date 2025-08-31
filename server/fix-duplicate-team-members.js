const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const Hackathon = require('./models/Hackathon');

async function fixDuplicateTeamMembers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    const hackathons = await Hackathon.find({});
    console.log(`🔍 Found ${hackathons.length} hackathons to check`);

    let fixedCount = 0;

    for (const hackathon of hackathons) {
      let needsUpdate = false;
      const originalTeamSize = hackathon.teamMembers.length;

      // Remove team members whose email matches the hackathon owner email
      const filteredMembers = hackathon.teamMembers.filter(member => 
        member.email.toLowerCase() !== hackathon.email.toLowerCase()
      );

      // Remove duplicate team members (same email)
      const uniqueMembers = [];
      const seenEmails = new Set();

      for (const member of filteredMembers) {
        const email = member.email.toLowerCase();
        if (!seenEmails.has(email)) {
          seenEmails.add(email);
          uniqueMembers.push(member);
        }
      }

      if (originalTeamSize !== uniqueMembers.length) {
        hackathon.teamMembers = uniqueMembers;
        await hackathon.save();
        needsUpdate = true;
        fixedCount++;

        console.log(`✅ Fixed ${hackathon.name}:`);
        console.log(`   - Original team size: ${originalTeamSize}`);
        console.log(`   - New team size: ${uniqueMembers.length}`);
        console.log(`   - Owner email: ${hackathon.email}`);
      }
    }

    console.log(`🎉 Fixed ${fixedCount} hackathons with duplicate team members`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixDuplicateTeamMembers();