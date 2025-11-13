import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Inject token automatically for every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Basic error handling for 401 errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      // No automatic redirect, leave it to the pages to decide
    }
    return Promise.reject(err);
  }
);

// Minimal API functions
export async function login(email, password) {
  const { data } = await api.post('/api/auth/login', { email, password });
  const { token, user } = data.data;
  localStorage.setItem('authToken', token);
  localStorage.setItem('user', JSON.stringify(user));
  return user;
}

export function logout() {
  // Try to notify the server but also if the request fails—clear local storage
  return api.post('/api/auth/logout').finally(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  });
}

export function getCurrentUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

// Profile
export async function getProfile() {
  const { data } = await api.get('/api/auth/profile');
  return data.data;
}

// Albums
export async function getAlbums(params = {}) {
  const { data } = await api.get('/api/albums', { params });
  return data.data || [];
}

export async function addAlbum(payload) {
  const { data } = await api.post('/api/albums', payload);
  return data.data;
}

export async function deleteAlbum(id) {
  const { data } = await api.delete(`/api/albums/${id}`);
  return data.data;
}

export default api;
