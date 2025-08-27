import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './Header.css';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
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
            to="/" 
            className={`nav-link ${isActive('/')}`}
          >
            📅 Calendar
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
