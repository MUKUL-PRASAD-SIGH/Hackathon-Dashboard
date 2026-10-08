import { apiCall } from './apiUtils';

const authHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');
  return { Authorization: `Bearer ${token}` };
};

export const getRecommendedHackathons = async (limit = 6) => {
  const data = await apiCall(`/recommendations/hackathons?limit=${limit}`, { headers: authHeaders() });
  return data.recommendations || [];
};

export const getRecommendedTeammates = async (limit = 6) => {
  const data = await apiCall(`/recommendations/teammates?limit=${limit}`, { headers: authHeaders() });
  return data.recommendations || [];
};
