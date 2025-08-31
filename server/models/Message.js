const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hackathonWorldId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HackathonWorld',
    required: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null // null for public chat, teamId for private team chat
  },
  messageType: {
    type: String,
    enum: ['text', 'file', 'system', 'join_request', 'team_update'],
    default: 'text'
  },
  metadata: {
    // For file messages
    fileName: String,
    fileSize: Number,
    fileType: String,
    fileUrl: String,
    
    // For system messages
    systemAction: String,
    
    // For join requests
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JoinRequest'
    },
    
    // For team updates
    teamAction: String,
    affectedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
messageSchema.index({ hackathonWorldId: 1, createdAt: -1 });
messageSchema.index({ teamId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ messageType: 1 });

// Virtual for chat room identifier
messageSchema.virtual('chatRoom').get(function() {
  return this.teamId ? `team_${this.teamId}` : `world_${this.hackathonWorldId}`;
});

// Method to edit message
messageSchema.methods.editContent = function(newContent, userId) {
  // Only sender can edit
  if (this.sender.toString() !== userId.toString()) {
    throw new Error('Only message sender can edit this message');
  }
  
  // Cannot edit system messages
  if (this.messageType !== 'text') {
    throw new Error('Cannot edit non-text messages');
  }
  
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  
  return this.save();
};

// Method to soft delete message
messageSchema.methods.deleteMessage = function(userId) {
  // Only sender can delete
  if (this.sender.toString() !== userId.toString()) {
    throw new Error('Only message sender can delete this message');
  }
  
  this.isDeleted = true;
  this.deletedAt = new Date();
  
  return this.save();
};

// Method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(r => r.userId.toString() !== userId.toString());
  
  // Add new reaction
  this.reactions.push({
    userId,
    emoji,
    createdAt: new Date()
  });
  
  return this.save();
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(r => r.userId.toString() !== userId.toString());
  return this.save();
};

// Static method to create system message
messageSchema.statics.createSystemMessage = function(hackathonWorldId, action, metadata = {}) {
  return new this({
    content: this.getSystemMessageContent(action, metadata),
    sender: null, // System messages have no sender
    hackathonWorldId,
    teamId: metadata.teamId || null,
    messageType: 'system',
    metadata: {
      systemAction: action,
      ...metadata
    }
  });
};

// Static method to get system message content
messageSchema.statics.getSystemMessageContent = function(action, metadata) {
  const messages = {
    user_joined: `${metadata.userName} joined the hackathon world`,
    user_left: `${metadata.userName} left the hackathon world`,
    team_created: `Team "${metadata.teamName}" was created`,
    team_disbanded: `Team "${metadata.teamName}" was disbanded`,
    member_joined: `${metadata.userName} joined team "${metadata.teamName}"`,
    member_left: `${metadata.userName} left team "${metadata.teamName}"`,
    team_complete: `Team "${metadata.teamName}" is now complete`,
    team_looking: `Team "${metadata.teamName}" is now looking for members`
  };
  
  return messages[action] || `System: ${action}`;
};

module.exports = mongoose.model('Message', messageSchema);