const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://mukulprasad957:mukul123@cluster0.fvfmh.mongodb.net/hackathon_dashboard?retryWrites=true&w=majority&appName=Cluster0';

async function fixDuplicateTeamLeader() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('hackathon_dashboard');
    const hackathons = db.collection('hackathons');
    
    const hackathon = await hackathons.findOne({});
    console.log('🏆 Hackathon:', hackathon.name);
    console.log('📧 Team Leader Email:', hackathon.email);
    console.log('👥 Team Members:');
    
    if (hackathon.teamMembers) {
      hackathon.teamMembers.forEach((member, index) => {
        console.log(`  ${index + 1}. ${member.name} (${member.email})`);
      });
    }
    
    // Remove team member that has same email as team leader
    const result = await hackathons.updateOne(
      { _id: hackathon._id },
      { 
        $pull: { 
          teamMembers: { 
            email: hackathon.email 
          } 
        } 
      }
    );
    
    console.log('🗑️ Removed duplicate team leader from team members');
    console.log('✅ Modified:', result.modifiedCount, 'documents');
    
    // Verify fix
    const fixed = await hackathons.findOne({ _id: hackathon._id });
    console.log('👥 Final team size:', fixed.teamMembers?.length || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

fixDuplicateTeamLeader();