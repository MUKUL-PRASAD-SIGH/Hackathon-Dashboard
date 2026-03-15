import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { getUserHackathons, createHackathon, updateHackathon, deleteHackathon } from './utils/hackathonApi';
import './App.css';
import Header from './components/Header/Header';
import Landing from './components/Landing/Landing';
import ThreeBackground from './components/ThreeBackground/ThreeBackground';
import CalendarView from './components/CalendarView/CalendarView';
import Dashboard from './components/Dashboard/Dashboard';
import HackathonForm from './components/HackathonForm/HackathonForm';
import GoogleCalendarSync from './components/GoogleCalendarSync/GoogleCalendarSync';
import RegisterWithOtp from './components/Auth/RegisterWithOtp';
import Login from './components/Auth/Login';
import DebugPanel from './components/DebugPanel';
import HackathonWorldsList from './components/HackathonWorlds/HackathonWorldsList';
import WorldDetail from './components/HackathonWorlds/WorldDetail';
import JoinHackathon from './components/JoinHackathon/JoinHackathon';
import AcceptInvite from './components/AcceptInvite/AcceptInvite';
import Notifications from './components/Notifications/Notifications';
import Profile from './components/Profile/Profile';
import Friends from './components/Friends/Friends';
import HackathonDetail from './components/HackathonDetail/HackathonDetail';
import TeamPage from './components/TeamPage/TeamPage';
import ChatPage from './components/ChatPage/ChatPage';
import OAuthCallback from './components/Auth/OAuthCallback';

const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (!token || !user) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return false;
  }
  try {
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return false;
    }
    JSON.parse(user);
    return true;
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return false;
  }
};

// Pages that should NOT show the header
const NO_HEADER_PATHS = ['/', '/login', '/register', '/oauth/callback'];

