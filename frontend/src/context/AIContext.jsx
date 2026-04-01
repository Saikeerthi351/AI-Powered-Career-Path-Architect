// frontend/src/context/AIContext.jsx

import React, { createContext, useState, useCallback } from 'react';
import { aiService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export const AIContext = createContext(null);

export const AIProvider = ({ children }) => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeSkillGap = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Analyzing skill gap with data:', data);
      
      // Ensure current_skills is an array of strings
      const formattedData = {
        target_role: data.target_role,
        current_skills: Array.isArray(data.current_skills) 
          ? data.current_skills.map(skill => {
              // If skill is an object with name property, extract the name
              if (typeof skill === 'object' && skill !== null) {
                return skill.name || skill.skill_name || JSON.stringify(skill);
              }
              // If it's already a string, use it
              return String(skill);
            })
          : [],
        experience_level: data.experience_level || ''
      };
      
      console.log('Formatted data for API:', formattedData);
      
      const result = await aiService.analyzeSkillGap(formattedData);
      console.log('Skill gap analysis result:', result);
      
      if (result) {
        setAnalyses(prev => [...prev, result]);
        return result;
      } else {
        throw new Error('No analysis data received');
      }
    } catch (error) {
      console.error('Error analyzing skill gap:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        
        // Extract error message from response
        const errorMessage = error.response.data?.error || 
                            error.response.data?.message || 
                            JSON.stringify(error.response.data) ||
                            'Failed to analyze skill gap';
        setError(errorMessage);
        toast.error(errorMessage);
        throw new Error(errorMessage);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('No response received:', error.request);
        setError('No response from server');
        toast.error('No response from server');
        throw error;
      } else {
        // Something happened in setting up the request
        console.error('Request setup error:', error.message);
        setError(error.message);
        toast.error(error.message);
        throw error;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeResume = useCallback(async (resumeText, targetRole = null) => {
    try {
      setLoading(true);
      setError(null);
      const result = await aiService.analyzeResume(resumeText, targetRole);
      setAnalyses(prev => [...prev, result]);
      return result;
    } catch (error) {
      console.error('Error analyzing resume:', error);
      const errorMessage = error.response?.data?.error || 'Failed to analyze resume';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getCareerSuggestions = useCallback(async (profile) => {
    try {
      setLoading(true);
      setError(null);
      const result = await aiService.getCareerSuggestions(profile);
      return result;
    } catch (error) {
      console.error('Error getting career suggestions:', error);
      const errorMessage = error.response?.data?.error || 'Failed to get career suggestions';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getMarketInsights = useCallback(async (role, location = null) => {
    try {
      setLoading(true);
      setError(null);
      const result = await aiService.getMarketInsights(role, location);
      return result;
    } catch (error) {
      console.error('Error getting market insights:', error);
      // Return the actual error - no fallbacks
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await aiService.getRecommendations();
      setRecommendations(data);
      return data;
    } catch (error) {
      console.error('Error loading recommendations:', error);
      setError(error.response?.data?.error || 'Failed to load recommendations');
      setRecommendations([]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const acceptRecommendation = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const result = await aiService.acceptRecommendation(id);
      setRecommendations(prev => prev.filter(r => r.id !== id));
      toast.success('Recommendation accepted');
      return result;
    } catch (error) {
      console.error('Error accepting recommendation:', error);
      const errorMessage = error.response?.data?.error || 'Failed to accept recommendation';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const rejectRecommendation = useCallback(async (id, feedback = '') => {
    try {
      setLoading(true);
      setError(null);
      const result = await aiService.rejectRecommendation(id, feedback);
      setRecommendations(prev => prev.filter(r => r.id !== id));
      toast.success('Recommendation rejected');
      return result;
    } catch (error) {
      console.error('Error rejecting recommendation:', error);
      const errorMessage = error.response?.data?.error || 'Failed to reject recommendation';
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const value = {
    analyses,
    recommendations,
    loading,
    error,
    analyzeSkillGap,
    analyzeResume,
    getCareerSuggestions,
    getMarketInsights,
    loadRecommendations,
    acceptRecommendation,
    rejectRecommendation,
  };

  return (
    <AIContext.Provider value={value}>
      {children}
    </AIContext.Provider>
  );
};