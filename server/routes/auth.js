const express = require('express');
const router = express.Router();
const https = require('https');
const UserMongoDB = require('../models/UserMongoDB');

// ──────────────────────────────────────────────
// Google OAuth 2.0 — Authorization Code Flow
// ──────────────────────────────────────────────

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:10000/api/auth/google/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * Helper: make an HTTPS request and return JSON response
 */
function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// ─────────────────────────────────────────────────────────
// GET /api/auth/google — Redirect user to Google consent
// ─────────────────────────────────────────────────────────
router.get('/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.status(500).json({
      success: false,
      error: { message: 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID in .env' },
    });
  }

  const scopes = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: scopes,
    access_type: 'offline',
    prompt: 'consent',
  });

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  console.log('🔗 Redirecting to Google OAuth:', googleAuthUrl);
  res.redirect(googleAuthUrl);
});

// ─────────────────────────────────────────────────────────
// GET /api/auth/google/callback — Handle Google's redirect
// ─────────────────────────────────────────────────────────
router.get('/google/callback', async (req, res) => {
  const { code, error: authError } = req.query;

  // Handle user denying access
  if (authError) {
    console.error('❌ Google OAuth error:', authError);
    return res.redirect(`${FRONTEND_URL}/login?error=oauth_denied`);
  }

  if (!code) {
    console.error('❌ No authorization code received');
    return res.redirect(`${FRONTEND_URL}/login?error=no_code`);
  }

  try {
    // ── Step 1: Exchange authorization code for tokens ──
    console.log('🔄 Exchanging authorization code for tokens...');

    const tokenBody = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }).toString();

    const tokenResponse = await httpsRequest('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(tokenBody),
      },
      body: tokenBody,
    });

    if (tokenResponse.status !== 200 || !tokenResponse.data.access_token) {
      console.error('❌ Token exchange failed:', tokenResponse.data);
      return res.redirect(`${FRONTEND_URL}/login?error=token_exchange_failed`);
    }

    const { access_token } = tokenResponse.data;
    console.log('✅ Access token obtained');

    // ── Step 2: Fetch user info from Google ──
    console.log('👤 Fetching Google user profile...');

    const profileResponse = await httpsRequest(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${access_token}`
    );

    if (profileResponse.status !== 200 || !profileResponse.data.email) {
      console.error('❌ Failed to fetch user profile:', profileResponse.data);
      return res.redirect(`${FRONTEND_URL}/login?error=profile_fetch_failed`);
    }

    const googleUser = profileResponse.data;
    console.log('✅ Google profile received:', {
      name: googleUser.name,
      email: googleUser.email,
      picture: googleUser.picture,
    });

    // ── Step 3: Find or create user in MongoDB ──
    let user = await UserMongoDB.findOne({ email: googleUser.email.toLowerCase().trim() });

    if (!user) {
      // Create new user from Google profile (no password required)
      console.log('📝 Creating new user from Google profile:', googleUser.email);
      user = new UserMongoDB({
        name: googleUser.name,
        email: googleUser.email.toLowerCase().trim(),
        emailVerified: true,
        isTemporary: false,
        password: require('crypto').randomBytes(32).toString('hex'), // random password since they'll use OAuth
        profile: {
          avatar: googleUser.picture || '',
          isPublic: false,
        },
      });
      await user.save();
      console.log('✅ New Google user created:', user._id);
    } else {
      // Update last login and optionally update avatar
      console.log('👋 Existing user signing in via Google:', user.email);
      user.lastLogin = new Date();
      if (googleUser.picture && !user.profile.avatar) {
        user.profile.avatar = googleUser.picture;
      }
      await user.save();
    }

    // ── Step 4: Generate app token (same format as existing auth) ──
    const token = Buffer.from(
      JSON.stringify({
        id: user._id,
        email: user.email,
        name: user.name,
      })
    ).toString('base64');

    console.log('✅ Google OAuth login successful for:', user.email);

    // ── Step 5: Redirect to frontend with token ──
    const userData = encodeURIComponent(
      JSON.stringify({
        _id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        profile: user.profile,
      })
    );

    res.redirect(`${FRONTEND_URL}/oauth/callback?token=${token}&user=${userData}`);
  } catch (error) {
    console.error('❌ Google OAuth callback error:', error);
    res.redirect(`${FRONTEND_URL}/login?error=server_error`);
  }
});

console.log('🔐 Google OAuth routes loaded');
module.exports = router;
