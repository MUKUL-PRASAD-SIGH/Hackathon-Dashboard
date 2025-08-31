const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://mukulprasad957:mukul123@cluster0.fvfmh.mongodb.net/hackathon_dashboard?retryWrites=true&w=majority&appName=Cluster0';

async function checkUser() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('hackathon_dashboard');
    const users = db.collection('users');
    
    // Check for the specific email
    const user = await users.findOne({ email: 'mukulprasad958@gmail.com' });
    
    console.log('🔍 Checking user: mukulprasad958@gmail.com');
    console.log('📊 User exists:', !!user);
    
    if (user) {
      console.log('👤 User details:', {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      });
    } else {
      console.log('❌ User not found in database');
      
      // Check all users to see what emails exist
      const allUsers = await users.find({}).toArray();
      console.log('📋 All users in database:');
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (${u.name})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkUser();