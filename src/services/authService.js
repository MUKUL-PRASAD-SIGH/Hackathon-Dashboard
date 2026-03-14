// Auth service for handling OTP and user authentication
import { toast } from 'react-hot-toast';

// API URL - relative in dev (proxy), absolute in prod
const getApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  const isLocalhost = window.location.hostname === 'localhost';
  return isLocalhost
    ? '/api'
    : 'https://hackathon-dashboard-backend-md49.onrender.com/api';
};

const authService = {
  // Send OTP to email
  sendOtp: async (email) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      return data;
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error(error.message || 'Failed to send OTP');
      throw error;
    }
  },

  // Verify OTP
  verifyOtp: async (email, otp) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to verify OTP');
      }

      return data;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error(error.message || 'Failed to verify OTP');
      throw error;
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract error message from nested error object or top-level message
        const errorMessage = data.error?.message || data.message || 'Login failed';
        throw new Error(errorMessage);
      }

      // Save user session
      if (data.token && data.user) {
        authService.setUserSession(data.token, data.user);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Register a new user
  registerUser: async (email, password, name) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      return data;
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed');
      throw error;
    }
  },

  // Send Login OTP (only for registered users)
  sendLoginOtp: async (email) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/send-login-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error?.message || data.message || 'Failed to send OTP';
        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error('Send login OTP error:', error);
      throw error;
    }
  },

  // Verify Login OTP and get auth token
  verifyLoginOtp: async (email, otp) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/verify-login-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error?.message || data.message || 'Failed to verify OTP';
        throw new Error(errorMessage);
      }

      // Save user session
      if (data.token && data.user) {
        authService.setUserSession(data.token, data.user);
      }

      return data;
    } catch (error) {
      console.error('Verify login OTP error:', error);
      throw error;
    }
  },

  // Set user session
  setUserSession: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  // Clear user session
  clearSession: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get current user
  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Check if user is authenticated with valid JWT token
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      return false;
    }

    // Validate JWT structure (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) {
      // Invalid token format, clear session
      authService.clearSession();
      return false;
    }

    try {
      // Check if token payload is valid and not expired
      const payload = JSON.parse(atob(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        // Token expired, clear session
        authService.clearSession();
        return false;
      }

      // Validate user data
      JSON.parse(user);
      return true;
    } catch {
      authService.clearSession();
      return false;
    }
  },

  // Login with Google OAuth (redirect to backend OAuth endpoint)
  loginWithGoogle: () => {
    // In dev, proxy handles routing; in prod use full URL
    const base = window.location.hostname === 'localhost'
      ? ''
      : 'https://hackathon-dashboard-backend-md49.onrender.com';
    window.location.href = `${base}/api/auth/google`;
  },

  // Logout user
  logout: () => {
    authService.clearSession();
    window.location.href = '/login';
  },
};

export default authService;
