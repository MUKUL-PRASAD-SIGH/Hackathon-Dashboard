# 🚨 Common Issues & Quick Fixes

## ⚠️ **🔥 CRITICAL: PORT MISMATCH - CHECK THIS FIRST! 🔥**

### 🚨 **HIDDEN ISSUE: Backend Running on Wrong Port**
**⚠️ BEFORE KILLING/RESTARTING BACKEND - CHECK CONSOLE LOGS!**

**Symptoms:**
- ❌ `Failed to load resource: the server responded with a status of 500 (Internal Server Error)`
- ❌ `:5001/api/worlds:1 Failed to load resource`
- ❌ Frontend shows "Internal server error under hackathons world"
- ❌ API calls work for some endpoints but fail for others

**🔍 Root Cause:** 
- Frontend configured for port `5001` or `5000`
- Backend actually running on port `10000` (default in app.js)
- **DON'T KILL BACKEND** - Just fix the port!

**🚀 Quick Fix:**
1. **Check backend console** - Look for: `🚀 Server running on port 10000`
2. **Update frontend API config:**
   ```javascript
   // In src/config/api.js
   'http://localhost:5001/api' → 'http://localhost:10000/api'
   ```
3. **Restart frontend only** - Backend is fine!

**🔧 Files to Update:**
- `src/config/api.js` - Main API URL
- `src/utils/apiUtils.js` - API utility functions  
- `src/services/socketService.js` - Socket.IO URL

**💡 Prevention:** Always check `console.log('🚀 Server running on port X')` before assuming backend issues!

---

## 🔧 **Port Configuration Issues**

### Issue: Frontend calling wrong backend port
**Symptoms:**
- `ERR_CONNECTION_REFUSED` errors
- API calls failing with "Cannot connect to localhost:5000"
- Empty dashboard/data not loading

**Root Cause:** Frontend hardcoded to port 5000, backend running on 5001

**Files to Check:**
- `src/config/api.js` - Main API URL
- `src/utils/apiUtils.js` - API utility functions  
- `src/services/socketService.js` - Socket.IO URL
- `.env` - PORT variable

**Quick Fix:**
```javascript
// Change in all files:
'http://localhost:5000' → 'http://localhost:5001'
```

---

## 🔐 **Authentication Issues**

### Issue: Token missing or invalid
**Symptoms:**
- "No token found! Please login first"
- Dashboard shows 0 hackathons
- API returns 401 Unauthorized

**Quick Fix:**
1. Check localStorage: `localStorage.getItem('token')`
2. Re-login if token missing
3. Clear browser cache if persists

---

## 🗄️ **Database Connection Issues**

### Issue: User data not showing up
**Symptoms:**
- Existing hackathons not appearing
- User registered but data missing

**Root Cause:** User ID mismatch or email differences

**Debug Steps:**
1. Check user ID: `localStorage.getItem('user')`
2. Use recovery endpoint: `/api/recover-hackathons/your-email`
3. Verify MongoDB connection in server logs

---

## 🌐 **CORS & Network Issues**

### Issue: Browser blocking requests
**Symptoms:**
- CORS errors in console
- "Failed to fetch" errors
- Chrome extension warnings

**Quick Fix:**
1. Ensure backend CORS allows frontend URL
2. Check if backend server is running
3. Disable browser extensions temporarily

---

## 🔄 **Cache Issues**

### Issue: Old code/URLs cached
**Symptoms:**
- Changes not reflecting
- Still calling old ports/URLs
- Stale data showing

**Quick Fix:**
1. Hard refresh: `Ctrl + F5`
2. Clear browser cache completely
3. Restart both frontend and backend

---

## 📱 **Frontend Build Issues**

### Issue: React app not updating
**Symptoms:**
- New components not showing
- Old behavior persisting
- Import errors

**Quick Fix:**
1. Stop frontend: `Ctrl + C`
2. Clear cache: `npm start` (restart)
3. Check for syntax errors in console

---

## 🔌 **Socket.IO Connection Issues**

### Issue: Real-time features not working
**Symptoms:**
- Chat messages not appearing
- "🔴 Offline" status
- Socket connection errors

