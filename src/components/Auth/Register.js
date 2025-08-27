import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import { AuthLayout } from './AuthLayout';
import './AuthForms.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [otp, setOtp] = useState('');
  const [showOtpField, setShowOtpField] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(1);
  
  const { register, sendOtp, verifyOtp, loginWithGmail } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    try {
      await sendOtp(formData.email);
      setShowOtpField(true);
      setRegistrationStep(2);
      toast.success('OTP sent to your email!');
    } catch (error) {
      toast.error('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    
    if (!otp) {
      toast.error('Please enter the OTP');
      return;
    }
    
    setIsLoading(true);
    try {
      const success = await verifyOtp(formData.email, otp);
      if (success) {
        // In a real app, you would register the user with the backend
        const user = await register(formData.name, formData.email, formData.password);
        if (user) {
          toast.success('Registration successful!');
          navigate('/dashboard');
        }
      }
    } catch (error) {
      toast.error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGmailRegister = async () => {
    try {
      setIsLoading(true);
      const success = await loginWithGmail();
      if (success) {
        navigate('/dashboard');
      }
    } catch (error) {
      toast.error('Gmail registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Create an Account"
      subtitle="Join us and start your hackathon journey"
    >
      <form onSubmit={registrationStep === 1 ? handleSendOtp : handleVerifyAndRegister} className="auth-form">
        {registrationStep === 1 ? (
          <>
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
              />
            </div>
          </>
        ) : (
          <div className="otp-verification">
            <div className="form-group">
              <label htmlFor="otp">Enter OTP</label>
              <p className="otp-instructions">We've sent a 6-digit verification code to {formData.email}</p>
              <input
                type="text"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                required
                className="otp-input"
              />
              <button 
                type="button" 
                className="resend-otp"
                onClick={handleSendOtp}
                disabled={isLoading}
              >
                Resend OTP
              </button>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : registrationStep === 1 ? 'Send OTP' : 'Create Account'}
          </button>
        </div>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          className="btn btn-google"
          onClick={handleGmailRegister}
          disabled={isLoading}
        >
          <FcGoogle className="google-icon" />
          {isLoading ? 'Signing up...' : 'Continue with Google'}
        </button>

        <div className="auth-footer-links">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Register;
