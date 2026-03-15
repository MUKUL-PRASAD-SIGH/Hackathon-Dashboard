const mongoose = require('mongoose');

const chatPresenceSchema = new mongoose.Schema({
  chatKey: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  lastSeenAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

chatPresenceSchema.index({ chatKey: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('ChatPresence', chatPresenceSchema);
