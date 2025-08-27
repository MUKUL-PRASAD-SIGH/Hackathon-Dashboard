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
    enum: ['Devpost', 'HackerEarth', 'Unstop', 'HackerRank', 'Codeforces', 'Other']
  },
  email: {
    type: String,
    required: true
  },
  team: {
    type: String,
    required: true,
    enum: ['Solo', '2-4 members', '5+ members']
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
    enum: ['Planning', 'Participating', 'Won', 'Qualified', 'Didn\'t qualify'],
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
    required: true
  }
}, {
  timestamps: true
});

// Index for efficient user queries
hackathonSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Hackathon', hackathonSchema);