**Files to Check:**
- `src/services/socketService.js` - Socket URL
- `server/server.js` - Socket.IO CORS config

**Quick Fix:**
1. Ensure Socket.IO URL matches backend port
2. Check CORS origins include frontend URL
3. Verify authentication token is valid

---

## 🏗️ **Development Setup Issues**

### Issue: Backend not starting
**Symptoms:**
- "EADDRINUSE" port errors
- Module not found errors
- Environment variables missing

**Quick Fix:**
1. Kill process on port: `netstat -ano | findstr :5001`
2. Install dependencies: `cd server && npm install`
3. Check `.env` file exists and has correct values

---

## 📊 **Data Not Loading Issues**

### Issue: API returns empty arrays
**Symptoms:**
- Dashboard shows 0 items
- "No hackathons found"
- API successful but empty data

**Debug Steps:**
1. Check user authentication
2. Verify user ID in database
3. Check API endpoint logs
4. Use recovery endpoints to find data

---

## 📧 **Invitation System Issues**

### Issue: "Failed to send invitation" error
**Symptoms:**
- Dashboard shows "Failed to send invitation"
- Email not received by invitee
- Server errors in console

**Root Causes & Solutions:**
1. **Nodemailer method error**: `createTransporter` → `createTransport`
2. **Email service not configured**: Check Gmail SMTP settings in .env
3. **Duplicate invitations**: System prevents sending to same user twice
4. **Invalid email format**: Ensure proper email validation

**Quick Fix:**
```javascript
// Fix in hackathons.js
nodemailer.createTransport (not createTransporter)
```

### Issue: "Error accepting invitation" 
**Symptoms:**
- Notification shows but can't accept
- "Invitation not found" errors
- Accept button doesn't work

**Root Causes:**
- Notification ID mismatch
- User authentication issues
- Already processed invitations
- Database connection problems

**Debug Steps:**
1. Check server console for accept-invite logs
2. Verify notification ID in URL
3. Confirm user is logged in
4. Check if invitation already processed

### Issue: Duplicate invitations received
**Symptoms:**
- Same invitation appears twice
- Multiple emails for same hackathon

**Solution:** Added duplicate prevention check in invitation creation

---

## 👤 **Profile API Issues**

### Issue: "API endpoint not found" when saving profile
**Symptoms:**
- Profile save shows "API endpoint not found"
- Console shows 404 errors for `/api/users/profile`
- Server logs show unmatched routes

**Root Cause:** Wrong server file running

**Files to Check:**
- `server/package.json` - Check dev script
- `server/app.js` vs `server/server.js`
- Server console logs for users routes loading

**Quick Fix:**
1. Kill all processes: `taskkill /PID <PID> /F`
2. Update package.json: `"dev": "nodemon app.js"`
3. Run correct server: `node app.js` or `npm run dev`
4. Look for: "✅ Users routes loaded at /api/users"

**Server File Differences:**
- `app.js` = New server with profile API ✅
- `server.js` = Old server without profile API ❌

---

## 🔍 **Quick Debug Commands**

```bash
# Check what's running on ports
netstat -ano | findstr :5001
netstat -ano | findstr :3001

# Kill process on port
taskkill /PID <PID> /F

# Test API directly
curl http://localhost:5001/api/worlds
curl http://localhost:5001/api/users/test

# Check MongoDB connection
# Use recovery endpoint in browser
http://localhost:5001/api/recover-hackathons/your-email

# Test profile API
curl -X PUT http://localhost:5001/api/users/profile

# Test invitation system
curl -X POST http://localhost:5001/api/hackathons/HACKATHON_ID/invite
curl -X GET http://localhost:5001/api/hackathons/notifications
curl -X POST http://localhost:5001/api/hackathons/accept-invite/NOTIFICATION_ID
```

---

## 💬 **Private Chat System Issues**

### Issue: Chat messages not loading
**Symptoms:**
- "Loading chat..." never finishes
- Empty chat area
- Console errors for `/api/hackathons/:id/messages`

**Root Causes:**
1. **API endpoint missing**: Chat routes not loaded
2. **Authentication failure**: User not team member
3. **Hackathon ID mismatch**: Wrong ID passed to chat
4. **Server memory issue**: Global messages storage not initialized

