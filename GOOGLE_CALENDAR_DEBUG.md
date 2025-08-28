# 🔍 Google Calendar Integration Debug Guide

## 🚨 Issues Found & Solutions

### 1. **Client ID Inconsistency**
**Problem**: Different Client IDs used in different files
- Service: `507618059169-vp8etph9vp3g7dod8tp822fc6frj130i.apps.googleusercontent.com`
- Test files: `507618059169-eljil3v8bah6ks9fug43qk9t8garnuh4.apps.googleusercontent.com`

**Solution**: ✅ Fixed - Using consistent Client ID from environment variables

### 2. **Missing API Key**
**Problem**: Google Calendar API requires both Client ID and API Key
**Solution**: ✅ Added API Key to service and environment variables

### 3. **Insufficient Error Handling**
**Problem**: Generic error messages without specific debugging info
**Solution**: ✅ Added comprehensive debug logging and specific error messages

### 4. **OAuth Configuration Issues**
**Problem**: Redirect URIs might not be properly configured in Google Cloud Console
**Solution**: Need to verify Google Cloud Console settings

---

## 🛠️ Debug Tools Created

### 1. **Enhanced Google Calendar Service** ✅
- Added comprehensive debug logging
- Added API key support
- Improved error handling with specific error types
- Added authentication status checking

### 2. **Google Calendar Debug Component** ✅
- Step-by-step testing interface
- Real-time debug logs
- Connection status monitoring
- Environment variable checking

### 3. **Debug Test Scripts** ✅
- Browser console test script
- HTML debug page
- Comprehensive API testing

---

## 🧪 How to Debug

### Method 1: Use Debug Component (Recommended)
1. Start your React app: `npm start`
2. Navigate to: `http://localhost:3000/google-debug`
3. Click "🚀 Run Full Test" to test all functionality
4. Check debug logs for specific error messages

### Method 2: Browser Console Testing
1. Open your app in browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Load the test script:
   ```javascript
   // Copy and paste the content of test-google-calendar.js
   // Then run:
   testGoogleCalendar();
   ```

### Method 3: HTML Debug Page
1. Open `debug-google-calendar.html` in browser
2. Click "Test Google Calendar API"
3. Check console output for detailed logs

---

## 🔧 Google Cloud Console Setup Required

### 1. **Verify OAuth 2.0 Client Configuration**
Go to [Google Cloud Console](https://console.cloud.google.com/):

1. **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID: `507618059169-vp8etph9vp3g7dod8tp822fc6frj130i.apps.googleusercontent.com`
3. **Edit** the client
4. **Authorized JavaScript origins** should include:
   - `http://localhost:3000`
   - `http://localhost:3001`
   - `https://hackathon-dashboard-mukul.netlify.app`
5. **Authorized redirect URIs** should include:
   - `http://localhost:3000`
   - `http://localhost:3001`
   - `https://hackathon-dashboard-mukul.netlify.app`

### 2. **Enable Calendar API**
1. **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click **Enable**

### 3. **Verify API Key**
1. **APIs & Services** → **Credentials**
2. Find API Key: `AIzaSyD-2r01xGtYmo-hugPhG8PcApPmpAkZ7Qc`
3. **Edit** the API key
4. **API restrictions** → Select "Google Calendar API"
5. **Website restrictions** → Add your domains

---

## 🚀 Testing Steps

### Step 1: Environment Check
```bash
# Check if environment variables are loaded
echo $REACT_APP_GOOGLE_CLIENT_ID
echo $REACT_APP_GOOGLE_API_KEY
```

### Step 2: Basic API Test
1. Go to `/google-debug` route
2. Click "1. Test Initialization"
3. Check for any initialization errors

### Step 3: Authentication Test
1. Click "2. Test Sign In"
2. Complete Google OAuth flow
3. Verify successful authentication

### Step 4: Calendar Access Test
1. Click "3. Test Calendar Access"
2. Verify calendar list retrieval
3. Check permissions

### Step 5: Event Creation Test
1. Click "4. Test Event Creation"
2. Verify test event is created
3. Check Google Calendar for the event

---

## 🔍 Common Error Solutions

### Error: "popup_closed_by_user"
**Cause**: User closed the OAuth popup
**Solution**: Try sign-in again, don't close the popup

### Error: "access_denied"
**Cause**: User denied calendar access
**Solution**: Grant calendar permissions in OAuth flow

### Error: "invalid_client"
**Cause**: Client ID not configured properly
**Solution**: Check Google Cloud Console OAuth client setup

### Error: "redirect_uri_mismatch"
**Cause**: Current URL not in authorized redirect URIs
**Solution**: Add current URL to Google Cloud Console

### Error: 403 "Permission denied"
**Cause**: API key restrictions or insufficient permissions
**Solution**: Check API key configuration and user permissions

### Error: 401 "Authentication failed"
**Cause**: Token expired or invalid
**Solution**: Sign out and sign in again

---

## 📊 Debug Output Examples

### ✅ Successful Output:
```
[GoogleCalendar] Starting initialization...
[GoogleCalendar] Client ID: 507618059169-vp8etph9vp3g7dod8tp822fc6frj130i.apps.googleusercontent.com
[GoogleCalendar] API Key: Present
[GoogleCalendar] Google API script loaded
[GoogleCalendar] Initializing gapi client...
[GoogleCalendar] ✅ Google Calendar API initialized successfully
[GoogleCalendar] Sign-in status: true
```

### ❌ Error Output:
```
[GoogleCalendar] ❌ gapi.client.init failed: {error: "invalid_client", error_description: "Unauthorized"}
```

---

## 🎯 Next Steps

1. **Run the debug component** to identify specific issues
2. **Check Google Cloud Console** configuration
3. **Verify environment variables** are loaded correctly
4. **Test step by step** using the debug interface
5. **Check browser console** for additional error details

---

## 📞 Quick Fix Commands

```bash
# Restart development server with fresh environment
npm start

# Clear browser cache and localStorage
# (Use browser dev tools → Application → Storage → Clear)

# Test in incognito mode to avoid cached auth issues
```

---

## 🔗 Useful Links

- [Google Calendar API Documentation](https://developers.google.com/calendar/api)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OAuth 2.0 Troubleshooting](https://developers.google.com/identity/protocols/oauth2/web-server#troubleshooting)