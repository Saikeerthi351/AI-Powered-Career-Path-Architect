import axios from 'axios';

// Base URL already has /api
const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Flag to prevent multiple token refresh requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor
// In api.js, update the request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    console.log('🚀 Request:', config.method.toUpperCase(), config.url);
    console.log('🔑 Token present:', token ? 'Yes' : 'No');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Authorization header added');
    } else {
      console.log('❌ No token found in localStorage');
    }
    
    // Log full headers for debugging
    console.log('Headers:', config.headers);
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is not 401 or request already retried, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh for login/register endpoints
    if (originalRequest.url.includes('/auth/token/') || 
        originalRequest.url.includes('/auth/register/')) {
      return Promise.reject(error);
    }

    // If this is a token refresh request that failed, don't retry
    if (originalRequest.url.includes('/auth/token/refresh/')) {
      // Clear tokens and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // If already refreshing, queue this request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch(err => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/token/refresh/', {
        refresh: refreshToken,
      });
      
      const { access } = response.data;
      localStorage.setItem('access_token', access);
      
      // Update authorization header
      api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      // Process queued requests
      processQueue(null, access);
      
      // Retry original request
      originalRequest.headers.Authorization = `Bearer ${access}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      
      // Clear tokens and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// Auth service
export const authService = {
  login: async (credentials) => {
    try {
      // Your backend expects email field
      const response = await api.post('/auth/token/', {
        email: credentials.email,
        password: credentials.password,
      });
      
      if (response.data) {
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        
        try {
          const userResponse = await api.get('/users/profile/');
          localStorage.setItem('user', JSON.stringify(userResponse.data));
          return { user: userResponse.data, ...response.data };
        } catch (userError) {
          console.error('Error fetching user profile:', userError);
          return { user: null, ...response.data };
        }
      }
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (userData) => {
    try {
      // Generate username from email
      const username = userData.email.split('@')[0];
      
      const response = await api.post('/auth/register/', {
        username: username,
        email: userData.email,
        password: userData.password,
        first_name: userData.first_name,
        last_name: userData.last_name,
      });
      
      if (response.data) {
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await api.post('/auth/logout/', { refresh: refreshToken });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/users/profile/');
      return response.data;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  },

  updateProfile: async (userData) => {
    try {
      const response = await api.put('/users/update_profile/', userData);
      
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...currentUser, ...response.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await api.post('/users/change_password/', passwordData);
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  },

  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await api.post('/auth/token/refresh/', {
        refresh: refreshToken,
      });

      localStorage.setItem('access_token', response.data.access);
      return response.data;
    } catch (error) {
      console.error('Refresh token error:', error);
      throw error;
    }
  },

  verifyToken: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      return false;
    }

    try {
      await api.post('/auth/token/verify/', {
        token: token,
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  getCurrentUserFromStorage: () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      return null;
    }
  },

  clearAuthData: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },
};

// Roadmap service
export const roadmapService = {
  getRoadmaps: async (params = {}) => {
    try {
      const response = await api.get('/roadmap/roadmaps/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching roadmaps:', error);
      return [];
    }
  },

  getRoadmap: async (id) => {
    try {
      const response = await api.get(`/roadmap/roadmaps/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching roadmap:', error);
      throw error;
    }
  },

  createRoadmap: async (data) => {
    try {
      const response = await api.post('/roadmap/roadmaps/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating roadmap:', error);
      throw error;
    }
  },

  updateRoadmap: async (id, data) => {
    try {
      const response = await api.patch(`/roadmap/roadmaps/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating roadmap:', error);
      throw error;
    }
  },

  deleteRoadmap: async (id) => {
    try {
      const response = await api.delete(`/roadmap/roadmaps/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      throw error;
    }
  },

  generateRoadmap: async (data) => {
    try {
      const response = await api.post('/roadmap/roadmaps/generate/', data);
      return response.data;
    } catch (error) {
      console.error('Error generating roadmap:', error);
      throw error;
    }
  },

  getDashboardStats: async () => {
    try {
      const response = await api.get('/roadmap/roadmaps/dashboard_stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        total_roadmaps: 0,
        completed_roadmaps: 0,
        in_progress_roadmaps: 0,
        average_completion: 0,
        total_time_invested: 0,
        skills_being_developed: 0,
        recent_updates: []
      };
    }
  },

  getSteps: async (roadmapId) => {
    try {
      const response = await api.get(`/roadmap/steps/?roadmap=${roadmapId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching steps:', error);
      return [];
    }
  },

  addStep: async (roadmapId, data) => {
    try {
      const response = await api.post('/roadmap/steps/', { ...data, roadmap: roadmapId });
      return response.data;
    } catch (error) {
      console.error('Error adding step:', error);
      throw error;
    }
  },

  updateStep: async (stepId, data) => {
    try {
      const response = await api.patch(`/roadmap/steps/${stepId}/`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating step:', error);
      throw error;
    }
  },

  deleteStep: async (stepId) => {
    try {
      const response = await api.delete(`/roadmap/steps/${stepId}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting step:', error);
      throw error;
    }
  },

  getLearningResources: async (params = {}) => {
    try {
      const response = await api.get('/roadmap/resources/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching resources:', error);
      return [];
    }
  },

  completeResource: async (resourceId) => {
    try {
      const response = await api.post(`/roadmap/resources/${resourceId}/complete/`);
      return response.data;
    } catch (error) {
      console.error('Error completing resource:', error);
      throw error;
    }
  },
};

// AI Service
export const aiService = {
  analyzeSkillGap: async (data) => {
    try {
      const response = await api.post('/ai/analyses/skill_gap/', data);
      return response.data;
    } catch (error) {
      console.error('Error analyzing skill gap:', error);
      throw error;
    }
  },

  analyzeResume: async (resumeText, targetRole = null) => {
    try {
      const response = await api.post('/ai/analyses/resume/', {
        resume_text: resumeText,
        target_role: targetRole,
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing resume:', error);
      throw error;
    }
  },

  getCareerSuggestions: async (profile) => {
    try {
      const response = await api.post('/ai/analyses/career_suggestions/', profile);
      return response.data;
    } catch (error) {
      console.error('Error getting career suggestions:', error);
      throw error;
    }
  },

  getMarketInsights: async (role, location = null) => {
    try {
      const response = await api.post('/ai/analyses/market_insights/', {
        role,
        location,
      });
      return response.data;
    } catch (error) {
      console.error('Error getting market insights:', error);
      throw error;
    }
  },

  getRecommendations: async () => {
    try {
      const response = await api.get('/ai/recommendations/');
      return response.data;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  },

  acceptRecommendation: async (id) => {
    try {
      const response = await api.post(`/ai/recommendations/${id}/accept/`);
      return response.data;
    } catch (error) {
      console.error('Error accepting recommendation:', error);
      throw error;
    }
  },

  rejectRecommendation: async (id, feedback = '') => {
    try {
      const response = await api.post(`/ai/recommendations/${id}/reject/`, { feedback });
      return response.data;
    } catch (error) {
      console.error('Error rejecting recommendation:', error);
      throw error;
    }
  },
};
