import React, { useState, useEffect, useContext } from 'react';
import AuthContext from '../../contexts/AuthContext';
import './HackathonWorlds.css';
import './SearchStyles.css';
import './TeamCards.css';
import { getApiUrl } from '../../utils/apiBase';

const API = getApiUrl();

const HackathonWorldsList = ({ onSelectWorld, refreshTrigger }) => {
  const [worlds, setWorlds] = useState([]);
  const [filteredWorlds, setFilteredWorlds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joinRequestModal, setJoinRequestModal] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const { token } = useContext(AuthContext);

  useEffect(() => {
    fetchWorlds();
  }, [refreshTrigger]);
  
  // Auto-refresh every 30 seconds to keep participant counts updated
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWorlds();
    }, 30000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredWorlds(worlds);
    } else {
      const filtered = worlds.filter(world => 
        world.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        world.platform?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        world.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredWorlds(filtered);
    }
  }, [worlds, searchQuery]);
  
  const removeDuplicateWorlds = (worldsList) => {
    const seen = new Set();
    return worldsList.filter(world => {
      const key = `${world.name}-${world.platform}-${world.startDate}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  };

  const fetchWorlds = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/hackathons/public`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const text = await response.text();
        if (text.includes('<!DOCTYPE')) {
          throw new Error('Backend server not reachable. Please ensure the backend is running on port 10000.');
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setWorlds(data.hackathons || []);
        setFilteredWorlds(data.hackathons || []);
      } else {
        setError(data.error?.message || 'Failed to fetch public hackathons');
      }
    } catch (err) {
      setError(err.message || 'Backend server not running. Please start: cd server && npm run dev');
      console.error('Fetch worlds error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="worlds-loading">
        <div className="loading-spinner"></div>
        <p>Loading hackathon worlds...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="worlds-error">
        <p>❌ {error}</p>
        <button onClick={fetchWorlds} className="retry-btn">
          🔄 Retry
        </button>
      </div>
    );
  }

  const handleJoinRequest = (hackathonId) => {
    setJoinRequestModal(hackathonId);
    setRequestMessage('');
  };
  
  const sendJoinRequest = async () => {
    try {
      const response = await fetch(`${API}/hackathons/${joinRequestModal}/request-join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: requestMessage })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Join request sent successfully!');
        setJoinRequestModal(null);
        setRequestMessage('');
        fetchWorlds();
      } else {
        alert('❌ ' + (data.error?.message || 'Failed to send request'));
      }
    } catch (error) {
      alert('❌ Network error. Please try again.');
    }
  };
  
  const handleWithdrawRequest = async (hackathonId) => {
    if (!window.confirm('Are you sure you want to withdraw your join request?')) {
      return;
    }
    
    try {
      const response = await fetch(`${API}/hackathons/${hackathonId}/withdraw-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Join request withdrawn successfully!');
        fetchWorlds();
      } else {
        alert('❌ ' + (data.error?.message || 'Failed to withdraw request'));
      }
    } catch (error) {
      alert('❌ Network error. Please try again.');
    }
  };

  return (
    <div className="hackathon-worlds-list">
      <div className="worlds-header">
        <h2>🌍 Public Hackathons</h2>
        <p>Find teams and join hackathons!</p>
        
        <div className="search-container">
          <input
            type="text"
            placeholder="🔍 Search hackathons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {filteredWorlds.length === 0 ? (
        <div className="no-worlds">
          <p>No active hackathon worlds found.</p>
          <p>Create a hackathon in your dashboard and make it public to see it here!</p>
        </div>
      ) : (
        <div className="worlds-grid">
          {filteredWorlds.map(hackathon => {
            const teamSize = (hackathon.teamMembers?.length || 0) + 1;
            const isTeamFull = teamSize >= hackathon.maxParticipants;
            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const isOwnHackathon = hackathon.email.toLowerCase() === currentUser.email?.toLowerCase();
            const hasPendingRequest = hackathon.joinRequests?.some(r => r.email === currentUser.email && r.status === 'pending');
            const isMember = hackathon.teamMembers?.some(m => m.email === currentUser.email);
            
            return (
              <div key={hackathon._id} className="world-card hackathon-team-card">
                <div className="world-header">
                  <h3>{hackathon.name}</h3>
                  <span className="world-platform">{hackathon.platform}</span>
                  {isTeamFull && <span className="team-full-badge">🔒 Team Full</span>}
                </div>
                
                <div className="world-stats">
                  <div className="stat">
                    <span className="stat-label">Team Size</span>
                    <span className="stat-value">{teamSize}/{hackathon.maxParticipants}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Status</span>
                    <span className="stat-value">{hackathon.status}</span>
                  </div>
                </div>
                
                <div className="world-dates">
                  <div className="date">
                    <span>📅 Date: {new Date(hackathon.date).toLocaleDateString()}</span>
                  </div>
                  <div className="date">
                    <span>🔄 Rounds: {hackathon.rounds}</span>
                  </div>
                </div>
                
                <div className="team-leader">
                  <div className="creator-info">
                    <div className="creator-avatar">
                      👑
                    </div>
                    <div>
                      <span className="creator-name">{hackathon.createdBy?.name || 'Team Leader'}</span>
                      <span className="creator-email">({hackathon.email})</span>
                    </div>
                  </div>
                </div>
                
                {hackathon.teamMembers && hackathon.teamMembers.length > 0 && (
                  <div className="team-members">
                    <h4>Team Members:</h4>
                    {hackathon.teamMembers.map((member, idx) => (
                      <div key={idx} className="team-member">
                        <span className="member-avatar">{member.name.charAt(0)}</span>
                        <span className="member-name">{member.name}</span>
                        <span className="member-role">({member.role})</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="world-actions">
                  {isOwnHackathon ? (
                    <button className="action-btn disabled">Your Hackathon</button>
                  ) : isMember ? (
                    <button 
                      className="action-btn success"
                      onClick={() => onSelectWorld(hackathon)}
                    >
                      💬 Open Chat
                    </button>
                  ) : isTeamFull ? (
                    <button className="action-btn disabled">Team Full</button>
                  ) : hasPendingRequest ? (
                    <div className="request-actions">
                      <button className="action-btn pending">⏳ Request Sent</button>
                      <button 
                        className="action-btn withdraw"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWithdrawRequest(hackathon._id);
                        }}
                      >
                        🗑️ Withdraw
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="action-btn primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinRequest(hackathon._id);
                      }}
                    >
                      🚀 Request to Join
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Join Request Modal */}
      {joinRequestModal && (
        <div className="modal-overlay" onClick={() => setJoinRequestModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>🚀 Request to Join Team</h3>
            <p>Send a message to the team leader:</p>
            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Hi! I'd like to join your hackathon team. I have experience in..."
              rows="4"
              style={{ width: '100%', margin: '10px 0' }}
            />
            <div className="modal-actions">
              <button onClick={sendJoinRequest} className="btn-primary">
                📤 Send Request
              </button>
              <button onClick={() => setJoinRequestModal(null)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HackathonWorldsList;
