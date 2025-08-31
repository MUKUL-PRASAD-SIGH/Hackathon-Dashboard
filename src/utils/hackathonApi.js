import { apiCall } from './apiUtils';

// Get user's hackathons from database
export const getUserHackathons = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  try {
    return await apiCall(`/hackathons?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (error) {
    // Handle invalid token errors
    if (error.status === 401 || error.message.includes('Invalid token') || error.message.includes('authentication')) {
      // Clear invalid session
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
    throw error;
  }
};

// Create new hackathon
export const createHackathon = async (hackathonData) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return await apiCall('/hackathons', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(hackathonData)
  });
};

// Update hackathon
export const updateHackathon = async (id, updates) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return await apiCall(`/hackathons/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
};

// Delete hackathon
export const deleteHackathon = async (id) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return await apiCall(`/hackathons/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
};
