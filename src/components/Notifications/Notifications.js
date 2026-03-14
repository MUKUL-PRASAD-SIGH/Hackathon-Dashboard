import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Notifications.css';
import './CongratsPopup.css';
import { getApiUrl } from '../../utils/apiBase';

const API = getApiUrl();

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCongrats, setShowCongrats] = useState(false);
  const navigate = useNavigate();
  
  const showCongratsPopup = () => {
    setShowCongrats(true);
    setTimeout(() => setShowCongrats(false), 4000);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
    const response = await fetch(API + '/hackathons/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (notificationId) => {
    try {
      console.log('🎯 Accepting invitation:', notificationId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Please login first');
        return;
      }
      
    const response = await fetch(API + `/hackathons/accept-invite/${notificationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error:', errorText);
        alert(`Server error: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      console.log('✅ Accept response:', data);
      
      if (data.success) {
        fetchNotifications();
        showCongratsPopup();
      } else {
        alert(data.error?.message || 'Failed to accept invitation');
      }
    } catch (error) {
      console.error('❌ Accept invite error:', error);
      alert('Network error. Please check your connection and try again.');
    }
  };

  const handleDecline = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
    const response = await fetch(API + `/hackathons/decline-invite/${notificationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchNotifications();
        alert('Invitation declined');
      } else {
        alert(data.error?.message || 'Failed to decline invitation');
      }
    } catch (error) {
      alert('Error declining invitation');
    }
  };

  const handleApproveRequest = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
    const response = await fetch(API + `/hackathons/approve-request/${notificationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchNotifications();
        alert('✅ Join request approved!');
      } else {
        alert(data.error?.message || 'Failed to approve request');
      }
    } catch (error) {
      alert('Error approving request');
    }
  };

  const handleRejectRequest = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
    const response = await fetch(API + `/hackathons/reject-request/${notificationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        fetchNotifications();
        alert('Join request rejected');
      } else {
        alert(data.error?.message || 'Failed to reject request');
      }
    } catch (error) {
      alert('Error rejecting request');
    }
  };

  if (loading) {
    return (
      <div className="notifications-container">
        <div className="loading">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="notifications-container">
      <div className="container">
        <h2 className="section-title">🔔 Notifications</h2>
        
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map(notification => (
              <div key={notification._id} className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}>
                <div className="notification-header">
                  <h3>{notification.title}</h3>
                  <span className="notification-time">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <p className="notification-message">{notification.message}</p>
                
                {notification.type === 'hackathon_invite' && (
                  !notification.isActioned ? (
                    <div className="notification-actions">
                      <button 
                        onClick={() => handleAccept(notification._id)}
                        className="btn-accept click-effect"
                      >
                        ✅ Accept
                      </button>
                      <button 
                        onClick={() => handleDecline(notification._id)}
                        className="btn-decline click-effect"
                      >
                        ❌ Decline
                      </button>
                    </div>
                  ) : (
                    <div className="invitation-result">
                      <div className="result-success">
                        🎉 You joined the team for <strong>{notification.data?.hackathonName}</strong> as <strong>{notification.data?.role}</strong>!
                      </div>
                    </div>
                  )
                )}
                
                {notification.type === 'join_request' && !notification.isActioned && (
                  <div className="notification-actions">
                    <div className="request-details">
                      <p><strong>Hackathon:</strong> {notification.data.hackathonName}</p>
                      <p><strong>From:</strong> {notification.data.requesterName} ({notification.data.requesterEmail})</p>
                      {notification.data.requestMessage && (
                        <p><strong>Message:</strong> {notification.data.requestMessage}</p>
                      )}
                    </div>
                    <div className="action-buttons">
                      <button 
                        onClick={() => handleApproveRequest(notification._id)}
                        className="btn-accept click-effect"
                      >
                        ✅ Approve
                      </button>
                      <button 
                        onClick={() => handleRejectRequest(notification._id)}
                        className="btn-decline click-effect"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                )}
                
                {(notification.isActioned || !['hackathon_invite', 'join_request'].includes(notification.type)) && (
                  <div className="notification-status">
                    {notification.type === 'hackathon_invite' && '✅ Joined Team'}
                    {notification.type === 'join_request' && '✅ Request Handled'}
                    {notification.type === 'invitation_accepted' && '🎉 Member Joined'}
                    {notification.type === 'welcome_team' && '🚀 Welcome Message'}
                    {notification.type === 'request_accepted' && '🎉 You were accepted!'}
                    {notification.type === 'member_joined' && '👥 New team member'}
                    {!['hackathon_invite', 'join_request', 'invitation_accepted', 'welcome_team', 'request_accepted', 'member_joined'].includes(notification.type) && '✓ Processed'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Congratulations Popup */}
        {showCongrats && (
          <div className="congrats-popup">
            <div className="congrats-content">
              <div className="congrats-icon">🎉</div>
              <h3>Congratulations!</h3>
              <p>Welcome to the team! You've successfully joined the hackathon!</p>
              <div className="celebration-emojis">
                <span>🎆</span>
                <span>🚀</span>
                <span>✨</span>
                <span>🏆</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
