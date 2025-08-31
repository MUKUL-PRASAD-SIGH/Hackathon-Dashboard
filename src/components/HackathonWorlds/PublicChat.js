import React, { useState, useEffect, useRef, useContext } from 'react';
import { getApiBaseUrl } from '../../config/api';
import AuthContext from '../../contexts/AuthContext';
import { useWorldSocket } from '../../hooks/useSocket';

const PublicChat = ({ worldId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const { token, user } = useContext(AuthContext);
  
  // Use Socket.IO for real-time messaging
  const { 
    messages: socketMessages, 
    sendMessage, 
    setTyping, 
    typingUsers, 
    isConnected 
  } = useWorldSocket(worldId);

  useEffect(() => {
    fetchMessages();
  }, [worldId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, socketMessages]);

  // Merge socket messages with fetched messages
  useEffect(() => {
    if (socketMessages.length > 0) {
      setMessages(prev => {
        const allMessages = [...prev, ...socketMessages];
        // Remove duplicates based on message ID
        const uniqueMessages = allMessages.filter((msg, index, self) => 
          index === self.findIndex(m => m.id === msg.id)
        );
        return uniqueMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      });
    }
  }, [socketMessages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/worlds/${worldId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      } else {
        setError(data.error?.message || 'Failed to fetch messages');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Fetch messages error:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    if (isConnected) {
      // Send via Socket.IO for real-time delivery
      sendMessage(newMessage.trim());
    } else {
      // Fallback to REST API if socket not connected
      sendMessageViaAPI(newMessage.trim());
    }
    
    setNewMessage('');
  };

  const sendMessageViaAPI = async (message) => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/worlds/${worldId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();
      
      if (data.success) {
        await fetchMessages(); // Refresh messages
      } else {
        setError(data.error?.message || 'Failed to send message');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Send message error:', err);
    }
  };

  const handleTyping = (isTyping) => {
    if (isConnected) {
      setTyping(isTyping);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="chat-loading">
        <div className="loading-spinner"></div>
        <p>Loading chat...</p>
      </div>
    );
  }

  return (
    <div className="public-chat">
      <div className="chat-header">
        <h3>💬 Public Chat</h3>
        <div className="connection-status">
          {isConnected ? (
            <span className="status-online">🟢 Online</span>
          ) : (
            <span className="status-offline">🔴 Offline</span>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={() => setError(null)} className="close-error">×</button>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id} 
              className={`message ${message.sender?.email === user.email ? 'own-message' : 'other-message'}`}
            >
              <div className="message-header">
                <span className="message-sender">
                  {message.sender?.name || 'Unknown User'}
                </span>
                <span className="message-time">
                  {formatTime(message.createdAt)}
                </span>
              </div>
              <div className="message-content">
                {message.content}
              </div>
              {message.isEdited && (
                <div className="message-edited">
                  <small>edited</small>
                </div>
              )}
            </div>
          ))
        )}
        
        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="typing-indicators">
            {typingUsers.map(user => (
              <div key={user.userId} className="typing-indicator">
                <span>{user.userName} is typing...</span>
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <div className="chat-input-container">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onFocus={() => handleTyping(true)}
            onBlur={() => handleTyping(false)}
            placeholder="Type your message..."
            className="chat-input"
            maxLength={1000}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim() || (!isConnected && loading)}
            className="send-button"
          >
            📤
          </button>
        </div>
        <div className="chat-input-info">
          <small>
            {isConnected ? 'Real-time messaging enabled' : 'Offline mode - messages will sync when connected'}
          </small>
        </div>
      </form>
    </div>
  );
};

export default PublicChat;
