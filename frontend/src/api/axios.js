import axios from 'axios';

let rawBaseURL = import.meta.env.VITE_API_URL || '/api';
if (rawBaseURL.endsWith('/')) {
  rawBaseURL = rawBaseURL.slice(0, -1);
}
if (rawBaseURL.startsWith('http') && !rawBaseURL.endsWith('/api')) {
  rawBaseURL = `${rawBaseURL}/api`;
}

const api = axios.create({ 
  baseURL: rawBaseURL,
  withCredentials: true 
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Intercept 401 response and automatically refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const hasToken = !!localStorage.getItem('token');
      if (hasToken) {
        try {
          // Call refresh endpoint - browser automatically sends the secure cookie
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`, 
            {}, 
            { withCredentials: true }
          );
          localStorage.setItem('token', data.token);
          api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
          originalRequest.headers['Authorization'] = `Bearer ${data.token}`;
          return api(originalRequest);
        } catch (err) {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
