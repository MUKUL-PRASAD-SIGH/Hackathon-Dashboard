import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import './HackathonForm.css';
import './EmailField.css';
import './RoundDates.css';
import './RemarksStyles.css';
import './ValidationStyles.css';

const HackathonForm = ({ onAddHackathon, onUpdateHackathon, onReload, hackathons = [] }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [formData, setFormData] = useState({
    name: '',
    platform: '',
    email: user.email || '',
    date: '',
    rounds: 1,
    roundDates: { 1: '' },
    status: 'Planning',
    remarks: {},
    notifications: [],
    maxParticipants: 4
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
  const [errors, setErrors] = useState({});

  const platforms = ['Devpost', 'HackerEarth', 'Topcoder', 'CodeChef', 'HackerRank', 'Other'];
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
    
    if (name === 'rounds') {
      const numRounds = parseInt(value) || 1;
      const newRoundDates = {};
      for (let i = 1; i <= numRounds; i++) {
        newRoundDates[i] = formData.roundDates?.[i] || '';
      }
      
      // Auto-adjust currentRound if it exceeds new rounds count
      if (currentRound > numRounds) {
        setCurrentRound(numRounds);
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: numRounds,
        roundDates: newRoundDates
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleRoundDateChange = (roundNumber, date) => {
    setFormData(prev => ({
      ...prev,
      roundDates: {
        ...prev.roundDates,
        [roundNumber]: date
      }
    }));
    
    // Validate date sequence immediately
    validateRoundDateSequence(roundNumber, date);
  };
  
  const validateRoundDateSequence = (changedRound, newDate) => {
    const newErrors = { ...errors };
    delete newErrors.dateSequence;
    
    if (!newDate) {
      setErrors(newErrors);
      return;
    }
    
    const currentDates = { ...formData.roundDates, [changedRound]: newDate };
    
    for (let i = 1; i < formData.rounds; i++) {
      const currentRoundDate = currentDates[i];
      const nextRoundDate = currentDates[i + 1];
      
      if (currentRoundDate && nextRoundDate) {
        if (new Date(currentRoundDate) >= new Date(nextRoundDate)) {
          newErrors.dateSequence = `Round ${i + 1} date must be after Round ${i} date`;
          break;
        }
      }
    }
    
    setErrors(newErrors);
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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Hackathon name is required';
    }
    
    if (!formData.platform) {
      newErrors.platform = 'Platform is required';
    }
    
    // Check if all round dates are filled
    const missingRoundDates = [];
    for (let i = 1; i <= formData.rounds; i++) {
      if (!formData.roundDates?.[i]) {
        missingRoundDates.push(i);
      }
    }
    
    if (missingRoundDates.length > 0) {
      newErrors.roundDates = `Round ${missingRoundDates.join(', ')} date(s) required`;
    }
    
    // Check round date sequence
    for (let i = 1; i < formData.rounds; i++) {
      const currentRoundDate = formData.roundDates[i];
      const nextRoundDate = formData.roundDates[i + 1];
      
      if (currentRoundDate && nextRoundDate) {
        if (new Date(currentRoundDate) >= new Date(nextRoundDate)) {
          newErrors.dateSequence = `Round ${i + 1} date must be after Round ${i} date`;
          break;
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fill in all required fields (marked in red)');
      return;
    }

    const hackathonData = {
      ...formData,
      email: user.email, // Always use profile email
      date: formData.roundDates[1] || new Date().toISOString().split('T')[0], // Use first round date
      notifications: selectedNotifications.map(trigger => ({ trigger })),
      remarks: formData.remarks, // Include round remarks
      roundDates: formData.roundDates // Include all round dates
    };

    try {
      if (isEditMode) {
        // Update existing hackathon
        await onUpdateHackathon(id, hackathonData);
        toast.success('Hackathon updated successfully!');
      } else {
        // Add new hackathon
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:10000/api/hackathons', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(hackathonData)
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error?.message || 'Failed to create hackathon');
        }
        
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
      console.error('Hackathon data being sent:', hackathonData);
      console.error('Error details:', error.message);
      toast.error(`Failed to save hackathon: ${error.message || 'Please try again'}`);
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
                  className={`form-input ${errors.name ? 'error' : ''}`}
                  placeholder="e.g., HackTheMountains"
                  required
                />
                {errors.name && <span className="error-message">{errors.name}</span>}
              </div>
              
              <div className="form-group">
                <label className="form-label">Platform *</label>
                <select
                  name="platform"
                  value={formData.platform}
                  onChange={handleInputChange}
                  className={`form-select ${errors.platform ? 'error' : ''}`}
                  required
                >
                  <option value="">Select Platform</option>
                  {platforms.map(platform => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))}
                </select>
                {errors.platform && <span className="error-message">{errors.platform}</span>}
              </div>
            </div>
            
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Team Leader Email</label>
                <input
                  type="email"
                  name="email"
                  value={user.email || ''}
                  className="form-input readonly"
                  placeholder="your@email.com"
                  readOnly
                  title="This is your profile email and cannot be changed"
                />
                <small className="form-hint">This email is from your profile and will be used as team leader contact</small>
              </div>
              

            </div>
            
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">Max Team Members</label>
                <select
                  name="maxParticipants"
                  value={formData.maxParticipants || 4}
                  onChange={handleInputChange}
                  className="form-select"
                >
                  <option value="1">1 (Solo)</option>
                  <option value="2">2 members</option>
                  <option value="3">3 members</option>
                  <option value="4">4 members</option>
                  <option value="5">5 members</option>
                  <option value="6">6 members</option>
                  <option value="8">8 members</option>
                  <option value="10">10 members</option>
                  <option value="custom">Custom</option>
                </select>
                {formData.maxParticipants === 'custom' && (
                  <input
                    type="number"
                    name="customMaxParticipants"
                    placeholder="Enter custom number"
                    min="1"
                    max="50"
                    className="form-input custom-input"
                    onChange={(e) => setFormData(prev => ({ ...prev, maxParticipants: parseInt(e.target.value) || 1 }))}
                  />
                )}
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
            
            
            <div className="rounds-dates-section">
              <h4>Round Dates</h4>
              {errors.dateSequence && (
                <div className="sequence-error">
                  ⚠️ {errors.dateSequence}
                </div>
              )}
              <div className="rounds-grid">
                {Array.from({ length: formData.rounds }, (_, i) => i + 1).map(roundNum => (
                  <div key={roundNum} className="round-date-group">
                    <label className="form-label">Round {roundNum} Date *</label>
                    <input
                      type="date"
                      value={formData.roundDates[roundNum] || ''}
                      onChange={(e) => handleRoundDateChange(roundNum, e.target.value)}
                      className={`form-input ${errors.roundDates && !formData.roundDates?.[roundNum] ? 'error' : ''}`}
                      required
                    />
                    {errors.roundDates && !formData.roundDates?.[roundNum] && (
                      <span className="error-message">Date required</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-2">
              
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
            

          </div>

          <div className="form-section remarks-section">
            <h3>Round Remarks</h3>
            <p className="section-description">
              Add detailed remarks for each round (max 500 characters per round)
            </p>
            
            <div className="round-remarks-container">
              {Object.entries(formData.remarks).map(([round, remark]) => (
                <div key={round} className="round-remark-display">
                  <div className="remark-header">
                    <strong>{round}:</strong>
                    <button
                      type="button"
                      onClick={() => removeRoundRemark(round)}
                      className="remove-btn"
                    >
                      ×
                    </button>
                  </div>
                  <div className="remark-content">{remark}</div>
                </div>
              ))}
              
              <div className="add-round-remark-section">
                <div className="remark-input-row">
                  <select
                    value={currentRound <= formData.rounds ? currentRound : 1}
                    onChange={(e) => setCurrentRound(parseInt(e.target.value))}
                    className="round-select"
                  >
                    {Array.from({ length: formData.rounds }, (_, i) => i + 1).map(round => (
                      <option key={round} value={round}>Round {round}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={roundRemark}
                    onChange={(e) => setRoundRemark(e.target.value.slice(0, 500))}
                    className="remark-input-large"
                    placeholder="Enter detailed round remark (max 500 characters)..."
                    maxLength={500}
                  />
                  <button
                    type="button"
                    onClick={handleRoundRemark}
                    className="add-remark-btn"
                  >
                    Add Remark
                  </button>
                </div>
                <div className="char-counter">
                  {roundRemark.length}/500 characters
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
