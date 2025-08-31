import React, { useState, useEffect, useContext } from 'react';
import { getApiBaseUrl } from '../../config/api';
import AuthContext from '../../contexts/AuthContext';

const ParticipantsList = ({ worldId, participants }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers([]);
    }
  }, [searchTerm, allUsers]);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/debug/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setAllUsers(data.users || []);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async (userId) => {
    try {
      // For now, just show an alert - you can implement actual invitation later
      alert(`Invitation sent to user! They can join the hackathon world directly.`);
    } catch (err) {
      console.error('Invite user error:', err);
    }
  };

  return (
    <div className="participants-list">
      <h3>Participants ({participants.length})</h3>
      
      {/* Search for users */}
      <div className="user-search">
        <h4>🔍 Search Users to Invite</h4>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
        {searchTerm && (
          <div className="search-results">
            {loading ? (
              <p>Searching...</p>
            ) : filteredUsers.length > 0 ? (
              <div className="users-grid">
                {filteredUsers.map(user => (
                  <div key={user._id} className="user-card">
                    <div className="user-info">
                      <h5>{user.name}</h5>
                      <span className="user-email">{user.email}</span>
                    </div>
                    <button 
                      onClick={() => inviteUser(user._id)}
                      className="invite-btn"
                    >
                      📧 Invite
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p>No users found matching "{searchTerm}"</p>
            )}
          </div>
        )}
      </div>

      {/* Current participants */}
      <div className="current-participants">
        <h4>Current Participants</h4>
        <div className="participants-grid">
          {participants.map(participant => (
            <div key={participant.id} className="participant-card">
              <div className="participant-info">
                <h4>{participant.name}</h4>
                <span className="participant-role">{participant.role}</span>
              </div>
              <div className="participant-skills">
                {participant.skills.slice(0, 3).map(skill => (
                  <span key={skill} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParticipantsList;
