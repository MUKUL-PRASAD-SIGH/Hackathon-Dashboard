import React, { useState, useEffect } from 'react';
import googleCalendarService from '../services/googleCalendarService';

const GoogleCalendarDebug = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Not tested');

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testInitialization = async () => {
    setIsLoading(true);
    addLog('🔄 Testing Google Calendar API initialization...', 'info');
    
    try {
      await googleCalendarService.initialize();
      addLog('✅ Google Calendar API initialized successfully', 'success');
      setConnectionStatus('Initialized');
    } catch (error) {
      addLog(`❌ Initialization failed: ${error.message}`, 'error');
      setConnectionStatus('Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testSignIn = async () => {
    setIsLoading(true);
    addLog('🔄 Testing Google Calendar sign-in...', 'info');
    
    try {
      await googleCalendarService.signIn();
      addLog('✅ Successfully signed in to Google Calendar', 'success');
      setConnectionStatus('Signed In');
    } catch (error) {
      addLog(`❌ Sign-in failed: ${error.message}`, 'error');
      setConnectionStatus('Sign-in Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testCalendarAccess = async () => {
    setIsLoading(true);
    addLog('🔄 Testing calendar access...', 'info');
    
    try {
      // Test basic calendar access
      const response = await window.gapi.client.calendar.calendarList.list();
      addLog(`✅ Calendar access successful. Found ${response.result.items.length} calendars`, 'success');
      
      // List calendar names
      response.result.items.forEach(calendar => {
        addLog(`📅 Calendar: ${calendar.summary} (${calendar.id})`, 'info');
      });
      
      setConnectionStatus('Full Access');
    } catch (error) {
      addLog(`❌ Calendar access failed: ${error.message}`, 'error');
      setConnectionStatus('Access Denied');
    } finally {
      setIsLoading(false);
    }
  };

  const testCreateEvent = async () => {
    setIsLoading(true);
    addLog('🔄 Testing event creation...', 'info');
    
    const testHackathon = {
      name: 'Test Hackathon',
      platform: 'Devpost',
      team: 'Solo',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      rounds: 2,
      status: 'Planning'
    };
    
    try {
      const event = await googleCalendarService.createHackathonEvent(testHackathon);
      addLog(`✅ Test event created successfully: ${event.id}`, 'success');
      addLog(`📅 Event link: ${event.htmlLink}`, 'info');
      setConnectionStatus('Fully Working');
    } catch (error) {
      addLog(`❌ Event creation failed: ${error.message}`, 'error');
      setConnectionStatus('Event Creation Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const runFullTest = async () => {
    clearLogs();
    addLog('🚀 Starting comprehensive Google Calendar test...', 'info');
    
    await testInitialization();
    if (connectionStatus !== 'Failed') {
      await testSignIn();
      if (connectionStatus === 'Signed In') {
        await testCalendarAccess();
        if (connectionStatus === 'Full Access') {
          await testCreateEvent();
        }
      }
    }
    
    addLog('🏁 Test completed', 'info');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Fully Working': return '#28a745';
      case 'Full Access': return '#17a2b8';
      case 'Signed In': return '#ffc107';
      case 'Initialized': return '#6c757d';
      case 'Failed':
      case 'Sign-in Failed':
      case 'Access Denied':
      case 'Event Creation Failed': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      case 'warning': return '#ffc107';
      default: return '#333';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>🔍 Google Calendar Debug Panel</h2>
      
      <div style={{ 
        background: '#f8f9fa', 
        padding: '15px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: `2px solid ${getStatusColor(connectionStatus)}`
      }}>
        <h3>Connection Status: <span style={{ color: getStatusColor(connectionStatus) }}>{connectionStatus}</span></h3>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testInitialization} 
          disabled={isLoading}
          style={{ margin: '5px', padding: '8px 16px' }}
        >
          1. Test Initialization
        </button>
        <button 
          onClick={testSignIn} 
          disabled={isLoading}
          style={{ margin: '5px', padding: '8px 16px' }}
        >
          2. Test Sign In
        </button>
        <button 
          onClick={testCalendarAccess} 
          disabled={isLoading}
          style={{ margin: '5px', padding: '8px 16px' }}
        >
          3. Test Calendar Access
        </button>
        <button 
          onClick={testCreateEvent} 
          disabled={isLoading}
          style={{ margin: '5px', padding: '8px 16px' }}
        >
          4. Test Event Creation
        </button>
        <button 
          onClick={runFullTest} 
          disabled={isLoading}
          style={{ 
            margin: '5px', 
            padding: '8px 16px', 
            background: '#007bff', 
            color: 'white', 
            border: 'none',
            borderRadius: '4px'
          }}
        >
          🚀 Run Full Test
        </button>
        <button 
          onClick={clearLogs}
          style={{ margin: '5px', padding: '8px 16px' }}
        >
          Clear Logs
        </button>
      </div>

      <div style={{ 
        background: '#000', 
        color: '#fff', 
        padding: '15px', 
        borderRadius: '8px',
        height: '400px',
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: '14px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#fff' }}>Debug Logs:</h4>
        {logs.length === 0 ? (
          <div style={{ color: '#888' }}>No logs yet. Run a test to see debug information.</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} style={{ 
              marginBottom: '5px',
              color: getLogColor(log.type)
            }}>
              <span style={{ color: '#888' }}>[{log.timestamp}]</span> {log.message}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <h4>Environment Info:</h4>
        <ul>
          <li>Client ID: {process.env.REACT_APP_GOOGLE_CLIENT_ID ? 'Present' : 'Missing'}</li>
          <li>API Key: {process.env.REACT_APP_GOOGLE_API_KEY ? 'Present' : 'Missing'}</li>
          <li>Current URL: {window.location.origin}</li>
          <li>Node Environment: {process.env.NODE_ENV}</li>
        </ul>
      </div>
    </div>
  );
};

export default GoogleCalendarDebug;
