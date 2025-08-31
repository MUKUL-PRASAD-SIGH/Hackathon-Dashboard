const express = require('express');
const router = express.Router();
const Hackathon = require('../models/Hackathon');
const { asyncHandler } = require('../middleware/errorHandler');

// 🌍 PUBLIC ROUTE - Get public hackathons (NO AUTH REQUIRED)
router.get('/public', asyncHandler(async (req, res) => {
  console.log('🌍 GET /api/hackathons/public - No auth required');
  
  try {
    const UserMongoDB = require('../models/UserMongoDB');
    
    const publicHackathons = await Hackathon.find({ 
      isPublicWorld: true 
    }).sort({ createdAt: -1 });
    
    console.log(`🌍 Found ${publicHackathons.length} public hackathons`);
    
    const processedHackathons = publicHackathons.map(h => ({
      _id: h._id,
      name: h.name,
      platform: h.platform,
      email: h.email,
      date: h.date,
      rounds: h.rounds,
      status: h.status,
      maxParticipants: h.maxParticipants || 4,
      teamMembers: h.teamMembers || [],
      joinRequests: h.joinRequests || [],
      userId: h.userId || null,
      createdBy: {
        name: 'Team Leader',
        email: h.email
      },
      createdAt: h.createdAt
    }));
    
    res.json({ 
      success: true, 
      hackathons: processedHackathons,
      count: processedHackathons.length
    });
    
  } catch (error) {
    console.error('❌ Public hackathons error:', error);
    res.status(500).json({ 
      success: false, 
      error: { message: 'Failed to fetch public hackathons' } 
    });
  }
}));

// Simple auth middleware (extract user from token)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: { message: 'No token provided' } });
  }
  
  // Simple token decode (in production, use proper JWT verification)
  try {
    const userData = JSON.parse(Buffer.from(token, 'base64').toString());
    req.user = userData;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: { message: 'Invalid token' } });
  }
};

// Get joined hackathons specifically
router.get('/joined', authMiddleware, asyncHandler(async (req, res) => {
  console.log('🤝 GET joined hackathons - User email:', req.user.email);
  
  const joinedHackathons = await Hackathon.find({ 
    'teamMembers.email': req.user.email.toLowerCase() 
  }).sort({ createdAt: -1 });
  
  console.log('🤝 Found joined hackathons:', joinedHackathons.length);
  
  res.json({
    success: true,
    hackathons: joinedHackathons,
    count: joinedHackathons.length
  });
}));

// Get all hackathons for authenticated user
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  console.log('🔍 GET hackathons - User Email:', req.user.email);
  console.log('🔍 User object:', req.user);
  
  // Find hackathons where user is owner (by email)
  const ownedHackathons = await Hackathon.find({ 
    email: { $regex: new RegExp('^' + req.user.email.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&') + '$', 'i') }
  }).sort({ createdAt: -1 });
  
  // Find hackathons where user is a team member
  const joinedHackathons = await Hackathon.find({ 
    'teamMembers.email': req.user.email.toLowerCase(),
    email: { $ne: req.user.email.toLowerCase() } // Exclude own hackathons
  }).sort({ createdAt: -1 });
  
  console.log('🔍 Found owned hackathons:', ownedHackathons.length);
  console.log('🔍 Found joined hackathons:', joinedHackathons.length);
  
  res.json({
    success: true,
    ownedHackathons,
    joinedHackathons,
    hackathons: ownedHackathons, // Keep for backward compatibility
    count: ownedHackathons.length + joinedHackathons.length,
    debug: {
      userEmail: req.user.email
    }
  });
}));

// Create new hackathon
router.post('/', authMiddleware, asyncHandler(async (req, res) => {
  console.log('🚀 CREATE hackathon - User Email:', req.user.email);
  console.log('🚀 User object:', req.user);
  console.log('🚀 Hackathon data:', JSON.stringify(req.body, null, 2));
  
  try {
    const hackathonData = {
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('🚀 Final hackathon data:', JSON.stringify(hackathonData, null, 2));
    
    const hackathon = new Hackathon(hackathonData);
    
    console.log('🚀 Hackathon object created, attempting save...');
    await hackathon.save();
    
    console.log('✅ Hackathon saved with ID:', hackathon._id);
    
    res.status(201).json({
      success: true,
      message: 'Hackathon created successfully',
      hackathon,
      debug: {
        userEmail: req.user.email,
        hackathonId: hackathon._id
      }
    });
  } catch (saveError) {
    console.error('❌ Error saving hackathon:', saveError);
    console.error('❌ Error name:', saveError.name);
    console.error('❌ Error message:', saveError.message);
    console.error('❌ Validation errors:', saveError.errors);
    
    res.status(400).json({
      success: false,
      error: {
        message: saveError.message || 'Failed to create hackathon',
        details: saveError.errors || saveError
      }
    });
  }
}));

// Update hackathon
router.put('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.findOneAndUpdate(
    { 
      _id: req.params.id, 
      email: req.user.email.toLowerCase()
    },
    req.body,
    { new: true, runValidators: true }
  );
  
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found or you are not the owner' }
    });
  }
  
  res.json({
    success: true,
    message: 'Hackathon updated successfully',
    hackathon
  });
}));

