import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    // Store the intended location before redirecting to login
    const from = location.pathname + location.search;
    toast.error('Please log in to access this page');
    return <Navigate to="/login" state={{ from }} replace />;
  }

  return children;
};

export default ProtectedRoute;
