const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://mukulprasad957:mukul123@cluster0.fvfmh.mongodb.net/hackathon_dashboard?retryWrites=true&w=majority&appName=Cluster0';

async function fixHackathonEmail() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('hackathon_dashboard');
    const collection = db.collection('hackathons');
    
    // Find current hackathon
    const current = await collection.findOne({});
    console.log('🏆 Current hackathon email:', current?.email);
    
    // Update to correct email
    const result = await collection.updateOne(
      {},
      { $set: { email: 'mukulprasad957@gmail.com' } }
    );
    
    console.log('🔧 Updated hackathon email to: mukulprasad957@gmail.com');
    console.log('✅ Update result:', result.modifiedCount, 'documents modified');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

fixHackathonEmail();