**Quick Fix:**
```javascript
// Check server console for:
// "✅ Chat routes loaded"
// "🔒 User access denied to chat"
// "💬 New message in [hackathon]"
```

### Issue: Messages not syncing between users
**Symptoms:**
- User A sends message, User B doesn't see it
- Messages appear only for sender
- Polling not working

**Root Causes:**
1. **Different hackathon IDs**: Users viewing different chats
2. **Authentication mismatch**: Users not in same team
3. **Polling interval too slow**: 2-second delay
4. **Global storage cleared**: Server restart loses messages

**Debug Steps:**
1. Check hackathon ID in URL/API calls
2. Verify both users are team members
3. Check server logs for message storage
4. Test with manual refresh

### Issue: "Access denied" when opening chat
**Symptoms:**
- Chat shows "Access denied. Only team members can view chat"
- 403 Forbidden errors
- Team leader can't access own chat

**Root Causes:**
1. **Team membership check failing**: Email case mismatch
2. **User ID vs email confusion**: Mixed authentication
3. **Hackathon ownership check**: Wrong user ID comparison

**Quick Fix:**
```javascript
// Check team membership logic:
// isTeamLeader = hackathon.userId.toString() === req.user.id
// isTeamMember = hackathon.teamMembers.some(m => m.email.toLowerCase() === req.user.email.toLowerCase())
```

### Issue: Chat UI not responsive
**Symptoms:**
- Chat area too small/large
- Messages not scrolling
- Send button not working
- Mobile layout broken

**Files to Check:**
- `PrivateChat.css` - Layout and responsive design
- `VibrantCards.css` - Modal sections grid
- Browser console for CSS errors

### Issue: Messages lost after server restart
**Symptoms:**
- Chat history disappears
- Previous conversations gone
- Only new messages appear

**Root Cause:** ~~Using `global.hackathonMessages` (in-memory storage)~~ **FIXED**

**Solution:** ✅ Now using MongoDB Message model for persistence

### Issue: "Message sent successfully" but not appearing
**Symptoms:**
- Send button works, no errors
- Message disappears from input
- Other users don't see the message
- Message not in chat history

**Debug Steps:**
1. Check server console for message save logs
2. Verify MongoDB connection
3. Check Message model schema
4. Verify hackathonId matches between send/fetch

**Common Fixes:**
```javascript
// Check if Message model exists
const Message = require('../models/Message');

// Verify hackathon ID in both endpoints
console.log('Hackathon ID:', req.params.id);

// Check user authentication
console.log('User:', req.user);
```

### Issue: Message Model Import Errors
**Symptoms:**
- Server crashes when sending messages
- "Cannot find module '../models/Message'" error
- Chat API returns 500 Internal Server Error

**Root Cause:** Message model file missing or incorrect path

**Solution:**
1. Create Message model file: `server/models/Message.js`
2. Verify import path in hackathons.js routes
3. Check model schema matches frontend expectations

**Message Model Schema:**
```javascript
const messageSchema = new mongoose.Schema({
  hackathonId: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  senderName: { type: String, required: true },
  senderEmail: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});
```

### Issue: Chat messages not persisting after server restart
**Symptoms:**
- Messages disappear when server restarts
- Chat history lost
- Only new messages appear

**Root Cause:** Using in-memory storage (global.hackathonMessages)

**Solution:** ✅ **FIXED** - Now using MongoDB Message model
- Messages saved to database permanently
- Chat history persists across server restarts
- Proper user information populated

### Issue: User information not showing in chat messages
**Symptoms:**
- Messages show "undefined" for sender name
- Email not displaying correctly
- User lookup failing

**Root Cause:** UserMongoDB.findById() not populating user data

**Solution:**
```javascript
// Fixed user lookup in message creation
const user = await UserMongoDB.findById(req.user.id);
if (!user) {
  return res.status(404).json({ error: 'User not found' });
}

// Save with proper user data
const newMessage = new Message({
  hackathonId: req.params.id,
  senderId: req.user.id,
  senderName: user.name,
  senderEmail: user.email,
  message: req.body.message
});
```

