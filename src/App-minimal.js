import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header>
          <h1>Hackathon Dashboard</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<div>Welcome to Hackathon Dashboard</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