// Delete hackathon
router.delete('/:id', authMiddleware, asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.findOneAndDelete({ 
    _id: req.params.id, 
    email: req.user.email.toLowerCase()
  });
  
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found or you are not the owner' }
    });
  }
  
  res.json({
    success: true,
    message: 'Hackathon deleted successfully'
  });
}));

// Send invitation to join hackathon
router.post('/:id/invite', authMiddleware, asyncHandler(async (req, res) => {
  const { email, role, note } = req.body;
  
  const hackathon = await Hackathon.findOne({ 
    _id: req.params.id, 
    email: req.user.email.toLowerCase() 
  });
  
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found or you are not the owner' }
    });
  }
  
  // Check if team is full
  if (hackathon.teamMembers.length >= (hackathon.maxParticipants || 4)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Team is already full' }
    });
  }
  
  // Check if user is team leader (owner)
  if (req.user.email === email) {
    return res.status(409).json({
      success: false,
      error: { message: 'You cannot invite yourself' }
    });
  }
  
  // Check if user already member (strict email check)
  const existingMember = hackathon.teamMembers.find(m => m.email.toLowerCase() === email.toLowerCase());
  if (existingMember) {
    return res.status(409).json({
      success: false,
      error: { message: 'This email is already a team member' }
    });
  }
  
  // Check if hackathon owner email matches invite email
  if (hackathon.email.toLowerCase() === email.toLowerCase()) {
    return res.status(409).json({
      success: false,
      error: { message: 'This email is already the team leader' }
    });
  }
  
  // Check if user exists in database (registered users only)
  const UserMongoDB = require('../models/UserMongoDB');
  const invitedUser = await UserMongoDB.findOne({ email });
  
  if (!invitedUser) {
    return res.status(404).json({
      success: false,
      error: { message: 'User not found. Only registered users can be invited. Ask them to register first!' }
    });
  }
  
  if (invitedUser.isTemporary) {
    return res.status(400).json({
      success: false,
      error: { message: 'User has not completed registration. Ask them to verify their account first!' }
    });
  }
  
  // Check for existing notification to prevent duplicates
  const Notification = require('../models/Notification');
  const existingNotification = await Notification.findOne({
    userId: invitedUser._id,
    type: 'hackathon_invite',
    'data.hackathonId': hackathon._id,
    isActioned: false
  });
  
  if (existingNotification) {
    return res.status(409).json({
      success: false,
      error: { message: 'Invitation already sent to this user' }
    });
  }
  
  // Create notification
  const notification = new Notification({
    userEmail: invitedUser.email,
    type: 'hackathon_invite',
    title: `Invitation to join ${hackathon.name}`,
    message: `${req.user.name} invited you to join their hackathon team as ${role}${note ? '. Note: ' + note : ''}`,
    data: {
      hackathonId: hackathon._id,
      hackathonName: hackathon.name,
      inviterName: req.user.name,
      inviterEmail: req.user.email,
      role: role,
      note: note
    }
  });
  
  await notification.save();
  
  // Send email
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  const inviteUrl = `http://localhost:3001/accept-invite/${notification._id}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `🚀 Hackathon Team Invitation - ${hackathon.name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #4a90e2; margin-bottom: 20px;">🚀 You're Invited to Join a Hackathon Team!</h2>
          <p><strong>${req.user.name}</strong> has invited you to join their team for <strong>${hackathon.name}</strong></p>
          <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Role:</strong> ${role}</p>
            <p><strong>Platform:</strong> ${hackathon.platform}</p>
            <p><strong>Date:</strong> ${hackathon.date}</p>
            ${note ? `<p><strong>Personal Note:</strong> ${note}</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background: #4a90e2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
          </div>
          <p style="color: #666; font-size: 14px;">If you don't have an account, you'll be prompted to create one.</p>
        </div>
      </div>
    `
  };
  
  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await transporter.sendMail(mailOptions);
      console.log('✅ Invitation email sent successfully');
    } else {
      console.log('⚠️ Email credentials not configured, skipping email send');
    }
  } catch (error) {
    console.error('❌ Email send error:', error);
  }
  
  res.json({
    success: true,
    message: 'Invitation sent successfully'
  });
}));

