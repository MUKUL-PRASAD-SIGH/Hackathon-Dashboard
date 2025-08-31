import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './Header.css';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');
  const [friendRequests, setFriendRequests] = useState([]);
  const [showFriendDropdown, setShowFriendDropdown] = useState(false);

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchFriendRequests();
      // Poll for new requests every 30 seconds
      const interval = setInterval(fetchFriendRequests, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.friend-requests-dropdown')) {
        setShowFriendDropdown(false);
      }
    };

    if (showFriendDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showFriendDropdown]);

  const fetchFriendRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('http://localhost:10000/api/users/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setFriendRequests(data.receivedRequests || []);
        }
      }
    } catch (error) {
      // Silently fail - server might be down
    }
  };

  const handleFriendRequest = async (email, action) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:10000/api/users/friend-request/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        fetchFriendRequests();
        toast.success(`Friend request ${action}ed!`);
      }
    } catch (error) {
      console.error('Error handling friend request:', error);
    }
  };

  const handleLogout = () => {
    // Clear all authentication data
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    toast.success('Logged out successfully!');
    
    // Force page reload to clear all state
    setTimeout(() => {
      window.location.href = '/login';
      window.location.reload();
    }, 500);
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-brand">
          <Link to="/" className="brand-link">
            <h1>🚀 Hackathon Dashboard</h1>
          </Link>
        </div>
        
        <nav className="header-nav">
          <Link 
            to="/profile" 
            className={`nav-link ${isActive('/profile')}`}
          >
            👤 Profile
          </Link>
          <Link 
            to="/dashboard" 
            className={`nav-link ${isActive('/dashboard')}`}
          >
            📊 Dashboard
          </Link>
          <Link 
            to="/add-hackathon" 
            className={`nav-link ${isActive('/add-hackathon')}`}
          >
            ➕ Add Hackathon
          </Link>
          <Link 
            to="/google-sync" 
            className={`nav-link ${isActive('/google-sync')}`}
          >
            📅 Google Sync
          </Link>
          <Link 
            to="/worlds" 
            className={`nav-link ${isActive('/worlds')}`}
          >
            🌍 Hackathon Worlds
          </Link>
          <Link 
            to="/notifications" 
            className={`nav-link ${isActive('/notifications')}`}
          >
            🔔 Notifications
          </Link>
          {isAuthenticated && friendRequests.length > 0 && (
            <div className="friend-requests-dropdown">
              <button 
                className="nav-link friend-requests-btn"
                onClick={() => setShowFriendDropdown(!showFriendDropdown)}
              >
                👥 Friends ({friendRequests.length})
              </button>
              {showFriendDropdown && (
                <div className="friend-requests-menu">
                  <h4>Friend Requests</h4>
                  {friendRequests.map(request => (
                    <div key={request.email} className="friend-request-item">
                      <span>{request.email}</span>
                      <div className="request-actions">
                        <button 
                          onClick={() => handleFriendRequest(request.email, 'accept')}
                          className="accept-btn"
                        >
                          ✅
                        </button>
                        <button 
                          onClick={() => handleFriendRequest(request.email, 'reject')}
                          className="reject-btn"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <Link 
            to="/calendar" 
            className={`nav-link ${isActive('/calendar')}`}
          >
            📅 Calendar
          </Link>
          {isAuthenticated && (
            <button 
              onClick={handleLogout}
              className="nav-link logout-btn"
            >
              🚪 Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
