import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
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
        </nav>
      </div>
    </header>
  );
};

export default Header;