// Send join request to public hackathon
router.post('/:id/request-join', authMiddleware, asyncHandler(async (req, res) => {
  const { message } = req.body;
  
  try {
    const UserMongoDB = require('../models/UserMongoDB');
    const user = await UserMongoDB.findOne({ email: req.user.email });
    
    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }
    
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) {
      return res.status(404).json({ success: false, error: { message: 'Hackathon not found' } });
    }
    
    if (!hackathon.isPublicWorld) {
      return res.status(400).json({ success: false, error: { message: 'This hackathon is private' } });
    }
    
    // Check if team is full
    if ((hackathon.teamMembers?.length || 0) >= (hackathon.maxParticipants - 1)) {
      return res.status(400).json({ success: false, error: { message: 'Team is full' } });
    }
    
    // Check if already requested or member
    const existingRequest = hackathon.joinRequests?.find(r => r.email === user.email && r.status === 'pending');
    if (existingRequest) {
      return res.status(409).json({ success: false, error: { message: 'Join request already sent' } });
    }
    
    const isMember = hackathon.teamMembers?.find(m => m.email === user.email);
    if (isMember) {
      return res.status(409).json({ success: false, error: { message: 'Already a team member' } });
    }
    
    // Add join request
    hackathon.joinRequests = hackathon.joinRequests || [];
    hackathon.joinRequests.push({
      name: user.name,
      email: user.email,
      message: message || '',
      status: 'pending'
    });
    
    await hackathon.save();
    
    // Create notification for team leader
    const Notification = require('../models/Notification');
    await Notification.create({
      userEmail: hackathon.email,
      type: 'join_request',
      title: 'New Join Request',
      message: `${user.name} wants to join your hackathon "${hackathon.name}"`,
      data: {
        hackathonId: hackathon._id,
        requesterName: user.name,
        requesterEmail: user.email,
        message: message
      }
    });
    
    res.json({ success: true, message: 'Join request sent successfully' });
    
  } catch (error) {
    console.error('Join request error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to send join request' } });
  }
}));

// Handle join request from public hackathon world
router.post('/:id/join-request', authMiddleware, asyncHandler(async (req, res) => {
  const { message } = req.body;
  
  const hackathon = await Hackathon.findById(req.params.id)
    .populate('userId', 'name email');
  
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found' }
    });
  }
  
  if (!hackathon.isPublicWorld) {
    return res.status(403).json({
      success: false,
      error: { message: 'This hackathon is private' }
    });
  }
  
  // Check if team is full
  if (hackathon.teamMembers.length >= (hackathon.maxParticipants || 4)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Team is already full' }
    });
  }
  
  // Check if already requested or member
  const existingRequest = hackathon.joinRequests.find(r => r.email === req.user.email);
  if (existingRequest) {
    return res.status(409).json({
      success: false,
      error: { message: 'You already sent a join request' }
    });
  }
  
  const existingMember = hackathon.teamMembers.find(m => m.email === req.user.email);
  if (existingMember) {
    return res.status(409).json({
      success: false,
      error: { message: 'You are already a team member' }
    });
  }
  
  // Add join request
  hackathon.joinRequests.push({
    name: req.user.name,
    email: req.user.email,
    message: message || 'I would like to join your hackathon team!'
  });
  
  await hackathon.save();
  
  // Create notification for team leader
  const Notification = require('../models/Notification');
  const notification = new Notification({
    userEmail: hackathon.email,
    type: 'join_request',
    title: `Join request for ${hackathon.name}`,
    message: `${req.user.name} wants to join your hackathon team for ${hackathon.name}`,
    data: {
      hackathonId: hackathon._id,
      hackathonName: hackathon.name,
      requesterName: req.user.name,
      requesterEmail: req.user.email,
      requestMessage: message
    }
  });
  
  await notification.save();
  
  res.json({
    success: true,
    message: 'Join request sent successfully'
  });
}));

// Get notifications for user
router.get('/notifications', authMiddleware, asyncHandler(async (req, res) => {
  const Notification = require('../models/Notification');
  const notifications = await Notification.find({ userEmail: req.user.email })
    .sort({ createdAt: -1 })
    .limit(50);
  
  res.json({
    success: true,
    notifications
  });
}));

