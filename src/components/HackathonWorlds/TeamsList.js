import React, { useState, useEffect, useContext } from 'react';
import { getApiBaseUrl } from '../../config/api';
import AuthContext from '../../contexts/AuthContext';

const TeamsList = ({ worldId, world }) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeam, setNewTeam] = useState({
    name: '',
    maxSize: 4,
    requirements: '',
    skills: '',
    projectIdea: { title: '', description: '' }
  });
  const { token, user } = useContext(AuthContext);

  useEffect(() => {
    fetchTeams();
  }, [worldId]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/worlds/${worldId}/teams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setTeams(data.teams);
      } else {
        setError(data.error?.message || 'Failed to fetch teams');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Fetch teams error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/worlds/${worldId}/teams`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newTeam,
          skills: newTeam.skills.split(',').map(s => s.trim()).filter(s => s)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setShowCreateForm(false);
        setNewTeam({
          name: '',
          maxSize: 4,
          requirements: '',
          skills: '',
          projectIdea: { title: '', description: '' }
        });
        await fetchTeams();
      } else {
        setError(data.error?.message || 'Failed to create team');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Create team error:', err);
    }
  };

  const handleJoinTeam = async (teamId) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/worlds/${worldId}/teams/${teamId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: 'Frontend Developer'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchTeams();
      } else {
        setError(data.error?.message || 'Failed to join team');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Join team error:', err);
    }
  };

  if (loading) {
    return (
      <div className="teams-loading">
        <div className="loading-spinner"></div>
        <p>Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="teams-list">
      <div className="teams-header">
        <h3>👥 Teams</h3>
        {world.userRole === 'explorer' && (
          <button 
            onClick={() => setShowCreateForm(true)}
            className="world-action-btn primary"
          >
            ➕ Create Team
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={() => setError(null)} className="close-error">×</button>
        </div>
      )}

      {showCreateForm && (
        <div className="create-team-form">
          <h4>Create New Team</h4>
          <form onSubmit={handleCreateTeam}>
            <div className="form-group">
              <label>Team Name *</label>
              <input
                type="text"
                value={newTeam.name}
                onChange={(e) => setNewTeam({...newTeam, name: e.target.value})}
                required
                placeholder="Enter team name"
              />
            </div>
            
            <div className="form-group">
              <label>Max Team Size</label>
              <select
                value={newTeam.maxSize}
                onChange={(e) => setNewTeam({...newTeam, maxSize: parseInt(e.target.value)})}
              >
                <option value={2}>2 members</option>
                <option value={3}>3 members</option>
                <option value={4}>4 members</option>
                <option value={5}>5 members</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Requirements</label>
              <textarea
                value={newTeam.requirements}
                onChange={(e) => setNewTeam({...newTeam, requirements: e.target.value})}
                placeholder="What skills or experience are you looking for?"
                rows={3}
              />
            </div>
            
            <div className="form-group">
              <label>Skills (comma-separated)</label>
              <input
                type="text"
                value={newTeam.skills}
                onChange={(e) => setNewTeam({...newTeam, skills: e.target.value})}
                placeholder="React, Node.js, Python, etc."
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" className="world-action-btn primary">
                Create Team
              </button>
              <button 
                type="button" 
                onClick={() => setShowCreateForm(false)}
                className="world-action-btn secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="no-teams">
          <p>No teams created yet.</p>
          <p>Be the first to create a team!</p>
        </div>
      ) : (
        <div className="teams-grid">
          {teams.map(team => (
            <div key={team.id} className="team-card">
              <div className="team-header">
                <h4>{team.name}</h4>
                <div className="team-status">
                  {team.lookingForMembers ? (
                    <span className="status-looking">🔍 Looking for members</span>
                  ) : (
                    <span className="status-complete">✅ Complete</span>
                  )}
                </div>
              </div>
              
              <div className="team-leader">
                <strong>Leader:</strong> {team.leader}
              </div>
              
              <div className="team-size">
                <strong>Size:</strong> {team.currentSize}/{team.maxSize} members
                {team.availableSpots > 0 && (
                  <span className="available-spots">
                    ({team.availableSpots} spots available)
                  </span>
                )}
              </div>
              
              {team.requirements && (
                <div className="team-requirements">
                  <strong>Looking for:</strong> {team.requirements}
                </div>
              )}
              
              {team.skills.length > 0 && (
                <div className="team-skills">
                  <strong>Skills:</strong>
                  <div className="skills-tags">
                    {team.skills.map(skill => (
                      <span key={skill} className="skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="team-members">
                <strong>Members:</strong>
                <div className="members-list">
                  <div className="member">👑 {team.leader} (Leader)</div>
                  {team.members.map(member => (
                    <div key={member.email} className="member">
                      👤 {member.email} ({member.role})
                    </div>
                  ))}
                </div>
              </div>
              
              {team.lookingForMembers && team.leader.toLowerCase() !== user.email.toLowerCase() && (
                <div className="team-actions">
                  <button 
                    onClick={() => handleJoinTeam(team.id)}
                    className="world-action-btn primary"
                  >
                    🚀 Join Team
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamsList;
