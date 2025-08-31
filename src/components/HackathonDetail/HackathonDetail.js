import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './HackathonDetail.css';

const HackathonDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hackathon, setHackathon] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHackathonDetail();
  }, [id]);

  const fetchHackathonDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:10000/api/hackathons/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setHackathon(data.hackathon);
      }
    } catch (error) {
      console.error('Error fetching hackathon:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      // Add message locally first
      const message = {
        sender: user.name,
        content: newMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!hackathon) return <div className="error">Hackathon not found</div>;

  const totalMembers = (hackathon.teamMembers?.length || 0) + 1;
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="hackathon-detail">
      <div className="container">
        <button onClick={() => navigate('/dashboard')} className="back-btn">
          ← Back to Dashboard
        </button>

        <div className="hackathon-header">
          <h1>{hackathon.name}</h1>
          <div className="hackathon-meta">
            <span>📅 {new Date(hackathon.date).toLocaleDateString()}</span>
            <span>🏢 {hackathon.platform}</span>
            <span>👥 {totalMembers}/{hackathon.maxParticipants || 4} members</span>
          </div>
        </div>

        <div className="detail-content">
          <div className="team-section">
            <h3>Team Members ({totalMembers}/{hackathon.maxParticipants || 4})</h3>
            
            <div className="team-list">
              <div className="team-member leader">
                <div className="member-avatar">👑</div>
                <div className="member-info">
                  <span className="member-name">{user.name}</span>
                  <span className="member-email">({hackathon.email})</span>
                  <span className="member-role">Team Leader</span>
                </div>
              </div>

              {hackathon.teamMembers?.map((member, index) => (
                <div key={index} className="team-member">
                  <div className="member-avatar">{member.name.charAt(0).toUpperCase()}</div>
                  <div className="member-info">
                    <span className="member-name">{member.name}</span>
                    <span className="member-email">({member.email})</span>
                    <span className="member-role">{member.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chat-section">
            <h3>💬 Team Chat</h3>
            <div className="chat-container">
              <div className="messages-area">
                {messages.length === 0 ? (
                  <div className="no-messages">
                    <p>Start chatting with your team!</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div key={index} className="message">
                      <strong>{msg.sender}:</strong> {msg.content}
                    </div>
                  ))
                )}
              </div>
              
              <form onSubmit={sendMessage} className="message-form">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="message-input"
                />
                <button type="submit" className="send-btn">Send</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HackathonDetail;