// Accept hackathon invitation
router.post('/accept-invite/:notificationId', authMiddleware, asyncHandler(async (req, res) => {
  console.log('🎯 Accept invite - NotificationId:', req.params.notificationId, 'UserEmail:', req.user.email);
  
  const Notification = require('../models/Notification');
  const notification = await Notification.findOne({
    _id: req.params.notificationId,
    userEmail: req.user.email,
    type: 'hackathon_invite'
  });
  
  console.log('📧 Found notification:', !!notification);
  console.log('📧 Notification details:', notification);
  
  if (!notification) {
    console.log('❌ Notification not found');
    return res.status(404).json({
      success: false,
      error: { message: 'Invitation not found' }
    });
  }
  
  if (notification.isActioned) {
    console.log('⚠️ Invitation already processed');
    return res.status(400).json({
      success: false,
      error: { message: 'Invitation already processed' }
    });
  }
  
  const hackathon = await Hackathon.findById(notification.data.hackathonId);
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found' }
    });
  }
  
  // Check if team is full
  if (hackathon.teamMembers.length >= (hackathon.maxParticipants || 4)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Team is already full' }
    });
  }
  
  // Check for duplicate email before adding (safety check)
  const duplicateCheck = hackathon.teamMembers.find(m => m.email.toLowerCase() === req.user.email.toLowerCase());
  if (duplicateCheck) {
    return res.status(409).json({
      success: false,
      error: { message: 'You are already a team member' }
    });
  }
  
  // Prevent team leader from being added as team member
  if (hackathon.email.toLowerCase() === req.user.email.toLowerCase()) {
    return res.status(409).json({
      success: false,
      error: { message: 'Team leader cannot be added as team member' }
    });
  }
  
  // Add to team
  console.log('👥 Adding member to team:', req.user.name);
  console.log('👥 Current team size:', hackathon.teamMembers.length);
  
  hackathon.teamMembers.push({
    name: req.user.name,
    email: req.user.email.toLowerCase(),
    role: notification.data.role,
    joinedAt: new Date()
  });
  
  const savedHackathon = await hackathon.save();
  console.log('✅ Team member added, new size:', savedHackathon.teamMembers.length);
  
  // Update user's current team info
  const UserMongoDB = require('../models/UserMongoDB');
  await UserMongoDB.findOneAndUpdate({ email: req.user.email }, {
    'currentTeam.hackathonEmail': hackathon.email,
    'currentTeam.teamName': hackathon.teamName || hackathon.name,
    'currentTeam.role': 'member'
  });
  
  // Mark notification as actioned
  notification.isActioned = true;
  notification.isRead = true;
  await notification.save();
  
  // Notify team leader about acceptance
  const leaderNotification = new Notification({
    userEmail: hackathon.email,
    type: 'invitation_accepted',
    title: `🎉 ${req.user.name} joined your team!`,
    message: `Congratulations! ${req.user.name} accepted your invitation and joined ${hackathon.name} as ${notification.data.role}. Your team is growing stronger!`,
    data: {
      hackathonId: hackathon._id,
      hackathonName: hackathon.name,
      memberName: req.user.name,
      memberEmail: req.user.email,
      role: notification.data.role
    }
  });
  
  await leaderNotification.save();
  
  // Send congratulations notification to the new member
  const welcomeNotification = new Notification({
    userEmail: req.user.email,
    type: 'welcome_team',
    title: `🎆 Welcome to ${hackathon.name}!`,
    message: `Congratulations! You've successfully joined the team. Get ready for an amazing hackathon experience! 🚀`,
    data: {
      hackathonId: hackathon._id,
      hackathonName: hackathon.name,
      role: notification.data.role
    }
  });
  
  await welcomeNotification.save();
  
  res.json({
    success: true,
    message: 'Successfully joined the hackathon team!'
  });
}));

// Decline hackathon invitation
router.post('/decline-invite/:notificationId', authMiddleware, asyncHandler(async (req, res) => {
  const Notification = require('../models/Notification');
  const notification = await Notification.findOneAndUpdate(
    {
      _id: req.params.notificationId,
      userEmail: req.user.email,
      type: 'hackathon_invite',
      isActioned: false
    },
    {
      isActioned: true,
      isRead: true
    }
  );
  
  if (!notification) {
    return res.status(404).json({
      success: false,
      error: { message: 'Invitation not found or already processed' }
    });
  }
  
  res.json({
    success: true,
    message: 'Invitation declined'
  });
}));

