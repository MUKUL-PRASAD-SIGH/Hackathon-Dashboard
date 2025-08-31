import React, { useState } from 'react';
import { runNetworkDiagnostics } from '../utils/debugUtils';
import { testConnection } from '../utils/apiUtils';

const ConnectionTest = () => {
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async () => {
    setIsLoading(true);
    try {
      const [diagnostics, connection] = await Promise.all([
        runNetworkDiagnostics(),
        testConnection()
      ]);
      
      setResult({ diagnostics, connection });
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>🔧 Connection Test</h2>
      <button 
        onClick={runTest} 
        disabled={isLoading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {isLoading ? 'Testing...' : 'Test Connection'}
      </button>

      {result && (
        <div style={{ marginTop: '20px' }}>
          {result.error ? (
            <div style={{ color: 'red' }}>
              <h3>❌ Error</h3>
              <p>{result.error}</p>
            </div>
          ) : (
            <div>
              <h3>📊 Results</h3>
              
              <div style={{ marginBottom: '20px' }}>
                <h4>🌐 Network Status</h4>
                <ul>
                  <li>Online: {result.diagnostics.online ? '✅' : '❌'}</li>
                  <li>Backend Health: {result.diagnostics.tests.backendHealth?.success ? '✅' : '❌'}</li>
                  <li>API Endpoint: {result.diagnostics.tests.apiEndpoint?.success ? '✅' : '❌'}</li>
                </ul>
              </div>

              <div>
                <h4>🔗 Connection Test</h4>
                <p>{result.connection.connected ? '✅' : '❌'} {result.connection.message}</p>
                {result.connection.suggestion && (
                  <p style={{ color: '#666' }}>💡 {result.connection.suggestion}</p>
                )}
              </div>

              <details style={{ marginTop: '20px' }}>
                <summary style={{ cursor: 'pointer', color: '#007bff' }}>
                  View Raw Data
                </summary>
                <pre style={{
                  backgroundColor: '#f8f9fa',
                  padding: '10px',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '12px'
                }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionTest;
