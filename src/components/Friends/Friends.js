import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../utils/apiBase';
import './Friends.css';

const API = getApiUrl();

const Friends = () => {
  const [friends, setFriends] = useState([]);
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
      } else {
        setError(data.error?.message || 'Failed to load friends');
      }
    } catch (err) {
      setError('Network error while loading friends');
    } finally {
      setLoading(false);
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

      {error && (
        <div className="friends-error">
          <p>❌ {error}</p>
        </div>
      )}

      {friends.length === 0 ? (
        <div className="friends-empty">
          <p>No friends yet. Add friends from your Profile.</p>
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
