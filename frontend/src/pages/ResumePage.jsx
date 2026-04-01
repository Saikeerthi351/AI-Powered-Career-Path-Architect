import React, { useState, useEffect } from 'react';
import {
  FiFileText,
  FiUpload,
  FiDownload,
  FiTrash2,
  FiStar,
  FiEye,
  FiShare2,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiTrendingUp,
  FiAward,
  FiBriefcase,
  FiCalendar,
  FiX,
  FiZap,
  FiBarChart2,
  FiLayers,
  FiArrowUpRight,
  FiSearch,
  FiRefreshCw,
  FiExternalLink,
} from 'react-icons/fi';
import { HiOutlineSparkles } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth.jsx';
import { userService } from '../services/userService.js';
import { useAI } from '../hooks/useAI.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const ResumePage = () => {
  const { user } = useAuth();
  const { analyzeResume: aiAnalyzeResume } = useAI();
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedResume, setSelectedResume] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    analyzed: 0,
    primary: 0,
    thisMonth: 0,
    averageScore: 0,
  });

  useEffect(() => {
    loadResumes();
  }, []);

  // Update stats when resumes change
  useEffect(() => {
    if (resumes.length > 0) {
      const analyzed = resumes.filter(r => r.analyzed).length;
      const scores = resumes.filter(r => r.ats_score).map(r => r.ats_score);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const thisMonth = resumes.filter(r => {
        const uploadDate = new Date(r.upload_date);
        const now = new Date();
        return uploadDate.getMonth() === now.getMonth() &&
               uploadDate.getFullYear() === now.getFullYear();
      }).length;

      setStats({
        total: resumes.length,
        analyzed,
        primary: resumes.filter(r => r.is_primary).length,
        thisMonth,
        averageScore: Math.round(avgScore),
      });
    } else {
      setStats({
        total: 0,
        analyzed: 0,
        primary: 0,
        thisMonth: 0,
        averageScore: 0,
      });
    }
  }, [resumes]);

  const loadResumes = async () => {
    try {
      setIsLoading(true);
      const data = await userService.getResumes();
      
      // Handle different response formats
      if (Array.isArray(data)) {
        setResumes(data);
      } else if (data?.results) {
        setResumes(data.results);
      } else if (data?.data) {
        setResumes(data.data);
      } else {
        setResumes([]);
      }
    } catch (error) {
      console.error('Error loading resumes:', error);
      toast.error('Failed to load resumes');
      setResumes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 
                       'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size should be less than 10MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress (UI only)
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const response = await userService.uploadResume(file);
      setResumes([...resumes, response]);
      setShowUploadModal(false);
      setUploadProgress(0);
      toast.success('Resume uploaded successfully');
      
      // Auto-analyze new resume
      handleAnalyzeResume(response.id);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload resume');
    } finally {
      clearInterval(interval);
      setIsUploading(false);
    }
  };

  const handleAnalyzeResume = async (resumeId) => {
    const resume = resumes.find(r => r.id === resumeId);
    if (!resume) return;

    setIsAnalyzing(true);
    try {
      // Call the analyze endpoint - REAL API call
      const result = await userService.analyzeResume(resumeId);
      
      setAnalysis(result);
      setSelectedResume(resume);
      setShowAnalysisModal(true);
      
      // Update resume analyzed status
      setResumes(resumes.map(r => 
        r.id === resumeId ? { 
          ...r, 
          analyzed: true, 
          ats_score: result.ats_score,
          parsed_content: result 
        } : r
      ));
      
      toast.success('Resume analyzed successfully');
    } catch (error) {
      console.error('Error analyzing resume:', error);
      toast.error(error.response?.data?.message || 'Failed to analyze resume');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSetPrimary = async (resumeId) => {
    try {
      await userService.setPrimaryResume(resumeId);
      setResumes(resumes.map(r => ({
        ...r,
        is_primary: r.id === resumeId,
      })));
      toast.success('Primary resume updated');
    } catch (error) {
      console.error('Error setting primary:', error);
      toast.error(error.response?.data?.message || 'Failed to set primary resume');
    }
  };

  const handleDeleteResume = async (resumeId) => {
    if (!window.confirm('Are you sure you want to delete this resume?')) return;

    try {
      await userService.deleteResume(resumeId);
      setResumes(resumes.filter(r => r.id !== resumeId));
      if (selectedResume?.id === resumeId) {
        setSelectedResume(null);
        setShowAnalysisModal(false);
      }
      toast.success('Resume deleted successfully');
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast.error(error.response?.data?.message || 'Failed to delete resume');
    }
  };

  const handleDownload = async (resume) => {
    try {
      // In a real app, this would call the download endpoint
      // For now, we'll use the file URL from the resume object
      if (resume.file_url) {
        window.open(resume.file_url, '_blank');
      } else {
        toast.error('Download URL not available');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download resume');
    }
  };

  const handleShare = (resume) => {
    // Generate a shareable link - this would be a real endpoint in production
    const shareUrl = `${window.location.origin}/shared/resume/${resume.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard');
  };

  const filteredResumes = resumes.filter(resume => {
    const matchesSearch = resume.original_filename?.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === 'all') return matchesSearch;
    if (filter === 'primary') return matchesSearch && resume.is_primary;
    if (filter === 'analyzed') return matchesSearch && resume.analyzed;
    if (filter === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return matchesSearch && new Date(resume.upload_date) > oneWeekAgo;
    }
    return matchesSearch;
  });

  const getFileIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'pdf': return '📄';
      case 'doc': return '📝';
      case 'docx': return '📝';
      default: return '📁';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
    return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 animate-pulse">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header with Gradient */}
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-4">
                <div className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                  <FiFileText className="w-4 h-4 mr-2" />
                  Resume Management
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold">
                  Optimize Your Resume
                </h1>
                
                <p className="text-white/80 max-w-2xl">
                  Upload, analyze, and optimize your resumes with AI-powered insights
                </p>

                <div className="flex items-center space-x-4 pt-4">
                  <div className="flex items-center space-x-2">
                    <FiLayers className="w-4 h-4 text-white/70" />
                    <span className="text-sm">{stats.total} Total</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiCheckCircle className="w-4 h-4 text-white/70" />
                    <span className="text-sm">{stats.analyzed} Analyzed</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiBarChart2 className="w-4 h-4 text-white/70" />
                    <span className="text-sm">Avg. {stats.averageScore}%</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowUploadModal(true)}
                className="group inline-flex items-center px-6 py-3 bg-white text-gray-900 rounded-xl font-semibold hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200"
              >
                <FiUpload className="w-5 h-5 mr-2 group-hover:-translate-y-1 transition-transform" />
                Upload Resume
                <FiArrowUpRight className="w-4 h-4 ml-2 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Stats Cards - Real data from API */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Resumes</p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</h3>
                </div>
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  <FiFileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Analyzed</p>
                  <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{stats.analyzed}</h3>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <FiCheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Primary</p>
                  <h3 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{stats.primary}</h3>
                </div>
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                  <FiStar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">This Month</p>
                  <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{stats.thisMonth}</h3>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <FiCalendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Score</p>
                  <h3 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.averageScore}%</h3>
                </div>
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  <FiBarChart2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Search resumes by filename..."
                />
              </div>

              <div className="flex items-center space-x-2">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'primary', label: 'Primary' },
                  { id: 'analyzed', label: 'Analyzed' },
                  { id: 'recent', label: 'Recent' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      filter === f.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resumes Grid - Real data from API */}
          {filteredResumes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredResumes.map((resume) => (
                <motion.div
                  key={resume.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden group cursor-pointer"
                  onClick={() => {
                    setSelectedResume(resume);
                    if (resume.analyzed && resume.parsed_content) {
                      setAnalysis(resume.parsed_content);
                      setShowAnalysisModal(true);
                    }
                  }}
                >
                  {/* Card Header with Status Bar */}
                  <div className={`h-2 ${
                    resume.is_primary ? 'bg-yellow-500' :
                    resume.analyzed ? 'bg-green-500' :
                    'bg-gray-300 dark:bg-gray-600'
                  }`}></div>

                  <div className="p-6">
                    {/* Header - FIXED: Removed truncate and added break-all */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="text-4xl">
                          {getFileIcon(resume.file_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-base text-gray-900 dark:text-white break-all group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {resume.original_filename}
                           </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {resume.file_size ? Math.round(resume.file_size / 1024) : 0} KB •{' '}
                            <span className="font-mono text-xs uppercase tracking-wider">
                              {(resume.file_type || 'pdf').split('/').pop() || 'pdf'}
                            </span>
                          </p>
                        </div>
                      </div>

                      {resume.is_primary && (
                        <div className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                          <FiStar className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-2 mb-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Uploaded</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {resume.upload_date ? new Date(resume.upload_date).toLocaleDateString() : 'Unknown'}
                        </span>
                      </div>

                      {resume.analyzed && resume.ats_score && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">ATS Score</span>
                          <span className={`font-medium ${getScoreColor(resume.ats_score)}`}>
                            {resume.ats_score}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Progress bar for analyzed resumes */}
                    {resume.analyzed && resume.ats_score && (
                      <div className="mb-4">
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              resume.ats_score >= 80 ? 'bg-green-500' :
                              resume.ats_score >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${resume.ats_score}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(resume);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Download"
                        >
                          <FiDownload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(resume);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Share"
                        >
                          <FiShare2 className="w-4 h-4" />
                        </button>
                        {!resume.analyzed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAnalyzeResume(resume.id);
                            }}
                            disabled={isAnalyzing}
                            className="p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Analyze"
                          >
                            <HiOutlineSparkles className="w-4 h-4" />
                          </button>
                        )}
                        {!resume.is_primary && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSetPrimary(resume.id);
                            }}
                            className="p-2 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            title="Set as primary"
                          >
                            <FiStar className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteResume(resume.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Delete"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-3 flex justify-center">
                      {resume.analyzed ? (
                        <span className="inline-flex items-center px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-lg border border-green-200 dark:border-green-800">
                          <FiCheckCircle className="w-3 h-3 mr-1" />
                          Analyzed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs font-medium rounded-lg">
                          <FiClock className="w-3 h-3 mr-1" />
                          Not analyzed
                        </span>
                      )}
                    </div>

                    {/* View Analysis Button for analyzed resumes */}
                    {resume.analyzed && resume.parsed_content && (
                      <div className="mt-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedResume(resume);
                            setAnalysis(resume.parsed_content);
                            setShowAnalysisModal(true);
                          }}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                        >
                          View Analysis →
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-6">
                <FiFileText className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {searchQuery || filter !== 'all' ? 'No resumes found' : 'No resumes uploaded yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                {searchQuery || filter !== 'all'
                  ? 'No resumes match your current filters. Try adjusting your search.'
                  : 'Upload your first resume to get AI-powered analysis and optimization'}
              </p>
              {(!searchQuery && filter === 'all') && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg"
                >
                  <FiUpload className="w-5 h-5 mr-2" />
                  Upload Your First Resume
                </button>
              )}
            </div>
          )}

          {/* Upload Modal - NO TEMPLATES, SCROLLABLE */}
          <AnimatePresence>
            {showUploadModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={() => setShowUploadModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Fixed Header */}
                  <div className="p-8 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                          <FiUpload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Upload Resume
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Add a new resume for analysis
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowUploadModal(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Content - NO TEMPLATES SECTION */}
                  <div className="flex-1 overflow-y-auto p-8 pt-4">
                    <div className="space-y-6">
                      {/* Upload Area */}
                      <div
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors cursor-pointer group"
                        onClick={() => document.getElementById('file-upload').click()}
                      >
                        <div className="w-16 h-16 mx-auto bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <FiUpload className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <p className="text-gray-900 dark:text-white font-medium mb-2">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          PDF or Word (Max 10MB)
                        </p>
                        <input
                          id="file-upload"
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </div>

                      {/* Upload Progress */}
                      {isUploading && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
                            <span className="font-medium text-indigo-600 dark:text-indigo-400">{uploadProgress}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Analysis Modal - SCROLLABLE - Shows real analysis data from API */}
          <AnimatePresence>
            {showAnalysisModal && analysis && selectedResume && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={() => setShowAnalysisModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Fixed Header */}
                  <div className="p-8 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                          <HiOutlineSparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Resume Analysis
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
                            {selectedResume?.original_filename}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAnalysisModal(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-8 pt-4">
                    <div className="space-y-6">
                      {/* Scores - Real data from API */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-5 ${getScoreBg(analysis.ats_score || 0)} rounded-xl border text-center`}>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">ATS Score</p>
                          <p className={`text-3xl font-bold ${getScoreColor(analysis.ats_score || 0)}`}>
                            {analysis.ats_score || 0}%
                          </p>
                        </div>

                        <div className={`p-5 ${getScoreBg(analysis.impact_score || 0)} rounded-xl border text-center`}>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Impact Score</p>
                          <p className={`text-3xl font-bold ${getScoreColor(analysis.impact_score || 0)}`}>
                            {analysis.impact_score || 0}%
                          </p>
                        </div>

                        <div className={`p-5 ${getScoreBg(analysis.format_score || 0)} rounded-xl border text-center`}>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Format Score</p>
                          <p className={`text-3xl font-bold ${getScoreColor(analysis.format_score || 0)}`}>
                            {analysis.format_score || 0}%
                          </p>
                        </div>
                      </div>

                      {/* Full Analysis Text - Raw from AI */}
                      {analysis.text && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                              <FiFileText className="w-5 h-5 mr-2 text-indigo-500" />
                              Full Analysis
                            </h4>
                          </div>
                          <div className="p-6">
                            <div className="prose prose-indigo dark:prose-invert max-w-none max-h-[400px] overflow-y-auto">
                              {analysis.text.split('\n').map((line, index) => {
                                if (line.startsWith('# ')) {
                                  return <h1 key={index} className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-6 first:mt-0">{line.substring(2)}</h1>;
                                } else if (line.startsWith('## ')) {
                                  return <h2 key={index} className="text-xl font-semibold text-gray-900 dark:text-white mt-4">{line.substring(3)}</h2>;
                                } else if (line.startsWith('**') && line.endsWith('**')) {
                                  return <h3 key={index} className="text-lg font-medium text-gray-900 dark:text-white mt-3">{line.replace(/\*\*/g, '')}</h3>;
                                } else if (line.startsWith('- ')) {
                                  return <li key={index} className="ml-4 text-gray-700 dark:text-gray-300">{line.substring(2)}</li>;
                                } else if (line.trim() === '') {
                                  return <div key={index} className="h-2"></div>;
                                } else {
                                  return <p key={index} className="text-gray-700 dark:text-gray-300">{line}</p>;
                                }
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Strengths - Parsed from API */}
                      {analysis.strengths?.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="bg-green-50 dark:bg-green-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                              <FiCheckCircle className="w-5 h-5 mr-2 text-green-500" />
                              Strengths
                            </h4>
                          </div>
                          <div className="p-6">
                            <ul className="space-y-2">
                              {analysis.strengths.map((strength, index) => (
                                <li key={index} className="flex items-start space-x-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                  <FiCheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                  <span className="text-gray-700 dark:text-gray-300">{strength}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Improvements - Parsed from API */}
                      {analysis.improvements?.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                              <FiXCircle className="w-5 h-5 mr-2 text-red-500" />
                              Areas for Improvement
                            </h4>
                          </div>
                          <div className="p-6">
                            <ul className="space-y-2">
                              {analysis.improvements.map((improvement, index) => (
                                <li key={index} className="flex items-start space-x-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                  <FiXCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                  <span className="text-gray-700 dark:text-gray-300">{improvement}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Keyword Analysis - Parsed from API */}
                      {analysis.keywords && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                              <FiZap className="w-5 h-5 mr-2 text-blue-500" />
                              Keyword Analysis
                            </h4>
                          </div>
                          <div className="p-6">
                            <div className="space-y-4">
                              {analysis.keywords.matched?.length > 0 && (
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">✅ Matched Keywords</p>
                                  <div className="flex flex-wrap gap-2">
                                    {analysis.keywords.matched.map((kw, i) => (
                                      <span
                                        key={i}
                                        className="px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg text-sm border border-green-200 dark:border-green-800"
                                      >
                                        {kw}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {analysis.keywords.missing?.length > 0 && (
                                <div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">❌ Missing Keywords</p>
                                  <div className="flex flex-wrap gap-2">
                                    {analysis.keywords.missing.map((kw, i) => (
                                      <span
                                        key={i}
                                        className="px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm border border-red-200 dark:border-red-800"
                                      >
                                        {kw}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Suggestions - Parsed from API */}
                      {analysis.suggestions?.length > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <div className="bg-purple-50 dark:bg-purple-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                              <HiOutlineSparkles className="w-5 h-5 mr-2 text-purple-500" />
                              AI Suggestions
                            </h4>
                          </div>
                          <div className="p-6">
                            <ul className="space-y-2">
                              {analysis.suggestions.map((suggestion, index) => (
                                <li key={index} className="flex items-start space-x-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>
                                  <span className="text-gray-700 dark:text-gray-300">{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fixed Footer */}
                  <div className="p-8 pt-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowAnalysisModal(false)}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          setShowAnalysisModal(false);
                          handleDownload(selectedResume);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Download Resume
                      </button>
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

export default ResumePage;