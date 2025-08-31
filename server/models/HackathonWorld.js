const mongoose = require('mongoose');

// New model for hackathon social worlds (separate from personal hackathon tracking)
const hackathonWorldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  platform: {
    type: String,
    enum: ['Devpost', 'HackerEarth', 'Unstop', 'HackerRank', 'Codeforces', 'Other'],
    default: 'Other'
  },
  maxTeamSize: {
    type: Number,
    default: 4,
    min: 1,
    max: 10
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    required: true
  },
  participants: [{
    email: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['participant', 'explorer', 'team_leader', 'team_member'],
      default: 'participant'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    skills: [String],
    preferredRole: {
      type: String,
      enum: ['Frontend Developer', 'Backend Developer', 'Designer', 'PM', 'Data Scientist', 'Mobile Developer'],
      default: 'Frontend Developer'
    },
    experience: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Expert'],
      default: 'Beginner'
    },
    lookingFor: {
      type: String,
      enum: ['team', 'members', 'specific_role'],
      default: 'team'
    },
    availability: {
      type: String,
      enum: ['full-time', 'part-time', 'weekends'],
      default: 'full-time'
    }
  }],
  teams: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team'
  }],
  settings: {
    allowTeamFormation: {
      type: Boolean,
      default: true
    },
    maxTeamsPerUser: {
      type: Number,
      default: 1
    },
    autoApproveJoinRequests: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
hackathonWorldSchema.index({ isActive: 1, startDate: 1 });
hackathonWorldSchema.index({ 'participants.userId': 1 });
hackathonWorldSchema.index({ createdBy: 1 });

// Virtual for participant count
hackathonWorldSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Method to add participant
hackathonWorldSchema.methods.addParticipant = function(email, userProfile = {}) {
  const existingParticipant = this.participants.find(p => p.email === email);
  
  if (existingParticipant) {
    throw new Error('User already joined this hackathon world');
  }
  
  this.participants.push({
    email,
    ...userProfile,
    joinedAt: new Date()
  });
  
  return this.save();
};

// Method to remove participant
hackathonWorldSchema.methods.removeParticipant = function(email) {
  this.participants = this.participants.filter(p => p.email !== email);
  return this.save();
};

// Method to update participant role
hackathonWorldSchema.methods.updateParticipantRole = function(email, newRole) {
  const participant = this.participants.find(p => p.email === email);
  
  if (!participant) {
    throw new Error('User not found in this hackathon world');
  }
  
  participant.role = newRole;
  return this.save();
};

module.exports = mongoose.model('HackathonWorld', hackathonWorldSchema);