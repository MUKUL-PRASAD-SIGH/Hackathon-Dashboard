import React, { useState, useEffect } from 'react';
import '../src/debugEnv'; // Debug: Log environment variables
import EnvDebugPage from './EnvDebugPage';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { getUserHackathons, createHackathon, updateHackathon, deleteHackathon } from './utils/hackathonApi';
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
// Proper auth helper with validation
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  
  // Both token and user must exist
  if (!token || !user) {
    // Clear invalid state
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return false;
  }
  
  try {
    // Validate user data
    JSON.parse(user);
    return true;
  } catch {
    // Invalid user data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return false;
  }
};

// All hackathons are now loaded from MongoDB via API

// Hackathons are now loaded from MongoDB via API

function App() {
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Authentication state management
  useEffect(() => {
    // Check if user is properly authenticated
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && !user) {
      // Invalid state - clear token
      localStorage.removeItem('token');
    }
  }, []);
  
  // Load user's hackathons from database
  const loadUserHackathons = async () => {
    if (!isAuthenticated()) {
      console.log('🔒 Not authenticated, clearing hackathons');
      setHackathons([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log('📡 Loading hackathons from API...');
      const response = await getUserHackathons();
      console.log('📊 API Response:', response);
      console.log('📋 Hackathons array:', response.hackathons);
      console.log('📊 Setting hackathons count:', response.hackathons?.length || 0);
      setHackathons(response.hackathons || []);
    } catch (error) {
      console.error('❌ Failed to load hackathons:', error);
      setHackathons([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Load hackathons when component mounts or auth changes
  useEffect(() => {
    loadUserHackathons();
  }, []);

  // Note: Hackathons are now stored in MongoDB, not localStorage

  // Get a hackathon by ID (MongoDB uses _id)
  const getHackathonById = (id) => {
    return hackathons.find(h => h._id === id || h.id === Number(id));
  };

  // Add a new hackathon
  const addHackathon = async (newHackathon) => {
    try {
      console.log('🚀 Adding hackathon:', newHackathon);
      const response = await createHackathon(newHackathon);
      console.log('✅ Hackathon created:', response);
      await loadUserHackathons(); // Reload to get updated list
      return response.hackathon;
    } catch (error) {
      console.error('❌ Failed to add hackathon:', error);
      console.error('Error details:', error.message, error.stack);
      throw error;
    }
  };

  // Update an existing hackathon
  const updateHackathonById = async (id, updates) => {
    try {
      await updateHackathon(id, updates);
      await loadUserHackathons(); // Reload to get updated list
    } catch (error) {
      console.error('Failed to update hackathon:', error);
      throw error;
    }
  };

  // Delete a hackathon
  const deleteHackathonById = async (id) => {
    try {
      await deleteHackathon(id);
      await loadUserHackathons(); // Reload to get updated list
    } catch (error) {
      console.error('Failed to delete hackathon:', error);
      throw error;
    }
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
                  loading={loading}
                  onUpdateHackathon={updateHackathonById}
                  onDeleteHackathon={deleteHackathonById}
                  onReload={loadUserHackathons}
                />
              </ProtectedRoute>
            } />
            <Route path="/add-hackathon" element={
              <ProtectedRoute>
                <HackathonForm 
                  onAddHackathon={addHackathon}
                  onReload={loadUserHackathons}
                />
              </ProtectedRoute>
            } />
            <Route path="/edit-hackathon/:id" element={
              <ProtectedRoute>
                <HackathonForm 
                  hackathons={hackathons}
                  onUpdateHackathon={updateHackathonById}
                  onReload={loadUserHackathons}
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
                  window.location.href = '/register';
                }}>Go to Register</button>
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
