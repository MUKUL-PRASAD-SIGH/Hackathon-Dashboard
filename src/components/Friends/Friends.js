import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../utils/apiBase';
import './Friends.css';

const API = getApiUrl();

const Friends = () => {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ sent: [], received: [] });
  const [friendEmail, setFriendEmail] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(API + '/users/friends', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setFriends(data.friends || []);
        setRequests({ sent: data.sentRequests || [], received: data.receivedRequests || [] });
      } else {
        setError(data.error?.message || 'Failed to load friends');
      }
    } catch (err) {
      setError('Network error while loading friends');
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (e) => {
    e.preventDefault();
    setActionMessage('');
    const email = friendEmail.trim().toLowerCase();
    if (!email) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API + '/users/friend-request', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (data.success) {
        setFriendEmail('');
        setActionMessage('✅ Friend request sent');
        fetchFriends();
      } else {
        setActionMessage(`❌ ${data.error?.message || 'Failed to send request'}`);
      }
    } catch (err) {
      setActionMessage('❌ Failed to send request');
    }
  };

  const handleRequestAction = async (email, action) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API + `/users/friend-request/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (data.success) {
        setActionMessage(`✅ Request ${action}ed`);
        fetchFriends();
      } else {
        setActionMessage(`❌ ${data.error?.message || 'Action failed'}`);
      }
    } catch {
      setActionMessage('❌ Action failed');
    }
  };

  if (loading) {
    return (
      <div className="friends-page">
        <div className="friends-loading">Loading friends...</div>
      </div>
    );
  }

  return (
    <div className="friends-page">
      <div className="friends-header">
        <h2>👥 Friends</h2>
        <p>People you’re connected with and the hackathons you share.</p>
      </div>

      <div className="friends-actions">
        <form onSubmit={sendFriendRequest} className="friends-add-form">
          <input
            type="email"
            placeholder="Add friend by email"
            value={friendEmail}
            onChange={(e) => setFriendEmail(e.target.value)}
            className="friends-add-input"
            required
          />
          <button type="submit" className="friends-add-btn">
            ➕ Send Request
          </button>
        </form>
        {actionMessage && <div className="friends-action-message">{actionMessage}</div>}
      </div>

      {requests.received.length > 0 && (
        <div className="friends-requests">
          <h3>Friend Requests</h3>
          {requests.received.map((request) => {
            const requestUser = request.user || { email: request.email };
            return (
              <div key={requestUser.email} className="friends-request-card">
                <span>{requestUser.name || 'User'} ({requestUser.email})</span>
                <div className="friends-request-actions">
                  <button onClick={() => handleRequestAction(requestUser.email, 'accept')} className="friends-accept">
                    ✅ Accept
                  </button>
                  <button onClick={() => handleRequestAction(requestUser.email, 'reject')} className="friends-reject">
                    ❌ Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="friends-error">
          <p>❌ {error}</p>
        </div>
      )}

      {friends.length === 0 ? (
        <div className="friends-empty">
          <p>No friends yet. Add friends from this tab.</p>
        </div>
      ) : (
        <div className="friends-grid">
          {friends.map((friend) => {
            const friendUser = friend.user || { email: friend.email };
            return (
              <div key={friendUser.email} className="friend-card">
                <div className="friend-avatar">
                  {friendUser.profile?.avatar ? (
                    <img src={friendUser.profile.avatar} alt={friendUser.name || friendUser.email} />
                  ) : (
                    (friendUser.name || friendUser.email || '?').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="friend-info">
                  <h4>{friendUser.name || 'Friend'}</h4>
                  <p>{friendUser.email}</p>
                  <div className="friend-shared">
                    <span className="friend-shared-label">Shared Hackathons</span>
                    {friend.sharedHackathons?.length > 0 ? (
                      <div className="friend-shared-list">
                        {friend.sharedHackathons.map((shared) => (
                          <span key={`${shared.name}-${shared.date}`} className="friend-shared-pill">
                            {shared.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="friend-shared-empty">No shared hackathons yet</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Friends;
