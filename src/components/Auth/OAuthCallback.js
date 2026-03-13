import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './Auth.css';

/**
 * OAuthCallback — handles the redirect from Google OAuth
 * URL: /oauth/callback?token=xxx&user=xxx
 */
const OAuthCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('processing');

    useEffect(() => {
        const token = searchParams.get('token');
        const userData = searchParams.get('user');
        const error = searchParams.get('error');

        if (error) {
            console.error('OAuth error:', error);
            const errorMessages = {
                oauth_denied: 'You denied access. Please try again.',
                no_code: 'No authorization code received from Google.',
                token_exchange_failed: 'Failed to authenticate with Google. Please try again.',
                profile_fetch_failed: 'Failed to fetch your Google profile. Please try again.',
                server_error: 'Server error during authentication. Please try again.',
            };
            toast.error(errorMessages[error] || 'Authentication failed. Please try again.');
            setStatus('error');
            setTimeout(() => navigate('/login'), 2000);
            return;
        }

        if (token && userData) {
            try {
                const user = JSON.parse(decodeURIComponent(userData));

                // Store session (same format as existing auth)
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));

                console.log('✅ Google OAuth successful:', user.email);
                toast.success(`Welcome, ${user.name}! 🎉`);
                setStatus('success');

                // Redirect to dashboard (use window.location for full reload to update AuthContext)
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 500);
            } catch (err) {
                console.error('Failed to parse OAuth data:', err);
                toast.error('Authentication failed. Please try again.');
                setStatus('error');
                setTimeout(() => navigate('/login'), 2000);
            }
        } else {
            toast.error('Invalid OAuth response. Please try again.');
            setStatus('error');
            setTimeout(() => navigate('/login'), 2000);
        }
    }, [searchParams, navigate]);

    return (
        <div className="auth-container">
            <div className="auth-card" style={{ textAlign: 'center' }}>
                {status === 'processing' && (
                    <>
                        <div className="oauth-spinner" />
                        <h2 style={{ marginTop: '1.5rem' }}>Signing you in...</h2>
                        <p className="auth-subtitle">Completing Google authentication</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                        <h2>Welcome!</h2>
                        <p className="auth-subtitle">Redirecting to your dashboard...</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                        <h2>Authentication Failed</h2>
                        <p className="auth-subtitle">Redirecting to login...</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default OAuthCallback;