### Issue: Chat access validation failing
**Symptoms:**
- Team leader can't access own chat
- "Access denied" for valid team members
- 403 Forbidden errors

**Root Cause:** Team membership logic errors

**Debug Steps:**
```javascript
// Check team membership validation
const hackathon = await Hackathon.findById(req.params.id);
const isTeamLeader = hackathon.userId.toString() === req.user.id;
const isTeamMember = hackathon.teamMembers?.some(m => 
  m.email.toLowerCase() === req.user.email.toLowerCase()
);

console.log('User ID:', req.user.id);
console.log('Hackathon Owner:', hackathon.userId.toString());
console.log('Is Team Leader:', isTeamLeader);
console.log('Team Members:', hackathon.teamMembers);
console.log('Is Team Member:', isTeamMember);
```

### Issue: Chat polling causing performance issues
**Symptoms:**
- Browser slowing down
- Too many API requests
- Network tab showing constant requests every 2 seconds

**Current Implementation:** 2-second polling interval

**Optimization Options:**
```javascript
// Option 1: Increase polling interval
setInterval(fetchMessages, 5000); // 5 seconds instead of 2

// Option 2: Implement WebSocket (future enhancement)
// Use Socket.IO for real-time messaging
```

### Issue: Chat modal layout breaking on mobile
**Symptoms:**
- Chat area too small on mobile devices
- Send button not visible
- Messages overlapping
- Scroll not working properly

**Files to Check:**
- `PrivateChat.css` - Mobile responsive styles
- `VibrantCards.css` - Modal grid layout
- Browser dev tools for responsive testing

**Quick Fixes:**
```css
/* Mobile responsive chat */
@media (max-width: 768px) {
  .chat-container {
    height: 300px;
    font-size: 14px;
  }
  
  .message-input {
    font-size: 16px; /* Prevent zoom on iOS */
  }
}
```

### Issue: "Access denied" for team leader
**Symptoms:**
- Team leader can't access own team chat
- 403 Forbidden errors
- "Only team members can view chat" message

**Root Cause:** Team membership check logic error

**Debug:**
```javascript
// Check team membership logic
const isTeamLeader = hackathon.userId.toString() === req.user.id;
const isTeamMember = hackathon.teamMembers.some(m => 
  m.email.toLowerCase() === req.user.email.toLowerCase()
);
console.log('Is team leader:', isTeamLeader);
console.log('Is team member:', isTeamMember);
```

---

## 🔄 **Chat Integration Issues**

### Issue: Modal not showing chat section
**Symptoms:**
- "View Details" shows team members but no chat
- Chat component not rendering
- Import errors for PrivateChat

**Files to Check:**
- `Dashboard.js` - PrivateChat import and usage
- `PrivateChat/PrivateChat.js` - Component exists
- Browser console for import errors

### Issue: Chat polling causing performance issues
**Symptoms:**
- Browser slowing down
- Too many API calls
- Network tab showing constant requests

**Root Cause:** 2-second polling interval

**Optimization:**
```javascript
// Increase interval or implement WebSocket
setInterval(fetchMessages, 5000); // 5 seconds instead of 2
```

---

### Issue: Chat API returning 500 Internal Server Error
**Symptoms:**
- Server crashes when accessing chat
- "Internal Server Error" in browser
- Chat completely broken

**Common Causes:**
1. **Message model not found**: Missing `require('../models/Message')`
2. **User lookup fails**: UserMongoDB.findOne() returns null
3. **Database connection**: MongoDB not connected
4. **Schema mismatch**: Message model fields don't match

**Quick Fixes:**
```bash
# Check server logs for exact error
node app.js

# Test MongoDB connection
# Check if Message model file exists
ls server/models/Message.js

# Verify user exists in database
# Check hackathon exists with correct ID
```

### Issue: Messages appear for sender but not receiver
**Symptoms:**
- Sender sees their message immediately
- Other team members don't see it
- Refresh doesn't help

**Root Cause:** Message not actually saved to database

**Debug Steps:**
1. Check server console for "Message saved to DB" log
2. Verify MongoDB write operations
3. Check if populate() is working for sender info
4. Ensure all team members have same hackathon ID

