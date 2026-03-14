import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import UserGuide from '../UserGuide/UserGuide';
import PrivateChat from '../PrivateChat/PrivateChat';
import './Dashboard.css';
import './UserInfo.css';
import './VibrantCards.css';
import { getApiUrl } from '../../utils/apiBase';

const API = getApiUrl();

const Dashboard = ({ hackathons = [], loading, onUpdateHackathon, onDeleteHackathon, onReload, onCreateWorld }) => {
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
  const [joinedHackathons, setJoinedHackathons] = useState([]);
  const [loadingJoined, setLoadingJoined] = useState(true);
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
  const [invitingHackathon, setInvitingHackathon] = useState(null);
  const [viewingHackathon, setViewingHackathon] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('');
  const [inviteNote, setInviteNote] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [deletingHackathon, setDeletingHackathon] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinInviteLink, setJoinInviteLink] = useState('');
  
  // Check if user is new and should see guide
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenGuide');
    const isNewUser = localStorage.getItem('isNewUser');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    // Show guide only for new users who just registered
    if (!hasSeenGuide && isNewUser === 'true' && user.email) {
      setShowGuide(true);
      localStorage.removeItem('isNewUser'); // Remove flag after showing guide
    }
  }, []);

  const handleEdit = (hackathon) => {
    setEditingHackathon(hackathon);
    setEditFormData({
      status: hackathon.status,
      remarks: { ...hackathon.remarks }
    });
  };

  const handleDeleteWithConfirmation = (hackathon) => {
    setDeletingHackathon(hackathon);
    setDeleteConfirmText('');
  };
  
  const confirmDelete = () => {
    if (deleteConfirmText === 'DELETE') {
      onDeleteHackathon?.(deletingHackathon._id || deletingHackathon.id);
      setDeletingHackathon(null);
      setDeleteConfirmText('');
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
    console.log('🔄 Dashboard: hackathons changed', {
      count: hackathons?.length || 0,
      userEmail: userInfo?.email,
      hackathons: hackathons?.map(h => ({ 
        id: h._id || h.id, 
        name: h.name, 
        email: h.email, 
        createdBy: h.createdBy, 
        userId: h.userId 
      }))
    });
    applyFiltersAndSorting();
  }, [hackathons, filters, searchTerm, sortBy, sortOrder]);
  
  // Fetch joined hackathons
  useEffect(() => {
    fetchJoinedHackathons();
  }, []);
  
  const fetchJoinedHackathons = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoadingJoined(false);
        return;
      }
      
      const response = await fetch(API + '/hackathons/joined', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setJoinedHackathons(data.hackathons);
        console.log('🤝 Loaded joined hackathons:', data.hackathons.length);
      } else {
        console.log('🤝 No joined hackathons or error:', data.error?.message);
      }
    } catch (error) {
      console.error('Error fetching joined hackathons:', error);
    } finally {
      setLoadingJoined(false);
    }
  };
  
  // Auto-refresh disabled to prevent modal issues
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     if (onReload) {
  //       onReload();
  //     }
  //   }, 10000);
  //   return () => clearInterval(interval);
  // }, [onReload]);

  const applyFiltersAndSorting = () => {
    let filtered = [...hackathons];

    // Apply enhanced search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(h => 
        h.name.toLowerCase().includes(searchLower) ||
        h.platform.toLowerCase().includes(searchLower) ||
        h.status.toLowerCase().includes(searchLower) ||
        h.team.toLowerCase().includes(searchLower) ||
        (h.teamMembers && h.teamMembers.some(member => 
          member.name.toLowerCase().includes(searchLower) ||
          member.email.toLowerCase().includes(searchLower) ||
          member.role.toLowerCase().includes(searchLower)
        )) ||
        (h.remarks && Object.values(h.remarks).some(remark => 
          remark.toLowerCase().includes(searchLower)
        ))
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

  const toggleWorldVisibility = async (hackathon) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!hackathon.isPublicWorld) {
        // Make public using new route
        const response = await fetch(API + `/hackathons/${hackathon._id || hackathon.id}/make-public`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Update hackathon to mark as public
            onUpdateHackathon(hackathon._id || hackathon.id, {
              isPublicWorld: true,
              worldId: data.worldId
            });
            alert('✅ Hackathon world created! Other users can now find and join your hackathon.');
          }
        } else {
          const errorData = await response.json();
          console.error('Failed to create world:', errorData);
          alert('❌ Failed to create hackathon world: ' + (errorData.error?.message || 'Unknown error'));
        }
      } else {
        // Make private using new route
        const response = await fetch(API + `/hackathons/${hackathon._id || hackathon.id}/make-private`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Update hackathon to mark as private
            onUpdateHackathon(hackathon._id || hackathon.id, {
              isPublicWorld: false,
              worldId: null
            });
            alert('✅ Hackathon made private. It will no longer appear in public worlds.');
          }
        } else {
          const errorData = await response.json();
          console.error('Failed to make world private:', errorData);
          alert('❌ Failed to make hackathon private: ' + (errorData.error?.message || 'Unknown error'));
        }
      }
    } catch (error) {
      console.error('Toggle world visibility error:', error);
      alert('❌ Network error. Please try again.');
    }
  };

  const handleJoinHackathon = async (e) => {
    e.preventDefault();
    
    try {
      // Extract notification ID from invite link
      const url = new URL(joinInviteLink);
      const pathParts = url.pathname.split('/');
      const notificationId = pathParts[pathParts.length - 1];
      
      if (!notificationId) {
        alert('❌ Invalid invitation link format');
        return;
      }
      
      const token = localStorage.getItem('token');
      const response = await fetch(API + `/hackathons/accept-invite/${notificationId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('✅ Successfully joined the hackathon team!');
        setShowJoinModal(false);
        setJoinInviteLink('');
        fetchJoinedHackathons(); // Refresh joined hackathons
        onReload?.(); // Refresh main hackathons
      } else {
        alert('❌ ' + (data.error?.message || 'Failed to join hackathon'));
      }
    } catch (error) {
      console.error('Join hackathon error:', error);
      alert('❌ Invalid invitation link or network error');
    }
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API + `/hackathons/${invitingHackathon}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          note: inviteNote
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setShowConfirmation(true);
        // Don't close modal or reload immediately
        setTimeout(() => {
          setShowConfirmation(false);
          setInvitingHackathon(null);
          setInviteEmail('');
          setInviteRole('');
          setInviteNote('');
          // onReload?.(); // Removed auto-reload
        }, 2000);
      } else {
        const errorMsg = data.error?.message || 'Failed to send invitation';
        if (errorMsg.includes('not found') || errorMsg.includes('not registered')) {
          alert('❌ ' + errorMsg + '\n\nTip: Ask them to register at your platform first!');
        } else {
          alert('❌ ' + errorMsg);
        }
      }
    } catch (error) {
      console.error('Send invite error:', error);
      alert('Failed to send invitation');
    }
  };

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <div className="header-content">
            <div className="title-section">
              <h1 className="dashboard-title">
                <span className="title-icon">🚀</span>
                Hackathon Dashboard
                <span className="title-accent">✨</span>
              </h1>
              <p className="dashboard-subtitle">Manage your hackathon journey</p>
            </div>
            {userInfo && (
              <div className="user-profile">
                <div className="user-avatar">
                  {userInfo.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-details">
                  <span className="welcome-text">
                    Welcome back, <span className="user-name">{userInfo.name}</span>! 👋
                  </span>
                  <span className="user-email">
                    <span className="email-icon">📧</span>
                    {userInfo.email}
                  </span>
                </div>
                <button 
                  onClick={() => {
                    localStorage.clear();
                    navigate('/login');
                  }}
                  className="logout-btn"
                  title="Logout"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Filters and Search */}

        <div className="dashboard-controls">
          <div className="search-section">
            <div className="search-container">
              <div className="search-icon">🔍</div>
              <input
                type="text"
                placeholder="Search by name, platform, status, team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input enhanced"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="clear-search"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            {searchTerm && (
              <div className="search-info">
                Found {filteredHackathons.filter(h => h.createdBy === userInfo?.id || h.userId === userInfo?.id).length} result(s) for "<strong>{searchTerm}</strong>"
              </div>
            )}
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

        {/* My Hackathons (Created) */}
        <div className="hackathons-list">
          <h3 className="section-title">📊 My Hackathons ({filteredHackathons.filter(h => h.createdBy === userInfo?.id || h.userId === userInfo?.id).length})</h3>
          <p className="section-subtitle">Hackathons you created - You are the team leader</p>
          
          {filteredHackathons.filter(h => h.createdBy === userInfo?.id || h.userId === userInfo?.id).length === 0 ? (
            <div className="no-results">
              {searchTerm ? (
                <div className="search-no-results">
                  <div className="no-results-icon">🔍</div>
                  <h3>Oops! Nothing found</h3>
                  <p>No hackathons match "<strong>{searchTerm}</strong>"</p>
                  <p className="search-suggestions">
                    Try searching for:
                    <span className="suggestion-tags">
                      <span className="tag">hackathon name</span>
                      <span className="tag">platform</span>
                      <span className="tag">status</span>
                      <span className="tag">team member</span>
                    </span>
                  </p>
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="clear-search-btn"
                  >
                    ✨ Clear Search
                  </button>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🚀</div>
                  <h3>Ready to start your hackathon journey?</h3>
                  <p>No hackathons created yet.</p>
                  <Link to="/add-hackathon" className="create-first-btn">
                    🎯 Create your first hackathon!
                  </Link>
                </div>
              )}
            </div>
          ) : (
            filteredHackathons.filter(h => h.createdBy === userInfo?.id || h.userId === userInfo?.id).map(hackathon => (
              <div key={hackathon._id || hackathon.id} className="hackathon-item">

                <div className="hackathon-main">
                  <div className="hackathon-info">
                    <h4>{hackathon.name}</h4>
                    

                    
                    {/* Primary Action Buttons */}
                    <div className="primary-actions">
                      <button 
                        onClick={() => navigate(`/team/${hackathon._id}`)}
                        className="view-details-btn gradient-btn"
                      >
                        👁️ View Details
                      </button>
                      
                      {(hackathon.teamMembers?.length || 0) < (hackathon.maxParticipants || 4) - 1 && (
                        <button 
                          onClick={() => setInvitingHackathon(hackathon._id || hackathon.id)}
                          className="invite-btn gradient-btn"
                        >
                          📧 Invite Member
                        </button>
                      )}
                      
                      {(hackathon.teamMembers?.length || 0) >= (hackathon.maxParticipants || 4) - 1 && (
                        <div className="team-full-badge">
                          ✅ Team Complete
                        </div>
                      )}
                    </div>
                    <div className="team-leader-badge">
                      👑 Team Leader
                    </div>
                    
                    <div className="hackathon-meta grid grid-3">
                      <span><strong>Platform:</strong> {hackathon.platform}</span>
                      <span><strong>Team Size:</strong> {(hackathon.teamMembers?.length || 0) + 1}/{hackathon.maxParticipants || 4}</span>
                      <span><strong>Date:</strong> {new Date(hackathon.date).toLocaleDateString()}</span>
                    </div>
                    <div className="hackathon-meta grid grid-2">
                      <span><strong>Rounds:</strong> {hackathon.rounds}</span>
                      <span><strong>Status:</strong> {hackathon.isPublicWorld ? '🌍 Public' : '🔒 Private'}</span>
                    </div>
                  </div>
                  
                  <div className="hackathon-actions">
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(hackathon.status) }}
                    >
                      {hackathon.status}
                    </span>
                    
                    <div className="action-buttons">
                      <Link 
                        to={`/edit-hackathon/${hackathon._id || hackathon.id}`}
                        className="edit-button click-effect"
                        title="Edit hackathon"
                        aria-label="Edit hackathon"
                      >
                        ✏️
                      </Link>
                      <button
                        onClick={() => toggleWorldVisibility(hackathon)}
                        className={`world-toggle-btn click-effect ${hackathon.isPublicWorld ? 'public' : 'private'}`}
                        title={hackathon.isPublicWorld ? 'Make private' : 'Make public in Hackathon Worlds'}
                      >
                        {hackathon.isPublicWorld ? '🌍🔓' : '🌍🔒'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWithConfirmation(hackathon);
                        }}
                        className="delete-hackathon click-effect"
                        title="Delete hackathon"
                        aria-label="Delete hackathon"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    <div className="status-update">
                      <label>Update Status:</label>
                      <select
                        value={hackathon.status}
                        onChange={(e) => handleStatusUpdate(hackathon._id || hackathon.id, e.target.value)}
                        className="form-select click-effect"
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

        {/* Joined Hackathons */}
        <div className="hackathons-list joined-hackathons">
          <h3 className="section-title">🤝 Joined Hackathons ({joinedHackathons.length})</h3>
          <p className="section-subtitle">Hackathons you joined as a team member</p>
          
          {loadingJoined ? (
            <div className="loading">Loading joined hackathons...</div>
          ) : joinedHackathons.length === 0 ? (
            <div className="no-results">
              <p>No joined hackathons yet. Accept team invitations to see them here!</p>
            </div>
          ) : (
            joinedHackathons.map(hackathon => {
              const userMember = hackathon.teamMembers.find(m => m.email.toLowerCase() === userInfo?.email.toLowerCase());
              return (
                <div key={hackathon._id} className="hackathon-item joined-item">
                  <div className="hackathon-main">
                    <div className="hackathon-info">
                      <h4>{hackathon.name}</h4>
                      <div className="member-role-badge">
                        🎖️ {userMember?.role || 'Team Member'}
                      </div>
                      
                      <div className="hackathon-meta grid grid-3">
                        <span><strong>Platform:</strong> {hackathon.platform}</span>
                        <span><strong>Team Leader:</strong> {hackathon.userId}</span>
                        <span><strong>Date:</strong> {hackathon.date}</span>
                      </div>
                      <div className="hackathon-meta grid grid-2">
                        <span><strong>Team Size:</strong> {(hackathon.teamMembers?.length || 0) + 1}/{hackathon.maxParticipants || 4}</span>
                        <span><strong>Joined:</strong> {new Date(userMember?.joinedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="hackathon-actions">
                      <span 
                        className="status-badge"
                        style={{ backgroundColor: getStatusColor(hackathon.status) }}
                      >
                        {hackathon.status}
                      </span>
                      
                      <div className="action-buttons">
                        <button 
                          onClick={() => navigate(`/team/${hackathon._id}`)}
                          className="view-details-btn gradient-btn"
                        >
                          👁️ View Team
                        </button>
                        <button 
                          onClick={() => navigate(`/chat/${hackathon._id}`)}
                          className="chat-btn gradient-btn"
                        >
                          💬 Chat
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Invite Modal */}
        {invitingHackathon && (
          <div className="modal-overlay" onClick={() => setInvitingHackathon(null)}>
            <div className="modal-content invite-modal" onClick={(e) => e.stopPropagation()}>
              <h3>📧 Invite Team Member</h3>
              <form onSubmit={handleSendInvite} className="invite-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Enter email address"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Custom Role</label>
                    <input
                      type="text"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      placeholder="e.g., Frontend Developer"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Note (Optional)</label>
                  <textarea
                    value={inviteNote}
                    onChange={(e) => setInviteNote(e.target.value)}
                    placeholder="Add a personal message..."
                    rows="3"
                  />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn-primary click-effect">🚀 Send Invite</button>
                  <button type="button" onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInvitingHackathon(null);
                    setInviteEmail('');
                    setInviteRole('');
                    setInviteNote('');
                  }} className="btn-secondary click-effect">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Success Confirmation */}
        {showConfirmation && (
          <div className="confirmation-overlay">
            <div className="confirmation-popup">
              <div className="success-icon">✅</div>
              <h3>Invitation Sent!</h3>
              <p>Team member invitation has been sent successfully</p>
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Modal */}
        {deletingHackathon && (
          <div className="modal-overlay" onClick={() => setDeletingHackathon(null)}>
            <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()}>
              <h3>🚨 Delete Hackathon</h3>
              <p>This action cannot be undone. This will permanently delete <strong>{deletingHackathon.name}</strong>.</p>
              <p>Please type <strong>DELETE</strong> to confirm:</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className="delete-confirm-input"
              />
              <div className="modal-actions">
                <button 
                  onClick={confirmDelete}
                  disabled={deleteConfirmText !== 'DELETE'}
                  className={`btn-danger ${deleteConfirmText === 'DELETE' ? 'enabled' : 'disabled'}`}
                >
                  🗑️ Delete Hackathon
                </button>
                <button 
                  onClick={() => {
                    setDeletingHackathon(null);
                    setDeleteConfirmText('');
                  }} 
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Hackathon Details Modal */}
      {viewingHackathon && (
        <HackathonDetailsModal 
          hackathon={viewingHackathon}
          onClose={() => setViewingHackathon(null)}
          onReload={onReload}
        />
      )}
      
      {/* User Guide for New Users */}
      {showGuide && (
        <UserGuide 
          onComplete={() => setShowGuide(false)}
          onSkip={() => setShowGuide(false)}
        />
      )}
      
      {/* Join Hackathon Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content join-modal" onClick={(e) => e.stopPropagation()}>
            <h3>🔗 Join Private Hackathon</h3>
            <p>Enter the invitation link you received to join a private hackathon team:</p>
            <form onSubmit={handleJoinHackathon} className="join-form">
              <div className="form-group">
                <label>Invitation Link</label>
                <input
                  type="url"
                  value={joinInviteLink}
                  onChange={(e) => setJoinInviteLink(e.target.value)}
                  placeholder="https://hackathon-dashboard.com/accept-invite/..."
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  🚀 Join Team
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinInviteLink('');
                  }} 
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Hackathon Details Modal Component
const HackathonDetailsModal = ({ hackathon, onClose, onReload }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const totalMembers = (hackathon.teamMembers?.length || 0) + 1;
  
  const handleRemoveMember = async (memberEmail, memberName) => {
    if (window.confirm(`Remove ${memberName} from the team?`)) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(API + `/hackathons/${hackathon._id}/member/${encodeURIComponent(memberEmail)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        if (data.success) {
          alert(`✅ ${memberName} removed from team`);
          onReload?.();
          onClose();
        } else {
          alert(data.error?.message || 'Failed to remove member');
        }
      } catch (error) {
        alert('Error removing member');
      }
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{hackathon.name}</h2>
          <button onClick={onClose} className="modal-close-btn">✕</button>
        </div>
        
        <div className="modal-body">
          <div className="hackathon-info">
            <p><strong>Platform:</strong> {hackathon.platform}</p>
            <p><strong>Date:</strong> {new Date(hackathon.date).toLocaleDateString()}</p>
            <p><strong>Status:</strong> {hackathon.status}</p>
            <p><strong>Participants:</strong> {totalMembers}/{hackathon.maxParticipants || 4}</p>
          </div>
          
          <div className="modal-sections">
            <div className="team-section">
              <h3>Team Members ({totalMembers}/{hackathon.maxParticipants || 4})</h3>
              
              <div className="team-member leader">
                <span className="member-avatar">👑</span>
                <div className="member-info">
                  <span className="member-name">{user.name}</span>
                  <span className="member-email">({hackathon.email})</span>
                  <span className="member-role">Team Leader</span>
                </div>
              </div>
              
              {hackathon.teamMembers?.map((member, index) => (
                <div key={index} className="team-member">
                  <span className="member-avatar">{member.name.charAt(0).toUpperCase()}</span>
                  <div className="member-info">
                    <span className="member-name">{member.name}</span>
                    <span className="member-email">({member.email})</span>
                    <span className="member-role">{member.role}</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveMember(member.email, member.name)}
                    className="remove-member-btn"
                    title="Remove member"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
            
            <div className="chat-section">
              <h3>💬 Private Team Chat</h3>
              <PrivateChat hackathonId={hackathon._id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
