import React, { useState, useEffect } from 'react';
import GoogleCalendarService from '../../services/googleCalendarService';
import './GoogleCalendarSync.css';

const GoogleCalendarSync = ({ hackathons, onSyncComplete }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [selectedHackathons, setSelectedHackathons] = useState([]);
  const [calendarService] = useState(new GoogleCalendarService());

  // Initialize Google Calendar service
  useEffect(() => {
    initializeGoogleCalendar();
  }, []);

  /**
   * Detects specific error patterns and returns a user-friendly message
   */
  const getErrorMessage = (error) => {
    const errorStr = String(error).toLowerCase();
    const errorMessage = error.message || error.toString();
    
    // Network-related errors
    if (errorStr.includes('network error') || errorStr.includes('failed to fetch')) {
      return {
        title: 'Network Error',
        message: 'Unable to connect to Google services',
        details: 'Please check your internet connection and try again.',
        type: 'network',
        showRetry: true
      };
    }
    
    // Authentication errors
    if (errorStr.includes('access_denied') || errorStr.includes('user_cancelled')) {
      return {
        title: 'Access Denied',
        message: 'You need to grant calendar access',
        details: 'Please grant the required permissions to continue.',
        type: 'auth',
        showRetry: true
      };
    }
    
    // Configuration errors
    if (errorStr.includes('api key') || !process.env.REACT_APP_GOOGLE_API_KEY) {
      return {
        title: 'Configuration Error',
        message: 'Google API key is missing or invalid',
        details: 'Please check your .env file for REACT_APP_GOOGLE_API_KEY',
        type: 'config',
        showRetry: false
      };
    }
    
    if (errorStr.includes('client_id') || !process.env.REACT_APP_GOOGLE_CLIENT_ID) {
      return {
        title: 'Configuration Error',
        message: 'Google Client ID is missing or invalid',
        details: 'Please check your .env file for REACT_APP_GOOGLE_CLIENT_ID',
        type: 'config',
        showRetry: false
      };
    }
    
    // Rate limiting
    if (errorStr.includes('quota') || errorStr.includes('rate limit')) {
      return {
        title: 'Service Limit Reached',
        message: 'Too many requests to Google services',
        details: 'Please wait a few minutes and try again.',
        type: 'rate_limit',
        showRetry: true
      };
    }
    
    // Default error
    return {
      title: 'Error',
      message: 'Failed to initialize Google Calendar service',
      details: errorMessage,
      type: 'unknown',
      showRetry: true
    };
  };

  // Initialize Google Calendar service with enhanced error handling
  const initializeGoogleCalendar = async () => {
    try {
      setIsLoading(true);
      setSyncStatus({
        type: 'info',
        title: 'Initializing Google Calendar',
        message: 'Setting up the calendar service...',
        details: 'Please wait while we connect to Google Calendar.',
        showRetry: false
      });
      
      // Check for required environment variables first
      if (!process.env.REACT_APP_GOOGLE_API_KEY || !process.env.REACT_APP_GOOGLE_CLIENT_ID) {
        throw new Error('Missing required Google API configuration');
      }
      
      // Initialize the service
      await calendarService.initialize();
      
      // If we get here, initialization was successful
      setIsInitialized(true);
      const signedIn = calendarService.isSignedIn();
      setIsSignedIn(signedIn);
      
      if (signedIn) {
        setSyncStatus({
          type: 'success',
          title: 'Connected',
          message: 'Successfully connected to Google Calendar',
          details: 'You can now sync your hackathons to your calendar.',
          showRetry: false
        });
      } else {
        setSyncStatus({
          type: 'info',
          title: 'Ready',
          message: 'Google Calendar service is ready',
          details: 'Please sign in to sync your hackathons.',
          showRetry: false
        });
      }
    } catch (error) {
      console.error('Google Calendar initialization error:', error);
      const errorInfo = getErrorMessage(error);
      
      setSyncStatus({
        type: 'error',
        title: errorInfo.title,
        message: errorInfo.message,
        details: errorInfo.details,
        showRetry: errorInfo.showRetry,
        errorType: errorInfo.type
      });
      
      setIsInitialized(false);
      setIsSignedIn(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google sign in with enhanced error handling
  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setSyncStatus({
        type: 'info',
        title: 'Signing In',
        message: 'Connecting to your Google account...',
        details: 'Please wait while we connect to your Google account.',
        showRetry: false
      });
      
      await calendarService.signIn();
      setIsSignedIn(true);
      
      setSyncStatus({
        type: 'success',
        title: 'Signed In',
        message: 'Successfully connected to your Google account',
        details: 'You can now sync your hackathons to Google Calendar.',
        showRetry: false
      });
    } catch (error) {
      console.error('Google Sign-In error:', error);
      const errorInfo = getErrorMessage(error);
      
      // Special handling for popup blocked errors
      if (error.toString().includes('popup_closed_by_user')) {
        setSyncStatus({
          type: 'warning',
          title: 'Sign In Cancelled',
          message: 'The sign-in window was closed',
          details: 'Please try signing in again and complete the process.',
          showRetry: true
        });
      } else {
        setSyncStatus({
          type: 'error',
          title: errorInfo.title || 'Sign In Failed',
          message: errorInfo.message || 'Failed to sign in to Google',
          details: errorInfo.details || 'An unknown error occurred during sign-in.',
          showRetry: errorInfo.showRetry !== false,
          errorType: errorInfo.type
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google sign out
  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await calendarService.signOut();
      setIsSignedIn(false);
      setSyncStatus({
        type: 'info',
        message: 'Signed out from Google Calendar',
        details: 'You can sign in again to sync hackathons.'
      });
    } catch (error) {
      console.error('Sign out failed:', error);
      setSyncStatus({
        type: 'error',
        message: 'Failed to sign out',
        details: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle hackathon selection
  const handleHackathonSelection = (hackathonId, isSelected) => {
    if (isSelected) {
      setSelectedHackathons(prev => [...prev, hackathonId]);
    } else {
      setSelectedHackathons(prev => prev.filter(id => id !== hackathonId));
    }
  };

  // Select all hackathons
  const selectAllHackathons = () => {
    const allIds = hackathons.map(h => h.id);
    setSelectedHackathons(allIds);
  };

  // Deselect all hackathons
  const deselectAllHackathons = () => {
    setSelectedHackathons([]);
  };

  // Sync selected hackathons to Google Calendar
  const syncToGoogleCalendar = async () => {
    if (selectedHackathons.length === 0) {
      setSyncStatus({
        type: 'warning',
        message: 'No hackathons selected',
        details: 'Please select at least one hackathon to sync.'
      });
      return;
    }

    try {
      setIsLoading(true);
      const selectedHackathonsData = hackathons.filter(h => selectedHackathons.includes(h.id));
      
      setSyncStatus({
        type: 'info',
        message: 'Syncing hackathons to Google Calendar...',
        details: `Syncing ${selectedHackathonsData.length} hackathon(s)...`
      });

      const results = await calendarService.syncAllHackathons(selectedHackathonsData);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      if (failed.length === 0) {
        setSyncStatus({
          type: 'success',
          message: 'All hackathons synced successfully!',
          details: `Successfully synced ${successful.length} hackathon(s) to Google Calendar.`
        });
      } else if (successful.length === 0) {
        setSyncStatus({
          type: 'error',
          message: 'Failed to sync any hackathons',
          details: `All ${failed.length} hackathon(s) failed to sync. Check console for details.`
        });
      } else {
        setSyncStatus({
          type: 'warning',
          message: 'Partial sync completed',
          details: `Successfully synced ${successful.length} hackathon(s), ${failed.length} failed.`
        });
      }
      
      // Clear selection after successful sync
      setSelectedHackathons([]);
      
      // Notify parent component
      if (onSyncComplete) {
        onSyncComplete(results);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus({
        type: 'error',
        message: 'Sync failed',
        details: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get status icon and color
  const getStatusDisplay = () => {
    if (!isInitialized) {
      return { icon: '❌', color: '#dc3545', text: 'Not Initialized' };
    }
    if (isSignedIn) {
      return { icon: '✅', color: '#28a745', text: 'Signed In' };
    }
    return { icon: '⏳', color: '#ffc107', text: 'Ready to Sign In' };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="google-calendar-sync">
      <div className="sync-header">
        <h3>📅 Google Calendar Integration</h3>
        <p>Sync your hackathons to Google Calendar for better organization</p>
        <div style={{ 
          background: '#e8f5e8', 
          padding: '12px', 
          borderRadius: '8px', 
          marginTop: '16px',
          border: '1px solid #4caf50'
        }}>
          <p style={{ margin: 0, color: '#2e7d32', fontSize: '0.9rem' }}>
            🚀 <strong>Version 1.1.0 Feature</strong> - Real Google Calendar API integration! 
            Make sure you have configured your Google API credentials in the .env file.
          </p>
        </div>
      </div>

      {/* Enhanced Status Display */}
      <div className="sync-status">
        <div className="status-card" style={{ 
          borderLeft: `4px solid ${statusDisplay.color}`,
          background: `${statusDisplay.color}10`,
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <span className="status-icon" style={{ 
                fontSize: '24px',
                marginRight: '12px',
                color: statusDisplay.color
              }}>
                {statusDisplay.icon}
              </span>
              <div>
                <h5 className="mb-0" style={{ color: statusDisplay.color }}>
                  {statusDisplay.text}
                </h5>
                <p className="mb-0 text-muted small">
                  {isInitialized 
                    ? isSignedIn 
                      ? 'Connected to Google Calendar' 
                      : 'Ready to connect'
                    : 'Initializing...'}
                </p>
              </div>
            </div>
            
            {isInitialized && (
              <div className="auth-buttons">
                {!isSignedIn ? (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSignIn}
                    disabled={isLoading}
                    style={{
                      minWidth: '120px',
                      backgroundColor: statusDisplay.color,
                      borderColor: statusDisplay.color
                    }}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Signing In...
                      </>
                    ) : (
                      'Sign In to Google'
                    )}
                  </button>
                ) : (
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleSignOut}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing Out...' : 'Sign Out'}
                  </button>
                )}
              </div>
            )}
          </div>
          
          {!isInitialized && !isLoading && (
            <div className="mt-2">
              <div className="progress" style={{ height: '4px' }}>
                <div 
                  className="progress-bar progress-bar-striped progress-bar-animated" 
                  role="progressbar" 
                  style={{ width: '100%' }}
                ></div>
              </div>
              <p className="small text-muted mt-2 mb-0">
                Setting up Google Calendar integration...
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Sync Status Messages */}
      {syncStatus && (
        <div className={`sync-message ${syncStatus.type} ${syncStatus.errorType || ''}`}>
          <div className="message-header">
            <span className="message-icon">
              {syncStatus.type === 'success' && '✅'}
              {syncStatus.type === 'error' && '❌'}
              {syncStatus.type === 'warning' && '⚠️'}
              {syncStatus.type === 'info' && 'ℹ️'}
            </span>
            <div className="message-content">
              {syncStatus.title && (
                <h4 className="message-title">{syncStatus.title}</h4>
              )}
              <p className="message-text">
                {syncStatus.message}
                {syncStatus.details && (
                  <span className="message-details"> {syncStatus.details}</span>
                )}
              </p>
              
              {/* Show retry button if applicable */}
              {syncStatus.showRetry && (
                <button 
                  className="btn btn-sm btn-outline-primary mt-2"
                  onClick={syncStatus.errorType === 'auth' ? handleSignIn : initializeGoogleCalendar}
                  disabled={isLoading}
                >
                  {isLoading ? 'Processing...' : 'Try Again'}
                </button>
              )}
              
              {/* Show additional help for common issues */}
              {syncStatus.type === 'error' && (
                <div className="error-help mt-2">
                  <p className="help-title">Need help?</p>
                  {syncStatus.errorType === 'network' && (
                    <ul className="help-list">
                      <li>• Check your internet connection</li>
                      <li>• Try disabling VPN if you're using one</li>
                      <li>• Verify that https://accounts.google.com is accessible</li>
                    </ul>
                  )}
                  {syncStatus.errorType === 'config' && (
                    <ul className="help-list">
                      <li>• Verify your .env file has all required Google API credentials</li>
                      <li>• Make sure to restart your development server after changing .env</li>
                      <li>• Check that your Google Cloud project has the necessary APIs enabled</li>
                    </ul>
                  )}
                  {syncStatus.errorType === 'auth' && (
                    <ul className="help-list">
                      <li>• Make sure to grant all requested permissions</li>
                      <li>• Try clearing your browser cache and cookies</li>
                      <li>• Check if you're signed in to the correct Google account</li>
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hackathon Selection */}
      {isSignedIn && hackathons.length > 0 && (
        <div className="hackathon-selection">
          <div className="selection-header">
            <h4>Select Hackathons to Sync</h4>
            <div className="selection-actions">
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={selectAllHackathons}
              >
                Select All
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={deselectAllHackathons}
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="hackathon-list">
            {hackathons.map(hackathon => (
              <div key={hackathon.id} className="hackathon-item">
                <label className="hackathon-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedHackathons.includes(hackathon.id)}
                    onChange={(e) => handleHackathonSelection(hackathon.id, e.target.checked)}
                  />
                  <span className="checkbox-custom"></span>
                </label>
                <div className="hackathon-info">
                  <span className="hackathon-name">{hackathon.name}</span>
                  <span className="hackathon-date">
                    {new Date(hackathon.date).toLocaleDateString()}
                  </span>
                  <span className={`hackathon-status status-${hackathon.status.toLowerCase().replace(' ', '-').replace("'", '')}`}>
                    {hackathon.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="sync-actions">
            <button
              className="btn btn-success"
              onClick={syncToGoogleCalendar}
              disabled={isLoading || selectedHackathons.length === 0}
            >
              {isLoading ? 'Syncing...' : `Sync ${selectedHackathons.length} Hackathon(s)`}
            </button>
          </div>
        </div>
      )}

      {/* No Hackathons Message */}
      {isSignedIn && hackathons.length === 0 && (
        <div className="no-hackathons">
          <p>No hackathons available to sync. Add some hackathons first!</p>
        </div>
      )}

      {/* Not Initialized Message */}
      {!isInitialized && (
        <div className="not-initialized">
          <p>Google Calendar service is initializing...</p>
          <button
            className="btn btn-primary"
            onClick={initializeGoogleCalendar}
            disabled={isLoading}
          >
            {isLoading ? 'Initializing...' : 'Retry Initialization'}
          </button>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarSync;
