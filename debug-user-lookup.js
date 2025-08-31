const mongoose = require('mongoose');
const UserMongoDB = require('./server/models/UserMongoDB');

// Connect to MongoDB
mongoose.connect('mongodb+srv://mukulprasad957:Mukul%40123@cluster0.fvfmn.mongodb.net/hackathon-dashboard?retryWrites=true&w=majority')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function findUser() {
  try {
    const email = 'mukulprasad957@gmail.com';
    
    console.log('\n🔍 Searching for user:', email);
    
    // Try exact match
    const user1 = await UserMongoDB.findOne({ email: email });
    console.log('Exact match:', user1 ? '✅ Found' : '❌ Not found');
    if (user1) {
      console.log('User data:', {
        id: user1._id,
        name: user1.name,
        email: user1.email,
        createdAt: user1.createdAt
      });
    }
    
    // Try case insensitive
    const user2 = await UserMongoDB.findOne({ 
      email: { $regex: new RegExp('^' + email + '$', 'i') } 
    });
    console.log('Case insensitive:', user2 ? '✅ Found' : '❌ Not found');
    
    // List all users with similar email
    const similarUsers = await UserMongoDB.find({ 
      email: { $regex: 'mukulprasad', $options: 'i' } 
    });
    console.log('\n📋 All users with "mukulprasad":');
    similarUsers.forEach(user => {
      console.log(`- ${user.email} (ID: ${user._id})`);
    });
    
    // List all users
    const allUsers = await UserMongoDB.find({});
    console.log('\n👥 All registered users:');
    allUsers.forEach(user => {
      console.log(`- ${user.email} (Name: ${user.name || 'No name'})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

findUser();