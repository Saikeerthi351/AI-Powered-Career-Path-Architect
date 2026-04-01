import React, { createContext, useState, useEffect, useCallback } from 'react';
import { roadmapService } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export const RoadmapContext = createContext(null);

export const RoadmapProvider = ({ children }) => {
  const { user } = useAuth();
  const [roadmaps, setRoadmaps] = useState([]);
  const [selectedRoadmap, setSelectedRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    status: 'all',
    sortBy: 'created_at',
    sortOrder: 'desc',
  });
  const [viewMode, setViewMode] = useState('grid');
  const [stats, setStats] = useState({
    total_roadmaps: 0,
    completed_roadmaps: 0,
    in_progress_roadmaps: 0,
    average_completion: 0,
    total_time_invested: 0,
  });

  useEffect(() => {
    if (user) {
      loadRoadmaps();
      loadStats();
    }
  }, [user]);

  const loadRoadmaps = async () => {
    try {
      setLoading(true);
      const data = await roadmapService.getRoadmaps();
      setRoadmaps(Array.isArray(data) ? data : data.results || []);
    } catch (error) {
      console.error('Error loading roadmaps:', error);
      toast.error('Failed to load roadmaps');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await roadmapService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const getRoadmap = async (id) => {
    try {
      setLoading(true);
      const data = await roadmapService.getRoadmap(id);
      return data;
    } catch (error) {
      console.error('Error getting roadmap:', error);
      toast.error('Failed to load roadmap');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createRoadmap = async (roadmapData) => {
    try {
      setLoading(true);
      const data = await roadmapService.createRoadmap({
        title: roadmapData.title,
        description: roadmapData.description || '',
        target_role: roadmapData.target_role,
        target_industry: roadmapData.target_industry || '',
        total_duration_months: roadmapData.total_duration_months || 12,
        difficulty_level: 'intermediate',
        generated_by_ai: false
      });
      setRoadmaps([...roadmaps, data]);
      toast.success('Roadmap created successfully');
      return data;
    } catch (error) {
      console.error('Error creating roadmap:', error);
      const errorMessage = error.response?.data?.message || 'Failed to create roadmap';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateRoadmap = async (id, roadmapData) => {
    try {
      setLoading(true);
      const data = await roadmapService.updateRoadmap(id, roadmapData);
      setRoadmaps(roadmaps.map(r => r.id === id ? data : r));
      if (selectedRoadmap?.id === id) {
        setSelectedRoadmap(data);
      }
      toast.success('Roadmap updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating roadmap:', error);
      toast.error('Failed to update roadmap');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteRoadmap = async (id) => {
    try {
      setLoading(true);
      await roadmapService.deleteRoadmap(id);
      setRoadmaps(roadmaps.filter(r => r.id !== id));
      if (selectedRoadmap?.id === id) {
        setSelectedRoadmap(null);
      }
      toast.success('Roadmap deleted successfully');
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      toast.error('Failed to delete roadmap');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const generateRoadmap = async (data) => {
    try {
      setLoading(true);
      const roadmap = await roadmapService.generateRoadmap({
        target_role: data.target_role,
        target_industry: data.target_industry || '',
        timeframe_months: data.timeframe_months || 12,
        include_salary_data: data.include_salary_data || true,
        include_market_insights: data.include_market_insights || true,
        current_skills: [], // Would come from user profile
        experience_level: user?.years_experience ? `${user.years_experience} years` : 'intermediate'
      });
      setRoadmaps([...roadmaps, roadmap]);
      toast.success('AI roadmap generated successfully');
      return roadmap;
    } catch (error) {
      console.error('Error generating roadmap:', error);
      const errorMessage = error.response?.data?.error || 'Failed to generate roadmap';
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const addStep = async (roadmapId, stepData) => {
    try {
      const step = await roadmapService.addStep(roadmapId, stepData);
      
      // Update the roadmap in state with the new step
      setRoadmaps(roadmaps.map(r => 
        r.id === roadmapId 
          ? { ...r, steps: [...(r.steps || []), step] }
          : r
      ));
      
      if (selectedRoadmap?.id === roadmapId) {
        setSelectedRoadmap({
          ...selectedRoadmap,
          steps: [...(selectedRoadmap.steps || []), step]
        });
      }
      
      toast.success('Step added successfully');
      return step;
    } catch (error) {
      console.error('Error adding step:', error);
      toast.error('Failed to add step');
      throw error;
    }
  };

  const updateStep = async (stepId, stepData) => {
    try {
      const step = await roadmapService.updateStep(stepId, stepData);
      
      // Update step in roadmaps
      const updatedRoadmaps = roadmaps.map(r => ({
        ...r,
        steps: r.steps?.map(s => s.id === stepId ? step : s) || []
      }));
      setRoadmaps(updatedRoadmaps);
      
      if (selectedRoadmap) {
        setSelectedRoadmap({
          ...selectedRoadmap,
          steps: selectedRoadmap.steps?.map(s => s.id === stepId ? step : s) || []
        });
      }
      
      toast.success('Step updated successfully');
      return step;
    } catch (error) {
      console.error('Error updating step:', error);
      toast.error('Failed to update step');
      throw error;
    }
  };

  const deleteStep = async (stepId) => {
    try {
      await roadmapService.deleteStep(stepId);
      
      // Remove step from roadmaps
      const updatedRoadmaps = roadmaps.map(r => ({
        ...r,
        steps: r.steps?.filter(s => s.id !== stepId) || []
      }));
      setRoadmaps(updatedRoadmaps);
      
      if (selectedRoadmap) {
        setSelectedRoadmap({
          ...selectedRoadmap,
          steps: selectedRoadmap.steps?.filter(s => s.id !== stepId) || []
        });
      }
      
      toast.success('Step deleted successfully');
    } catch (error) {
      console.error('Error deleting step:', error);
      toast.error('Failed to delete step');
      throw error;
    }
  };

  // Search roadmaps function
  const searchRoadmaps = useCallback((query) => {
    if (!roadmaps) return [];
    if (!query) return roadmaps;
    
    const searchTerm = query.toLowerCase();
    return roadmaps.filter(roadmap => 
      roadmap.title?.toLowerCase().includes(searchTerm) ||
      roadmap.description?.toLowerCase().includes(searchTerm) ||
      roadmap.target_role?.toLowerCase().includes(searchTerm)
    );
  }, [roadmaps]);

  // Sort roadmaps function
  const sortRoadmaps = useCallback((roadmapsToSort, sortBy = 'created_at', sortOrder = 'desc') => {
    if (!roadmapsToSort || !Array.isArray(roadmapsToSort)) return [];
    
    return [...roadmapsToSort].sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title?.toLowerCase() || '';
          bValue = b.title?.toLowerCase() || '';
          break;
        case 'progress':
          aValue = a.completion_percentage || 0;
          bValue = b.completion_percentage || 0;
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at || a.created_at).getTime();
          bValue = new Date(b.updated_at || b.created_at).getTime();
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, []);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({
      status: 'all',
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  }, []);

  const selectRoadmap = (roadmap, navigate) => {
  setSelectedRoadmap(roadmap);
  if (navigate && roadmap?.id) {
    navigate(`/roadmap/${roadmap.id}`);
  }
};

  const clearSelectedRoadmap = () => {
    setSelectedRoadmap(null);
  };

  const refreshRoadmaps = () => {
    loadRoadmaps();
    loadStats();
  };

  const value = {
    roadmaps,
    selectedRoadmap,
    loading,
    error,
    stats,
    filters,
    viewMode,
    setViewMode,
    getRoadmap,
    createRoadmap,
    updateRoadmap,
    deleteRoadmap,
    generateRoadmap,
    addStep,
    updateStep,
    deleteStep,
    selectRoadmap,
    clearSelectedRoadmap,
    refreshRoadmaps,
    searchRoadmaps,
    sortRoadmaps,
    updateFilters,
    clearFilters,
    createRoadmapMutation: { mutateAsync: createRoadmap },
    generateRoadmapMutation: { mutateAsync: generateRoadmap },
    deleteRoadmapMutation: { mutateAsync: deleteRoadmap },
  };

  return (
    <RoadmapContext.Provider value={value}>
      {children}
    </RoadmapContext.Provider>
  );
};