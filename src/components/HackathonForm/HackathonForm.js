import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import './HackathonForm.css';

const HackathonForm = ({ onAddHackathon, onUpdateHackathon, onReload, hackathons = [] }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  
  const [formData, setFormData] = useState({
    name: '',
    platform: '',
    email: '',
    team: 'Solo',
    date: '',
    rounds: 1,
    status: 'Planning',
    remarks: {},
    notifications: []
  });

  // Load hackathon data if in edit mode
  useEffect(() => {
    if (isEditMode && hackathons.length > 0) {
      const hackathonToEdit = hackathons.find(h => h._id === id || h.id === parseInt(id));
      if (hackathonToEdit) {
        setFormData({
          name: hackathonToEdit.name || '',
          platform: hackathonToEdit.platform || '',
          email: hackathonToEdit.email || '',
          team: hackathonToEdit.team || 'Solo',
          date: hackathonToEdit.date || '',
          rounds: hackathonToEdit.rounds || 1,
          status: hackathonToEdit.status || 'Planning',
          remarks: { ...(hackathonToEdit.remarks || {}) },
          notifications: [...(hackathonToEdit.notifications || [])]
        });
        
        // Set current round to the last round with a remark, or 1 if no remarks
        const roundNumbers = Object.keys(hackathonToEdit.remarks || {}).map(Number);
        setCurrentRound(roundNumbers.length > 0 ? Math.max(...roundNumbers) : 1);
        
        // Set selected notifications
        if (hackathonToEdit.notifications) {
          setSelectedNotifications(hackathonToEdit.notifications.map(n => n.trigger));
        }
      }
    }
  }, [id, hackathons, isEditMode]);

  const [currentRound, setCurrentRound] = useState(1);
  const [roundRemark, setRoundRemark] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState([]);

  const platforms = ['Devpost', 'HackerEarth', 'Topcoder', 'CodeChef', 'HackerRank', 'Other'];
  const teamOptions = ['Solo', 'Team'];
  const statusOptions = ['Planning', 'Participating', 'Won', 'Didn\'t qualify'];
  const notificationOptions = [
    '2 days before',
    '1 day before',
    '12 hours before',
    '6 hours before',
    '1 hour before',
    '30 minutes before',
    '15 minutes before',
    'Before each round',
    'Custom interval'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRoundRemark = () => {
    if (roundRemark.trim()) {
      setFormData(prev => ({
        ...prev,
        remarks: {
          ...prev.remarks,
          [`round${currentRound}`]: roundRemark
        }
      }));
      setRoundRemark('');
      setCurrentRound(prev => prev + 1);
    }
  };

  const handleNotificationToggle = (notification) => {
    setSelectedNotifications(prev => {
      if (prev.includes(notification)) {
        return prev.filter(n => n !== notification);
      } else {
        return [...prev, notification];
      }
    });
  };

  const handleCustomNotification = (e) => {
    const customValue = e.target.value;
    if (customValue) {
      setSelectedNotifications(prev => {
        const filtered = prev.filter(n => !n.startsWith('Custom:'));
        return [...filtered, `Custom: ${customValue}`];
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.platform || !formData.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    const hackathonData = {
      ...formData,
      date: new Date(formData.date).toISOString().split('T')[0], // Format date as YYYY-MM-DD
      notifications: selectedNotifications.map(trigger => ({ trigger }))
    };

    try {
      if (isEditMode) {
        // Update existing hackathon
        await onUpdateHackathon(id, hackathonData);
        toast.success('Hackathon updated successfully!');
      } else {
        // Add new hackathon
        await onAddHackathon(hackathonData);
        toast.success('Hackathon added successfully!');
      }
      
      // Reload data if callback provided
      if (onReload) {
        await onReload();
      }
      
      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving hackathon:', error);
      toast.error('Failed to save hackathon. Please try again.');
    }
  };

  const removeRoundRemark = (roundKey) => {
    setFormData(prev => {
      const newRemarks = { ...prev.remarks };
      delete newRemarks[roundKey];
      return { ...prev, remarks: newRemarks };
    });
  };

  return (
    <div className="hackathon-form">
      <div className="container">
        <div className="form-header">
          <h2>{isEditMode ? 'Edit Hackathon' : 'Add New Hackathon'}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="form">
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Hackathon Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="e.g., HackTheMountains"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Platform *</label>
                <select
                  name="platform"
                  value={formData.platform}
                  onChange={handleInputChange}
                  className="form-select"
                  required
                >
                  <option value="">Select Platform</option>
                  {platforms.map(platform => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="your@email.com"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Team Size</label>
                <select
                  name="team"
                  value={formData.team}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  {teamOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  {statusOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Number of Rounds</label>
              <input
                type="number"
                name="rounds"
                value={formData.rounds}
                onChange={handleInputChange}
                className="form-input"
                min="1"
                max="10"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Round Remarks</h3>
            <p className="section-description">
              Add remarks for each round of the hackathon
            </p>
            
            <div className="round-remarks">
              {Object.entries(formData.remarks).map(([round, remark]) => (
                <div key={round} className="round-remark-item">
                  <strong>{round}:</strong> {remark}
                  <button
                    type="button"
                    onClick={() => removeRoundRemark(round)}
                    className="remove-btn"
                  >
                    ×
                  </button>
                </div>
              ))}
              
              <div className="add-round-remark">
                <div className="round-input-group">
                  <select
                    value={currentRound}
                    onChange={(e) => setCurrentRound(parseInt(e.target.value))}
                    className="form-select"
                  >
                    {Array.from({ length: formData.rounds }, (_, i) => i + 1).map(round => (
                      <option key={round} value={round}>Round {round}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={roundRemark}
                    onChange={(e) => setRoundRemark(e.target.value)}
                    className="form-input"
                    placeholder="Enter round remark..."
                  />
                  <button
                    type="button"
                    onClick={handleRoundRemark}
                    className="btn btn-secondary"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Notification Settings</h3>
            <p className="section-description">
              Select when you want to receive notifications
            </p>
            
            <div className="notifications-grid">
              {notificationOptions.map(notification => (
                <label key={notification} className="notification-option">
                  <input
                    type="checkbox"
                    checked={selectedNotifications.includes(notification)}
                    onChange={() => handleNotificationToggle(notification)}
                  />
                  <span>{notification}</span>
                </label>
              ))}
            </div>
            
            <div className="form-group">
              <label className="form-label">Custom Notification Interval</label>
              <input
                type="text"
                placeholder="e.g., 3 days before, 2 hours before"
                onChange={handleCustomNotification}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditMode ? 'Update Hackathon' : 'Add Hackathon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HackathonForm;
