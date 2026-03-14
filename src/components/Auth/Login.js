import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FcGoogle } from 'react-icons/fc';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import authService from '../../services/authService';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpField, setShowOtpField] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  const [searchParams] = useSearchParams();

  // Handle OAuth error redirects
  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      const errorMessages = {
        oauth_denied: 'Google sign-in was cancelled.',
        no_code: 'Authentication failed. Please try again.',
        token_exchange_failed: 'Failed to authenticate with Google.',
        profile_fetch_failed: 'Could not fetch your Google profile.',
        server_error: 'Server error. Please try again later.',
      };
      toast.error(errorMessages[error] || 'Authentication failed.');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setErrorMessage('');
    setShowRegisterPrompt(false);

    // Basic validation
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setIsLoading(true);

    try {
      if (loginMethod === 'password') {
        // Handle password login
        if (!password) {
          toast.error('Please enter your password');
          return;
        }

        const response = await authService.login(email, password);
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        toast.success('Login successful!');
        // Force page reload to update AuthContext
        window.location.href = '/dashboard';
      } else {
        // Handle OTP login for registered users
        if (!showOtpField) {
          // Request Login OTP (checks if user is registered)
          await authService.sendLoginOtp(email);
          setShowOtpField(true);
          toast.success('OTP sent to your email!');
        } else {
          // Verify OTP and login
          if (!otp || otp.length !== 6) {
            toast.error('Please enter a valid 6-digit OTP');
            return;
          }

          const response = await authService.verifyLoginOtp(email, otp);
          if (response.success) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            toast.success('Login successful!');
            // Force page reload to update AuthContext
            window.location.href = '/dashboard';
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);

      // Check if the error is about user not being registered
      const errorMsg = error.message || 'Login failed. Please try again.';
      if (errorMsg.includes('No account found') || errorMsg.includes('register first') || errorMsg.includes('USER_NOT_FOUND')) {
        setShowRegisterPrompt(true);
        setErrorMessage('No account found with this email. You must register before logging in.');
      } else {
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGmailLogin = () => {
    try {
      setIsLoading(true);
      authService.loginWithGoogle();
      // Page will redirect, so loading stays on
    } catch (error) {
      console.error('Gmail login error:', error);
      toast.error('Gmail login failed. Please try another method.');
      setIsLoading(false);
    }
  };

  const toggleLoginMethod = () => {
    setLoginMethod(loginMethod === 'password' ? 'otp' : 'password');
    setShowOtpField(false);
    setOtp('');
    setErrorMessage('');
    setShowRegisterPrompt(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to your account to continue</p>

        {/* Registration Required Error Banner */}
        {showRegisterPrompt && (
          <div style={{
            background: 'linear-gradient(135deg, #fff3cd, #ffeeba)',
            border: '2px solid #ffc107',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
            textAlign: 'center',
            animation: 'fadeIn 0.3s ease-in'
          }}>
            <p style={{
              color: '#856404',
              fontWeight: '600',
              fontSize: '15px',
              margin: '0 0 10px 0'
            }}>
              ⚠️ {errorMessage}
            </p>
            <Link
              to="/register"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                padding: '10px 28px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.4)'
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-1px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              🚀 Register Now
            </Link>
          </div>
        )}

        {/* General Error Message */}
        {errorMessage && !showRegisterPrompt && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: '#dc2626',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            ❌ {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value.trim());
                setErrorMessage('');
                setShowRegisterPrompt(false);
              }}
              placeholder="Enter your email"
              className="form-input"
              required
              disabled={showOtpField}
            />
          </div>

          {/* Password or OTP Field */}
          {loginMethod === 'password' ? (
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="form-input"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
          ) : showOtpField ? (
            <div className="form-group">
              <label htmlFor="otp">Enter OTP</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                id="otp"
                name="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                className="form-input otp-input"
                maxLength={6}
                required
              />
              <p className="otp-note">We've sent a 6-digit code to your email</p>
            </div>
          ) : null}

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="text-button"
              onClick={toggleLoginMethod}
              disabled={showOtpField}
            >
              {loginMethod === 'password' ? 'Use OTP instead' : 'Use password instead'}
            </button>

            {loginMethod === 'password' && (
              <Link to="/forgot-password" className="text-button">
                Forgot password?
              </Link>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="auth-button primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="button-loader">Processing...</span>
            ) : showOtpField ? (
              'Verify OTP'
            ) : loginMethod === 'otp' ? (
              'Send OTP'
            ) : (
              'Sign In'
            )}
          </button>

          {/* Divider */}
          <div className="divider">
            <span>or continue with</span>
          </div>

          {/* Social Login */}
          <button
            type="button"
            className="auth-button google"
            onClick={handleGmailLogin}
            disabled={isLoading}
          >
            <FcGoogle className="icon" />
            Continue with Google
          </button>
        </form>

        {/* Footer */}
        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="text-button">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
