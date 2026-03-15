import { io } from 'socket.io-client';
import { getApiBase } from '../utils/apiBase';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.eventListeners = new Map();
  }

  // Connect to Socket.IO server
  connect(token) {
    if (this.socket && this.isConnected) {
      console.log('🔌 Socket already connected');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Use same URL detection as API
        const serverUrl = getApiBase() || '';
        
        console.log('🔌 Connecting to Socket.IO server:', serverUrl);
        
        this.socket = io(serverUrl, {
          auth: { token },
          transports: ['polling', 'websocket'],
          timeout: 20000,
          forceNew: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 2000
        });

        // Connection successful
        this.socket.on('connect', () => {
          console.log('✅ Socket connected successfully:', this.socket.id);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        // Connection confirmation from server
        this.socket.on('connected', (data) => {
          console.log('🎉 Server confirmed connection:', data);
        });

        // Connection error
        this.socket.on('connect_error', (error) => {
          console.error('❌ Socket connection error:', error.message);
          this.isConnected = false;
          
          if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
            reject(new Error('Authentication failed. Please login again.'));
          } else {
            // Don't reject immediately, let it retry
            console.log('🔄 Connection failed, will retry...');
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
              reject(new Error('Failed to connect to server after multiple attempts'));
            }
          }
        });

        // Disconnection handling
        this.socket.on('disconnect', (reason) => {
          console.log('🔌 Socket disconnected:', reason);
          this.isConnected = false;
          
          // Auto-reconnect for certain reasons
          if (reason === 'io server disconnect') {
            console.log('🔌 Server initiated disconnect');
          } else if (reason === 'transport close' || reason === 'ping timeout') {
            console.log('🔄 Connection lost, attempting to reconnect...');
          }
        });

        // Ping-pong for connection health
        this.socket.on('pong', (data) => {
          console.log('🏓 Pong received:', data.timestamp);
        });

        // Test response
        this.socket.on('testResponse', (data) => {
          console.log('🧪 Test response:', data);
        });

        // Error handling
        this.socket.on('error', (error) => {
          console.error('❌ Socket error:', error);
        });

        // Set connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            console.error('❌ Connection timeout');
            reject(new Error('Connection timeout'));
          }
        }, 15000);

      } catch (error) {
        console.error('❌ Socket initialization error:', error);
        reject(error);
      }
    });
  }

  // Disconnect from server
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventListeners.clear();
    }
  }

  // Check connection status
  isSocketConnected() {
    return this.socket && this.isConnected;
  }

  // Send ping to test connection
  ping() {
    if (this.isSocketConnected()) {
      console.log('🏓 Sending ping...');
      this.socket.emit('ping');
    }
  }

  // Test connection
  testConnection() {
    if (this.isSocketConnected()) {
      console.log('🧪 Testing connection...');
      this.socket.emit('test', { message: 'Connection test', timestamp: Date.now() });
    }
  }

  // Join hackathon world room
  joinWorld(hackathonWorldId) {
    if (this.isSocketConnected()) {
      console.log(`🌍 Joining world: ${hackathonWorldId}`);
      this.socket.emit('joinWorld', { hackathonWorldId });
    }
  }

  // Join DM room
  joinDm(dmKey) {
    if (this.isSocketConnected() && dmKey) {
      this.socket.emit('joinDm', { dmKey });
    }
  }

  // Leave DM room
  leaveDm(dmKey) {
    if (this.isSocketConnected() && dmKey) {
      this.socket.emit('leaveDm', { dmKey });
    }
  }

  // Leave hackathon world room
  leaveWorld(hackathonWorldId) {
    if (this.isSocketConnected()) {
      console.log(`🌍 Leaving world: ${hackathonWorldId}`);
      this.socket.emit('leaveWorld', { hackathonWorldId });
    }
  }

  // Send chat message
  sendMessage(hackathonWorldId, message, teamId = null) {
    if (this.isSocketConnected()) {
      this.socket.emit('chatMessage', {
        hackathonWorldId,
        teamId,
        message,
        timestamp: Date.now()
      });
    }
  }

  // Send typing indicator
  setTyping(hackathonWorldId, isTyping, teamId = null) {
    if (this.isSocketConnected()) {
      this.socket.emit('typing', {
        hackathonWorldId,
        teamId,
        isTyping,
        timestamp: Date.now()
      });
    }
  }

  // Send DM typing indicator
  setDmTyping(dmKey, isTyping) {
    if (this.isSocketConnected() && dmKey) {
      this.socket.emit('dmTyping', {
        dmKey,
        isTyping,
        timestamp: Date.now()
      });
    }
  }

  // Generic event listener
  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      
      // Store listener for cleanup
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event).push(callback);
    }
  }

  // Remove event listener
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      
      // Remove from stored listeners
      if (this.eventListeners.has(event)) {
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }
  }

  // Remove all listeners for an event
  removeAllListeners(event) {
    if (this.socket) {
      this.socket.removeAllListeners(event);
      this.eventListeners.delete(event);
    }
  }

  // Emit custom event
  emit(event, data) {
    if (this.isSocketConnected()) {
      this.socket.emit(event, data);
    }
  }

  // Get socket ID
  getSocketId() {
    return this.socket?.id || null;
  }
}

// Create singleton instance
const socketService = new SocketService();

export default socketService;
