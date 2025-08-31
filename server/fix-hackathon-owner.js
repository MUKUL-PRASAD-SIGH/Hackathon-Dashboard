const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fixOwner = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const User = require('./models/UserMongoDB');
  const Hackathon = require('./models/Hackathon');
  
  // Find the user
  const user = await User.findOne({ email: 'mukulprasad957@gmail.com' });
  console.log('👤 User:', user.name, user._id);
  
  // Find the hackathon
  const hackathon = await Hackathon.findOne({ name: 'Mukul Prasad' });
  console.log('🏆 Hackathon owner ID:', hackathon.userId);
  console.log('🔍 Match:', hackathon.userId.toString() === user._id.toString());
  
  if (hackathon.userId.toString() !== user._id.toString()) {
    console.log('🔧 Fixing owner...');
    hackathon.userId = user._id;
    await hackathon.save();
    console.log('✅ Fixed! Hackathon now owned by correct user');
  }
  
  mongoose.disconnect();
};

fixOwner().catch(console.error);