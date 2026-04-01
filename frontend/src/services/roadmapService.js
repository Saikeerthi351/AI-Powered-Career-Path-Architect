import { api } from './api';

export const roadmapService = {
  // Roadmaps
  getRoadmaps: async (params = {}) => {
    try {
      const response = await api.get('/roadmap/roadmaps/', { params });
      
      // Handle different response formats
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data?.results) {
        return response.data.results;
      } else if (response.data?.data) {
        return response.data.data;
      }
      
      const roadmaps = response.data?.roadmaps || response.data;
      return Array.isArray(roadmaps) ? roadmaps : [];
      
    } catch (error) {
      console.error('Error fetching roadmaps:', error);
      if (error.response?.status === 401) {
        console.log('User not authenticated for roadmaps');
        return [];
      }
      return [];
    }
  },

  // In roadmapService.js, update the getRoadmap function:

getRoadmap: async (id) => {
  try {
    console.log(`Fetching roadmap with ID: ${id}`);
    const response = await api.get(`/roadmap/roadmaps/${id}/`);
    console.log('Roadmap API response:', response.data);
    
    // Ensure we have a valid object
    if (!response.data) {
      console.error('No data returned from API');
      throw new Error('No roadmap data received');
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
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

  // Steps
  getSteps: async (roadmapId) => {
    try {
      const response = await api.get(`/roadmap/steps/?roadmap=${roadmapId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching steps:', error);
      return [];
    }
  },

  // In roadmapService.js, update the addStep function
// In roadmapService.js - update the addStep function
addStep: async (roadmapId, data) => {
  try {
    // DO NOT remove step_number - backend needs it
    const payload = { 
      ...data, 
      roadmap: parseInt(roadmapId) 
    };
    
    console.log('Sending step data (with step_number):', payload);
    const response = await api.post('/roadmap/steps/', payload);
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

  // Toggle step completion
  toggleStepCompletion: async (stepId, isCompleted) => {
    try {
      const response = await api.patch(`/roadmap/steps/${stepId}/`, {
        is_completed: isCompleted,
      });
      return response.data;
    } catch (error) {
      console.error('Error toggling step completion:', error);
      throw error;
    }
  },

  // Resources
  // Resources
getLearningResources: async (params = {}) => {
  try {
    const response = await api.get('/roadmap/resources/', { params });
    
    // Handle different response formats
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data?.results) {
      return response.data.results;
    } else if (response.data?.data) {
      return response.data.data;
    }
    
    return response.data || [];
  } catch (error) {
    console.error('Error fetching resources:', error);
    return [];
  }
},

  // Analytics
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
        recent_updates: []
      };
    }
  },

  getRoadmapAnalytics: async (roadmapId) => {
    try {
      const response = await api.get(`/roadmap/roadmaps/${roadmapId}/analytics/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching roadmap analytics:', error);
      throw error;
    }
  },

  // Export
  exportRoadmap: async (roadmapId, format = 'pdf') => {
    try {
      const response = await api.get(`/roadmap/roadmaps/${roadmapId}/export/`, {
        params: { format },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting roadmap:', error);
      throw error;
    }
  },

  // Move step
  moveStep: async (stepId, direction) => {
    try {
      const response = await api.post(`/roadmap/steps/${stepId}/move/`, {
        direction,
      });
      return response.data;
    } catch (error) {
      console.error('Error moving step:', error);
      throw error;
    }
  },

  // Quick add step
  quickAddStep: async (roadmapId, title, description) => {
    try {
      return roadmapService.addStep(roadmapId, {
        title,
        description,
        step_type: 'learning',
        estimated_duration_hours: 20,
      });
    } catch (error) {
      console.error('Error adding quick step:', error);
      throw error;
    }
  },
};