import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AcceptInvite.css';

const AcceptInvite = () => {
  const { notificationId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchInvitation();
  }, [notificationId]);

  const fetchInvitation = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`http://localhost:10000/api/hackathons/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        const invite = data.notifications.find(n => n._id === notificationId && n.type === 'hackathon_invite');
        if (invite) {
          setNotification(invite);
        } else {
          setMessage('Invitation not found or already processed');
        }
      }
    } catch (error) {
      setMessage('Error loading invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:10000/api/hackathons/accept-invite/${notificationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setMessage('✅ Successfully joined the hackathon team!');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setMessage(data.error?.message || 'Failed to accept invitation');
      }
    } catch (error) {
      setMessage('Error accepting invitation');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:10000/api/hackathons/decline-invite/${notificationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setMessage('Invitation declined');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        setMessage(data.error?.message || 'Failed to decline invitation');
      }
    } catch (error) {
      setMessage('Error declining invitation');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="accept-invite-container">
        <div className="loading">Loading invitation...</div>
      </div>
    );
  }

  if (message && !notification) {
    return (
      <div className="accept-invite-container">
        <div className="message-card">
          <h2>{message}</h2>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="accept-invite-container">
      <div className="invite-card">
        <div className="invite-header">
          <h1>🚀 Hackathon Team Invitation</h1>
        </div>
        
        {notification && (
          <div className="invite-details">
            <h2>{notification.data.hackathonName}</h2>
            <div className="invite-info">
              <p><strong>From:</strong> {notification.data.inviterName}</p>
              <p><strong>Role:</strong> {notification.data.role}</p>
              {notification.data.note && (
                <div className="invite-note">
                  <strong>Personal Note:</strong>
                  <p>{notification.data.note}</p>
                </div>
              )}
            </div>
            
            {message && (
              <div className="message">{message}</div>
            )}
            
            {!notification.isActioned && !message && (
              <div className="invite-actions">
                <button 
                  onClick={handleAccept}
                  disabled={processing}
                  className="btn-accept click-effect"
                >
                  {processing ? 'Processing...' : '✅ Accept Invitation'}
                </button>
                <button 
                  onClick={handleDecline}
                  disabled={processing}
                  className="btn-decline click-effect"
                >
                  {processing ? 'Processing...' : '❌ Decline'}
                </button>
              </div>
            )}
            
            {notification.isActioned && (
              <div className="already-processed">
                This invitation has already been processed.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
