import { api } from './api';

export const aiService = {
  // Analysis endpoints
  getAnalyses: async (params = {}) => {
    try {
      const response = await api.get('/ai/analyses/', { params });
      
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data?.results) {
        return response.data.results;
      } else if (response.data?.data) {
        return response.data.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching AI analyses:', error);
      return [];
    }
  },

  // In aiService.js, verify analyzeSkillGap is correct
analyzeSkillGap: async (data) => {
  try {
    console.log('Calling analyzeSkillGap with data:', data);
    const response = await api.post('/ai/analyses/skill_gap/', {
      target_role: data.target_role,
      current_skills: data.current_skills || [],
      experience_level: data.experience_level || ''
    });
    console.log('analyzeSkillGap response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error analyzing skill gap:', error);
    if (error.response) {
      console.error('Server response:', error.response.data);
      console.error('Status:', error.response.status);
    }
    throw error;
  }
},

  analyzeResume: async (resumeText, targetRole = null) => {
    try {
      const response = await api.post('/ai/analyses/resume/', {
        resume_text: resumeText,
        target_role: targetRole
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing resume:', error);
      throw error;
    }
  },

  getCareerSuggestions: async (userProfile) => {
    try {
      const response = await api.post('/ai/analyses/career_suggestions/', userProfile);
      return response.data;
    } catch (error) {
      console.error('Error getting career suggestions:', error);
      throw error;
    }
  },

  generateInterviewPrep: async (role, company = null, experienceLevel = null) => {
    try {
      const response = await api.post('/ai/analyses/interview_prep/', {
        target_role: role,
        company: company,
        experience_level: experienceLevel
      });
      return response.data;
    } catch (error) {
      console.error('Error getting interview prep:', error);
      throw error;
    }
  },

  getMarketInsights: async (role, location = null) => {
  try {
    console.log('Calling market insights API with:', { role, location });
    const response = await api.post('/ai/analyses/market_insights/', {
      role: role,
      location: location || 'United States'
    });
    console.log('Market insights API response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting market insights:', error);
    if (error.response) {
      console.error('Server response:', error.response.data);
      console.error('Status:', error.response.status);
    }
    throw error;
  }
},
  // Chat interaction
  chat: async (message, context = {}) => {
    try {
      const response = await api.post('/ai/interactions/chat/', {
        message,
        context
      });
      return response.data;
    } catch (error) {
      console.error('Error chatting with AI:', error);
      throw error;
    }
  },

  // Recommendations
  getRecommendations: async (params = {}) => {
    try {
      const response = await api.get('/ai/recommendations/', { params });
      
      if (Array.isArray(response.data)) {
        return response.data;
      } else if (response.data?.results) {
        return response.data.results;
      } else if (response.data?.data) {
        return response.data.data;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  },

  acceptRecommendation: async (recommendationId) => {
    try {
      const response = await api.post(`/ai/recommendations/${recommendationId}/accept/`);
      return response.data;
    } catch (error) {
      console.error('Error accepting recommendation:', error);
      throw error;
    }
  },

  rejectRecommendation: async (recommendationId, reason = '') => {
    try {
      const response = await api.post(`/ai/recommendations/${recommendationId}/reject/`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error rejecting recommendation:', error);
      throw error;
    }
  },

  // In aiService.js, update the getStats function:
getStats: async () => {
  try {
    // Try both possible endpoints
    try {
      const response = await api.get('/ai/dashboard/stats/');
      return response.data;
    } catch (error) {
      // If /stats/ fails, try the base dashboard endpoint
      const response = await api.get('/ai/dashboard/');
      return response.data;
    }
  } catch (error) {
    console.error('Error fetching AI stats:', error);
    return {
      total_analyses: 0,
      completed_analyses: 0,
      pending_analyses: 0,
      total_recommendations: 0,
      accepted_recommendations: 0,
      implemented_recommendations: 0,
      total_tokens_used: 0,
      recent_interactions: [],
      analysis_types: {
        roadmap: 0,
        skill_gap: 0,
        resume: 0,
        career_suggestion: 0,
        interview_prep: 0,
        market_insights: 0
      }
    };
  }
},

  // Generate learning resources
generateLearningResources: async (data) => {
  try {
    // Create a custom config with longer timeout
    const config = {
      timeout: 60000, // 60 seconds instead of 30
    };
    
    const response = await api.post('/ai/analyses/learning_resources/', {
      skills: data.skills || [],
      goals: data.goals || []
    }, config);
    
    return response.data;
  } catch (error) {
    console.error('Error generating learning resources:', error);
    
    // Add more detailed error message
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. The AI is taking too long to respond. Please try again.');
    }
    throw error;
  }
},
};