import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import googleCalendarService from '../../services/googleCalendarService';
import './GoogleCalendarSync.css';

const GoogleCalendarSync = ({ hackathons, onHackathonUpdate }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [syncedEvents, setSyncedEvents] = useState(new Set());

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      await googleCalendarService.initialize();
      setIsConnected(googleCalendarService.isUserSignedIn());
    } catch (error) {
      console.error('Failed to check Google Calendar status:', error);
    }
  };

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await googleCalendarService.signIn();
      setIsConnected(true);
      toast.success('🎉 Connected to Google Calendar!');
    } catch (error) {
      toast.error('Failed to connect to Google Calendar');
      console.error('Google Calendar connection error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await googleCalendarService.signOut();
      setIsConnected(false);
      setSyncedEvents(new Set());
      toast.success('Disconnected from Google Calendar');
    } catch (error) {
      toast.error('Failed to disconnect from Google Calendar');
      console.error('Google Calendar disconnect error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncHackathon = async (hackathon) => {
    if (!isConnected) {
      toast.error('Please connect to Google Calendar first');
      return;
    }

    setIsLoading(true);
    try {
      const event = await googleCalendarService.createHackathonEvent(hackathon);
      setSyncedEvents(prev => new Set([...prev, hackathon.id]));
      
      // Update hackathon with calendar event ID
      if (onHackathonUpdate) {
        onHackathonUpdate(hackathon.id, { 
          ...hackathon, 
          calendarEventId: event.id 
        });
      }
      
      toast.success(`📅 ${hackathon.name} synced to Google Calendar!`);
    } catch (error) {
      toast.error('Failed to sync hackathon to calendar');
      console.error('Sync error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const syncAllHackathons = async () => {
    if (!isConnected) {
      toast.error('Please connect to Google Calendar first');
      return;
    }

    setIsLoading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const hackathon of hackathons) {
      if (!syncedEvents.has(hackathon.id) && !hackathon.calendarEventId) {
        try {
          await syncHackathon(hackathon);
          successCount++;
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          errorCount++;
          console.error(`Failed to sync ${hackathon.name}:`, error);
        }
      }
    }

    setIsLoading(false);
    
    if (successCount > 0) {
      toast.success(`📅 Synced ${successCount} hackathons to Google Calendar!`);
    }
    if (errorCount > 0) {
      toast.error(`Failed to sync ${errorCount} hackathons`);
    }
  };

  const unsyncedHackathons = hackathons.filter(h => 
    !syncedEvents.has(h.id) && !h.calendarEventId
  );

  return (
    <div className="google-calendar-sync">
      <div className="sync-header">
        <div className="sync-status">
          <h3>📅 Google Calendar Sync</h3>
          <span className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '✅ Connected' : '❌ Not Connected'}
          </span>
        </div>
        
        <div className="sync-actions">
          {!isConnected ? (
            <button 
              onClick={handleConnect}
              disabled={isLoading}
              className="btn btn-primary"
            >
              {isLoading ? 'Connecting...' : '🔗 Connect to Google Calendar'}
            </button>
          ) : (
            <div className="connected-actions">
              <button 
                onClick={syncAllHackathons}
                disabled={isLoading || unsyncedHackathons.length === 0}
                className="btn btn-success"
              >
                {isLoading ? 'Syncing...' : `📅 Sync All (${unsyncedHackathons.length})`}
              </button>
              <button 
                onClick={handleDisconnect}
                disabled={isLoading}
                className="btn btn-secondary"
              >
                🔌 Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {isConnected && (
        <div className="sync-content">
          <div className="sync-stats">
            <div className="stat">
              <span className="stat-number">{hackathons.length}</span>
              <span className="stat-label">Total Hackathons</span>
            </div>
            <div className="stat">
              <span className="stat-number">{syncedEvents.size}</span>
              <span className="stat-label">Synced Events</span>
            </div>
            <div className="stat">
              <span className="stat-number">{unsyncedHackathons.length}</span>
              <span className="stat-label">Pending Sync</span>
            </div>
          </div>

          {unsyncedHackathons.length > 0 && (
            <div className="unsynced-hackathons">
              <h4>📋 Hackathons to Sync</h4>
              <div className="hackathon-list">
                {unsyncedHackathons.map(hackathon => (
                  <div key={hackathon.id} className="hackathon-item">
                    <div className="hackathon-info">
                      <span className="hackathon-name">{hackathon.name}</span>
                      <span className="hackathon-date">{hackathon.date}</span>
                      <span className="hackathon-platform">{hackathon.platform}</span>
                    </div>
                    <button 
                      onClick={() => syncHackathon(hackathon)}
                      disabled={isLoading}
                      className="btn btn-sm btn-outline"
                    >
                      📅 Sync
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarSync;