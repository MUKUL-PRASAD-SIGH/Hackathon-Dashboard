import React, { useState, useEffect, useContext } from 'react';
import { getApiBaseUrl } from '../../config/api';
import AuthContext from '../../contexts/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import TeamsList from './TeamsList';
import PublicChat from './PublicChat';
import ParticipantsList from './ParticipantsList';

const WorldDetail = ({ worldId, onBack }) => {
  const [world, setWorld] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('teams');
  const [isJoining, setIsJoining] = useState(false);
  const { token, user } = useContext(AuthContext);
  const { isConnected } = useSocket();

  useEffect(() => {
    fetchWorldDetail();
  }, [worldId]);

  const fetchWorldDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/worlds/${worldId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setWorld(data.world);
      } else {
        setError(data.error?.message || 'Failed to fetch world details');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Fetch world detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWorld = async () => {
    try {
      setIsJoining(true);
      const response = await fetch(`${getApiBaseUrl()}/worlds/${worldId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          skills: ['JavaScript', 'React'],
          preferredRole: 'Frontend Developer',
          experience: 'Intermediate'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchWorldDetail(); // Refresh world data
      } else {
        setError(data.error?.message || 'Failed to join world');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Join world error:', err);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveWorld = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/worlds/${worldId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchWorldDetail(); // Refresh world data
      } else {
        setError(data.error?.message || 'Failed to leave world');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Leave world error:', err);
    }
  };

  if (loading) {
    return (
      <div className="world-detail">
        <div className="worlds-loading">
          <div className="loading-spinner"></div>
          <p>Loading world details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="world-detail">
        <div className="worlds-error">
          <p>❌ {error}</p>
          <button onClick={fetchWorldDetail} className="retry-btn">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!world) {
    return (
      <div className="world-detail">
        <div className="worlds-error">
          <p>World not found</p>
          <button onClick={onBack} className="retry-btn">
            ← Back to Worlds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="world-detail">
      <button onClick={onBack} className="world-action-btn secondary" style={{ marginBottom: '20px' }}>
        ← Back to Worlds
      </button>

      <div className="world-detail-header">
        <h1 className="world-detail-title">{world.name}</h1>
        <p className="world-detail-description">{world.description}</p>
        
        <div className="world-detail-stats">
          <div className="world-detail-stat">
            <span className="world-detail-stat-value">{world.participantCount}</span>
            <span className="world-detail-stat-label">Participants</span>
          </div>
          <div className="world-detail-stat">
            <span className="world-detail-stat-value">{world.maxTeamSize}</span>
            <span className="world-detail-stat-label">Max Team Size</span>
          </div>
          <div className="world-detail-stat">
            <span className="world-detail-stat-value">{world.platform}</span>
            <span className="world-detail-stat-label">Platform</span>
          </div>
          <div className="world-detail-stat">
            <span className="world-detail-stat-value">
              {isConnected ? '🟢 Online' : '🔴 Offline'}
            </span>
            <span className="world-detail-stat-label">Connection</span>
          </div>
        </div>
      </div>

      <div className="world-actions">
        {!world.isParticipant ? (
          <button 
            onClick={handleJoinWorld} 
            disabled={isJoining}
            className="world-action-btn primary"
          >
            {isJoining ? '⏳ Joining...' : '🚀 Join World'}
          </button>
        ) : (
          <>
            <button 
              onClick={handleLeaveWorld}
              className="world-action-btn danger"
            >
              👋 Leave World
            </button>
            <span className="world-action-btn" style={{ background: '#27ae60', color: 'white' }}>
              ✅ Joined as {world.userRole}
            </span>
          </>
        )}
      </div>

      {world.isParticipant && (
        <>
          <div className="world-tabs">
            <button 
              className={`world-tab ${activeTab === 'teams' ? 'active' : ''}`}
              onClick={() => setActiveTab('teams')}
            >
              👥 Teams
            </button>
            <button 
              className={`world-tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              💬 Public Chat
            </button>
            <button 
              className={`world-tab ${activeTab === 'participants' ? 'active' : ''}`}
              onClick={() => setActiveTab('participants')}
            >
              🌟 Participants
            </button>
          </div>

          <div className="world-tab-content">
            {activeTab === 'teams' && (
              <TeamsList worldId={worldId} world={world} />
            )}
            {activeTab === 'chat' && (
              <PublicChat worldId={worldId} />
            )}
            {activeTab === 'participants' && (
              <ParticipantsList worldId={worldId} participants={world.participants} />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default WorldDetail;