function App() {
  const [hackathons, setHackathons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorld, setSelectedWorld] = useState(null);
  const [worldsRefreshTrigger, setWorldsRefreshTrigger] = useState(0);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && !user) localStorage.removeItem('token');
  }, []);

  useEffect(() => {
    const onNav = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', onNav);
    return () => window.removeEventListener('popstate', onNav);
  }, []);

  const showHeader = !NO_HEADER_PATHS.includes(currentPath) && isAuthenticated();

  const loadUserHackathons = async () => {
    if (!isAuthenticated()) {
      setHackathons([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await getUserHackathons();
      const allHackathons = [
        ...(response.hackathons || []),
        ...(response.joinedHackathons || [])
      ];
      setHackathons(allHackathons);
    } catch (error) {
      console.error('Failed to load hackathons:', error);
      setHackathons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUserHackathons(); }, []);

  const getHackathonById = (id) => hackathons.find(h => h._id === id || h.id === Number(id));

  const addHackathon = async (newHackathon) => {
    try {
      const response = await createHackathon(newHackathon);
      await loadUserHackathons();
      return response.hackathon;
    } catch (error) {
      console.error('Failed to add hackathon:', error);
      throw error;
    }
  };

  const updateHackathonById = async (id, updates) => {
    try {
      await updateHackathon(id, updates);
      await loadUserHackathons();
    } catch (error) {
      console.error('Failed to update hackathon:', error);
      throw error;
    }
  };

  const deleteHackathonById = async (id) => {
    try {
      await deleteHackathon(id);
      await loadUserHackathons();
    } catch (error) {
      console.error('Failed to delete hackathon:', error);
      throw error;
    }
  };

  const createWorldFromHackathon = async (hackathon) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/worlds', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: hackathon.name,
          description: `Join the ${hackathon.name} hackathon community!`,
          startDate: hackathon.date,
          endDate: new Date(new Date(hackathon.date).getTime() + 2 * 24 * 60 * 60 * 1000),
          platform: hackathon.platform,
          maxTeamSize: 4
        })
      });
      const data = await response.json();
      if (data.success) {
        const joinResponse = await fetch(`/api/worlds/${data.world.id}/join`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ skills: [], preferredRole: 'Team Leader', experience: 'Expert' })
        });
        if (joinResponse.ok) window.location.href = '/worlds';
      }
    } catch (error) {
      console.error('Failed to create world:', error);
    }
  };

  const ProtectedRoute = ({ children }) =>
    isAuthenticated() ? children : <Navigate to="/login" />;

  return (
    <div className="App">
      <ThreeBackground />
      {showHeader && <Header />}
      <main className={showHeader ? 'main-content' : 'main-content main-content--full'}>
        <Routes>
          {/* Landing */}
          <Route path="/" element={
            isAuthenticated() ? <Navigate to="/dashboard" /> : <Landing />
          } />

          {/* Auth */}
          <Route path="/login" element={
            isAuthenticated() ? <Navigate to="/dashboard" /> : <Login />
          } />
          <Route path="/register" element={
            isAuthenticated() ? <Navigate to="/dashboard" /> : <RegisterWithOtp />
          } />
          <Route path="/oauth/callback" element={<OAuthCallback />} />

          {/* Protected */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard
                hackathons={hackathons}
                loading={loading}
                onUpdateHackathon={updateHackathonById}
                onDeleteHackathon={deleteHackathonById}
                onReload={loadUserHackathons}
                onCreateWorld={createWorldFromHackathon}
              />
            </ProtectedRoute>
          } />
          <Route path="/calendar" element={
            <ProtectedRoute>
              <CalendarView hackathons={hackathons} onUpdateHackathon={updateHackathonById} />
            </ProtectedRoute>
          } />
          <Route path="/add-hackathon" element={
            <ProtectedRoute>
              <HackathonForm onAddHackathon={addHackathon} onReload={loadUserHackathons} />
            </ProtectedRoute>
          } />
          <Route path="/edit-hackathon/:id" element={
            <ProtectedRoute>
              <HackathonForm hackathons={hackathons} onUpdateHackathon={updateHackathonById} onReload={loadUserHackathons} />
            </ProtectedRoute>
          } />
          <Route path="/google-sync" element={
            <ProtectedRoute>
              <GoogleCalendarSync hackathons={hackathons} />
            </ProtectedRoute>
          } />
          <Route path="/worlds" element={
            <ProtectedRoute>
              {selectedWorld ? (
                <WorldDetail
                  worldId={selectedWorld.id}
                  onBack={() => { setSelectedWorld(null); setWorldsRefreshTrigger(p => p + 1); }}
                />
              ) : (
                <HackathonWorldsList onSelectWorld={setSelectedWorld} refreshTrigger={worldsRefreshTrigger} />
              )}
            </ProtectedRoute>
          } />
          <Route path="/join-hackathon" element={<ProtectedRoute><JoinHackathon /></ProtectedRoute>} />
          <Route path="/accept-invite/:notificationId" element={<ProtectedRoute><AcceptInvite /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
          <Route path="/profile/:userId?" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/hackathon/:id" element={<ProtectedRoute><HackathonDetail /></ProtectedRoute>} />
          <Route path="/team/:id" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
          <Route path="/chat/:id" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

          <Route path="/logout" element={
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#050510' }}>
              <div style={{ textAlign:'center', fontFamily:'Orbitron,monospace', color:'#00ffff' }}>
                <h2 style={{ marginBottom:'1rem' }}>LOGGED OUT</h2>
                <button
                  style={{ background:'linear-gradient(135deg,#00ffff,#0088aa)', border:'none', borderRadius:'6px', padding:'0.75rem 1.5rem', fontFamily:'Orbitron,monospace', fontWeight:700, fontSize:'0.75rem', letterSpacing:'0.1em', cursor:'pointer', color:'#000' }}
                  onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
                >
                  GO TO LOGIN
                </button>
              </div>
            </div>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(8,8,24,0.95)',
            border: '1px solid rgba(0,255,255,0.2)',
            color: '#e0e8ff',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.88rem',
            backdropFilter: 'blur(12px)',
          },
          success: { iconTheme: { primary: '#00ff88', secondary: '#000' } },
          error: { iconTheme: { primary: '#ff3366', secondary: '#fff' } },
        }}
      />
      {process.env.NODE_ENV === 'development' && <DebugPanel />}
    </div>
  );
}

export default App;
