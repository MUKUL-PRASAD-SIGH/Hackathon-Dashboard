import { getApiUrl } from './apiBase';

const API = getApiUrl();

const authHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const fetchIdeas = async (hackathonId) => {
  const response = await fetch(`${API}/hackathons/${hackathonId}/ideas`, {
    headers: authHeaders()
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to fetch ideas');
  }
  return data;
};

export const submitIdea = async (hackathonId, payload) => {
  const response = await fetch(`${API}/hackathons/${hackathonId}/ideas`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to submit idea');
  }
  return data;
};

export const voteIdea = async (hackathonId, ideaId) => {
  const response = await fetch(`${API}/hackathons/${hackathonId}/ideas/${ideaId}/vote`, {
    method: 'POST',
    headers: authHeaders()
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to vote');
  }
  return data;
};
