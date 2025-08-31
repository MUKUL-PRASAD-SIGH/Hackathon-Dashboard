const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://mukulprasad957:mukul123@cluster0.fvfmh.mongodb.net/hackathon_dashboard?retryWrites=true&w=majority&appName=Cluster0';

async function restoreCorrectEmail() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('hackathon_dashboard');
    const hackathons = db.collection('hackathons');
    
    // Fix: Set correct team leader email back to 957
    const result = await hackathons.updateOne(
      {},
      { 
        $set: { 
          email: 'mukulprasad957@gmail.com'
        }
      }
    );
    
    console.log('✅ Restored team leader email to: mukulprasad957@gmail.com');
    console.log('📊 Modified:', result.modifiedCount, 'documents');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

restoreCorrectEmail();