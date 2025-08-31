const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const resetDatabase = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('🗑️ Clearing all collections...');
    
    // Drop all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (const collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
      console.log(`✅ Dropped collection: ${collection.name}`);
    }
    
    console.log('🎉 Database reset complete!');
    console.log('📝 All user data, hackathons, and worlds have been cleared');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    process.exit(1);
  }
};

resetDatabase();