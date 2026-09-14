import axios from 'axios';

// Support production Vercel deployment with dynamic VITE_API_URL or local Vite proxy fallback
const rawBaseUrl = import.meta.env.VITE_API_URL;
const baseURL = rawBaseUrl
  ? (rawBaseUrl.endsWith('/api') ? rawBaseUrl : `${rawBaseUrl.replace(/\/$/, '')}/api`)
  : '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tech_arena_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const activeEventId = sessionStorage.getItem('tech_arena_active_event_id') || localStorage.getItem('tech_arena_active_event_id');
    if (activeEventId && !config.headers['x-event-id']) {
      config.headers['x-event-id'] = activeEventId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('tech_arena_token');
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      } else if (window.location.pathname.startsWith('/participant') && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
