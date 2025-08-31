import React, { useState, useContext } from 'react';
import { getApiBaseUrl } from '../../config/api';
import AuthContext from '../../contexts/AuthContext';
import './JoinHackathon.css';

const JoinHackathon = () => {
  const [inviteLink, setInviteLink] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token, user } = useContext(AuthContext);

  const handleJoinRequest = async (e) => {
    e.preventDefault();
    
    if (!inviteLink.trim()) {
      setError('Please enter an invite link');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Extract hackathon ID from invite link
      const hackathonId = extractHackathonId(inviteLink);
      
      if (!hackathonId) {
        setError('Invalid invite link format');
        return;
      }

      const response = await fetch(`${getApiBaseUrl()}/hackathons/${hackathonId}/join-request`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message.trim() || 'I would like to join your hackathon team!'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('');
        setInviteLink('');
        alert('Join request sent successfully! The team leader will review your request.');
      } else {
        setError(data.error?.message || 'Failed to send join request');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Join request error:', err);
    } finally {
      setLoading(false);
    }
  };

  const extractHackathonId = (link) => {
    // Extract ID from various link formats
    const patterns = [
      /\/hackathon\/([a-f0-9]{24})/i,
      /hackathonId=([a-f0-9]{24})/i,
      /invite\/([a-f0-9]{24})/i
    ];
    
    for (const pattern of patterns) {
      const match = link.match(pattern);
      if (match) return match[1];
    }
    
    // If it's just an ID
    if (/^[a-f0-9]{24}$/i.test(link.trim())) {
      return link.trim();
    }
    
    return null;
  };

  return (
    <div className="join-hackathon">
      <div className="container">
        <div className="join-hackathon-header">
          <h2>🤝 Join Hackathon Team</h2>
          <p>Enter an invite link to request joining a private hackathon team</p>
        </div>

        <div className="join-form-container">
          <form onSubmit={handleJoinRequest} className="join-form">
            <div className="form-group">
              <label htmlFor="inviteLink">Invite Link or Hackathon ID</label>
              <input
                type="text"
                id="inviteLink"
                value={inviteLink}
                onChange={(e) => setInviteLink(e.target.value)}
                placeholder="Paste invite link or hackathon ID here..."
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="message">Message to Team Leader (Optional)</label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell the team leader why you want to join..."
                className="form-textarea"
                rows={4}
                maxLength={500}
              />
            </div>

            {error && (
              <div className="error-message">
                <p>❌ {error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || !inviteLink.trim()}
              className="submit-btn"
            >
              {loading ? '⏳ Sending Request...' : '🚀 Send Join Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default JoinHackathon;
