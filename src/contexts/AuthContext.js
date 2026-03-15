// AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { toast } from 'react-hot-toast';
import { getApiUrl } from '../utils/apiBase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  const refreshUserProfile = async (authToken) => {
    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) return;
      const data = await response.json();
      if (data?.success && data.user) {
        authService.setUserSession(authToken, data.user);
        setUser(data.user);
      }
    } catch (error) {
      console.error('Profile refresh failed:', error);
    }
  };

  // Check if user is logged in on initial load
  useEffect(() => {
    const userData = localStorage.getItem('user');
    const userToken = localStorage.getItem('token');
    if (userData && userToken) {
      setUser(JSON.parse(userData));
      setToken(userToken);
      refreshUserProfile(userToken);
    }
    setLoading(false);
  }, []);

  // Send OTP to email
  const sendOtp = async (email) => {
    try {
      await authService.sendOtp(email);
      setOtpSent(true);
      return true;
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    }
  };

  // Verify OTP
  const verifyOtp = async (email, otp) => {
    try {
      await authService.verifyOtp(email, otp);
      return true;
    } catch (error) {
      console.error('Verify OTP error:', error);
      throw error;
    }
  };

  // Login with email/password
  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      if (response.user && response.token) {
        setUser(response.user);
        setToken(response.token);
        refreshUserProfile(response.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Register new user
  const register = async (name, email, password) => {
    try {
      const response = await authService.registerUser(email, password, name);
      if (response.user && response.token) {
        setUser(response.user);
        setToken(response.token);
        refreshUserProfile(response.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Login with Google OAuth (redirects to Google consent screen)
  const loginWithGmail = () => {
    authService.loginWithGoogle();
    // This causes a full page redirect, so no return value needed
    return true;
  };

  // Logout
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    toast.success('Logged out successfully!');
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        otpSent,
        sendOtp,
        verifyOtp,
        login,
        register,
        loginWithGmail,
        logout,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