// Approve join request
router.post('/approve-request/:notificationId', authMiddleware, asyncHandler(async (req, res) => {
  const Notification = require('../models/Notification');
  const notification = await Notification.findOne({
    _id: req.params.notificationId,
    userEmail: req.user.email,
    type: 'join_request',
    isActioned: false
  });
  
  if (!notification) {
    return res.status(404).json({
      success: false,
      error: { message: 'Join request not found or already processed' }
    });
  }
  
  const hackathon = await Hackathon.findById(notification.data.hackathonId);
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found' }
    });
  }
  
  // Check if team is full
  if (hackathon.teamMembers.length >= (hackathon.maxParticipants || 4)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Team is already full' }
    });
  }
  
  // Add to team
  hackathon.teamMembers.push({
    name: notification.data.requesterName,
    email: notification.data.requesterEmail,
    role: 'Team Member',
    joinedAt: new Date()
  });
  
  // Remove from join requests
  hackathon.joinRequests = hackathon.joinRequests.filter(
    r => r.email !== notification.data.requesterEmail
  );
  
  await hackathon.save();
  
  // Mark notification as actioned
  notification.isActioned = true;
  notification.isRead = true;
  await notification.save();
  
  // Notify explorer that their request was accepted
  await Notification.create({
    userEmail: notification.data.requesterEmail,
    type: 'request_accepted',
    title: '🎉 Congratulations! You\'re in!',
    message: `Your request to join "${hackathon.name}" has been accepted! Welcome to the team!`,
    data: {
      hackathonId: hackathon._id,
      hackathonName: hackathon.name,
      teamLeaderName: req.user.name
    }
  });
  
  res.json({
    success: true,
    message: 'Join request approved successfully'
  });
}));

// Remove team member (team leader only)
router.delete('/:id/member/:memberEmail', authMiddleware, asyncHandler(async (req, res) => {
  const { memberEmail } = req.params;
  
  const hackathon = await Hackathon.findOne({ 
    _id: req.params.id, 
    userId: req.user.id 
  });
  
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found or you are not the owner' }
    });
  }
  
  // Find member to remove
  const memberIndex = hackathon.teamMembers.findIndex(m => m.email.toLowerCase() === memberEmail.toLowerCase());
  
  if (memberIndex === -1) {
    return res.status(404).json({
      success: false,
      error: { message: 'Team member not found' }
    });
  }
  
  const removedMember = hackathon.teamMembers[memberIndex];
  
  // Remove member from team
  hackathon.teamMembers.splice(memberIndex, 1);
  await hackathon.save();
  
  console.log(`🗑️ Removed member: ${removedMember.name} from ${hackathon.name}`);
  
  res.json({
    success: true,
    message: `${removedMember.name} has been removed from the team`
  });
}));

// Withdraw join request (by requester)
router.post('/:id/withdraw-request', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) {
      return res.status(404).json({ success: false, error: { message: 'Hackathon not found' } });
    }
    
    // Find and remove the join request
    const requestIndex = hackathon.joinRequests?.findIndex(r => r.email === req.user.email && r.status === 'pending');
    if (requestIndex === -1) {
      return res.status(404).json({ success: false, error: { message: 'No pending join request found' } });
    }
    
    hackathon.joinRequests.splice(requestIndex, 1);
    await hackathon.save();
    
    // Remove related notification for team leader
    const Notification = require('../models/Notification');
    await Notification.deleteMany({
      userEmail: hackathon.email,
      type: 'join_request',
      'data.requesterEmail': req.user.email,
      'data.hackathonId': hackathon._id,
      isActioned: false
    });
    
    res.json({ success: true, message: 'Join request withdrawn successfully' });
    
  } catch (error) {
    console.error('Withdraw request error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to withdraw request' } });
  }
}));

// Reject join request
router.post('/reject-request/:notificationId', authMiddleware, asyncHandler(async (req, res) => {
  const Notification = require('../models/Notification');
  const notification = await Notification.findOne({
    _id: req.params.notificationId,
    userEmail: req.user.email,
    type: 'join_request',
    isActioned: false
  });
  
  if (!notification) {
    return res.status(404).json({
      success: false,
      error: { message: 'Join request not found or already processed' }
    });
  }
  
  const hackathon = await Hackathon.findById(notification.data.hackathonId);
  if (hackathon) {
    // Remove from join requests
    hackathon.joinRequests = hackathon.joinRequests.filter(
      r => r.email !== notification.data.requesterEmail
    );
    await hackathon.save();
  }
  
  // Mark notification as actioned
  notification.isActioned = true;
  notification.isRead = true;
  await notification.save();
  
  res.json({
    success: true,
    message: 'Join request rejected'
  });
}));

