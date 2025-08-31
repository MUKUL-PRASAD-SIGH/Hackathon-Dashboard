import React, { useState, useEffect } from 'react';
import './RoundRemarks.css';

const RoundRemarks = ({ hackathonId, hackathon }) => {
  const [remarks, setRemarks] = useState([]);
  const [newRemark, setNewRemark] = useState('');
  const [selectedRound, setSelectedRound] = useState(1);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchRemarks();
  }, [hackathonId]);

  const fetchRemarks = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Fetching remarks for hackathon:', hackathonId);
      
      const response = await fetch(`http://localhost:10000/api/hackathons/${hackathonId}/remarks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      console.log('📊 Fetch remarks response:', data);
      
      if (data.success) {
        setRemarks(data.remarks || []);
      } else {
        console.error('Failed to fetch remarks:', data.error?.message);
      }
    } catch (error) {
      console.error('Error fetching remarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const addRemark = async () => {
    if (!newRemark.trim()) return;

    try {
      const token = localStorage.getItem('token');
      console.log('🔍 Adding remark:', { round: selectedRound, content: newRemark.trim() });
      
      const response = await fetch(`http://localhost:10000/api/hackathons/${hackathonId}/remarks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          round: selectedRound,
          content: newRemark.trim(),
          author: user.name || user.email
        })
      });

      const data = await response.json();
      console.log('📊 Add remark response:', data);
      
      if (data.success) {
        alert('✅ Note added successfully!');
        setNewRemark('');
        fetchRemarks();
      } else {
        alert('❌ Failed to add note: ' + (data.error?.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding remark:', error);
      alert('❌ Network error. Please try again.');
    }
  };

  const getRoundDate = (roundNum) => {
    if (hackathon?.roundDates?.[roundNum]) {
      return new Date(hackathon.roundDates[roundNum]).toLocaleDateString();
    }
    return hackathon?.date ? new Date(hackathon.date).toLocaleDateString() : 'No date set';
  };

  const groupedRemarks = remarks.reduce((acc, remark) => {
    if (!acc[remark.round]) acc[remark.round] = [];
    acc[remark.round].push(remark);
    return acc;
  }, {});

  if (loading) return <div className="loading">Loading remarks...</div>;

  return (
    <div className="round-remarks-container">
      {/* Add New Remark */}
      <div className="add-remark-section">
        <div className="add-remark-header">
          <select
            value={selectedRound}
            onChange={(e) => setSelectedRound(parseInt(e.target.value))}
            className="round-selector"
          >
            {Array.from({ length: hackathon?.rounds || 1 }, (_, i) => i + 1).map(round => (
              <option key={round} value={round}>
                Round {round} - {getRoundDate(round)}
              </option>
            ))}
          </select>
        </div>
        
        <div className="remark-input-section">
          <input
            type="text"
            value={newRemark}
            onChange={(e) => setNewRemark(e.target.value.slice(0, 500))}
            placeholder="Add a note or remark for this round..."
            className="remark-input"
            maxLength={500}
          />
          <button onClick={addRemark} className="add-remark-btn" disabled={!newRemark.trim()}>
            📝 Add Note
          </button>
        </div>
        <div className="char-count">{newRemark.length}/500</div>
      </div>

      {/* Display Remarks by Round */}
      <div className="remarks-display">
        {Array.from({ length: hackathon?.rounds || 1 }, (_, i) => i + 1).map(roundNum => (
          <div key={roundNum} className="round-section">
            <div className="round-header">
              <h3>Round {roundNum}</h3>
              <span className="round-date">📅 {getRoundDate(roundNum)}</span>
            </div>
            
            <div className="round-remarks">
              {groupedRemarks[roundNum]?.length > 0 ? (
                groupedRemarks[roundNum].map((remark, index) => (
                  <div key={index} className="remark-item">
                    <div className="remark-meta">
                      <span className="author">{remark.author}</span>
                      <span className="timestamp">{new Date(remark.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="remark-content">{remark.content}</div>
                  </div>
                ))
              ) : (
                <div className="no-remarks">No notes added for this round yet.</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoundRemarks;
