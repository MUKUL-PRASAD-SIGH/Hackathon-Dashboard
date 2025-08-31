import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RoundRemarks from './RoundRemarks';
import './TeamPage.css';

const TeamPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hackathon, setHackathon] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchHackathonDetails();
  }, [id]);

  const fetchHackathonDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:10000/api/hackathons`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        const foundHackathon = data.hackathons.find(h => h._id === id);
        setHackathon(foundHackathon);
      }
    } catch (error) {
      console.error('Error fetching hackathon:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberEmail, memberName) => {
    if (window.confirm(`Remove ${memberName} from the team?`)) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:10000/api/hackathons/${id}/member/${encodeURIComponent(memberEmail)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        if (data.success) {
          alert(`✅ ${memberName} removed from team`);
          fetchHackathonDetails();
        } else {
          alert(data.error?.message || 'Failed to remove member');
        }
      } catch (error) {
        alert('Error removing member');
      }
    }
  };

  if (loading) return <div className="loading">Loading team details...</div>;
  if (!hackathon) return <div className="error">Team not found</div>;

  // Filter out team leader from team members to prevent duplicates
  const filteredTeamMembers = hackathon.teamMembers?.filter(member => 
    member.email.toLowerCase() !== user.email.toLowerCase()
  ) || [];

  const totalMembers = filteredTeamMembers.length + 1;

  return (
    <div className="team-page">
      <div className="container">
        <div className="page-navigation">
          <button onClick={() => navigate('/dashboard')} className="back-btn-prominent">
            🏠 Back to Dashboard
          </button>
        </div>

        <div className="team-header">
          <h1 className="team-title">{hackathon.name}</h1>
          <div className="team-meta-grid">
            <div className="meta-card date-card">
              <div className="meta-icon">📅</div>
              <div className="meta-content">
                <span className="meta-label">Event Date</span>
                <span className="meta-value">{new Date(hackathon.date).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="meta-card platform-card">
              <div className="meta-icon">🏢</div>
              <div className="meta-content">
                <span className="meta-label">Platform</span>
                <span className="meta-value">{hackathon.platform}</span>
              </div>
            </div>
            
            <div className="meta-card members-card">
              <div className="meta-icon">👥</div>
              <div className="meta-content">
                <span className="meta-label">Team Size</span>
                <span className="meta-value">{totalMembers}/{hackathon.maxParticipants || 4} members</span>
              </div>
            </div>
            
            <div className="meta-card status-card">
              <div className="meta-icon">🎯</div>
              <div className="meta-content">
                <span className="meta-label">Status</span>
                <span className="meta-value status-text" style={{ color: getStatusColor(hackathon.status) }}>
                  {hackathon.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="team-content">
          <div className="team-info-card">
            <h2>Team Members</h2>
            
            <div className="members-list">
              <div className="member-card leader">
                <div className="member-avatar">👑</div>
                <div className="member-details">
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                  <span className="role">Team Leader</span>
                </div>
              </div>

              {filteredTeamMembers.map((member, index) => (
                <div key={index} className="member-card">
                  <div className="member-avatar">{member.name.charAt(0).toUpperCase()}</div>
                  <div className="member-details">
                    <h3>{member.name}</h3>
                    <p>{member.email}</p>
                    <span className="role">{member.role}</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveMember(member.email, member.name)}
                    className="remove-btn"
                    title="Remove member"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="round-remarks-section">
            <h2>Round Remarks & Notes</h2>
            <RoundRemarks hackathonId={id} hackathon={hackathon} />
          </div>
          
          <div className="team-actions">
            <button 
              onClick={() => navigate(`/chat/${id}`)}
              className="chat-btn"
            >
              💬 Open Team Chat
            </button>
            
            <button 
              onClick={() => navigate(`/edit-hackathon/${id}`)}
              className="edit-btn"
            >
              ✏️ Edit Hackathon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'Won': return '#28a745';
    case 'Participating': return '#007bff';
    case "Didn't qualify": return '#dc3545';
    case 'Planning': return '#ffc107';
    default: return '#6c757d';
  }
};

export default TeamPage;
