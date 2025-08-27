import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Google scripts are now loaded via index.html with proper async/defer attributes
// This ensures they load in the correct order without blocking the main thread

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // Temporarily disabled React.StrictMode to prevent double API calls in development
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
