const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['hackathon_invite', 'join_request', 'invite_accepted', 'invite_declined', 'request_approved', 'request_rejected', 'invitation_accepted', 'welcome_team', 'friend_request', 'friend_accepted', 'friend_rejected'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: Object,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isActioned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient user queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);