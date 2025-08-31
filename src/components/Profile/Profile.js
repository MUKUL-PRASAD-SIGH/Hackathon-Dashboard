import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './Profile.css';

const Profile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    bio: '',
    skills: '',
    experience: '',
    linkedin: '',
    github: '',
    portfolio: '',
    location: '',
    avatar: '',
    isPublic: false
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState('none');
  const [showFriendRequest, setShowFriendRequest] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ sent: [], received: [] });
  const [currentTeam, setCurrentTeam] = useState(null);

  useEffect(() => {
    setIsOwnProfile(!userId);
    fetchProfile();
  }, [userId]);
  
  useEffect(() => {
    // Force refresh on mount
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      
      console.log('🔍 Token exists:', !!token);
      console.log('🔍 UserId from params:', userId);
      
      const url = userId 
        ? `http://localhost:10000/api/users/profile/${userId}` 
        : 'http://localhost:10000/api/users/profile';
      console.log('🔍 API URL:', url);
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('🔍 Response status:', response.status);
      console.log('🔍 Response ok:', response.ok);

      const data = await response.json();
      console.log('Profile fetch response:', data);
      
      if (data.success) {
        setProfile(data.user);
        setHackathons(data.hackathons || []);
        setFriendshipStatus(data.friendshipStatus || 'none');
        setCurrentTeam(data.user.currentTeam);
        
        if (data.isOwnProfile) {
          setFormData({
            bio: data.user.profile?.bio || '',
            skills: data.user.profile?.skills?.join(', ') || '',
            experience: data.user.profile?.experience || '',
            linkedin: data.user.profile?.linkedin || '',
            github: data.user.profile?.github || '',
            portfolio: data.user.profile?.portfolio || '',
            location: data.user.profile?.location || '',
            avatar: data.user.profile?.avatar || '',
            isPublic: data.user.profile?.isPublic || false
          });
          fetchFriends();
        }
      } else if (response.status === 403) {
        setProfile({ ...data.user, isPrivate: true });
      } else {
        console.error('Profile fetch failed:', data);
      }
    } catch (error) {
      console.error('❌ Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image format (JPEG, PNG, GIF, WebP)');
        return;
      }
      if (file.size > 1 * 1024 * 1024) { // Reduced to 1MB
        alert('File size must be less than 1MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target.result;
        if (result.length > 500000) { // ~500KB base64 limit
          alert('Image too large after encoding. Please use a smaller image.');
          return;
        }
        setFormData({...formData, avatar: result});
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchFriends = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:10000/api/users/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setFriends(data.friends);
        setFriendRequests({ sent: data.sentRequests, received: data.receivedRequests });
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:10000/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          skills: formData.skills.split(',').map(s => s.trim()).filter(s => s)
        })
      });

      const data = await response.json();
      if (data.success) {
        setProfile(data.user);
        setEditing(false);
        setAvatarFile(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        fetchProfile();
      } else {
        alert(data.error?.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile save error:', error);
      alert('Error updating profile: ' + error.message);
    }
  };

  const sendFriendRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:10000/api/users/friend-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: friendEmail })
      });
      
      const data = await response.json();
      if (data.success) {
        setShowSuccess(true);
        setFriendEmail('');
        setShowFriendRequest(false);
        fetchFriends();
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert(data.error?.message || 'Failed to send friend request');
      }
    } catch (error) {
      alert('Error sending friend request: ' + error.message);
    }
  };

  const handleFriendRequest = async (userId, action) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:10000/api/users/friend-request/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      });
      
      const data = await response.json();
      if (data.success) {
        fetchFriends();
        if (userId === profile?._id) {
          setFriendshipStatus(action === 'accept' ? 'friends' : 'none');
        }
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
    }
  };

  const sendFriendRequestToProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:10000/api/users/friend-request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: profile.email })
      });
      
      const data = await response.json();
      if (data.success) {
        setFriendshipStatus('request_sent');
      } else {
        alert(data.error?.message);
      }
    } catch (error) {
      alert('Error sending friend request');
    }
  };

  if (loading) return <div className="profile-loading">Loading profile...</div>;

  if (profile?.isPrivate) {
    return (
      <div className="profile-container">
        <div className="container">
          <div className="profile-header">
            <div className="profile-avatar">
              {profile.name?.charAt(0).toUpperCase()}
            </div>
            <div className="profile-info">
              <h1>{profile.name}</h1>
              <p className="profile-email">{profile.email}</p>
              <p className="private-notice">🔒 This profile is private</p>
            </div>
            {friendshipStatus === 'none' && (
              <button onClick={sendFriendRequestToProfile} className="friend-btn">
                👥 Send Friend Request
              </button>
            )}
            {friendshipStatus === 'request_sent' && (
              <button className="friend-btn disabled">📤 Request Sent</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="container">
        <div className="profile-header">
          <div className="profile-avatar">
            {profile?.profile?.avatar ? (
              <img src={profile.profile.avatar} alt="Profile" />
            ) : (
              profile?.name?.charAt(0).toUpperCase()
            )}
            {editing && (
              <div className="avatar-upload">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleAvatarChange}
                  id="avatar-input"
                  style={{display: 'none'}}
                />
                <label htmlFor="avatar-input" className="upload-btn">
                  📷
                </label>
                <small>JPEG, PNG, GIF, WebP (max 5MB)</small>
              </div>
            )}
          </div>
          <div className="profile-info">
            <h1>{profile?.name || 'Loading...'}</h1>
            <p className="profile-email">{profile?.email || 'Loading...'}</p>
            {profile?.profile?.location && (
              <p className="profile-location">📍 {profile.profile.location}</p>
            )}
            {currentTeam && friendshipStatus === 'friends' && (
              <p className="current-team">🏆 Team: {currentTeam.teamName} ({currentTeam.hackathonName})</p>
            )}
          </div>
          <div className="profile-actions">
            {isOwnProfile ? (
              <>
                <button 
                  onClick={() => setEditing(!editing)}
                  className="edit-profile-btn click-effect"
                >
                  {editing ? '❌ Cancel' : '✏️ Edit Profile'}
                </button>
                <button 
                  onClick={() => setShowFriendRequest(true)}
                  className="friend-btn click-effect"
                >
                  👥 Add Friend
                </button>
              </>
            ) : (
              <>
                {friendshipStatus === 'none' && (
                  <button onClick={sendFriendRequestToProfile} className="friend-btn">
                    👥 Send Friend Request
                  </button>
                )}
                {friendshipStatus === 'request_sent' && (
                  <button className="friend-btn disabled">📤 Request Sent</button>
                )}
                {friendshipStatus === 'request_received' && (
                  <div className="friend-actions">
                    <button onClick={() => handleFriendRequest(profile._id, 'accept')} className="friend-btn accept">
                      ✅ Accept
                    </button>
                    <button onClick={() => handleFriendRequest(profile._id, 'reject')} className="friend-btn reject">
                      ❌ Decline
                    </button>
                  </div>
                )}
                {friendshipStatus === 'friends' && (
                  <button className="friend-btn friends">✅ Friends</button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <h3>About Me</h3>
            {editing ? (
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                placeholder="Tell us about yourself..."
                rows="4"
              />
            ) : (
              <>
                <p>{profile?.profile?.bio || 'No bio available'}</p>
              </>
            )}
          </div>

          <div className="profile-section">
            <h3>Skills</h3>
            {editing ? (
              <input
                type="text"
                value={formData.skills}
                onChange={(e) => setFormData({...formData, skills: e.target.value})}
                placeholder="JavaScript, React, Node.js (comma separated)"
              />
            ) : (
              <div className="skills-list">
                {profile?.profile?.skills?.map((skill, index) => (
                  <span key={index} className="skill-tag">{skill}</span>
                )) || <p>No skills listed</p>}
              </div>
            )}
          </div>

          <div className="profile-section">
            <h3>Experience</h3>
            {editing ? (
              <select
                value={formData.experience}
                onChange={(e) => setFormData({...formData, experience: e.target.value})}
              >
                <option value="">Select Experience</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            ) : (
              <p>{profile?.profile?.experience || 'Not specified'}</p>
            )}
          </div>

          <div className="profile-section">
            <h3>Social Links</h3>
            {editing ? (
              <div className="social-inputs">
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({...formData, linkedin: e.target.value})}
                  placeholder="https://linkedin.com/in/username"
                />
                <input
                  type="url"
                  value={formData.github}
                  onChange={(e) => setFormData({...formData, github: e.target.value})}
                  placeholder="https://github.com/username"
                />
                <input
                  type="url"
                  value={formData.portfolio}
                  onChange={(e) => setFormData({...formData, portfolio: e.target.value})}
                  placeholder="Portfolio URL"
                />
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Location"
                />
                <label className="privacy-toggle">
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                  />
                  🌐 Make profile public
                </label>
              </div>
            ) : (
              <div className="social-links">
                {profile?.profile?.linkedin && (
                  <a href={profile.profile.linkedin} target="_blank" rel="noopener noreferrer">
                    💼 LinkedIn
                  </a>
                )}
                {profile?.profile?.github && (
                  <a href={profile.profile.github} target="_blank" rel="noopener noreferrer">
                    🐙 GitHub
                  </a>
                )}
                {profile?.profile?.portfolio && (
                  <a href={profile.profile.portfolio} target="_blank" rel="noopener noreferrer">
                    🌐 Portfolio
                  </a>
                )}
              </div>
            )}
          </div>

          {editing && (
            <button onClick={handleSave} className="save-btn click-effect">
              💾 Save Profile
            </button>
          )}
        </div>

        {isOwnProfile && (
          <div className="friends-section">
            <h3>Friends ({friends.length})</h3>
            {friends.length > 0 ? (
              <div className="friends-grid">
                {friends.map(friend => (
                  <div key={friend.userId._id} className="friend-card">
                    <div className="friend-avatar">
                      {friend.userId.profile?.avatar ? (
                        <img src={friend.userId.profile.avatar} alt={friend.userId.name} />
                      ) : (
                        friend.userId.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="friend-info">
                      <h4>{friend.userId.name}</h4>
                      <p>{friend.userId.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p>No friends yet. Send friend requests to connect!</p>
            )}
            
            {friendRequests.received.length > 0 && (
              <div className="friend-requests">
                <h4>Friend Requests ({friendRequests.received.length})</h4>
                {friendRequests.received.map(request => (
                  <div key={request.userId._id} className="friend-request">
                    <span>{request.userId.name} ({request.userId.email})</span>
                    <div className="request-actions">
                      <button 
                        onClick={() => handleFriendRequest(request.userId._id, 'accept')}
                        className="accept-btn"
                      >
                        ✅ Accept
                      </button>
                      <button 
                        onClick={() => handleFriendRequest(request.userId._id, 'reject')}
                        className="reject-btn"
                      >
                        ❌ Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="hackathons-section">
          <h3>Hackathon History</h3>
          <div className="stats">
            <div className="stat">
              <span className="stat-number">{hackathons.filter(h => h.status === 'Won').length}</span>
              <span className="stat-label">Won</span>
            </div>
            <div className="stat">
              <span className="stat-number">{hackathons.length}</span>
              <span className="stat-label">Participated</span>
            </div>
          </div>
          
          {hackathons.length > 0 ? (
            <div className="hackathons-list">
              {hackathons.map(hackathon => (
                <div key={hackathon._id} className="hackathon-card">
                  <h4>{hackathon.name}</h4>
                  <p>{hackathon.platform} • {hackathon.date}</p>
                  <span className={`status ${hackathon.status.toLowerCase().replace(/[^a-z]/g, '')}`}>
                    {hackathon.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p>No hackathons participated yet</p>
          )}
        </div>
      </div>
      
      {/* Friend Request Modal */}
      {showFriendRequest && (
        <div className="modal-overlay" onClick={() => setShowFriendRequest(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Add Friend</h3>
            <p>Enter the email address of the person you want to add as a friend:</p>
            <input
              type="email"
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              placeholder="friend@example.com"
              className="friend-email-input"
            />
            <div className="modal-actions">
              <button onClick={sendFriendRequest} className="send-btn">
                📤 Send Request
              </button>
              <button onClick={() => setShowFriendRequest(false)} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {showSuccess && (
        <div className="success-notification">
          <div className="success-content">
            <div className="success-icon">✅</div>
            <span>Action completed successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
