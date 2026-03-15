import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ChatPage.css';
import { getApiUrl, getApiBase } from '../../utils/apiBase';
import socketService from '../../services/socketService';

const API = getApiUrl();

const ChatPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hackathon, setHackathon] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [presence, setPresence] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    console.log(`💬 ChatPage loaded for hackathon ID: ${id}`);
    fetchHackathonDetails();
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    let isMounted = true;
    socketService.connect(token)
      .then(() => {
        if (!isMounted) return;
        socketService.joinWorld(id);
        socketService.emit('joinTeam', { teamId: id });
      })
      .catch(() => {});

    const handleTyping = (payload) => {
      if (!payload) return;
      if (payload.userEmail === user.email) return;
      if (!payload.isTyping) {
        setTypingUsers((prev) => prev.filter(u => u.userEmail !== payload.userEmail));
        return;
      }
      setTypingUsers((prev) => {
        const existing = prev.filter(u => u.userEmail !== payload.userEmail);
        return [...existing, { ...payload, seenAt: Date.now() }];
      });
    };

    socketService.on('userTyping', handleTyping);

    const cleanupInterval = setInterval(() => {
      setTypingUsers((prev) => prev.filter(u => Date.now() - u.seenAt < 2000));
    }, 1000);

    return () => {
      isMounted = false;
      socketService.off('userTyping', handleTyping);
      clearInterval(cleanupInterval);
    };
  }, [id, user.email]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchHackathonDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/hackathons`, {
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
      const response = await fetch(`${API}/hackathons/${id}/messages`, {
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
        setPresence(data.presence || []);
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
      const response = await fetch(`${API}/hackathons/${id}/messages`, {
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
        socketService.setTyping(null, false, id);
        fetchMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleInputChange = (value) => {
    setNewMessage(value);
    if (!socketService.isSocketConnected()) return;

    if (!value) {
      socketService.setTyping(null, false, id);
      return;
    }
    socketService.setTyping(null, true, id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketService.setTyping(null, false, id);
    }, 1500);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert('File too large. Max 1MB.');
      e.target.value = '';
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API}/hackathons/${id}/messages/file`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.data]);
      } else {
        alert(data.error?.message || 'Failed to send file');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'offline';
    const diff = Date.now() - new Date(timestamp).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getFileUrl = (fileUrl) => {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('http')) return fileUrl;
    return `${getApiBase()}${fileUrl}`;
  };

  const downloadFile = async (fileUrl, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(getFileUrl(fileUrl), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        alert('Download failed or file expired.');
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Download failed.');
    }
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
          <div className="chat-presence">
            {presence
              .filter(p => p.email !== user.email)
              .map(p => (
                <span key={p.email} className="presence-chip">
                  {p.name}: {formatLastSeen(p.lastSeenAt)}
                </span>
              ))}
          </div>
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
                className={`message ${msg.senderEmail === user.email ? 'own-message' : 'other-message'}`}
              >
                <div className="message-header">
                  <span className="sender-name">{msg.sender}</span>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="message-content">
                  {msg.messageType === 'file' && msg.metadata ? (
                    <div className="file-message">
                      <div className="file-meta">
                        <span className="file-name">{msg.metadata.fileName}</span>
                        <span className="file-size">{Math.round(msg.metadata.fileSize / 1024)} KB</span>
                      </div>
                      <button
                        type="button"
                        className="file-download"
                        onClick={() => downloadFile(msg.metadata.fileUrl, msg.metadata.fileName)}
                      >
                        Download (expires in 6h)
                      </button>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.senderEmail === user.email && (
                  <div className="message-status">
                    <span className="ticks">
                      {(msg.seenBy || []).length > 1 ? '✓✓' : '✓'}
                    </span>
                    {(msg.seenBy || []).length > 1 && (
                      <span className="seen-by">
                        Seen by {msg.seenBy.filter(u => u.email !== user.email).map(u => u.name).join(', ')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {typingUsers.length > 0 && (
          <div className="typing-indicator">
            {typingUsers.map(u => u.userName).join(', ')} typing...
          </div>
        )}

        <form onSubmit={sendMessage} className="message-form">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Type your message..."
            className="message-input"
            maxLength={500}
          />
          <input
            type="file"
            ref={fileInputRef}
            className="file-input"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            📎
          </button>
          <button type="submit" className="send-btn" disabled={!newMessage.trim()}>
            <span>{uploading ? 'Uploading...' : 'Send'}</span>
            <span className="send-icon">🚀</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
