// Debug script to find your hackathons
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://hacktrack-user:mukulinblr%23123@cluster0.heduy1t.mongodb.net/hackathon-dashboard?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

async function debugUserHackathons() {
  try {
    // Check Users collection
    const User = mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      emailVerified: Boolean
    }));
    
    console.log('\n🔍 Searching for user: mukulpra48@gmail.com');
    
    const users = await User.find({ email: /mukulpra48/i });
    console.log('📊 Found users:', users.length);
    users.forEach(user => {
      console.log(`- ID: ${user._id}, Email: ${user.email}, Name: ${user.name}`);
    });
    
    // Check Hackathons collection
    const Hackathon = mongoose.model('Hackathon', new mongoose.Schema({
      name: String,
      platform: String,
      email: String,
      team: String,
      date: String,
      rounds: Number,
      remarks: Object,
      status: String,
      notifications: Array,
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }));
    
    console.log('\n🔍 Searching for hackathons...');
    
    // Search by email
    const hackathonsByEmail = await Hackathon.find({ email: /mukulpra48/i });
    console.log('📊 Hackathons by email:', hackathonsByEmail.length);
    hackathonsByEmail.forEach(h => {
      console.log(`- ${h.name} (${h.platform}) - ${h.email} - Status: ${h.status}`);
    });
    
    // Search by userId
    if (users.length > 0) {
      const hackathonsByUserId = await Hackathon.find({ userId: users[0]._id });
      console.log('📊 Hackathons by userId:', hackathonsByUserId.length);
      hackathonsByUserId.forEach(h => {
        console.log(`- ${h.name} (${h.platform}) - UserID: ${h.userId} - Status: ${h.status}`);
      });
    }
    
    // Search all hackathons
    const allHackathons = await Hackathon.find({});
    console.log('\n📊 Total hackathons in database:', allHackathons.length);
    
    if (allHackathons.length > 0) {
      console.log('Sample hackathons:');
      allHackathons.slice(0, 3).forEach(h => {
        console.log(`- ${h.name} - Email: ${h.email} - UserID: ${h.userId}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugUserHackathons();