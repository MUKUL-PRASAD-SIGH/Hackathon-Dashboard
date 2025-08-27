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
      if (response.user) {
        setUser(response.user);
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
      if (response.user) {
        setUser(response.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Login with Gmail (placeholder)
  const loginWithGmail = async () => {
    toast.error('Gmail login not implemented yet');
    return false;
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