// Get private chat messages for hackathon team
router.get('/:id/messages', authMiddleware, asyncHandler(async (req, res) => {
  console.log(`💬 GET /api/hackathons/${req.params.id}/messages`);
  console.log(`💬 User: ${req.user.name} (${req.user.email})`);
  
  const hackathon = await Hackathon.findById(req.params.id);
  
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found' }
    });
  }
  
  // Check if user is team leader or member
  const isTeamLeader = hackathon.email.toLowerCase() === req.user.email.toLowerCase();
  const isTeamMember = hackathon.teamMembers.some(m => m.email.toLowerCase() === req.user.email.toLowerCase());
  
  if (!isTeamLeader && !isTeamMember) {
    return res.status(403).json({
      success: false,
      error: { message: 'Access denied. Only team members can view chat.' }
    });
  }
  
  // Get messages from MongoDB - use hackathon ID as chat room identifier
  const Message = require('../models/Message');
  const messages = await Message.find({ 
    hackathonWorldId: req.params.id,
    teamId: req.params.id,
    messageType: 'text'
  })
    .populate('sender', 'name email')
    .sort({ createdAt: 1 })
    .limit(100);
  
  console.log(`🔍 Query: hackathonWorldId=${req.params.id}, teamId=${req.params.id}`);
  
  console.log(`💬 Found ${messages.length} messages for hackathon ${req.params.id}`);
  console.log(`💬 Messages:`, messages.map(m => ({ sender: m.sender?.name, content: m.content })));
  
  res.json({
    success: true,
    messages: messages.map(msg => ({
      id: msg._id,
      sender: msg.sender?.name || 'Unknown',
      content: msg.content,
      timestamp: msg.createdAt
    }))
  });
}));

// Send message to private team chat
router.post('/:id/messages', authMiddleware, asyncHandler(async (req, res) => {
  console.log(`💬 POST /api/hackathons/${req.params.id}/messages`);
  console.log(`💬 User: ${req.user.name} (${req.user.email})`);
  console.log(`💬 Message: "${req.body.message}"`);
  
  const { message } = req.body;
  
  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Message cannot be empty' }
    });
  }
  
  const hackathon = await Hackathon.findById(req.params.id);
  
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found' }
    });
  }
  
  // Check if user is team leader or member
  const isTeamLeader = hackathon.email.toLowerCase() === req.user.email.toLowerCase();
  const isTeamMember = hackathon.teamMembers.some(m => m.email.toLowerCase() === req.user.email.toLowerCase());
  
  if (!isTeamLeader && !isTeamMember) {
    return res.status(403).json({
      success: false,
      error: { message: 'Access denied. Only team members can send messages.' }
    });
  }
  
  // Save message to MongoDB
  const Message = require('../models/Message');
  const UserMongoDB = require('../models/UserMongoDB');
  
  console.log(`🔍 Looking up user with email: "${req.user.email}"`);
  console.log(`🔍 User object from token:`, req.user);
  
  // Try exact match first
  let sender = await UserMongoDB.findOne({ email: req.user.email });
  
  // If not found, try case insensitive
  if (!sender) {
    console.log(`⚠️ Exact match failed, trying case insensitive...`);
    sender = await UserMongoDB.findOne({ 
      email: { $regex: new RegExp('^' + req.user.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } 
    });
  }
  
  // If still not found, log error
  if (!sender) {
    console.log(`⚠️ Email lookup failed`);
  }
  
  if (!sender) {
    console.error(`❌ User not found in database:`);
    console.error(`❌ Searched email: "${req.user.email}"`);
    console.error(`❌ Searched email: "${req.user.email}"`);
    
    // List all users for debugging
    const allUsers = await UserMongoDB.find({}).select('email name');
    console.error(`❌ Available users:`, allUsers.map(u => ({ email: u.email, name: u.name })));
    
    return res.status(404).json({
      success: false,
      error: { message: 'User not found in database. Please re-login and try again.' }
    });
  }
  
  console.log(`✅ Found sender: ${sender.name} (${sender.email})`);
  
  const newMessage = new Message({
    content: message.trim(),
    sender: sender._id,
    hackathonWorldId: req.params.id,
    teamId: req.params.id,
    messageType: 'text'
  });
  
  console.log(`💬 Creating message with hackathonWorldId: ${req.params.id}, teamId: ${req.params.id}`);
  console.log(`💬 Sender: ${sender.name} (${sender._id})`);
  
  await newMessage.save();
  await newMessage.populate('sender', 'name email');
  
  console.log(`💬 Message saved to DB with ID: ${newMessage._id}`);
  console.log(`💬 Saved message: ${req.user.name}: ${message}`);
  
  // Verify message was saved
  const savedMessage = await Message.findById(newMessage._id);
  console.log(`💬 Verification - Message exists in DB: ${!!savedMessage}`);
  
  res.json({
    success: true,
    message: 'Message sent successfully',
    data: {
      id: newMessage._id,
      sender: newMessage.sender.name,
      content: newMessage.content,
      timestamp: newMessage.createdAt
    }
  });
}));