---

## 🧪 **Chat API Testing Commands**

```bash
# Test get messages (replace TOKEN and HACKATHON_ID)
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:5001/api/hackathons/HACKATHON_ID/messages

# Test send message
curl -X POST \
     -H "Authorization: Bearer TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"message":"Test message"}' \
     http://localhost:5001/api/hackathons/HACKATHON_ID/messages

# Check server logs
tail -f server/logs/app.log

# Test MongoDB connection
node -e "require('./server/config/database'); console.log('DB connected');"

# Test Message model directly
node -e "const Message = require('./server/models/Message'); console.log('Message model loaded');"

# Check if messages exist in database
# Use MongoDB Compass or mongo shell:
# db.messages.find({hackathonId: ObjectId('YOUR_HACKATHON_ID')})
```

---

## 🔄 **Database Migration Issues**

### Issue: Switching from in-memory to MongoDB storage
**Symptoms:**
- Old messages lost during migration
- New message format not compatible
- Chat history inconsistent

**Migration Steps:**
1. **Backup existing data** (if any important messages)
2. **Create Message model** with proper schema
3. **Update API endpoints** to use MongoDB instead of global storage
4. **Test message persistence** across server restarts
5. **Verify user data population** in messages

**Before (In-Memory):**
```javascript
// Old approach - data lost on restart
if (!global.hackathonMessages) {
  global.hackathonMessages = {};
}
global.hackathonMessages[hackathonId] = messages;
```

**After (MongoDB):**
```javascript
// New approach - persistent storage
const newMessage = new Message({
  hackathonId: req.params.id,
  senderId: req.user.id,
  senderName: user.name,
  senderEmail: user.email,
  message: req.body.message
});
await newMessage.save();
```

### Issue: Message schema validation errors
**Symptoms:**
- "ValidationError: Path `senderName` is required"
- Messages not saving to database
- 500 errors when sending messages

**Root Cause:** Missing required fields in Message model

**Solution:**
```javascript
// Ensure all required fields are provided
const user = await UserMongoDB.findById(req.user.id);
if (!user) {
  return res.status(404).json({ error: 'User not found' });
}

// Validate before saving
const messageData = {
  hackathonId: req.params.id,
  senderId: req.user.id,
  senderName: user.name || user.email, // Fallback if name missing
  senderEmail: user.email,
  message: req.body.message.trim()
};

// Check for empty message
if (!messageData.message) {
  return res.status(400).json({ error: 'Message cannot be empty' });
}
```

### Issue: Duplicate messages appearing
**Symptoms:**
- Same message shows multiple times
- Polling creates duplicate entries
- Message list growing incorrectly

**Root Cause:** Frontend not handling message deduplication

**Solution:**
```javascript
// Add message ID tracking in frontend
const [messageIds, setMessageIds] = useState(new Set());

// Filter duplicates when fetching
const newMessages = response.data.filter(msg => !messageIds.has(msg._id));
if (newMessages.length > 0) {
  setMessages(prev => [...prev, ...newMessages]);
  setMessageIds(prev => new Set([...prev, ...newMessages.map(m => m._id)]));
}
```

### Issue: Chat not loading for existing hackathons
**Symptoms:**
- "Loading chat..." never finishes
- No messages appear even after sending
- API calls successful but empty response

**Debug Steps:**
1. Check hackathon ID in URL and API calls
2. Verify user is authenticated and team member
3. Check if Message collection exists in MongoDB
4. Test with fresh hackathon vs existing one

**Common Fix:**
```javascript
// Ensure hackathon ID is valid ObjectId
const mongoose = require('mongoose');
if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
  return res.status(400).json({ error: 'Invalid hackathon ID' });
}
```

---

## 🚀 **Prevention Tips**

1. **Always check ports** when adding new features
2. **Use environment variables** for URLs
3. **Test API endpoints** before frontend integration
4. **Clear cache** when making URL changes
5. **Check browser console** for errors first
6. **Verify authentication** before debugging data issues

---

**💡 Remember: Most issues are port mismatches, authentication problems, or cache issues!**