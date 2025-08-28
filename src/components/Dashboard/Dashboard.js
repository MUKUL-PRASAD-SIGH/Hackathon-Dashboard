import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Dashboard.css';
import './UserInfo.css';

const Dashboard = ({ hackathons = [], loading, onUpdateHackathon, onDeleteHackathon, onReload }) => {
  const navigate = useNavigate();
  
  // Get user info from localStorage
  const getUserInfo = () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  };
  
  const userInfo = getUserInfo();
  const [filteredHackathons, setFilteredHackathons] = useState([]);
  const [filters, setFilters] = useState({
    platform: '',
    team: '',
    status: '',
    dateRange: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('asc');
  const [editingHackathon, setEditingHackathon] = useState(null);
  const [editFormData, setEditFormData] = useState({
    status: '',
    remarks: {}
  });

  const handleEdit = (hackathon) => {
    setEditingHackathon(hackathon);
    setEditFormData({
      status: hackathon.status,
      remarks: { ...hackathon.remarks }
    });
  };

  const handleDelete = (hackathonId) => {
    if (window.confirm('Are you sure you want to delete this hackathon? This action cannot be undone.')) {
      onDeleteHackathon?.(hackathonId);
    }
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (editingHackathon && onUpdateHackathon) {
      onUpdateHackathon(editingHackathon.id, {
        status: editFormData.status,
        remarks: { ...editFormData.remarks }
      });
      setEditingHackathon(null);
    }
  };

  // Update filtered hackathons when hackathons or filters change
  useEffect(() => {
    applyFiltersAndSorting();
  }, [hackathons, filters, searchTerm, sortBy, sortOrder]);

  const applyFiltersAndSorting = () => {
    let filtered = [...hackathons];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(h => 
        h.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.platform.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.platform) {
      filtered = filtered.filter(h => h.platform === filters.platform);
    }
    if (filters.team) {
      filtered = filtered.filter(h => h.team === filters.team);
    }
    if (filters.status) {
      filtered = filtered.filter(h => h.status === filters.status);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'platform':
          aValue = a.platform.toLowerCase();
          bValue = b.platform.toLowerCase();
          break;
        default:
          aValue = a[sortBy];
          bValue = b[sortBy];
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredHackathons(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleStatusUpdate = (hackathonId, newStatus) => {
    if (onUpdateHackathon) {
      onUpdateHackathon(hackathonId, { status: newStatus });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Won': return 'var(--success-color)';
      case 'Participating': return 'var(--primary-color)';
      case 'Didn\'t qualify': return 'var(--error-color)';
      case 'Planning': return 'var(--warning-color)';
      default: return 'var(--text-secondary)';
    }
  };

  const getUniqueValues = (field) => {
    const values = hackathons.map(h => h[field]);
    return [...new Set(values.filter(Boolean))];
  };

  const stats = {
    total: hackathons?.length || 0,
    participating: hackathons?.filter(h => h.status === 'Participating').length || 0,
    won: hackathons?.filter(h => h.status === 'Won').length || 0,
    planning: hackathons?.filter(h => h.status === 'Planning').length || 0,
  };

  const handleRemarksChange = (hackathonId, round, newRemark) => {
    if (onUpdateHackathon) {
      const hackathon = hackathons.find(h => h.id === hackathonId);
      if (hackathon) {
        onUpdateHackathon(hackathonId, {
          remarks: {
            ...hackathon.remarks,
            [round]: newRemark
          }
        });
      }
    }
  };

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h2 className="section-title">📊 Hackathon Dashboard</h2>
          {userInfo && (
            <div className="user-info">
              <span className="welcome-text">Welcome back, <strong>{userInfo.name}</strong>!</span>
              <span className="user-email">{userInfo.email}</span>
            </div>
          )}
        </div>
        
        {/* Filters and Search */}
        <div className="dashboard-controls">
          <div className="search-section">
            <input
              type="text"
              placeholder="Search hackathons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="filters-section grid grid-4">
            <div className="form-group">
              <label className="form-label">Platform</label>
              <select
                value={filters.platform}
                onChange={(e) => handleFilterChange('platform', e.target.value)}
                className="form-select"
              >
                <option value="">All Platforms</option>
                {getUniqueValues('platform').map(platform => (
                  <option key={platform} value={platform}>{platform}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Team Size</label>
              <select
                value={filters.team}
                onChange={(e) => handleFilterChange('team', e.target.value)}
                className="form-select"
              >
                <option value="">All Teams</option>
                {getUniqueValues('team').map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="form-select"
              >
                <option value="">All Status</option>
                {getUniqueValues('status').map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label className="form-label">Sort By</label>
              <div className="sort-controls">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="form-select"
                >
                  <option value="date">Date</option>
                  <option value="name">Name</option>
                  <option value="platform">Platform</option>
                  <option value="rounds">Rounds</option>
                </select>
                <button
                  className={`sort-btn ${sortOrder === 'asc' ? 'asc' : 'desc'}`}
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="stats-section grid grid-4">
          <div className="stat-card">
            <h3>Total Hackathons</h3>
            <p className="stat-number">{stats.total}</p>
          </div>
          <div className="stat-card">
            <h3>Participating</h3>
            <p className="stat-number">{stats.participating}</p>
          </div>
          <div className="stat-card">
            <h3>Won</h3>
            <p className="stat-number">{stats.won}</p>
          </div>
          <div className="stat-card">
            <h3>Planning</h3>
            <p className="stat-number">{stats.planning}</p>
          </div>
        </div>

        {/* Hackathons List */}
        <div className="hackathons-list">
          <h3 className="section-title">Hackathons ({filteredHackathons.length})</h3>
          
          {filteredHackathons.length === 0 ? (
            <div className="no-results">
              <p>No hackathons found matching your criteria.</p>
            </div>
          ) : (
            filteredHackathons.map(hackathon => (
              <div key={hackathon._id || hackathon.id} className="hackathon-item">
                <button 
                  className="delete-hackathon"
                  onClick={() => handleDelete(hackathon._id || hackathon.id)}
                  title="Delete hackathon"
                  aria-label="Delete hackathon"
                >
                  ×
                </button>
                <div className="hackathon-main">
                  <div className="hackathon-info">
                    <h4>{hackathon.name}</h4>
                    <div className="hackathon-meta grid grid-3">
                      <span><strong>Platform:</strong> {hackathon.platform}</span>
                      <span><strong>Team:</strong> {hackathon.team}</span>
                      <span><strong>Date:</strong> {hackathon.date}</span>
                    </div>
                    <div className="hackathon-meta grid grid-2">
                      <span><strong>Rounds:</strong> {hackathon.rounds}</span>
                      <span><strong>Email:</strong> {hackathon.email}</span>
                    </div>
                  </div>
                  
                  <div className="hackathon-actions">
                    <div className="action-buttons">
                      <Link 
                        to={`/edit-hackathon/${hackathon._id || hackathon.id}`}
                        className="edit-button"
                        title="Edit hackathon"
                        aria-label="Edit hackathon"
                      >
                        ✏️
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(hackathon._id || hackathon.id);
                        }}
                        className="delete-hackathon"
                        title="Delete hackathon"
                        aria-label="Delete hackathon"
                      >
                        ×
                      </button>
                    </div>
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(hackathon.status) }}
                    >
                      {hackathon.status}
                    </span>
                    
                    <div className="status-update">
                      <label>Update Status:</label>
                      <select
                        value={hackathon.status}
                        onChange={(e) => handleStatusUpdate(hackathon._id || hackathon.id, e.target.value)}
                        className="form-select"
                      >
                        <option value="Planning">Planning</option>
                        <option value="Participating">Participating</option>
                        <option value="Won">Won</option>
                        <option value="Didn't qualify">Didn't qualify</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                {hackathon.remarks && (
                  <div className="hackathon-remarks">
                    <strong>Remarks:</strong>
                    <ul>
                      {Object.entries(hackathon.remarks).map(([round, remark]) => (
                        <li key={round}>
                          <strong>{round}:</strong> {remark}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {hackathon.notifications && (
                  <div className="hackathon-notifications">
                    <strong>Notifications:</strong>
                    <ul>
                      {hackathon.notifications.map((notification, index) => (
                        <li key={index}>{notification.trigger}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
