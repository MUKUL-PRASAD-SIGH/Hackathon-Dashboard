import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import OtpInput from './OtpInput';
import { useCountdown } from './CountdownTimer';
import { verifyOtp as verifyOtpAPI, resendOtp as resendOtpAPI } from '../../utils/apiUtils';
import './Auth.css';

const OtpVerification = ({ 
  email, 
  onVerificationSuccess, 
  onResendOtp,
  maxAttempts = 5,
  resendCooldown = 60 
}) => {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const verificationRef = useRef(null);

  // Countdown timer for resend functionality
  const resendTimer = useCountdown(resendCooldown, {
    autoStart: false,
    onComplete: () => console.log('Resend available')
  });

  // Handle OTP input change
  const handleOtpChange = useCallback((value) => {
    setOtp(value);
    setError(''); // Clear error when user types
  }, []);

  // Handle OTP completion (all digits entered)
  const handleOtpComplete = useCallback(async (otpValue) => {
    if (isVerifying) return; // Prevent duplicate calls
    
    await verifyOtp(otpValue);
  }, [isVerifying]);

  // Verify OTP with duplicate prevention
  const verifyOtp = async (otpValue = otp) => {
    // Prevent concurrent verification attempts
    if (isVerifying) {
      console.log('🔧 Verification already in progress, ignoring duplicate call');
      return;
    }

    if (!otpValue || otpValue.length !== 6) {
      setError('Please enter a complete 6-digit OTP');
      return;
    }

    if (attempts >= maxAttempts) {
      setError('Maximum verification attempts exceeded. Please request a new OTP.');
      return;
    }

    setIsVerifying(true);
    setError('');
    verificationRef.current = Date.now(); // Track this verification attempt

    try {
      console.log('🔧 Starting OTP verification for:', email);
      
      const data = await verifyOtpAPI(email, otpValue);
      
      console.log('✅ OTP verification successful');
      toast.success('OTP verified successfully!');
      
      if (onVerificationSuccess) {
        onVerificationSuccess(email, otpValue);
      } else {
        navigate('/login');
      }
    } catch (error) {
      setAttempts(prev => prev + 1);
      
      // Handle specific error types
      if (error.message.includes('Invalid OTP')) {
        const remainingAttempts = maxAttempts - attempts - 1;
        setError(`Invalid OTP. ${remainingAttempts} attempts remaining.`);
      } else if (error.message.includes('expired')) {
        setError('OTP has expired. Please request a new one.');
      } else if (error.message.includes('used')) {
        setError('OTP has already been used. Please request a new one.');
      } else if (error.message.includes('Concurrent')) {
        setError('Please wait for the current verification to complete.');
      } else {
        setError(error.message || 'Verification failed. Please try again.');
      }
      
      // Clear OTP on error
      setOtp('');
      
      toast.error(error.message || 'Failed to verify OTP');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle manual verify button click
  const handleVerifyClick = async (e) => {
    e.preventDefault();
    await verifyOtp();
  };

  // Handle resend OTP with rate limiting
  const handleResendOtp = async () => {
    if (isResending || !resendTimer.isComplete) {
      return;
    }

    if (!email) {
      toast.error('Email is required');
      return;
    }

    setIsResending(true);
    setError('');

    try {
      console.log('🔄 Requesting OTP resend for:', email);
      
      let response;
      if (onResendOtp) {
        // Use custom resend handler
        await onResendOtp();
      } else {
        // Use default resend endpoint
        await resendOtpAPI(email);
      }

      toast.success('New OTP sent successfully!');
      setOtp(''); // Clear current OTP
      setAttempts(0); // Reset attempts
      resendTimer.reset(resendCooldown);
      resendTimer.start();
    } catch (error) {
      if (error.message.includes('Rate limit')) {
        setError('Too many resend requests. Please wait before trying again.');
      } else {
        setError(error.message || 'Failed to resend OTP');
      }
      
      toast.error(error.message || 'Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Verify Your Email</h2>
          <p className="auth-subtitle">
            We've sent a verification code to <strong>{email}</strong>
          </p>
        </div>
        
        <form onSubmit={handleVerifyClick} className="auth-form">
          <div className="form-group">
            <label htmlFor="otp-input">Enter 6-digit OTP</label>
            <OtpInput
              length={6}
              value={otp}
              onChange={handleOtpChange}
              onComplete={handleOtpComplete}
              disabled={isVerifying}
              error={!!error}
              autoFocus={true}
            />
            {error && <div className="error-message">{error}</div>}
          </div>
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={isVerifying || otp.length !== 6}
          >
            {isVerifying ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>
        
        <div className="auth-footer">
          <div className="resend-section">
            <p>Didn't receive the code?</p>
            <button 
              onClick={handleResendOtp} 
              className="text-button"
              disabled={isResending || !resendTimer.isComplete}
            >
              {isResending ? 'Sending...' : 
               resendTimer.isComplete ? 'Resend OTP' : 
               `Resend in ${resendTimer.formattedTime}`}
            </button>
          </div>
          
          {attempts > 0 && (
            <div className="attempts-info">
              <small>Attempts: {attempts}/{maxAttempts}</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;
