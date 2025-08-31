const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// MongoDB User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() { return !this.isTemporary; },
    minlength: 6
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  isTemporary: {
    type: Boolean,
    default: false
  },
  profile: {
    bio: { type: String, default: '' },
    skills: [{ type: String }],
    experience: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    github: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    location: { type: String, default: '' },
    avatar: { type: String, default: '' },
    isPublic: { type: Boolean, default: false }
  },
  friends: [{
    email: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
  }],
  friendRequests: {
    sent: [{
      email: { type: String, required: true },
      sentAt: { type: Date, default: Date.now }
    }],
    received: [{
      email: { type: String, required: true },
      receivedAt: { type: Date, default: Date.now }
    }]
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  lastLogin: Date,
  hackathonsWon: { type: Number, default: 0 },
  hackathonsParticipated: { type: Number, default: 0 },
  currentTeam: {
    hackathonEmail: String,
    teamName: String,
    role: { type: String, enum: ['leader', 'member'], default: 'member' }
  }
}, {
  timestamps: true
});

// Virtual for checking if account is locked
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate auth token
userSchema.methods.generateAuthToken = function() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

// Ensure email uniqueness at database level
userSchema.index({ email: 1 }, { unique: true });

// Instance method to convert to JSON (hide password)
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.loginAttempts;
  delete user.lockUntil;
  return user;
};

// Static method to authenticate user
userSchema.statics.authenticate = async function(email, password) {
  const user = await this.findOne({ email: email.toLowerCase().trim() });
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  // Check if account is locked
  if (user.isLocked) {
    const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new Error(`Account locked. Try again in ${remainingTime} minutes`);
  }
  
  // Verify password
  const isValidPassword = await user.comparePassword(password);
  
  if (!isValidPassword) {
    // Increment login attempts
    user.loginAttempts += 1;
    
    // Lock account after 5 failed attempts
    if (user.loginAttempts >= 5) {
      user.lockUntil = Date.now() + (15 * 60 * 1000); // 15 minutes
    }
    
    await user.save();
    throw new Error('Invalid email or password');
  }
  
  // Reset login attempts on successful login
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  user.lastLogin = new Date();
  await user.save();
  
  return user;
};

// Friend system methods
userSchema.methods.sendFriendRequest = async function(targetEmail) {
  if (this.email === targetEmail) {
    throw new Error('Cannot send friend request to yourself');
  }
  
  // Check if already friends
  if (this.friends.some(f => f.email === targetEmail)) {
    throw new Error('Already friends');
  }
  
  // Check if request already sent
  if (this.friendRequests.sent.some(r => r.email === targetEmail)) {
    throw new Error('Friend request already sent');
  }
  
  // Add to sender's sent requests
  this.friendRequests.sent.push({ email: targetEmail });
  
  // Add to receiver's received requests
  const targetUser = await this.constructor.findOne({ email: targetEmail });
  if (!targetUser) {
    throw new Error('User not found');
  }
  
  targetUser.friendRequests.received.push({ email: this.email });
  
  // Create notification
  const Notification = require('./Notification');
  await Notification.create({
    userEmail: targetEmail,
    type: 'friend_request',
    title: 'New Friend Request',
    message: `${this.name} sent you a friend request`,
    data: { senderEmail: this.email, senderName: this.name }
  });
  
  await Promise.all([this.save(), targetUser.save()]);
  return true;
};

userSchema.methods.acceptFriendRequest = async function(senderEmail) {
  // Check if request exists
  const requestIndex = this.friendRequests.received.findIndex(r => r.email === senderEmail);
  if (requestIndex === -1) {
    throw new Error('Friend request not found');
  }
  
  // Add to both users' friends lists
  this.friends.push({ email: senderEmail });
  
  const senderUser = await this.constructor.findOne({ email: senderEmail });
  senderUser.friends.push({ email: this.email });
  
  // Remove from requests
  this.friendRequests.received.splice(requestIndex, 1);
  const sentIndex = senderUser.friendRequests.sent.findIndex(r => r.email === this.email);
  if (sentIndex !== -1) {
    senderUser.friendRequests.sent.splice(sentIndex, 1);
  }
  
  // Create notification for sender
  const Notification = require('./Notification');
  await Notification.create({
    userEmail: senderEmail,
    type: 'friend_accepted',
    title: 'Friend Request Accepted',
    message: `${this.name} accepted your friend request`,
    data: { accepterEmail: this.email, accepterName: this.name }
  });
  
  await Promise.all([this.save(), senderUser.save()]);
  return true;
};

userSchema.methods.rejectFriendRequest = async function(senderEmail) {
  const requestIndex = this.friendRequests.received.findIndex(r => r.email === senderEmail);
  if (requestIndex === -1) {
    throw new Error('Friend request not found');
  }
  
  this.friendRequests.received.splice(requestIndex, 1);
  
  const senderUser = await this.constructor.findOne({ email: senderEmail });
  const sentIndex = senderUser.friendRequests.sent.findIndex(r => r.email === this.email);
  if (sentIndex !== -1) {
    senderUser.friendRequests.sent.splice(sentIndex, 1);
  }
  
  await Promise.all([this.save(), senderUser.save()]);
  return true;
};

userSchema.methods.removeFriend = async function(friendEmail) {
  const friendIndex = this.friends.findIndex(f => f.email === friendEmail);
  if (friendIndex === -1) {
    throw new Error('Not friends');
  }
  
  this.friends.splice(friendIndex, 1);
  
  const friendUser = await this.constructor.findOne({ email: friendEmail });
  const userIndex = friendUser.friends.findIndex(f => f.email === this.email);
  if (userIndex !== -1) {
    friendUser.friends.splice(userIndex, 1);
  }
  
  await Promise.all([this.save(), friendUser.save()]);
  return true;
};

userSchema.methods.isFriendWith = function(email) {
  return this.friends.some(f => f.email === email);
};

module.exports = mongoose.model('User', userSchema);