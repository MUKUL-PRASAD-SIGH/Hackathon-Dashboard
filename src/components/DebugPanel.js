import React, { useState, useEffect } from 'react';
import { DebugLogger, runNetworkDiagnostics } from '../utils/debugUtils';

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [diagnostics, setDiagnostics] = useState(null);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  useEffect(() => {
    const updateLogs = () => {
      setLogs(DebugLogger.getAllLogs());
    };

    updateLogs();
    const interval = setInterval(updateLogs, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRunDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    try {
      const result = await runNetworkDiagnostics();
      setDiagnostics(result);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const handleClearLogs = () => {
    DebugLogger.clearLogs();
    setLogs([]);
  };

  const handleExportLogs = () => {
    DebugLogger.exportLogs();
  };

  if (!isOpen) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999
      }}>
        <button
          onClick={() => setIsOpen(true)}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
          }}
        >
          🔍
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '600px',
      height: '500px',
      backgroundColor: 'white',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: '10px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ margin: 0, fontSize: '16px' }}>🔍 Debug Panel</h3>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          ✕
        </button>
      </div>

      {/* Controls */}
      <div style={{
        padding: '10px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={handleRunDiagnostics}
          disabled={isRunningDiagnostics}
          style={{
            padding: '5px 10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {isRunningDiagnostics ? 'Running...' : '🔧 Run Diagnostics'}
        </button>
        <button
          onClick={handleClearLogs}
          style={{
            padding: '5px 10px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          🗑️ Clear Logs
        </button>
        <button
          onClick={handleExportLogs}
          style={{
            padding: '5px 10px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          📁 Export
        </button>
        <span style={{ fontSize: '12px', color: '#666' }}>
          {logs.length} logs
        </span>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '10px',
        fontSize: '12px'
      }}>
        {/* Diagnostics */}
        {diagnostics && (
          <div style={{ marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>
              🔧 Network Diagnostics
            </h4>
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '10px',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}>
              <div>Online: {diagnostics.online ? '✅' : '❌'}</div>
              <div>Backend Health: {diagnostics.tests.backendHealth?.success ? '✅' : '❌'}</div>
              <div>API Endpoint: {diagnostics.tests.apiEndpoint?.success ? '✅' : '❌'}</div>
              {diagnostics.tests.backendHealth?.error && (
                <div style={{ color: 'red' }}>
                  Error: {diagnostics.tests.backendHealth.error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logs */}
        <h4 style={{ margin: '0 0 10px 0', color: '#007bff' }}>
          📋 Debug Logs (Latest First)
        </h4>
        {logs.length === 0 ? (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            No logs yet. Interact with the app to see debug information.
          </div>
        ) : (
          <div>
            {logs.slice().reverse().map((log, index) => (
              <div
                key={index}
                style={{
                  marginBottom: '10px',
                  padding: '8px',
                  backgroundColor: log.level === 'error' ? '#ffe6e6' : 
                                 log.level === 'warn' ? '#fff3cd' : '#f8f9fa',
                  borderRadius: '4px',
                  borderLeft: `4px solid ${
                    log.level === 'error' ? '#dc3545' :
                    log.level === 'warn' ? '#ffc107' :
                    log.level === 'info' ? '#007bff' : '#6c757d'
                  }`
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '4px'
                }}>
                  <span style={{ fontWeight: 'bold' }}>
                    {log.level.toUpperCase()} - {log.component}
                  </span>
                  <span style={{ color: '#666', fontSize: '10px' }}>
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  {log.message}
                </div>
                {log.data && Object.keys(log.data).length > 0 && (
                  <details style={{ fontSize: '10px' }}>
                    <summary style={{ cursor: 'pointer', color: '#007bff' }}>
                      View Details
                    </summary>
                    <pre style={{
                      backgroundColor: '#f1f3f4',
                      padding: '8px',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '200px',
                      marginTop: '4px'
                    }}>
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugPanel;