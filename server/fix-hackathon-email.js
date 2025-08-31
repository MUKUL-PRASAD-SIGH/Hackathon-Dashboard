const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fixEmail = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Hackathon = require('./models/Hackathon');
  
  // Find the hackathon
  const hackathon = await Hackathon.findOne({ name: 'Mukul Prasad' });
  
  console.log('🏆 Current hackathon email:', hackathon.email);
  console.log('🔧 Updating to: mukulpra48@gmail.com');
  
  // Update the email to match the logged-in user
  hackathon.email = 'mukulpra48@gmail.com';
  await hackathon.save();
  
  console.log('✅ Hackathon email updated!');
  
  mongoose.disconnect();
};

fixEmail().catch(console.error);