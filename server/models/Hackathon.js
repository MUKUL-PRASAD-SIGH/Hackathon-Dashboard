const mongoose = require('mongoose');

const hackathonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  platform: {
    type: String,
    required: true,
    enum: ['Devpost', 'HackerEarth', 'Topcoder', 'CodeChef', 'HackerRank', 'Other']
  },
  email: {
    type: String,
    required: true
  },
  team: {
    type: String,
    required: false,
    enum: ['Solo', 'Team']
  },
  date: {
    type: Date,
    required: true
  },
  rounds: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  status: {
    type: String,
    required: true,
    enum: ['Planning', 'Participating', 'Won', 'Qualified', "Didn't qualify"],
    default: 'Planning'
  },
  remarks: {
    type: Map,
    of: String,
    default: {}
  },
  notifications: [{
    trigger: {
      type: String,
      required: true
    },
    customTime: String
  }],
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  // Team management fields
  maxParticipants: {
    type: Number,
    default: 4,
    min: 1,
    max: 10
  },
  
  teamMembers: [{
    name: String,
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    role: {
      type: String,
      default: 'Team Member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // World visibility
  isPublicWorld: {
    type: Boolean,
    default: false
  },
  
  worldId: String,
  
  // Join requests
  joinRequests: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    email: String,
    message: String,
    requestedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }]
},
{
  timestamps: true
});

// Add round dates and remarks fields
hackathonSchema.add({
  roundDates: {
    type: Map,
    of: String,
    default: {}
  },
  roundRemarks: [{
    round: Number,
    content: String,
    author: String,
    authorEmail: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
});

// Index for efficient user queries
hackathonSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Hackathon', hackathonSchema);