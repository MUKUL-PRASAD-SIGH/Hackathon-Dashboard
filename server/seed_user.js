const mongoose = require('mongoose');
const UserMongoDB = require('./models/UserMongoDB');

async function seed() {
  await mongoose.connect('mongodb://127.0.0.1:27017/hackathon-dashboard');
  const email = '1ms24ci076@msrit.edu';
  
  let user = await UserMongoDB.findOne({ email });
  if (user) {
    console.log('User exists, resetting password...');
    user.password = 'password123';
    await user.save();
    console.log('Password reset to: password123');
  } else {
    console.log('User does not exist, creating...');
    user = new UserMongoDB({
      name: 'Mukul Prasad',
      email: email,
      password: 'password123',
      emailVerified: true
    });
    await user.save();
    console.log('User created with password: password123');
  }
  process.exit(0);
}

seed().catch(console.error);
