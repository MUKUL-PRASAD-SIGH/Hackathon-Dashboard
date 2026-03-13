import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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

  const navigate = useNavigate();
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
        // Handle OTP login
        if (!showOtpField) {
          // Request OTP
          await authService.sendOtp(email);
          setShowOtpField(true);
          toast.success('OTP sent to your email!');
        } else {
          // Verify OTP and login
          if (!otp || otp.length !== 6) {
            toast.error('Please enter a valid 6-digit OTP');
            return;
          }

          const response = await authService.verifyOtp(email, otp);
          if (response.success) {
            localStorage.setItem('token', 'verified_' + Date.now());
            localStorage.setItem('user', JSON.stringify({ email }));
            toast.success('Login successful!');
            // Force page reload to update AuthContext
            window.location.href = '/dashboard';
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.message && error.message.toLowerCase().includes('invalid')) {
        toast((t) => (
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 10px', fontWeight: '500' }}>{error.message || 'Account not found'}</p>
            <button 
              onClick={() => { 
                toast.dismiss(t.id); 
                navigate('/register'); 
              }} 
              style={{
                padding: '6px 12px', background: '#4f46e5', color: '#fff', 
                border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px'
              }}
            >
              Go to Sign Up
            </button>
          </div>
        ), { duration: 6000, position: 'top-center' });
      } else {
        toast.error(error.message || 'Login failed. Please try again.');
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
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to your account to continue</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
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
