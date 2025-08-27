import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import OtpVerification from './OtpVerification';
import { sendOtp, registerUser, resendOtp } from '../../utils/apiUtils';
import { DebugLogger, runNetworkDiagnostics, setupGlobalErrorHandling } from '../../utils/debugUtils';
import './Auth.css';

const componentLogger = new DebugLogger('RegisterWithOtp');

const RegisterWithOtp = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  // Initialize debugging
  useEffect(() => {
    componentLogger.info('Component mounted', { formData });
    setupGlobalErrorHandling();
    
    // Run network diagnostics on mount
    runNetworkDiagnostics().then(diagnostics => {
      componentLogger.info('Network diagnostics completed', { diagnostics });
    }).catch(error => {
      componentLogger.error('Network diagnostics failed', { error });
    });
    
    return () => {
      componentLogger.info('Component unmounting');
    };
  }, []);

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    componentLogger.info('Form submission started', {
      email: formData.email,
      hasName: !!formData.name,
      hasPassword: !!formData.password,
      isLoading
    });
    
    if (!validateForm()) {
      componentLogger.warn('Form validation failed', { errors });
      return;
    }
    
    if (isLoading) {
      componentLogger.warn('Submit blocked - already loading');
      return;
    }

    setIsLoading(true);
    
    try {
      componentLogger.info('Starting OTP send process', {
        email: formData.email,
        timestamp: new Date().toISOString()
      });
      
      // Run quick network check before API call
      const diagnostics = await runNetworkDiagnostics();
      componentLogger.debug('Pre-request diagnostics', { diagnostics });
      
      if (!diagnostics.tests.backendHealth?.success) {
        throw new Error(`Backend server is not responding. Details: ${JSON.stringify(diagnostics.tests.backendHealth)}`);
      }
      
      const data = await sendOtp(formData.email);
      
      componentLogger.info('OTP sent successfully', {
        email: formData.email,
        response: data,
        expiresIn: data.expiresIn
      });
      
      setIsOtpSent(true);
      toast.success('OTP sent to your email!');
      
    } catch (error) {
      componentLogger.error('OTP sending failed', {
        email: formData.email,
        error,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack,
        errorCode: error.code,
        errorStatus: error.status
      });
      
      // Show detailed error to user
      let userMessage = error.message || 'Failed to send OTP';
      
      if (error.message.includes('Backend server not responding')) {
        userMessage = 'Cannot connect to server. Please make sure the backend is running on port 5000.';
      } else if (error.message.includes('HTML instead of JSON')) {
        userMessage = 'Server configuration error. The backend may not be properly set up.';
      }
      
      toast.error(userMessage);
      
      // Log detailed error for debugging
      console.group('🚨 DETAILED ERROR INFORMATION');
      console.error('Error Object:', error);
      console.error('Form Data:', formData);
      console.error('Component State:', { isLoading, isOtpSent, errors });
      console.error('Debug Logs:', componentLogger.constructor.getAllLogs());
      console.groupEnd();
      
    } finally {
      setIsLoading(false);
      componentLogger.debug('OTP send process completed', { isLoading: false });
    }
  };

  // Clean OTP verification success handler with debugging
  const handleOtpVerificationSuccess = useCallback(async (email, otp) => {
    componentLogger.info('OTP verification success callback triggered', {
      email,
      otp: otp ? '***' + otp.slice(-2) : 'undefined',
      isRegistering
    });
    
    setIsRegistering(current => {
      if (current) {
        componentLogger.warn('Registration already in progress, ignoring duplicate call');
        return current;
      }
      componentLogger.info('Starting registration process');
      return true;
    });

    try {
      componentLogger.info('Completing user registration', {
        name: formData.name,
        email: formData.email,
        hasPassword: !!formData.password
      });
      
      const registerData = await registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password
      });
      
      componentLogger.info('Registration API call successful', {
        response: registerData,
        hasUser: !!registerData.user,
        hasToken: !!registerData.token
      });
      
      const token = registerData.token || btoa(`${formData.email}:${Date.now()}`);
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(registerData.user));
      
      componentLogger.info('User session saved, navigating to dashboard');
      toast.success('Registration completed successfully!');
      navigate('/dashboard');
      
    } catch (error) {
      componentLogger.error('Registration completion failed', {
        error,
        formData: { ...formData, password: '***' }
      });
      
      toast.error(error.message || 'Failed to complete registration');
      setIsOtpSent(false);
      setIsRegistering(false);
    } finally {
      setIsRegistering(false);
    }
  }, [formData, navigate, isRegistering]);

  // Handle resend OTP with debugging
  const handleResendOtp = useCallback(async () => {
    componentLogger.info('Resending OTP', { email: formData.email });
    
    try {
      await resendOtp(formData.email);
      componentLogger.info('OTP resend successful');
    } catch (error) {
      componentLogger.error('OTP resend failed', { error, email: formData.email });
      throw error;
    }
  }, [formData.email]);

  if (isOtpSent) {
    return (
      <OtpVerification 
        email={formData.email} 
        onVerificationSuccess={handleOtpVerificationSuccess}
        onResendOtp={handleResendOtp}
        maxAttempts={5}
        resendCooldown={60}
      />
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Create Account</h2>
          <p className="auth-subtitle">Enter your details to get started</p>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              className={`form-input ${errors.name ? 'error' : ''}`}
              disabled={isLoading}
              required
            />
            {errors.name && <div className="field-error">{errors.name}</div>}
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className={`form-input ${errors.email ? 'error' : ''}`}
              disabled={isLoading}
              required
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
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
              className={`form-input ${errors.password ? 'error' : ''}`}
              disabled={isLoading}
              required
            />
            {errors.password && <div className="field-error">{errors.password}</div>}
            <div className="password-hint">
              Must contain uppercase, lowercase, and number (min 6 chars)
            </div>
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
              className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
              disabled={isLoading}
              required
            />
            {errors.confirmPassword && <div className="field-error">{errors.confirmPassword}</div>}
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? 'Sending OTP...' : 'Send OTP'}
          </button>
        </form>
        
        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <button 
              onClick={() => navigate('/login')} 
              className="text-button"
              disabled={isLoading}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterWithOtp;
