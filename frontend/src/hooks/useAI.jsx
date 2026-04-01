import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiService } from '../services/aiService';
import toast from 'react-hot-toast';

export const useAI = () => {
  const queryClient = useQueryClient();
  const [chatHistory, setChatHistory] = useState([]);

  // Get AI analyses
  const { 
    data: analyses, 
    isLoading: analysesLoading, 
    error: analysesError,
    refetch: refetchAnalyses 
  } = useQuery({
    queryKey: ['ai-analyses'],
    queryFn: () => aiService.getAnalyses(),
    staleTime: 30000,
    retry: 1,
    onError: (error) => {
      console.error('Error loading analyses:', error);
      toast.error('Failed to load AI analyses');
    }
  });

  // Get AI recommendations
  const { 
    data: recommendations, 
    isLoading: recommendationsLoading, 
    error: recommendationsError,
    refetch: refetchRecommendations 
  } = useQuery({
    queryKey: ['ai-recommendations'],
    queryFn: () => aiService.getRecommendations(),
    staleTime: 30000,
    retry: 1,
    onError: (error) => {
      console.error('Error loading recommendations:', error);
    }
  });

  // Get AI dashboard stats
  const { 
    data: aiStats, 
    isLoading: aiStatsLoading, 
    error: aiStatsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['ai-stats'],
    queryFn: () => aiService.getStats(),
    staleTime: 60000,
    retry: 1,
    onError: (error) => {
      console.error('Error loading AI stats:', error);
    }
  });

  // Generate learning resources mutation
  const generateLearningResourcesMutation = useMutation({
    mutationFn: (data) => aiService.generateLearningResources(data),
    onSuccess: (data) => {
      toast.success('Learning resources generated successfully');
      queryClient.invalidateQueries({ queryKey: ['ai-analyses'] });
    },
    onError: (error) => {
      console.error('Generate learning resources error:', error);
      toast.error('Failed to generate learning resources');
    }
  });

  // Generate roadmap mutation
  const generateRoadmapMutation = useMutation({
    mutationFn: (data) => aiService.generateRoadmapSteps(data),
    onSuccess: (data) => {
      toast.success('AI roadmap generated successfully');
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
    },
    onError: (error) => {
      console.error('Generate roadmap error:', error);
      toast.error('Failed to generate roadmap');
    }
  });

  // Analyze resume mutation
  const analyzeResumeMutation = useMutation({
    mutationFn: ({ file, targetRole }) => {
      if (file) {
        // This would need a parseResume method - if not available, use a simpler approach
        return aiService.analyzeResume(file, targetRole);
      }
      return Promise.reject(new Error('No file provided'));
    },
    onSuccess: () => {
      toast.success('Resume analyzed successfully');
      queryClient.invalidateQueries({ queryKey: ['ai-analyses'] });
    },
    onError: (error) => {
      console.error('Analyze resume error:', error);
      toast.error('Failed to analyze resume');
    }
  });

  // Analyze skill gap mutation - ✅ CORRECTLY DEFINED
  const analyzeSkillGapMutation = useMutation({
    mutationFn: ({ target_role, current_skills, experience_level }) => {
      console.log('analyzeSkillGap called with:', { target_role, current_skills, experience_level });
      return aiService.analyzeSkillGap({ target_role, current_skills, experience_level });
    },
    onSuccess: (data) => {
      toast.success('Skill gap analyzed successfully');
      queryClient.invalidateQueries({ queryKey: ['ai-analyses'] });
    },
    onError: (error) => {
      console.error('Analyze skill gap error:', error);
      toast.error('Failed to analyze skill gap');
    }
  });

  // Get career suggestions mutation
  const getCareerSuggestionsMutation = useMutation({
    mutationFn: (userProfile) => aiService.getCareerSuggestions(userProfile),
    onSuccess: () => {
      toast.success('Career suggestions generated successfully');
      queryClient.invalidateQueries({ queryKey: ['ai-analyses'] });
    },
    onError: (error) => {
      console.error('Career suggestions error:', error);
      toast.error('Failed to generate career suggestions');
    }
  });

  // Get market insights mutation
  const getMarketInsightsMutation = useMutation({
    mutationFn: ({ role, location }) => {
      console.log('Getting market insights for:', role, location);
      return aiService.getMarketInsights(role, location);
    },
    onSuccess: (data) => {
      toast.success('Market insights generated successfully');
      queryClient.invalidateQueries({ queryKey: ['ai-analyses'] });
    },
    onError: (error) => {
      console.error('Market insights error:', error);
      toast.error('Failed to get market insights');
    }
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: ({ message, context }) => aiService.chat(message, context),
    onSuccess: (response) => {
      setChatHistory(prev => [
        ...prev,
        { type: 'user', content: response.message },
        { type: 'ai', content: response.response }
      ]);
    },
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error('Failed to get AI response');
    }
  });

  // Accept recommendation mutation
  const acceptRecommendationMutation = useMutation({
    mutationFn: (recommendationId) => aiService.acceptRecommendation(recommendationId),
    onSuccess: () => {
      toast.success('Recommendation accepted');
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
    },
    onError: (error) => {
      console.error('Accept recommendation error:', error);
      toast.error('Failed to accept recommendation');
    }
  });

  // Reject recommendation mutation
  const rejectRecommendationMutation = useMutation({
    mutationFn: ({ recommendationId, reason }) => aiService.rejectRecommendation(recommendationId, reason),
    onSuccess: () => {
      toast.success('Recommendation rejected');
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
    },
    onError: (error) => {
      console.error('Reject recommendation error:', error);
      toast.error('Failed to reject recommendation');
    }
  });

  // Get pending recommendations
  const getPendingRecommendations = useCallback(() => {
    if (!recommendations) return [];
    
    if (Array.isArray(recommendations)) {
      return recommendations.filter(rec => rec.status === 'pending');
    } else if (recommendations?.results) {
      return recommendations.results.filter(rec => rec.status === 'pending');
    }
    
    return [];
  }, [recommendations]);

  // Clear chat history
  const clearChatHistory = useCallback(() => {
    setChatHistory([]);
  }, []);

  return {
    // Data
    analyses,
    recommendations,
    aiStats,
    chatHistory,
    
    // Loading states
    isLoading: analysesLoading || recommendationsLoading || aiStatsLoading,
    analysesLoading,
    recommendationsLoading,
    aiStatsLoading,
    
    // Errors
    analysesError,
    recommendationsError,
    aiStatsError,
    
    // Mutations - ✅ ALL PROPERLY EXPORTED
    generateRoadmap: generateRoadmapMutation,
    analyzeResume: analyzeResumeMutation,
    analyzeSkillGap: analyzeSkillGapMutation, // ✅ This is the key function
    getCareerSuggestions: getCareerSuggestionsMutation,
    getMarketInsights: getMarketInsightsMutation,
    chat: chatMutation,
    acceptRecommendation: acceptRecommendationMutation,
    rejectRecommendation: rejectRecommendationMutation,
    generateLearningResources: generateLearningResourcesMutation,
    
    // Actions
    getPendingRecommendations,
    clearChatHistory,
    refetchAnalyses,
    refetchRecommendations,
    refetchStats
  };
};

// Simplified hooks for specific use cases
export const useRoadmapAI = () => {
  const { generateRoadmap, analyzeSkillGap } = useAI();
  return { generateRoadmap, analyzeSkillGap };
};

export const useResumeAI = () => {
  const { analyzeResume } = useAI();
  return { analyzeResume };
};

export const useCareerAI = () => {
  const { getCareerSuggestions, getMarketInsights } = useAI();
  return { getCareerSuggestions, getMarketInsights };
};

export default useAI;