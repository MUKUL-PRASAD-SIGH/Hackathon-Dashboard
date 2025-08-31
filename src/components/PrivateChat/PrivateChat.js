import React, { useState, useEffect, useRef } from 'react';
import './PrivateChat.css';

const PrivateChat = ({ hackathonId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, [hackathonId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('💬 No auth token for chat');
        setMessages([{ sender: 'System', content: 'Please login to access chat.', timestamp: new Date() }]);
        return;
      }
      
      console.log(`💬 Fetching messages for hackathon: ${hackathonId}`);
      
      const response = await fetch(`http://localhost:10000/api/hackathons/${hackathonId}/messages`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`💬 API Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`💬 Chat API error: ${response.status} - ${errorText}`);
        
        if (response.status === 403) {
          setMessages([{ sender: 'System', content: 'Access denied. Only team members can view chat.', timestamp: new Date() }]);
        } else if (response.status === 404) {
          setMessages([{ sender: 'System', content: 'Hackathon not found.', timestamp: new Date() }]);
        } else if (response.status === 500) {
          setMessages([{ sender: 'System', content: 'Server error. Please try again later.', timestamp: new Date() }]);
        } else {
          setMessages([{ sender: 'System', content: `API Error: ${response.status}`, timestamp: new Date() }]);
        }
        return;
      }

      const data = await response.json();
      console.log(`💬 API Response data:`, data);
      
      if (data.success) {
        setMessages(data.messages || []);
        console.log(`💬 Loaded ${data.messages?.length || 0} messages`);
      } else {
        console.error('💬 API returned success: false');
        setMessages([{ sender: 'System', content: 'Failed to load messages.', timestamp: new Date() }]);
      }
    } catch (error) {
      console.error('💬 Network error fetching messages:', error);
      setMessages([{ sender: 'System', content: 'Network error. Check your connection.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageToSend = newMessage.trim();
    console.log(`💬 Sending message: "${messageToSend}" to hackathon: ${hackathonId}`);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please login to send messages.');
        return;
      }
      
      const response = await fetch(`http://localhost:10000/api/hackathons/${hackathonId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: messageToSend })
      });

      console.log(`💬 Send API Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`💬 Send message error: ${response.status} - ${errorText}`);
        
        if (response.status === 403) {
          alert('Access denied. Only team members can send messages.');
        } else if (response.status === 404) {
          alert('Hackathon not found.');
        } else if (response.status === 500) {
          alert('Server error. Please try again.');
        } else {
          alert(`Failed to send message. Error: ${response.status}`);
        }
        return;
      }

      const data = await response.json();
      console.log(`💬 Send API Response data:`, data);
      
      if (data.success) {
        setNewMessage('');
        fetchMessages(); // Refresh messages
        console.log('💬 Message sent successfully');
      } else {
        alert('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('💬 Network error sending message:', error);
      alert('Network error. Check your connection and try again.');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="chat-loading">Loading chat...</div>;
  }

  return (
    <div className="private-chat">
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>🚀 Start the conversation! Say hello to your team.</p>
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
          📤
        </button>
      </form>
    </div>
  );
};

export default PrivateChat;
