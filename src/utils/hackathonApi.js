import { apiCall } from './apiUtils';

// Get user's hackathons from database
export const getUserHackathons = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return await apiCall('/hackathons', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
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