import React, { useEffect, useRef, useState } from 'react';
import { getApiUrl, getApiBase } from '../../utils/apiBase';
import './Friends.css';
import socketService from '../../services/socketService';

const API = getApiUrl();

const Friends = () => {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ sent: [], received: [] });
  const [friendEmail, setFriendEmail] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDmEmail, setActiveDmEmail] = useState('');
  const [dmMessages, setDmMessages] = useState([]);
  const [dmInput, setDmInput] = useState('');
  const [dmLoading, setDmLoading] = useState(false);
  const [dmError, setDmError] = useState('');
  const [dmPresence, setDmPresence] = useState([]);
  const [dmTyping, setDmTyping] = useState(false);
  const [dmUploading, setDmUploading] = useState(false);
  const dmFileInputRef = useRef(null);
  const dmTypingTimeoutRef = useRef(null);

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    if (friends.length > 0 && !activeDmEmail) {
      setActiveDmEmail(friends[0].email || friends[0].user?.email || '');
    }
  }, [friends, activeDmEmail]);

  useEffect(() => {
    if (activeDmEmail) {
      fetchDirectMessages(activeDmEmail);
    }
  }, [activeDmEmail]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    socketService.connect(token).catch(() => {});

    const handleDmTyping = (payload) => {
      if (!payload) return;
      if (payload.userEmail === JSON.parse(localStorage.getItem('user') || '{}')?.email) return;
      setDmTyping(!!payload.isTyping);
    };

    socketService.on('dmTyping', handleDmTyping);

    return () => {
      socketService.off('dmTyping', handleDmTyping);
    };
  }, []);

  useEffect(() => {
    const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')?._id;
    const friend = friends.find(f => (f.user?.email || f.email) === activeDmEmail);
    const friendId = friend?.user?._id;
    if (!currentUserId || !friendId) return;
    const dmKey = [currentUserId, friendId].sort().join(':');
    socketService.joinDm(dmKey);

    return () => {
      socketService.leaveDm(dmKey);
    };
  }, [activeDmEmail, friends]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(API + '/users/friends', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setFriends(data.friends || []);
        setRequests({ sent: data.sentRequests || [], received: data.receivedRequests || [] });
      } else {
        setError(data.error?.message || 'Failed to load friends');
      }
    } catch (err) {
      setError('Network error while loading friends');
    } finally {
      setLoading(false);
    }
  };

  const fetchDirectMessages = async (email) => {
    if (!email) return;
    try {
      setDmLoading(true);
      setDmError('');
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/users/dm/${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setDmMessages(data.messages || []);
        setDmPresence(data.presence || []);
      } else {
        setDmError(data.error?.message || 'Failed to load messages');
      }
    } catch (err) {
      setDmError('Network error while loading messages');
    } finally {
      setDmLoading(false);
    }
  };

  const sendDirectMessage = async (e) => {
    e.preventDefault();
    if (!activeDmEmail || !dmInput.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/users/dm/${encodeURIComponent(activeDmEmail)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: dmInput.trim() })
      });
      const data = await response.json();
      if (data.success) {
        setDmInput('');
        const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')?._id;
        const friend = friends.find(f => (f.user?.email || f.email) === activeDmEmail);
        const friendId = friend?.user?._id;
        if (currentUserId && friendId) {
          const dmKey = [currentUserId, friendId].sort().join(':');
          socketService.setDmTyping(dmKey, false);
        }
        setDmMessages((prev) => [...prev, data.message]);
      } else {
        setDmError(data.error?.message || 'Failed to send message');
      }
    } catch (err) {
      setDmError('Network error while sending message');
    }
  };

  const handleDmInputChange = (value) => {
    setDmInput(value);
    const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')?._id;
    const friend = friends.find(f => (f.user?.email || f.email) === activeDmEmail);
    const friendId = friend?.user?._id;
    if (!currentUserId || !friendId) return;
    const dmKey = [currentUserId, friendId].sort().join(':');

    if (!value) {
      socketService.setDmTyping(dmKey, false);
      return;
    }
    socketService.setDmTyping(dmKey, true);
    if (dmTypingTimeoutRef.current) clearTimeout(dmTypingTimeoutRef.current);
    dmTypingTimeoutRef.current = setTimeout(() => {
      socketService.setDmTyping(dmKey, false);
    }, 1500);
  };

  const handleDmFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setDmError('File too large. Max 1MB.');
      e.target.value = '';
      return;
    }

    try {
      setDmUploading(true);
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API}/users/dm/${encodeURIComponent(activeDmEmail)}/file`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setDmMessages((prev) => [...prev, data.message]);
      } else {
        setDmError(data.error?.message || 'Failed to send file');
      }
    } catch (err) {
      setDmError('Network error while sending file');
    } finally {
      setDmUploading(false);
      e.target.value = '';
    }
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
        setDmError('Download failed or file expired.');
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
    } catch (err) {
      setDmError('Download failed.');
    }
  };

  const sendFriendRequest = async (e) => {
    e.preventDefault();
    setActionMessage('');
    const email = friendEmail.trim().toLowerCase();
    if (!email) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API + '/users/friend-request', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (data.success) {
        setFriendEmail('');
        setActionMessage('✅ Friend request sent');
        fetchFriends();
      } else {
        setActionMessage(`❌ ${data.error?.message || 'Failed to send request'}`);
      }
    } catch (err) {
      setActionMessage('❌ Failed to send request');
    }
  };

  const handleRequestAction = async (email, action) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API + `/users/friend-request/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (data.success) {
        setActionMessage(`✅ Request ${action}ed`);
        fetchFriends();
      } else {
        setActionMessage(`❌ ${data.error?.message || 'Action failed'}`);
      }
    } catch {
      setActionMessage('❌ Action failed');
    }
  };

  if (loading) {
    return (
      <div className="friends-page">
        <div className="friends-loading">Loading friends...</div>
      </div>
    );
  }

  return (
    <div className="friends-page">
      <div className="friends-header">
        <h2>👥 Friends</h2>
        <p>People you’re connected with and the hackathons you share.</p>
      </div>

      <div className="friends-actions">
        <form onSubmit={sendFriendRequest} className="friends-add-form">
          <input
            type="email"
            placeholder="Add friend by email"
            value={friendEmail}
            onChange={(e) => setFriendEmail(e.target.value)}
            className="friends-add-input"
            required
          />
          <button type="submit" className="friends-add-btn">
            ➕ Send Request
          </button>
        </form>
        {actionMessage && <div className="friends-action-message">{actionMessage}</div>}
      </div>

      {requests.received.length > 0 && (
        <div className="friends-requests">
          <h3>Friend Requests</h3>
          {requests.received.map((request) => {
            const requestUser = request.user || { email: request.email };
            return (
              <div key={requestUser.email} className="friends-request-card">
                <span>{requestUser.name || 'User'} ({requestUser.email})</span>
                <div className="friends-request-actions">
                  <button onClick={() => handleRequestAction(requestUser.email, 'accept')} className="friends-accept">
                    ✅ Accept
                  </button>
                  <button onClick={() => handleRequestAction(requestUser.email, 'reject')} className="friends-reject">
                    ❌ Decline
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="friends-error">
          <p>❌ {error}</p>
        </div>
      )}

      {friends.length === 0 ? (
        <div className="friends-empty">
          <p>No friends yet. Add friends from this tab.</p>
        </div>
      ) : (
        <>
          <div className="friends-grid">
            {friends.map((friend) => {
              const friendUser = friend.user || { email: friend.email };
              return (
                <div key={friendUser.email} className="friend-card">
                  <div className="friend-avatar">
                    {friendUser.profile?.avatar ? (
                      <img src={friendUser.profile.avatar} alt={friendUser.name || friendUser.email} />
                    ) : (
                      (friendUser.name || friendUser.email || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="friend-info">
                    <h4>{friendUser.name || 'Friend'}</h4>
                    <p>{friendUser.email}</p>
                    <div className="friend-shared">
                      <span className="friend-shared-label">Shared Hackathons</span>
                      {friend.sharedHackathons?.length > 0 ? (
                        <div className="friend-shared-list">
                          {friend.sharedHackathons.map((shared) => (
                            <span key={`${shared.name}-${shared.date}`} className="friend-shared-pill">
                              {shared.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="friend-shared-empty">No shared hackathons yet</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="friends-dm">
            <div className="friends-dm-header">
              <h3>Private DMs (Friends Only)</h3>
              <p>Select a friend and chat privately. Messages are stored in MongoDB.</p>
            </div>
            <div className="friends-dm-grid">
              <div className="friends-dm-list">
                {friends.map((friend) => {
                  const friendUser = friend.user || { email: friend.email, name: friend.email };
                  const email = friendUser.email || friend.email;
                  return (
                    <button
                      key={email}
                      type="button"
                      className={`friends-dm-item ${activeDmEmail === email ? 'active' : ''}`}
                      onClick={() => setActiveDmEmail(email)}
                    >
                      <span className="friends-dm-name">{friendUser.name || 'Friend'}</span>
                      <span className="friends-dm-email">{email}</span>
                    </button>
                  );
                })}
              </div>
          <div className="friends-dm-chat">
            <div className="friends-dm-presence">
              {dmPresence
                .filter(p => p.email !== JSON.parse(localStorage.getItem('user') || '{}')?.email)
                .map(p => (
                  <span key={p.email}>
                    Last seen: {formatLastSeen(p.lastSeenAt)}
                  </span>
                ))}
            </div>
            {dmError && <div className="friends-dm-error">❌ {dmError}</div>}
            {dmLoading ? (
              <div className="friends-dm-loading">Loading messages...</div>
            ) : (
              <div className="friends-dm-messages">
                {dmMessages.length === 0 ? (
                  <div className="friends-dm-empty">No messages yet. Say hi!</div>
                ) : (
                  dmMessages.map((msg) => {
                    const isOwn = msg.sender?.email === JSON.parse(localStorage.getItem('user') || '{}')?.email;
                    return (
                      <div key={msg.id} className={`friends-dm-message ${isOwn ? 'own' : ''}`}>
                        <div className="friends-dm-meta">
                          <span>{msg.sender?.name || msg.sender?.email || 'User'}</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div className="friends-dm-content">
                          {msg.messageType === 'file' && msg.metadata ? (
                            <div className="friends-dm-file">
                              <div className="friends-dm-file-meta">
                                <span>{msg.metadata.fileName}</span>
                                <span>{Math.round(msg.metadata.fileSize / 1024)} KB</span>
                              </div>
                              <button
                                type="button"
                                className="friends-dm-file-link"
                                onClick={() => downloadFile(msg.metadata.fileUrl, msg.metadata.fileName)}
                              >
                                Download (expires in 6h)
                              </button>
                            </div>
                          ) : (
                            msg.content
                          )}
                        </div>
                        {isOwn && (
                          <div className="friends-dm-status">
                            {(msg.seenBy || []).length > 1 ? '✓✓' : '✓'}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
            {dmTyping && <div className="friends-dm-typing">Typing...</div>}
            <form className="friends-dm-form" onSubmit={sendDirectMessage}>
              <input
                type="text"
                placeholder={activeDmEmail ? 'Type a private message...' : 'Select a friend to start chatting'}
                value={dmInput}
                onChange={(e) => handleDmInputChange(e.target.value)}
                disabled={!activeDmEmail}
                className="friends-dm-input"
              />
              <input
                type="file"
                ref={dmFileInputRef}
                className="friends-dm-file-input"
                onChange={handleDmFileSelect}
              />
              <button
                type="button"
                className="friends-dm-attach"
                onClick={() => dmFileInputRef.current?.click()}
                disabled={!activeDmEmail || dmUploading}
              >
                📎
              </button>
              <button type="submit" className="friends-dm-send" disabled={!activeDmEmail || !dmInput.trim()}>
                {dmUploading ? 'Uploading...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Friends;
