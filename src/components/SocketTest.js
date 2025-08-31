import React, { useState, useEffect } from 'react';
import socketService from '../services/socketService';

const SocketTest = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [messages, setMessages] = useState([]);
  const [testMessage, setTestMessage] = useState('');

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    if (token) {
      console.log('🔑 Token found, attempting connection...');
      connectSocket(token);
    } else {
      addMessage('❌ No authentication token found');
    }

    return () => {
      socketService.disconnect();
    };
  }, []);

  const addMessage = (message) => {
    setMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const connectSocket = async (token) => {
    try {
      setConnectionStatus('connecting');
      addMessage('🔄 Attempting to connect...');
      
      await socketService.connect(token);
      setConnectionStatus('connected');
      addMessage('✅ Connected successfully!');
      
      // Set up event listeners
      socketService.on('connected', (data) => {
        addMessage(`🎉 Server confirmed connection: ${data.socketId}`);
      });
      
      socketService.on('testResponse', (data) => {
        addMessage(`🧪 Test response: ${JSON.stringify(data)}`);
      });
      
      socketService.on('pong', (data) => {
        addMessage(`🏓 Pong received: ${data.timestamp}`);
      });
      
      socketService.on('error', (error) => {
        addMessage(`❌ Socket error: ${error.message}`);
      });
      
    } catch (error) {
      setConnectionStatus('error');
      addMessage(`❌ Connection failed: ${error.message}`);
    }
  };

  const testPing = () => {
    if (socketService.isSocketConnected()) {
      addMessage('🏓 Sending ping...');
      socketService.ping();
    } else {
      addMessage('❌ Socket not connected');
    }
  };

  const testConnection = () => {
    if (socketService.isSocketConnected()) {
      addMessage('🧪 Testing connection...');
      socketService.testConnection();
    } else {
      addMessage('❌ Socket not connected');
    }
  };

  const sendTestMessage = () => {
    if (socketService.isSocketConnected() && testMessage.trim()) {
      addMessage(`📤 Sending: ${testMessage}`);
      socketService.emit('test', { message: testMessage, timestamp: Date.now() });
      setTestMessage('');
    }
  };

  const reconnect = () => {
    const token = localStorage.getItem('token');
    if (token) {
      socketService.disconnect();
      setTimeout(() => connectSocket(token), 1000);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return '#4CAF50';
      case 'connecting': return '#FF9800';
      case 'error': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>🔌 Socket.IO Connection Test</h2>
      
      <div style={{ 
        padding: '10px', 
        backgroundColor: getStatusColor(), 
        color: 'white', 
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        Status: {connectionStatus.toUpperCase()}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={testPing} style={{ marginRight: '10px' }}>
          🏓 Send Ping
        </button>
        <button onClick={testConnection} style={{ marginRight: '10px' }}>
          🧪 Test Connection
        </button>
        <button onClick={reconnect}>
          🔄 Reconnect
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          placeholder="Enter test message..."
          style={{ padding: '5px', marginRight: '10px', width: '200px' }}
        />
        <button onClick={sendTestMessage}>📤 Send Test</button>
      </div>

      <div style={{ 
        height: '300px', 
        overflow: 'auto', 
        border: '1px solid #ccc', 
        padding: '10px',
        backgroundColor: '#f5f5f5'
      }}>
        <h3>📋 Connection Log:</h3>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: '5px' }}>
            {msg}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SocketTest;