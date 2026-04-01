import { api } from './api';

export const userService = {
  // Get user profile
  getProfile: async () => {
    const response = await api.get('/users/profile/');
    return response.data;
  },

  // Update user profile
  updateProfile: async (userData) => {
    const response = await api.put('/users/update_profile/', userData);
    
    // Update local storage
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    const updatedUser = { ...currentUser, ...response.data };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await api.post('/users/change_password/', passwordData);
    return response.data;
  },

  // Get user skills
  getSkills: async () => {
    const response = await api.get('/skills/');
    return response.data;
  },

  // Add skill
  addSkill: async (skillData) => {
    const response = await api.post('/skills/', skillData);
    return response.data;
  },

  // Update skill
  updateSkill: async (id, skillData) => {
    const response = await api.put(`/skills/${id}/`, skillData);
    return response.data;
  },

  // Delete skill
  deleteSkill: async (id) => {
    const response = await api.delete(`/skills/${id}/`);
    return response.data;
  },

  // Get user education
  getEducation: async () => {
    const response = await api.get('/education/');
    return response.data;
  },

  // Add education
  addEducation: async (educationData) => {
    const response = await api.post('/education/', educationData);
    return response.data;
  },

  // Update education
  updateEducation: async (id, educationData) => {
    const response = await api.put(`/education/${id}/`, educationData);
    return response.data;
  },

  // Delete education
  deleteEducation: async (id) => {
    const response = await api.delete(`/education/${id}/`);
    return response.data;
  },

  // Get user experiences
  getExperiences: async () => {
    const response = await api.get('/experiences/');
    return response.data;
  },

  // Add experience
  addExperience: async (experienceData) => {
    const response = await api.post('/experiences/', experienceData);
    return response.data;
  },

  // Update experience
  updateExperience: async (id, experienceData) => {
    const response = await api.put(`/experiences/${id}/`, experienceData);
    return response.data;
  },

  // Delete experience
  deleteExperience: async (id) => {
    const response = await api.delete(`/experiences/${id}/`);
    return response.data;
  },

  // Get user resumes
  getResumes: async () => {
    try {
      const response = await api.get('/resumes/');
      return response.data;
    } catch (error) {
      console.error('Error fetching resumes:', error);
      return [];
    }
  },

  // Upload resume
  uploadResume: async (file, isPrimary = false) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_primary', isPrimary ? 'true' : 'false');
      
      console.log('Uploading resume:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        isPrimary
      });
      
      const response = await api.post('/resumes/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      console.log('Upload response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error uploading resume:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
        console.error('Status:', error.response.status);
      }
      throw error;
    }
  },

  // Set resume as primary
  setPrimaryResume: async (id) => {
    try {
      const response = await api.post(`/resumes/${id}/set_primary/`);
      return response.data;
    } catch (error) {
      console.error('Error setting primary resume:', error);
      throw error;
    }
  },

  // Delete resume
  deleteResume: async (id) => {
    try {
      const response = await api.delete(`/resumes/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting resume:', error);
      throw error;
    }
  },

  // Analyze resume
  analyzeResume: async (id) => {
    try {
      const response = await api.post(`/resumes/${id}/analyze/`);
      console.log('Analysis response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error analyzing resume:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
        console.error('Status:', error.response.status);
      }
      throw error;
    }
  },

  // In userService.js, update the getCareerGoals function:
getCareerGoals: async () => {
  try {
    const response = await api.get('/career-goals/');
    console.log('Career goals response:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching career goals:', error);
    if (error.response) {
      console.error('Server response:', error.response.data);
      console.error('Status:', error.response.status);
    }
    return [];
  }
},

  // Add career goal - FIXED to match backend expectations
  addCareerGoal: async (goalData) => {
    try {
      // Format the data to match what the backend expects
      const formattedData = {
        title: goalData.target_role || goalData.title || 'Career Goal',
        description: goalData.description || '',
        target_role: goalData.target_role || '',
        target_industry: goalData.target_industry || '',
        target_companies: goalData.target_companies || [],
        timeframe_months: goalData.timeframe_months || 12,
        priority_level: goalData.priority || 'medium', // Note: backend uses priority_level
        is_active: true
      };
      
      console.log('Sending career goal data:', formattedData);
      const response = await api.post('/career-goals/', formattedData);
      return response.data;
    } catch (error) {
      console.error('Error adding career goal:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
        console.error('Status:', error.response.status);
      }
      throw error;
    }
  },

  // Update career goal - FIXED to match backend expectations
  updateCareerGoal: async (id, goalData) => {
    try {
      // Format the data to match what the backend expects
      const formattedData = {
        title: goalData.target_role || goalData.title || 'Career Goal',
        description: goalData.description || '',
        target_role: goalData.target_role || '',
        target_industry: goalData.target_industry || '',
        target_companies: goalData.target_companies || [],
        timeframe_months: goalData.timeframe_months || 12,
        priority_level: goalData.priority || goalData.priority_level || 'medium',
      };
      
      console.log('Updating career goal:', formattedData);
      const response = await api.put(`/career-goals/${id}/`, formattedData);
      return response.data;
    } catch (error) {
      console.error('Error updating career goal:', error);
      if (error.response) {
        console.error('Server response:', error.response.data);
        console.error('Status:', error.response.status);
      }
      throw error;
    }
  },

  // Delete career goal
  deleteCareerGoal: async (id) => {
    try {
      const response = await api.delete(`/career-goals/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error deleting career goal:', error);
      throw error;
    }
  },

  // Archive career goal
  archiveCareerGoal: async (id) => {
    try {
      const response = await api.post(`/career-goals/${id}/archive/`);
      return response.data;
    } catch (error) {
      console.error('Error archiving career goal:', error);
      throw error;
    }
  },

  // Mark career goal as complete
  completeCareerGoal: async (id) => {
    try {
      const response = await api.post(`/career-goals/${id}/complete/`);
      return response.data;
    } catch (error) {
      console.error('Error completing career goal:', error);
      throw error;
    }
  },
};