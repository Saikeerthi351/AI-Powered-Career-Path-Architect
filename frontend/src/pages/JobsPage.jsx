import React, { useState, useEffect } from 'react';
import {
  FiBriefcase,
  FiMapPin,
  FiDollarSign,
  FiClock,
  FiTrendingUp,
  FiStar,
  FiHeart,
  FiShare2,
  FiExternalLink,
  FiFilter,
  FiSearch,
  FiCalendar,
  FiUsers,
  FiAward,
  FiCheckCircle,
  FiX,
  FiZap,
  FiBarChart2,
  FiLayers,
  FiArrowUpRight,
  FiAlertCircle,
  FiFileText,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { HiOutlineSparkles } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth.jsx';
import { useAI } from '../hooks/useAI.jsx';
import { userService } from '../services/userService.js';
import { api } from '../services/api.js';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const JobsPage = () => {
  const { user } = useAuth();
  const { getMarketInsights } = useAI();
  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('software engineer');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [savedJobs, setSavedJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [marketInsights, setMarketInsights] = useState(null);
  const [marketInsightsError, setMarketInsightsError] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingMarketInsights, setIsLoadingMarketInsights] = useState(false);
  const [showFullInsights, setShowFullInsights] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    saved: 0,
    applied: 0,
    matchCount: 0,
  });

  const [filters, setFilters] = useState({
    jobType: 'all',
    experienceLevel: 'all',
    salary: 'all',
    location: '',
    remote: false,
    postedWithin: '30',
    industry: 'all',
  });

  const jobTypes = [
    { id: 'all', label: 'All Types' },
    { id: 'full-time', label: 'Full Time' },
    { id: 'part-time', label: 'Part Time' },
    { id: 'contract', label: 'Contract' },
    { id: 'internship', label: 'Internship' },
    { id: 'remote', label: 'Remote' },
  ];

  const experienceLevels = [
    { id: 'all', label: 'All Levels' },
    { id: 'entry', label: 'Entry Level' },
    { id: 'mid', label: 'Mid Level' },
    { id: 'senior', label: 'Senior' },
    { id: 'lead', label: 'Lead' },
    { id: 'executive', label: 'Executive' },
  ];

  const industries = [
    { id: 'all', label: 'All Industries' },
    { id: 'technology', label: 'Technology' },
    { id: 'finance', label: 'Finance' },
    { id: 'healthcare', label: 'Healthcare' },
    { id: 'education', label: 'Education' },
    { id: 'retail', label: 'Retail' },
    { id: 'manufacturing', label: 'Manufacturing' },
  ];

  useEffect(() => {
    loadJobs();
    loadSavedJobs();
    loadResumes();
    // Removed automatic market insights loading
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadJobs();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, filters.location, filters.jobType, filters.postedWithin, filters.remote, filters.experienceLevel, filters.industry]);

  useEffect(() => {
    setStats({
      total: jobs.length,
      saved: savedJobs.length,
      applied: appliedJobs.length,
      matchCount: jobs.filter(j => j.match_score >= 80).length,
    });
  }, [jobs, savedJobs, appliedJobs]);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      params.append('q', searchQuery || 'software engineer');
      
      if (filters.location) params.append('location', filters.location);
      if (filters.jobType !== 'all') params.append('job_type', filters.jobType);
      params.append('days_old', filters.postedWithin);
      
      const response = await api.get('/jobs/search/', { params });
      
      if (response.data?.results) {
        let jobsData = response.data.results;
        
        const primaryResume = resumes.find(r => r.is_primary);
        if (primaryResume?.parsed_content?.keywords?.matched) {
          const resumeSkills = primaryResume.parsed_content.keywords.matched.map(s => s.toLowerCase());
          
          jobsData = jobsData.map(job => {
            const jobSkills = (job.skills || []).map(s => s.toLowerCase());
            const matchedSkills = jobSkills.filter(skill => 
              resumeSkills.some(rs => rs.includes(skill) || skill.includes(rs))
            );
            
            const matchScore = jobSkills.length > 0 
              ? Math.round((matchedSkills.length / jobSkills.length) * 100)
              : 0;
            
            return {
              ...job,
              match_score: matchScore,
              matched_skills: matchedSkills
            };
          });
        }
        
        setJobs(jobsData);
      } else {
        setJobs([]);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      toast.error(`Failed to load jobs: ${error.response?.data?.error || error.message}`);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadResumes = async () => {
    try {
      const data = await userService.getResumes();
      if (Array.isArray(data)) {
        setResumes(data);
      } else if (data?.results) {
        setResumes(data.results);
      } else {
        setResumes([]);
      }
    } catch (error) {
      console.error('Error loading resumes:', error);
      setResumes([]);
    }
  };

  const loadSavedJobs = () => {
    const saved = JSON.parse(localStorage.getItem('saved_jobs') || '[]');
    const applied = JSON.parse(localStorage.getItem('applied_jobs') || '[]');
    setSavedJobs(saved);
    setAppliedJobs(applied);
  };

  // MANUAL market insights loading - only when button is clicked
  const handleLoadMarketInsights = async () => {
    try {
      setIsLoadingMarketInsights(true);
      setMarketInsightsError(null);
      const targetRole = user?.career_goals?.[0]?.target_role || 'Software Engineer';
      
      const result = await getMarketInsights.mutateAsync({ 
        role: targetRole, 
        location: 'United States' 
      });
      
      setMarketInsights(result);
      setShowFullInsights(true);
      toast.success('Market insights loaded successfully');
    } catch (error) {
      console.error('Failed to load market insights:', error);
      setMarketInsightsError(error.message || 'Failed to load market insights');
      setMarketInsights(null);
      toast.error('Failed to load market insights');
    } finally {
      setIsLoadingMarketInsights(false);
    }
  };

  const handleSaveJob = (jobId) => {
    const newSaved = savedJobs.includes(jobId)
      ? savedJobs.filter(id => id !== jobId)
      : [...savedJobs, jobId];
    
    setSavedJobs(newSaved);
    localStorage.setItem('saved_jobs', JSON.stringify(newSaved));
    toast.success(savedJobs.includes(jobId) ? 'Removed from saved' : 'Job saved!');
  };

  const handleApplyJob = (jobId) => {
    if (appliedJobs.includes(jobId)) {
      toast.error('Already applied to this job');
      return;
    }

    const primaryResume = resumes.find(r => r.is_primary);
    
    if (!primaryResume) {
      toast.error('Please set a primary resume before applying');
      return;
    }

    const newApplied = [...appliedJobs, jobId];
    setAppliedJobs(newApplied);
    localStorage.setItem('applied_jobs', JSON.stringify(newApplied));
    
    toast.success('Application submitted with your primary resume! 🎉');
  };

  const handleMatchAnalysis = async (job) => {
    setIsAnalyzing(true);
    try {
      const primaryResume = resumes.find(r => r.is_primary);
      
      if (!primaryResume || !primaryResume.parsed_content) {
        toast.error('Please upload and analyze a resume first');
        return;
      }

      const resumeSkills = primaryResume.parsed_content?.keywords?.matched || [];
      const jobSkills = job.skills || [];
      
      const matchedSkills = jobSkills.filter(skill => 
        resumeSkills.some(s => s.toLowerCase() === skill.toLowerCase())
      );
      
      const matchPercentage = jobSkills.length > 0 
        ? Math.round((matchedSkills.length / jobSkills.length) * 100)
        : 0;

      toast.success(
        <div>
          <p className="font-bold">Match Score: {matchPercentage}%</p>
          <p className="text-sm">Matched skills: {matchedSkills.join(', ') || 'None'}</p>
        </div>
      );
    } catch (error) {
      toast.error('Failed to analyze match');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filters.jobType === 'all' || job.type === filters.jobType;
    const matchesExperience = filters.experienceLevel === 'all' || job.experience === filters.experienceLevel;
    const matchesIndustry = filters.industry === 'all' || job.industry === filters.industry;
    const matchesRemote = !filters.remote || job.type === 'remote';
    
    const postedDate = new Date(job.posted);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(filters.postedWithin));
    const matchesPosted = postedDate >= cutoffDate;
    
    return matchesSearch && matchesType && matchesExperience && matchesIndustry && matchesRemote && matchesPosted;
  });

  const getMatchScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-indigo-600 dark:text-indigo-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getMatchScoreBg = (score) => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
    if (score >= 75) return 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
    return 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const primaryResume = resumes.find(r => r.is_primary);

  // Enhanced Market Insights Component with Show Less button and professional formatting
  const renderMarketInsights = () => {
    if (isLoadingMarketInsights) {
      return (
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl shadow-lg p-8 border border-indigo-100 dark:border-indigo-800">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading market insights...</p>
          </div>
        </div>
      );
    }

    if (marketInsightsError) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
          <div className="flex items-center space-x-3">
            <FiAlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Market Insights Unavailable</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {marketInsightsError}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (!marketInsights || !marketInsights.text) return null;

    // Parse the text content
    const lines = marketInsights.text.split('\n');
    
    // Find sections
    const marketOverviewIndex = lines.findIndex(line => line.includes('MARKET OVERVIEW'));
    const demandAnalysisIndex = lines.findIndex(line => line.includes('DEMAND ANALYSIS'));
    const salaryInfoIndex = lines.findIndex(line => line.includes('SALARY INFORMATION'));
    const topSkillsIndex = lines.findIndex(line => line.includes('TOP SKILLS IN DEMAND'));
    const topCompaniesIndex = lines.findIndex(line => line.includes('TOP COMPANIES HIRING'));
    const marketTrendsIndex = lines.findIndex(line => line.includes('MARKET TRENDS'));
    const recommendationsIndex = lines.findIndex(line => line.includes('RECOMMENDATIONS FOR JOB SEEKERS'));

    const extractSection = (startIndex, endIndex) => {
      if (startIndex === -1) return [];
      const end = endIndex !== -1 ? endIndex : lines.length;
      return lines.slice(startIndex + 1, end).filter(line => line.trim() !== '');
    };

    const marketOverview = extractSection(marketOverviewIndex, demandAnalysisIndex);
    const demandAnalysis = extractSection(demandAnalysisIndex, salaryInfoIndex);
    const salaryInfo = extractSection(salaryInfoIndex, topSkillsIndex);
    const topSkills = extractSection(topSkillsIndex, topCompaniesIndex);
    const topCompanies = extractSection(topCompaniesIndex, marketTrendsIndex);
    const marketTrends = extractSection(marketTrendsIndex, recommendationsIndex);
    const recommendations = extractSection(recommendationsIndex);

    // Parse demand metrics
    const demandText = demandAnalysis.join(' ').replace(/\*\*/g, '');
    const demandMatch = demandText.match(/Overall Demand:\s*([^•]+)/i);
    const growthMatch = demandText.match(/Year-over-Year Growth:\s*([^%]+%)/i);

    // Parse salary ranges
    const entrySalary = salaryInfo.find(l => l.includes('Entry Level'))?.replace(/\*\*/g, '').replace('Entry Level:', '').trim() || '$85,000 - $125,000';
    const midSalary = salaryInfo.find(l => l.includes('Mid Level'))?.replace(/\*\*/g, '').replace('Mid Level:', '').trim() || '$130,000 - $175,000';
    const seniorSalary = salaryInfo.find(l => l.includes('Senior Level'))?.replace(/\*\*/g, '').replace('Senior Level:', '').trim() || '$180,000 - $260,000+';

    // Clean skills (remove bullet points)
    const cleanSkills = topSkills.map(s => s.replace(/^[•\-*]\s*/, '').replace(/\*\*/g, ''));

    // Clean companies
    const cleanCompanies = topCompanies.map(s => s.replace(/^[•\-*]\s*/, '').replace(/\*\*/g, ''));

    // Clean trends
    const cleanTrends = marketTrends.map(s => s.replace(/^[•\-*]\s*/, '').replace(/\*\*/g, ''));

    // Clean recommendations
    const cleanRecommendations = recommendations.map(s => {
      const cleaned = s.replace(/^\d+\.\s*/, '').replace(/\*\*/g, '');
      return cleaned.replace(/^[•\-*]\s*/, '');
    });

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl shadow-lg border border-indigo-100 dark:border-indigo-800 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                <FiTrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  Market Insights
                  <span className="ml-3 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm font-medium rounded-full">
                    {user?.career_goals?.[0]?.target_role || 'Software Engineer'}
                  </span>
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Real-time labor market analysis based on current job postings
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowFullInsights(!showFullInsights)}
              className="flex items-center space-x-1 px-4 py-2 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <span className="text-sm font-medium">{showFullInsights ? 'Show Less' : 'Show Full Analysis'}</span>
              {showFullInsights ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {showFullInsights && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="p-6 space-y-8"
            >
              {/* Market Overview */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="w-1.5 h-6 bg-indigo-600 rounded-full mr-3"></span>
                  Market Overview
                </h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {marketOverview.join(' ').replace(/\*\*/g, '')}
                </p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4 border-indigo-500">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Overall Demand</p>
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                    {demandMatch ? demandMatch[1].trim() : 'High'}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4 border-green-500">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Year-over-Year Growth</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {growthMatch ? growthMatch[1].trim() : '25%'}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4 border-purple-500">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Entry Level</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{entrySalary}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-l-4 border-yellow-500">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Senior Level</p>
                  <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{seniorSalary}</p>
                </div>
              </div>

              {/* Salary Range Details */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="w-1.5 h-6 bg-green-600 rounded-full mr-3"></span>
                  Salary Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Entry Level</p>
                    <p className="text-xl font-bold text-green-700 dark:text-green-400">{entrySalary}</p>
                  </div>
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Mid Level</p>
                    <p className="text-xl font-bold text-yellow-700 dark:text-yellow-400">{midSalary}</p>
                  </div>
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Senior Level</p>
                    <p className="text-xl font-bold text-red-700 dark:text-red-400">{seniorSalary}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 italic">
                  * Base salary only. Total compensation including stocks/bonus can be 20-50% higher at Tier-1 tech firms.
                </p>
              </div>

              {/* Top Skills */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="w-1.5 h-6 bg-yellow-500 rounded-full mr-3"></span>
                  Top Skills in Demand
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cleanSkills.slice(0, 6).map((skill, index) => {
                    const [skillName, ...description] = skill.split(':');
                    return (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <FiZap className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-white">{skillName}</span>
                          {description.length > 0 && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description.join(':')}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Companies */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="w-1.5 h-6 bg-purple-600 rounded-full mr-3"></span>
                  Top Hiring Companies
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {cleanCompanies.slice(0, 8).map((company, index) => (
                    <div
                      key={index}
                      className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-3 text-center border border-indigo-100 dark:border-indigo-800"
                    >
                      <FiBriefcase className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{company}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Market Trends */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <span className="w-1.5 h-6 bg-blue-600 rounded-full mr-3"></span>
                  Market Trends
                </h3>
                <div className="space-y-3">
                  {cleanTrends.map((trend, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <FiTrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-700 dark:text-gray-300">{trend}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {cleanRecommendations.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border-l-4 border-indigo-600">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <HiOutlineSparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2" />
                    Recommendations for Job Seekers
                  </h3>
                  <ul className="space-y-3">
                    {cleanRecommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <span className="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{index + 1}</span>
                        </span>
                        <p className="text-gray-700 dark:text-gray-300">{rec}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/50 dark:bg-gray-800/50 border-t border-indigo-200 dark:border-indigo-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
            <FiClock className="w-3 h-3 mr-1" />
            Data updated: {new Date().toLocaleDateString()} • Based on real-time job market analysis
          </p>
        </div>
      </motion.div>
    );
  };

  if (isLoading && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingSpinner fullScreen text="Loading jobs..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                  <FiBriefcase className="w-4 h-4 mr-2" />
                  Job Search
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold">
                  Find Your Dream Job
                </h1>
                
                <p className="text-white/80 max-w-2xl">
                  Discover opportunities that match your skills and career aspirations
                </p>

                <div className="flex items-center space-x-4 pt-4">
                  <div className="flex items-center space-x-2">
                    <FiLayers className="w-4 h-4 text-white/70" />
                    <span className="text-sm">{stats.total} Jobs</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiHeart className="w-4 h-4 text-white/70" />
                    <span className="text-sm">{stats.saved} Saved</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiCheckCircle className="w-4 h-4 text-white/70" />
                    <span className="text-sm">{stats.applied} Applied</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="group inline-flex items-center px-6 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200"
              >
                <FiFilter className={`w-5 h-5 mr-2 transition-transform duration-300 ${showFilters ? 'rotate-180' : 'group-hover:rotate-12'}`} />
                Filters
                <FiArrowUpRight className="w-4 h-4 ml-2 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Market Insights Button */}
          <div className="flex justify-end">
            <button
              onClick={handleLoadMarketInsights}
              disabled={isLoadingMarketInsights}
              className="group inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingMarketInsights ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Loading...
                </>
              ) : (
                <>
                  <FiTrendingUp className="w-5 h-5 mr-2 group-hover:-translate-y-1 transition-transform" />
                  Get Market Insights
                  <FiArrowUpRight className="w-4 h-4 ml-2 opacity-70 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </button>
          </div>

          {/* Market Insights Display */}
          {renderMarketInsights()}

          {/* Resume Status Banner */}
          {resumes.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FiFileText className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    You haven't uploaded any resumes yet. Upload a resume to apply for jobs.
                  </p>
                </div>
                <button
                  onClick={() => window.location.href = '/resume'}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Upload Resume →
                </button>
              </div>
            </div>
          )}

          {!primaryResume && resumes.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FiStar className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Please set a primary resume to use for job applications.
                  </p>
                </div>
                <button
                  onClick={() => window.location.href = '/resume'}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Go to Resumes →
                </button>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Search by job title, company, or keywords..."
                />
              </div>
              <div className="relative flex-1">
                <FiMapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Location (city, state, or remote)"
                />
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
              >
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Job Type
                      </label>
                      <select
                        value={filters.jobType}
                        onChange={(e) => setFilters({ ...filters, jobType: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      >
                        {jobTypes.map(type => (
                          <option key={type.id} value={type.id}>{type.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Experience Level
                      </label>
                      <select
                        value={filters.experienceLevel}
                        onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      >
                        {experienceLevels.map(level => (
                          <option key={level.id} value={level.id}>{level.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Industry
                      </label>
                      <select
                        value={filters.industry}
                        onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      >
                        {industries.map(industry => (
                          <option key={industry.id} value={industry.id}>{industry.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Posted Within
                      </label>
                      <select
                        value={filters.postedWithin}
                        onChange={(e) => setFilters({ ...filters, postedWithin: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      >
                        <option value="7">Last 7 days</option>
                        <option value="14">Last 14 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="60">Last 60 days</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.remote}
                        onChange={(e) => setFilters({ ...filters, remote: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Remote Only
                      </span>
                    </label>

                    <button
                      onClick={() => setFilters({
                        jobType: 'all',
                        experienceLevel: 'all',
                        salary: 'all',
                        location: '',
                        remote: false,
                        postedWithin: '30',
                        industry: 'all',
                      })}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                    >
                      Clear All Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Jobs Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Found <span className="font-semibold text-indigo-600 dark:text-indigo-400">{filteredJobs.length}</span> job{filteredJobs.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <span className="flex items-center text-gray-600 dark:text-gray-400">
                <FiHeart className="w-4 h-4 mr-1 text-red-500" />
                {stats.saved} Saved
              </span>
              <span className="flex items-center text-gray-600 dark:text-gray-400">
                <FiCheckCircle className="w-4 h-4 mr-1 text-green-500" />
                {stats.applied} Applied
              </span>
            </div>
          </div>

          {/* Jobs Grid */}
          {filteredJobs.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredJobs.map((job) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden cursor-pointer group border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all"
                  onClick={() => {
                    setSelectedJob(job);
                    setShowJobModal(true);
                  }}
                >
                  <div className={`h-1.5 ${
                    job.match_score >= 90 ? 'bg-green-500' :
                    job.match_score >= 75 ? 'bg-indigo-500' :
                    job.match_score >= 60 ? 'bg-yellow-500' :
                    'bg-gray-400'
                  }`}></div>

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                          {job.logo ? (
                            <img src={job.logo} alt={job.company} className="w-8 h-8" />
                          ) : (
                            <FiBriefcase className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-xl text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {job.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">{job.company}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveJob(job.id);
                        }}
                        className={`p-2 rounded-xl transition-all ${
                          savedJobs.includes(job.id)
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        }`}
                      >
                        <FiHeart className="w-5 h-5" fill={savedJobs.includes(job.id) ? 'currentColor' : 'none'} />
                      </button>
                    </div>

                    <div className={`mb-4 p-4 ${getMatchScoreBg(job.match_score)} rounded-xl border`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Match Score</span>
                        <span className={`text-xl font-bold ${getMatchScoreColor(job.match_score)}`}>
                          {job.match_score}%
                        </span>
                      </div>
                      <div className="h-2 bg-white/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            job.match_score >= 90 ? 'bg-green-500' :
                            job.match_score >= 75 ? 'bg-indigo-500' :
                            job.match_score >= 60 ? 'bg-yellow-500' :
                            'bg-gray-400'
                          }`}
                          style={{ width: `${job.match_score}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="flex items-center text-sm">
                        <FiMapPin className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-700 dark:text-gray-300">{job.location}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <FiDollarSign className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-700 dark:text-gray-300">{job.salary}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <FiClock className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-gray-700 dark:text-gray-300">
                          {job.type?.replace('-', ' ')} • Posted {formatDate(job.posted)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.skills?.slice(0, 4).map((skill, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 text-xs font-medium rounded-lg border border-indigo-200 dark:border-indigo-800"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.skills?.length > 4 && (
                        <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-lg">
                          +{job.skills.length - 4}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-2">
                        {appliedJobs.includes(job.id) ? (
                          <span className="inline-flex items-center px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium rounded-lg">
                            <FiCheckCircle className="w-4 h-4 mr-1" />
                            Applied
                          </span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplyJob(job.id);
                            }}
                            disabled={!primaryResume}
                            className={`px-4 py-2 text-white text-sm font-medium rounded-xl transition-colors ${
                              primaryResume
                                ? 'bg-indigo-600 hover:bg-indigo-700'
                                : 'bg-gray-400 cursor-not-allowed'
                            }`}
                          >
                            Quick Apply
                          </button>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {job.applicants} applicants
                        </span>
                        <FiExternalLink className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>

                    {job.deadline && (
                      <div className="mt-3 text-xs text-center text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 py-2 rounded-lg">
                        Apply by {new Date(job.deadline).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-6">
                <FiBriefcase className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No jobs found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                {searchQuery || filters.jobType !== 'all' || filters.experienceLevel !== 'all' || filters.industry !== 'all' || filters.location
                  ? 'No jobs match your current filters. Try adjusting your search criteria.'
                  : 'Start your job search by exploring opportunities'}
              </p>
              {(searchQuery || filters.jobType !== 'all' || filters.experienceLevel !== 'all' || filters.industry !== 'all' || filters.location) && (
                <button
                  onClick={() => {
                    setSearchQuery('software engineer');
                    setFilters({
                      jobType: 'all',
                      experienceLevel: 'all',
                      salary: 'all',
                      location: '',
                      remote: false,
                      postedWithin: '30',
                      industry: 'all',
                    });
                  }}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {/* Job Details Modal */}
          <AnimatePresence>
            {showJobModal && selectedJob && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={() => setShowJobModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-8">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                          {selectedJob.logo ? (
                            <img src={selectedJob.logo} alt={selectedJob.company} className="w-10 h-10" />
                          ) : (
                            <FiBriefcase className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {selectedJob.title}
                          </h2>
                          <p className="text-gray-600 dark:text-gray-400 text-lg">{selectedJob.company}</p>
                          <div className="flex flex-wrap gap-4 mt-3">
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <FiMapPin className="w-4 h-4 mr-1" />
                              {selectedJob.location}
                            </div>
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <FiDollarSign className="w-4 h-4 mr-1" />
                              {selectedJob.salary}
                            </div>
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <FiClock className="w-4 h-4 mr-1" />
                              Posted {formatDate(selectedJob.posted)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowJobModal(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    </div>

                    {resumes.length > 0 && (
                      <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                          Apply with Resume
                        </h4>
                        <div className="space-y-2">
                          {resumes.map(resume => (
                            <div
                              key={resume.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                resume.is_primary
                                  ? 'border-indigo-300 bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-900/30'
                                  : 'border-gray-200 dark:border-gray-700'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <FiFileText className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {resume.original_filename}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {resume.analyzed ? `ATS Score: ${resume.ats_score}%` : 'Not analyzed'}
                                  </p>
                                </div>
                              </div>
                              {resume.is_primary && (
                                <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg">
                                  Primary
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`mb-6 p-5 ${getMatchScoreBg(selectedJob.match_score)} rounded-xl border`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-gray-900 dark:text-white">Your Match Score</span>
                        <span className={`text-2xl font-bold ${getMatchScoreColor(selectedJob.match_score)}`}>
                          {selectedJob.match_score}%
                        </span>
                      </div>
                      <div className="h-3 bg-white/50 dark:bg-gray-700/50 rounded-full overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full ${
                            selectedJob.match_score >= 90 ? 'bg-green-500' :
                            selectedJob.match_score >= 75 ? 'bg-indigo-500' :
                            selectedJob.match_score >= 60 ? 'bg-yellow-500' :
                            'bg-gray-400'
                          }`}
                          style={{ width: `${selectedJob.match_score}%` }}
                        />
                      </div>
                      <button
                        onClick={() => handleMatchAnalysis(selectedJob)}
                        disabled={isAnalyzing || !primaryResume}
                        className={`text-sm inline-flex items-center ${
                          primaryResume
                            ? 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300'
                            : 'text-gray-400 cursor-not-allowed'
                        } font-medium`}
                      >
                        {isAnalyzing ? 'Analyzing...' : 'See detailed match analysis'}
                        <FiArrowUpRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>

                    <div className="mb-6">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg">
                        Job Description
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                        {selectedJob.description}
                      </p>
                    </div>

                    {selectedJob.skills?.length > 0 && (
                      <div className="mb-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-lg">
                          Required Skills
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.skills.map((skill, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg text-sm font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleSaveJob(selectedJob.id)}
                          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border transition-all ${
                            savedJobs.includes(selectedJob.id)
                              ? 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
                              : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800'
                          }`}
                        >
                          <FiHeart className="w-4 h-4" fill={savedJobs.includes(selectedJob.id) ? 'currentColor' : 'none'} />
                          <span>{savedJobs.includes(selectedJob.id) ? 'Saved' : 'Save Job'}</span>
                        </button>
                        
                        {selectedJob.redirect_url && (
                          <a
                            href={selectedJob.redirect_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <FiExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>

                      {appliedJobs.includes(selectedJob.id) ? (
                        <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-2.5 rounded-xl">
                          <FiCheckCircle className="w-5 h-5" />
                          <span className="font-medium">Applied</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleApplyJob(selectedJob.id)}
                          disabled={!primaryResume}
                          className={`px-6 py-2.5 rounded-xl font-medium transition-colors shadow-lg ${
                            primaryResume
                              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                              : 'bg-gray-400 text-white cursor-not-allowed'
                          }`}
                        >
                          Apply Now
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default JobsPage;