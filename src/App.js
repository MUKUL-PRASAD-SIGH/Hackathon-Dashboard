import React, { useState, useEffect } from 'react';
import '../src/debugEnv'; // Debug: Log environment variables
import EnvDebugPage from './EnvDebugPage';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import Header from './components/Header/Header';
import CalendarView from './components/CalendarView/CalendarView';
import Dashboard from './components/Dashboard/Dashboard';
import HackathonForm from './components/HackathonForm/HackathonForm';
import GoogleCalendarSync from './components/GoogleCalendarSync/GoogleCalendarSync';
import RegisterWithOtp from './components/Auth/RegisterWithOtp';
import Login from './components/Auth/Login';
import DebugPanel from './components/DebugPanel';
import ConnectionTest from './components/ConnectionTest';
// Simple auth helper
const isAuthenticated = () => !!localStorage.getItem('token');

// Default hackathon data for first-time users
const defaultHackathons = [
  {
    id: 1,
    name: 'HackTheMountains',
    platform: 'Devpost',
    email: 'test@example.com',
    team: 'Solo',
    date: '2025-01-15',
    rounds: 3,
    status: 'Planning',
    remarks: {
      round1: 'Registration open',
      round2: 'Project submission',
      round3: 'Final presentation'
    },
    notifications: [
      { trigger: '2 days before' },
      { trigger: 'before each round' }
    ]
  },
  {
    id: 2,
    name: 'CodeFest 2025',
    platform: 'HackerEarth',
    email: 'test@example.com',
    team: '2-4 members',
    date: '2025-02-20',
    rounds: 2,
    status: 'Participating',
    remarks: {
      round1: 'Ideation phase',
      round2: 'Development phase'
    },
    notifications: [
      { trigger: '1 hour before' }
    ]
  },
  {
    id: 3,
    name: 'Innovation Challenge',
    platform: 'Devpost',
    email: 'test@example.com',
    team: '5+ members',
    date: '2025-03-10',
    rounds: 4,
    status: 'Won',
    remarks: {
      round1: 'Initial screening',
      round2: 'Prototype development',
      round3: 'Final presentation',
      round4: 'Award ceremony'
    },
    notifications: [
      { trigger: '2 days before' },
      { trigger: 'before each round' }
    ]
  }
];

// Load hackathons from localStorage or use default data
const loadHackathons = () => {
  try {
    const saved = localStorage.getItem('hackathons');
    return saved ? JSON.parse(saved) : defaultHackathons;
  } catch (error) {
    console.error('Failed to load hackathons:', error);
    return defaultHackathons;
  }
};

function App() {
  const [hackathons, setHackathons] = useState(loadHackathons);
  
  // Clear auth for testing (remove this in production)
  useEffect(() => {
    // Uncomment next line to test authentication flow
    // localStorage.removeItem('token');
  }, []);

  // Save to localStorage whenever hackathons change
  useEffect(() => {
    try {
      localStorage.setItem('hackathons', JSON.stringify(hackathons));
    } catch (error) {
      console.error('Failed to save hackathons:', error);
    }
  }, [hackathons]);

  // Get a hackathon by ID
  const getHackathonById = (id) => {
    return hackathons.find(h => h.id === Number(id));
  };

  // Add a new hackathon
  const addHackathon = (newHackathon) => {
    const newId = Math.max(0, ...hackathons.map(h => h.id)) + 1;
    const hackathonWithId = { 
      ...newHackathon, 
      id: newId,
      notifications: Array.isArray(newHackathon.notifications) 
        ? newHackathon.notifications 
        : []
    };
    
    setHackathons(prevHackathons => [...prevHackathons, hackathonWithId]);
    return hackathonWithId;
  };

  // Update an existing hackathon
  const updateHackathon = (id, updates) => {
    setHackathons(prevHackathons => 
      prevHackathons.map(hackathon => 
        hackathon.id === id ? { ...hackathon, ...updates } : hackathon
      )
    );
  };

  // Update an existing hackathon by ID
  const updateHackathonById = (id, updatedHackathon) => {
    setHackathons(prevHackathons =>
      prevHackathons.map(hackathon =>
        hackathon.id === id ? { ...hackathon, ...updatedHackathon } : hackathon
      )
    );
  };

  // Delete a hackathon
  const deleteHackathon = (id) => {
    setHackathons(prevHackathons => 
      prevHackathons.filter(hackathon => hackathon.id !== id)
    );
  };

  // Protected Route component
  const ProtectedRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <div className="App">
        <Header />
        <main className="main-content">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              isAuthenticated() ? 
                <Navigate to="/dashboard" /> : 
                <Login />
            } />
            <Route path="/register" element={
              isAuthenticated() ? 
                <Navigate to="/dashboard" /> : 
                <RegisterWithOtp />
            } />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <CalendarView hackathons={hackathons} />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard 
                  hackathons={hackathons} 
                  onUpdateHackathon={updateHackathon}
                  onDeleteHackathon={deleteHackathon}
                />
              </ProtectedRoute>
            } />
            <Route path="/add-hackathon" element={
              <ProtectedRoute>
                <HackathonForm onAddHackathon={addHackathon} />
              </ProtectedRoute>
            } />
            <Route path="/edit-hackathon/:id" element={
              <ProtectedRoute>
                <HackathonForm 
                  hackathons={hackathons}
                  onUpdateHackathon={updateHackathonById}
                />
              </ProtectedRoute>
            } />
            <Route path="/google-sync" element={
              <ProtectedRoute>
                <GoogleCalendarSync hackathons={hackathons} />
              </ProtectedRoute>
            } />
            
            {/* Debug Routes */}
            <Route path="/env-debug" element={<EnvDebugPage />} />
            <Route path="/connection-test" element={<ConnectionTest />} />
            <Route path="/logout" element={
              <div style={{padding: '20px', textAlign: 'center'}}>
                <h2>Logged Out</h2>
                <p>You have been logged out successfully.</p>
                <button onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  window.location.href = '/login';
                }}>Go to Login</button>
              </div>
            } />
            
            {/* Redirect all other routes to home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <Toaster position="top-right" />
        {process.env.NODE_ENV === 'development' && <DebugPanel />}
      </div>
    </Router>
  );
}

export default App;
