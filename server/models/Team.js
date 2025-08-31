const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  hackathonWorldId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HackathonWorld',
    required: true
  },
  leader: {
    type: String,
    required: true
  },
  members: [{
    email: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['Frontend Developer', 'Backend Developer', 'Designer', 'PM', 'Data Scientist', 'Mobile Developer'],
      default: 'Frontend Developer'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  maxSize: {
    type: Number,
    default: 4,
    min: 2,
    max: 10
  },
  requirements: {
    type: String,
    trim: true,
    maxlength: 500
  },
  skills: [String],
  lookingForMembers: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['forming', 'complete', 'competing', 'disbanded'],
    default: 'forming'
  },
  projectIdea: {
    title: String,
    description: String,
    techStack: [String]
  },
  communication: {
    chatRoomId: String, // For Socket.IO room management
    lastActivity: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
teamSchema.index({ hackathonWorldId: 1, lookingForMembers: 1 });
teamSchema.index({ leader: 1 });
teamSchema.index({ 'members.userId': 1 });
teamSchema.index({ status: 1 });

// Virtual for current team size
teamSchema.virtual('currentSize').get(function() {
  return this.members.length + 1; // +1 for leader
});

// Virtual for available spots
teamSchema.virtual('availableSpots').get(function() {
  return this.maxSize - this.currentSize;
});

// Method to add member
teamSchema.methods.addMember = function(email, role = 'Frontend Developer') {
  // Check if team is full
  if (this.currentSize >= this.maxSize) {
    throw new Error('Team is already full');
  }
  
  // Check if user is already a member or leader
  if (this.leader === email) {
    throw new Error('User is already the team leader');
  }
  
  const existingMember = this.members.find(m => m.email === email);
  if (existingMember) {
    throw new Error('User is already a team member');
  }
  
  this.members.push({
    email,
    role,
    joinedAt: new Date()
  });
  
  // Update status if team is now complete
  if (this.currentSize >= this.maxSize) {
    this.status = 'complete';
    this.lookingForMembers = false;
  }
  
  return this.save();
};

// Method to remove member
teamSchema.methods.removeMember = function(email) {
  const memberIndex = this.members.findIndex(m => m.email === email);
  
  if (memberIndex === -1) {
    throw new Error('User is not a member of this team');
  }
  
  this.members.splice(memberIndex, 1);
  
  // Update status if team is no longer complete
  if (this.status === 'complete' && this.currentSize < this.maxSize) {
    this.status = 'forming';
  }
  
  return this.save();
};

// Method to toggle looking for members status
teamSchema.methods.toggleLookingForMembers = function() {
  // Can only look for members if team is not full
  if (this.currentSize >= this.maxSize) {
    this.lookingForMembers = false;
    this.status = 'complete';
  } else {
    this.lookingForMembers = !this.lookingForMembers;
    this.status = this.lookingForMembers ? 'forming' : 'complete';
  }
  
  return this.save();
};

// Method to check if user can join team
teamSchema.methods.canUserJoin = function(email) {
  // Check if team is looking for members
  if (!this.lookingForMembers) {
    return { canJoin: false, reason: 'Team is not looking for members' };
  }
  
  // Check if team is full
  if (this.currentSize >= this.maxSize) {
    return { canJoin: false, reason: 'Team is full' };
  }
  
  // Check if user is already leader or member
  if (this.leader === email) {
    return { canJoin: false, reason: 'User is already the team leader' };
  }
  
  const existingMember = this.members.find(m => m.email === email);
  if (existingMember) {
    return { canJoin: false, reason: 'User is already a team member' };
  }
  
  return { canJoin: true };
};

// Method to update team activity
teamSchema.methods.updateActivity = function() {
  this.communication.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model('Team', teamSchema);