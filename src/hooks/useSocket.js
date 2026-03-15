import { useState, useEffect, useCallback, useContext } from 'react';
import socketService from '../services/socketService';
import AuthContext from '../contexts/AuthContext';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const { user, token } = useContext(AuthContext);

  // Connect to socket
  const connect = useCallback(async () => {
    if (!token || !user) {
      console.log('🔌 No token or user, skipping socket connection');
      return;
    }

    if (socketService.isSocketConnected()) {
      console.log('🔌 Socket already connected');
      setIsConnected(true);
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      await socketService.connect(token);
      setIsConnected(true);
      console.log('🔌 Socket connected successfully');
    } catch (error) {
      console.error('❌ Socket connection failed:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, [token, user]);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
    setConnectionError(null);
  }, []);

  // Auto-connect when user is authenticated
  useEffect(() => {
    if (user && token && !isConnected && !isConnecting) {
      connect();
    }
  }, [user, token, isConnected, isConnecting, connect]);

  // Auto-disconnect when user logs out
  useEffect(() => {
    if (!user || !token) {
      disconnect();
    }
  }, [user, token, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    connectionError,
    isConnecting,
    connect,
    disconnect,
    socket: socketService
  };
};

// Hook for hackathon world events
export const useWorldSocket = (hackathonWorldId) => {
  const { socket, isConnected } = useSocket();
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Join world room when connected
  useEffect(() => {
    if (isConnected && hackathonWorldId) {
      socket.joinWorld(hackathonWorldId);

      // Cleanup when leaving
      return () => {
        socket.leaveWorld(hackathonWorldId);
      };
    }
  }, [isConnected, hackathonWorldId, socket]);

  // Listen for world events
  useEffect(() => {
    if (!isConnected) return;

    // User joined world
    const handleUserJoined = (data) => {
      const user = data.user || {
        id: data.userId || data.socketId,
        name: data.userName,
        email: data.userEmail
      };
      console.log('👥 User joined:', user?.name || data.userName);
      if (user?.name) {
        setParticipants(prev => [...prev, user]);
      }
    };

    // User left world
    const handleUserLeft = (data) => {
      const userId = data.userId || data.socketId || data.user?.id;
      console.log('👋 User left:', userId);
      setParticipants(prev => prev.filter(p => p.id !== userId));
    };

    // New message
    const handleNewMessage = (data) => {
      const normalized = {
        id: data.id || data._id || `${data.timestamp || data.createdAt || Date.now()}`,
        content: data.content || data.message,
        sender: data.sender || (data.userName ? { name: data.userName, email: data.userEmail } : undefined),
        createdAt: data.createdAt || data.timestamp || Date.now(),
        isEdited: data.isEdited,
        messageType: data.messageType
      };
      console.log('💬 New message:', normalized);
      setMessages(prev => [...prev, normalized]);
    };

    // Typing indicator
    const handleUserTyping = (data) => {
      if (data.isTyping) {
        setTypingUsers(prev => [...prev.filter(u => u.userId !== data.userId), data]);
      } else {
        setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
      }
    };

    // Register event listeners
    socket.on('userJoined', handleUserJoined);
    socket.on('userLeft', handleUserLeft);
    socket.on('newMessage', handleNewMessage);
    socket.on('userTyping', handleUserTyping);

    // Cleanup listeners
    return () => {
      socket.off('userJoined', handleUserJoined);
      socket.off('userLeft', handleUserLeft);
      socket.off('newMessage', handleNewMessage);
      socket.off('userTyping', handleUserTyping);
    };
  }, [isConnected, socket]);

  // Send message
  const sendMessage = useCallback((message) => {
    if (isConnected && hackathonWorldId) {
      socket.sendMessage(hackathonWorldId, message);
    }
  }, [isConnected, hackathonWorldId, socket]);

  // Set typing status
  const setTyping = useCallback((isTyping) => {
    if (isConnected && hackathonWorldId) {
      socket.setTyping(hackathonWorldId, isTyping);
    }
  }, [isConnected, hackathonWorldId, socket]);

  return {
    participants,
    messages,
    typingUsers,
    sendMessage,
    setTyping,
    isConnected
  };
};

// Hook for team events
export const useTeamSocket = (teamId) => {
  const { socket, isConnected } = useSocket();
  const [teamMessages, setTeamMessages] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  // Listen for team events
  useEffect(() => {
    if (!isConnected || !teamId) return;

    // Team message
    const handleTeamMessage = (data) => {
      console.log('👥 Team message:', data);
      setTeamMessages(prev => [...prev, data]);
    };

    // Member joined team
    const handleMemberJoined = (data) => {
      console.log('👥 Member joined team:', data);
      setTeamMembers(prev => [...prev, data.member]);
    };

    // Member left team
    const handleMemberLeft = (data) => {
      console.log('👋 Member left team:', data);
      setTeamMembers(prev => prev.filter(m => m.id !== data.memberId));
    };

    // Register listeners
    socket.on('teamMessage', handleTeamMessage);
    socket.on('memberJoined', handleMemberJoined);
    socket.on('memberLeft', handleMemberLeft);

    // Cleanup
    return () => {
      socket.off('teamMessage', handleTeamMessage);
      socket.off('memberJoined', handleMemberJoined);
      socket.off('memberLeft', handleMemberLeft);
    };
  }, [isConnected, teamId, socket]);

  // Send team message
  const sendTeamMessage = useCallback((message) => {
    if (isConnected && teamId) {
      socket.sendMessage(null, message, teamId); // null hackathonWorldId for team messages
    }
  }, [isConnected, teamId, socket]);

  return {
    teamMessages,
    teamMembers,
    sendTeamMessage,
    isConnected
  };
};