// Debug user lookup
router.get('/debug-user', authMiddleware, asyncHandler(async (req, res) => {
  console.log('🔍 DEBUG USER LOOKUP');
  console.log('🔍 Token user:', req.user);
  
  const UserMongoDB = require('../models/UserMongoDB');
  
  // Try different lookup methods
  const exactMatch = await UserMongoDB.findOne({ email: req.user.email });
  const caseInsensitive = await UserMongoDB.findOne({ 
    email: { $regex: new RegExp('^' + req.user.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') } 
  });
  const byEmail = await UserMongoDB.findOne({ email: req.user.email });
  
  // Get all users for comparison
  const allUsers = await UserMongoDB.find({}).select('email name _id');
  
  res.json({
    success: true,
    debug: {
      tokenUser: req.user,
      lookupResults: {
        exactMatch: exactMatch ? { id: exactMatch._id, email: exactMatch.email, name: exactMatch.name } : null,
        caseInsensitive: caseInsensitive ? { id: caseInsensitive._id, email: caseInsensitive.email, name: caseInsensitive.name } : null,
        byEmail: byEmail ? { email: byEmail.email, name: byEmail.name } : null
      },
      allUsers: allUsers.map(u => ({ id: u._id, email: u.email, name: u.name }))
    }
  });
}));

// Get round remarks for hackathon
router.get('/:id/remarks', authMiddleware, asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.findById(req.params.id);
  
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found' }
    });
  }
  
  // Check if user is team leader or member
  const isTeamLeader = hackathon.userId.toString() === req.user.id;
  const isTeamMember = hackathon.teamMembers.some(m => m.email.toLowerCase() === req.user.email.toLowerCase());
  
  if (!isTeamLeader && !isTeamMember) {
    return res.status(403).json({
      success: false,
      error: { message: 'Access denied. Only team members can view remarks.' }
    });
  }
  
  res.json({
    success: true,
    remarks: hackathon.roundRemarks || []
  });
}));

// Make hackathon public (create HackathonWorld entry)
router.post('/:id/make-public', authMiddleware, asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.findOne({ 
    _id: req.params.id, 
    email: req.user.email 
  });
  
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found or you are not the owner' }
    });
  }
  
  // Check if already public
  const HackathonWorld = require('../models/HackathonWorld');
  const existingWorld = await HackathonWorld.findOne({ 
    name: hackathon.name,
    platform: hackathon.platform,
    startDate: hackathon.date 
  });
  
  if (existingWorld) {
    return res.status(409).json({
      success: false,
      error: { message: 'This hackathon is already public' }
    });
  }
  
  // Create HackathonWorld entry
  const world = new HackathonWorld({
    name: hackathon.name,
    description: hackathon.description || `Join ${hackathon.name} and build something amazing!`,
    startDate: new Date(hackathon.date),
    endDate: new Date(new Date(hackathon.date).getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days later
    platform: hackathon.platform,
    maxTeamSize: hackathon.maxParticipants || 4,
    createdBy: req.user.id,
    isActive: true
  });
  
  await world.save();
  
  // Update hackathon to mark as public
  hackathon.isPublicWorld = true;
  hackathon.worldId = world._id;
  await hackathon.save();
  
  console.log(`🌍 Made hackathon public: ${hackathon.name} by ${req.user.name}`);
  
  res.json({
    success: true,
    message: 'Hackathon made public successfully',
    worldId: world._id
  });
}));

// Make hackathon private (remove from public worlds)
router.post('/:id/make-private', authMiddleware, asyncHandler(async (req, res) => {
  const hackathon = await Hackathon.findOne({ 
    _id: req.params.id, 
    email: req.user.email 
  });
  
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found or you are not the owner' }
    });
  }
  
  // Remove from HackathonWorld if exists
  if (hackathon.worldId) {
    const HackathonWorld = require('../models/HackathonWorld');
    await HackathonWorld.findByIdAndDelete(hackathon.worldId);
  }
  
  // Update hackathon to mark as private
  hackathon.isPublicWorld = false;
  hackathon.worldId = undefined;
  await hackathon.save();
  
  console.log(`🔒 Made hackathon private: ${hackathon.name} by ${req.user.name}`);
  
  res.json({
    success: true,
    message: 'Hackathon made private successfully'
  });
}));

