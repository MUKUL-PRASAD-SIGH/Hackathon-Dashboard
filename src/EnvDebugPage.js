import React from 'react';

const EnvDebugPage = () => {
  return (
    <div style={{ padding: 32, fontFamily: 'monospace', background: '#f8f8f8' }}>
      <h2>Environment Debug Page</h2>
      <pre>
        <b>process.env.REACT_APP_GOOGLE_API_KEY:</b> {process.env.REACT_APP_GOOGLE_API_KEY || 'undefined'}
        {'\n'}
        <b>process.env.REACT_APP_GOOGLE_CLIENT_ID:</b> {process.env.REACT_APP_GOOGLE_CLIENT_ID || 'undefined'}
        {'\n'}
        <b>process.env.REACT_APP_SMTP_HOST:</b> {process.env.REACT_APP_SMTP_HOST || 'undefined'}
        {'\n'}
        <b>process.env.REACT_APP_SMTP_USER:</b> {process.env.REACT_APP_SMTP_USER || 'undefined'}
        {'\n'}
        <b>window.location.origin:</b> {window.location.origin}
        {'\n'}
        <b>window.location.port:</b> {window.location.port}
        {'\n'}
        <b>window.gapi loaded:</b> {typeof window.gapi !== 'undefined' ? 'YES' : 'NO'}
      </pre>
      <p style={{color: 'red'}}>If any value above is 'undefined', your .env is not being loaded. If gapi is 'NO', the Google API script is not loading.</p>
    </div>
  );
};

export default EnvDebugPage;
