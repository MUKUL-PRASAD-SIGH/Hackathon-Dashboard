// AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { toast } from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  // Check if user is logged in on initial load
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  // Send OTP to email
  const sendOtp = async (email) => {
    try {
      await authService.sendOTP(email);
      setOtpSent(true);
      toast.success('OTP sent to your email!');
      return true;
    } catch (error) {
      toast.error('Failed to send OTP');
      return false;
    }
  };

  // Verify OTP and login
  const verifyOtp = async (email, otp) => {
    try {
      const isValid = await authService.verifyOTP(email, otp);
      if (isValid) {
        // In a real app, you would get user data from your backend
        const user = { email, name: email.split('@')[0] };
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        toast.success('Logged in successfully!');
        return true;
      }
      return false;
    } catch (error) {
      toast.error('Invalid OTP');
      return false;
    }
  };

  // Login with email/password
  const login = async (email, password) => {
    try {
      const user = await authService.loginUser(email, password);
      if (user) {
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        toast.success('Logged in successfully!');
        return true;
      }
      return false;
    } catch (error) {
      toast.error('Login failed');
      return false;
    }
  };

  // Register new user
  const register = async (name, email, password) => {
    try {
      const user = await authService.registerUser(email, password, name);
      if (user) {
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        toast.success('Registration successful!');
        return true;
      }
      return false;
    } catch (error) {
      toast.error('Registration failed');
      return false;
    }
  };

  // Login with Gmail
  const loginWithGmail = async () => {
    try {
      // In a real app, this would use Google's OAuth flow
      const user = await authService.gmailLogin('gmail-token');
      if (user) {
        setUser(user);
        localStorage.setItem('user', JSON.stringify(user));
        toast.success('Logged in with Gmail!');
        return true;
      }
      return false;
    } catch (error) {
      toast.error('Gmail login failed');
      return false;
    }
  };

  // Logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    toast.success('Logged out successfully!');
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
