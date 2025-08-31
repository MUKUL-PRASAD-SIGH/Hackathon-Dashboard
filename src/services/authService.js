// Auth service for handling OTP and user authentication
import { toast } from 'react-hot-toast';

// API URL - Support both local and production
const getApiUrl = () => {
  const isLocalhost = window.location.hostname === 'localhost';
  const apiUrl = isLocalhost 
    ? 'http://localhost:10000/api'
    : 'https://hackathon-dashboard-backend-md49.onrender.com/api';
  console.log('🔧 API URL:', apiUrl);
  return apiUrl;
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
        throw new Error(data.message || 'Login failed');
      }
      
      // Save user session
      if (data.token && data.user) {
        authService.setUserSession(data.token, data.user);
      }
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
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

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Logout user
  logout: () => {
    authService.clearSession();
    window.location.href = '/login';
  },
};

export default authService;
