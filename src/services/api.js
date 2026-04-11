import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add the access token to headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access');
    if (token && !config.headers.SkipAuth) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Remove the custom header so it doesn't get sent to the server
    if (config.headers.SkipAuth) {
      delete config.headers.SkipAuth;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise(async (resolve, reject) => {
        try {
          const refreshToken = localStorage.getItem('refresh');
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const response = await axios.post(`${API_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access', access);
          
          api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
          originalRequest.headers.Authorization = `Bearer ${access}`;
          
          processQueue(null, access);
          resolve(api(originalRequest));
        } catch (refreshError) {
          processQueue(refreshError, null);
          localStorage.removeItem('access');
          localStorage.removeItem('refresh');
          reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      });
    }
    return Promise.reject(error);
  }
);

export const forgotPassword = async (email) => {
  try {
    const response = await api.post('/auth/forgot-password/', { email });
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Failed to request password reset';
  }
};

export const resetPassword = async (email, code, new_password) => {
  try {
    const response = await api.post('/auth/reset-password/', { email, code, new_password });
    return response.data;
  } catch (error) {
    throw error.response?.data?.error || 'Failed to reset password. The code might be invalid or expired.';
  }
};

export default api;
