const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://mukulprasad957:mukul123@cluster0.fvfmh.mongodb.net/hackathon_dashboard?retryWrites=true&w=majority&appName=Cluster0';

async function fixEmailCorruption() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('hackathon_dashboard');
    const hackathons = db.collection('hackathons');
    
    const hackathon = await hackathons.findOne({});
    console.log('🏆 Current hackathon email:', hackathon.email);
    console.log('👥 Team members:', hackathon.teamMembers?.map(m => m.email));
    
    // Fix: Restore correct team leader email and remove duplicate
    const result = await hackathons.updateOne(
      { _id: hackathon._id },
      { 
        $set: { 
          email: 'mukulprasad957@gmail.com' // Restore original team leader
        },
        $pull: { 
          teamMembers: { 
            email: 'mukulpra48@gmail.com' // Remove duplicate team member
          } 
        }
      }
    );
    
    console.log('✅ Fixed email corruption');
    console.log('🔧 Team leader restored to: mukulprasad957@gmail.com');
    console.log('🗑️ Removed duplicate team member: mukulpra48@gmail.com');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

fixEmailCorruption();