const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://mukulprasad957:mukul123@cluster0.fvfmh.mongodb.net/hackathon_dashboard?retryWrites=true&w=majority&appName=Cluster0';

async function fixTeamMemberSync() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('hackathon_dashboard');
    const hackathons = db.collection('hackathons');
    
    // Find the hackathon
    const hackathon = await hackathons.findOne({});
    console.log('🏆 Current hackathon:', hackathon.name);
    console.log('👥 Team members:', hackathon.teamMembers?.length || 0);
    
    if (hackathon.teamMembers) {
      hackathon.teamMembers.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.name} (${member.email}) - ${member.role}`);
      });
    }
    
    // Remove the problematic team member
    const result = await hackathons.updateOne(
      { _id: hackathon._id },
      { $pull: { teamMembers: { email: 'mukulpra48@gmail.com' } } }
    );
    
    console.log('🗑️ Removed team member with email mukulpra48@gmail.com');
    console.log('✅ Update result:', result.modifiedCount, 'documents modified');
    
    // Verify the update
    const updated = await hackathons.findOne({ _id: hackathon._id });
    console.log('👥 Updated team size:', updated.teamMembers?.length || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

fixTeamMemberSync();