import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ChatPage.css';

const ChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hackathon, setHackathon] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    console.log(`💬 ChatPage loaded for hackathon ID: ${id}`);
    fetchHackathonDetails();
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:10000/api/hackathons/${id}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        if (response.status === 403) {
          setMessages([{ sender: 'System', content: 'Access denied. Only team members can view chat.', timestamp: new Date() }]);
        }
        return;
      }

      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:10000/api/hackathons/${id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: newMessage })
      });

      if (!response.ok) {
        alert('Failed to send message. Check if you are a team member.');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setNewMessage('');
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Network error. Please try again.');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className="loading">Loading chat...</div>;

  // Calculate total members (team leader + team members)
  const totalMembers = hackathon ? (hackathon.teamMembers?.length || 0) + 1 : 0;
  console.log(`👥 Team calculation - Leader: 1, Members: ${hackathon?.teamMembers?.length || 0}, Total: ${totalMembers}`);

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div className="chat-navigation">
          <button onClick={() => navigate(`/team/${id}`)} className="back-btn-prominent">
            👥 Back to Team
          </button>
          <button onClick={() => navigate('/dashboard')} className="dashboard-btn">
            🏠 Dashboard
          </button>
        </div>
        
        <div className="chat-info">
          <h1>{hackathon?.name} - Team Chat</h1>
          <p>👥 {totalMembers} team members</p>
        </div>
      </div>

      <div className="chat-container">
        <div className="messages-area">
          {messages.length === 0 ? (
            <div className="no-messages">
              <div className="welcome-message">
                <h3>🚀 Welcome to your team chat!</h3>
                <p>Start collaborating with your hackathon team members</p>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div 
                key={index} 
                className={`message ${msg.sender === user.name ? 'own-message' : 'other-message'}`}
              >
                <div className="message-header">
                  <span className="sender-name">{msg.sender}</span>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="message-content">{msg.content}</div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={sendMessage} className="message-form">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="message-input"
            maxLength={500}
          />
          <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
            <span>Send</span>
            <span className="send-icon">🚀</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
