const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');
};

const checkNotifications = async () => {
  await connectDB();
  
  const Notification = require('./models/Notification');
  const User = require('./models/UserMongoDB');
  
  // Find user
  const user = await User.findOne({ email: 'mukulprasad957@gmail.com' });
  console.log('👤 User:', user ? `${user.name} (${user._id})` : 'Not found');
  
  if (user) {
    // Check notifications for this user
    const notifications = await Notification.find({ userId: user._id }).sort({ createdAt: -1 });
    console.log(`🔔 Notifications for ${user.name}: ${notifications.length}`);
    
    notifications.forEach((n, i) => {
      console.log(`${i + 1}. ${n.type}: ${n.title}`);
      console.log(`   Message: ${n.message}`);
      console.log(`   Created: ${n.createdAt}`);
      console.log(`   Read: ${n.isRead}, Actioned: ${n.isActioned}`);
      console.log('');
    });
  }
  
  // Check all notifications
  const allNotifications = await Notification.find().populate('userId', 'name email');
  console.log(`📊 Total notifications in DB: ${allNotifications.length}`);
  
  mongoose.disconnect();
};

checkNotifications().catch(console.error);