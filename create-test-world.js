// Create a test hackathon world
const mongoose = require('mongoose');

// Connect to MongoDB
const MONGODB_URI = 'mongodb+srv://hacktrack-user:mukulinblr%23123@cluster0.heduy1t.mongodb.net/hackathon-dashboard?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Define schema
const hackathonWorldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  platform: { type: String, default: 'Other' },
  maxTeamSize: { type: Number, default: 4 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [],
  teams: [],
  settings: {
    allowTeamFormation: { type: Boolean, default: true },
    maxTeamsPerUser: { type: Number, default: 1 },
    autoApproveJoinRequests: { type: Boolean, default: false }
  }
}, { timestamps: true });

hackathonWorldSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

const HackathonWorld = mongoose.model('HackathonWorld', hackathonWorldSchema);

// Create test world
async function createTestWorld() {
  try {
    // First, let's find a user to use as creator
    const User = mongoose.model('User', new mongoose.Schema({
      name: String,
      email: String
    }));
    
    let user = await User.findOne();
    
    if (!user) {
      // Create a test user
      user = new User({
        name: 'Test User',
        email: 'test@example.com'
      });
      await user.save();
      console.log('✅ Created test user');
    }

    const testWorld = new HackathonWorld({
      name: 'HackTheMountains 2024',
      description: 'A 48-hour hackathon focused on solving real-world problems with innovative technology solutions.',
      startDate: new Date('2024-12-01'),
      endDate: new Date('2024-12-03'),
      platform: 'Devpost',
      maxTeamSize: 4,
      createdBy: user._id
    });

    await testWorld.save();
    console.log('✅ Test hackathon world created:', testWorld.name);
    console.log('🆔 World ID:', testWorld._id);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test world:', error);
    process.exit(1);
  }
}

createTestWorld();