// Accept/reject join request
router.post('/:id/handle-request/:requestId', authMiddleware, asyncHandler(async (req, res) => {
  const { action } = req.body; // 'accept' or 'reject'
  const { id: hackathonId, requestId } = req.params;
  
  try {
    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) {
      return res.status(404).json({ success: false, error: { message: 'Hackathon not found' } });
    }
    
    // Check if user is team leader
    if (hackathon.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: { message: 'Only team leader can handle requests' } });
    }
    
    const request = hackathon.joinRequests?.find(r => r._id.toString() === requestId);
    if (!request) {
      return res.status(404).json({ success: false, error: { message: 'Join request not found' } });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: { message: 'Request already handled' } });
    }
    
    const UserMongoDB = require('../models/UserMongoDB');
    const requester = await UserMongoDB.findById(request.userId);
    
    if (action === 'accept') {
      // Check if team still has space
      if ((hackathon.teamMembers?.length || 0) >= (hackathon.maxParticipants - 1)) {
        return res.status(400).json({ success: false, error: { message: 'Team is now full' } });
      }
      
      // Add to team
      hackathon.teamMembers = hackathon.teamMembers || [];
      hackathon.teamMembers.push({
        name: request.name,
        email: request.email,
        role: 'Team Member',
        joinedAt: new Date()
      });
      
      request.status = 'approved';
      
      // Update user's current team info
      const UserMongoDB = require('../models/UserMongoDB');
      await UserMongoDB.findByIdAndUpdate(request.userId, {
        'currentTeam.hackathonId': hackathon._id,
        'currentTeam.teamName': hackathon.teamName || hackathon.name,
        'currentTeam.role': 'member'
      });
      
      // Notify requester of acceptance
      const Notification = require('../models/Notification');
      await Notification.create({
        userId: request.userId,
        type: 'request_accepted',
        title: 'Join Request Accepted',
        message: `You've been accepted to join "${hackathon.name}"!`,
        data: { hackathonId: hackathon._id }
      });
      
      // Notify team leader
      await Notification.create({
        userId: hackathon.userId,
        type: 'member_joined',
        title: 'New Team Member',
        message: `${request.name} joined your hackathon "${hackathon.name}"`,
        data: { hackathonId: hackathon._id, memberName: request.name }
      });
      
    } else {
      request.status = 'rejected';
      
      // Notify requester of rejection
      const Notification = require('../models/Notification');
      await Notification.create({
        userId: request.userId,
        type: 'request_rejected',
        title: 'Join Request Declined',
        message: `Your request to join "${hackathon.name}" was declined`,
        data: { hackathonId: hackathon._id }
      });
    }
    
    await hackathon.save();
    
    res.json({ 
      success: true, 
      message: `Join request ${action}ed successfully`,
      teamSize: (hackathon.teamMembers?.length || 0) + 1
    });
    
  } catch (error) {
    console.error('Handle request error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to handle request' } });
  }
}));

// Add round remark
router.post('/:id/remarks', authMiddleware, asyncHandler(async (req, res) => {
  const { round, content } = req.body;
  
  if (!content || !content.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Remark content cannot be empty' }
    });
  }
  
  const hackathon = await Hackathon.findById(req.params.id);
  
  if (!hackathon) {
    return res.status(404).json({
      success: false,
      error: { message: 'Hackathon not found' }
    });
  }
  
  // Check if user is team leader (by email) or member
  const isTeamLeader = hackathon.email.toLowerCase() === req.user.email.toLowerCase();
  const isTeamMember = hackathon.teamMembers.some(m => m.email.toLowerCase() === req.user.email.toLowerCase());
  
  console.log('🔍 Remark access check:', {
    hackathonEmail: hackathon.email,
    userEmail: req.user.email,
    isTeamLeader,
    isTeamMember,
    teamMembersCount: hackathon.teamMembers.length
  });
  
  if (!isTeamLeader && !isTeamMember) {
    return res.status(403).json({
      success: false,
      error: { message: 'Access denied. Only team members can add remarks.' }
    });
  }
  
  // Add new remark
  const newRemark = {
    round: parseInt(round),
    content: content.trim(),
    author: req.user.name,
    authorEmail: req.user.email,
    createdAt: new Date()
  };
  
  if (!hackathon.roundRemarks) {
    hackathon.roundRemarks = [];
  }
  
  hackathon.roundRemarks.push(newRemark);
  
  // CRITICAL: Only save roundRemarks, don't modify other fields
  await Hackathon.updateOne(
    { _id: hackathon._id },
    { $push: { roundRemarks: newRemark } }
  );
  
  console.log(`📝 New remark added to ${hackathon.name} Round ${round} by ${req.user.name}`);
  
  res.json({
    success: true,
    message: 'Remark added successfully',
    remark: newRemark
  });
}));

module.exports = router;