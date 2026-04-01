import React, { useState, useEffect } from 'react';
import {
  FiAward,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiTrendingUp,
  FiCheckCircle,
  FiBarChart2,
  FiBookOpen,
  FiStar,
  FiClock,
  FiFilter,
  FiSearch,
  FiX,
  FiZap,
  FiTarget,
  FiLayers,
  FiArrowUpRight,
  FiUsers,
  FiAlertCircle,
  FiRefreshCw,
  FiExternalLink,
  FiChevronDown,
  FiChevronUp,
} from 'react-icons/fi';
import { HiOutlineSparkles } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth.jsx';
import { userService } from '../services/userService.js';
import { useAI } from '../hooks/useAI.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

const SkillsPage = () => {
  const { user } = useAuth();
  const { analyzeSkillGap } = useAI();
  const [skills, setSkills] = useState([]);
  const [careerGoals, setCareerGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(true);
  const [expandedSkills, setExpandedSkills] = useState({});
  const [stats, setStats] = useState({
    total: 0,
    expert: 0,
    advanced: 0,
    intermediate: 0,
    beginner: 0,
    learning: 0,
    mastered: 0,
    totalYears: 0,
  });

  const [newSkill, setNewSkill] = useState({
    skill_name: '',
    proficiency_level: 'intermediate',
    years_experience: 0,
    last_used: new Date().getFullYear(),
    is_learning: false,
    notes: '',
  });

  useEffect(() => {
    loadSkills();
    loadCareerGoals();
    // Load saved analysis from localStorage
    const savedAnalysis = localStorage.getItem('skillGapAnalysis');
    if (savedAnalysis) {
      try {
        setGapAnalysis(JSON.parse(savedAnalysis));
      } catch (e) {
        console.error('Error loading saved analysis:', e);
      }
    }
  }, []);

  // Save analysis to localStorage whenever it changes
  useEffect(() => {
    if (gapAnalysis) {
      localStorage.setItem('skillGapAnalysis', JSON.stringify(gapAnalysis));
    }
  }, [gapAnalysis]);

  // Calculate stats when skills change
  useEffect(() => {
    if (skills.length > 0) {
      setStats({
        total: skills.length,
        expert: skills.filter(s => s.proficiency_level === 'expert').length,
        advanced: skills.filter(s => s.proficiency_level === 'advanced').length,
        intermediate: skills.filter(s => s.proficiency_level === 'intermediate').length,
        beginner: skills.filter(s => s.proficiency_level === 'beginner').length,
        learning: skills.filter(s => s.is_learning).length,
        mastered: skills.filter(s => !s.is_learning).length,
        totalYears: skills.reduce((sum, s) => sum + (s.years_experience || 0), 0),
      });
    } else {
      setStats({
        total: 0,
        expert: 0,
        advanced: 0,
        intermediate: 0,
        beginner: 0,
        learning: 0,
        mastered: 0,
        totalYears: 0,
      });
    }
  }, [skills]);

  const loadSkills = async () => {
    try {
      setIsLoading(true);
      const data = await userService.getSkills();
      console.log('Raw skills data from API:', data);
      
      // Handle different response formats
      let skillsData = [];
      if (Array.isArray(data)) {
        skillsData = data;
      } else if (data?.results && Array.isArray(data.results)) {
        skillsData = data.results;
      } else if (data?.data && Array.isArray(data.data)) {
        skillsData = data.data;
      } else {
        skillsData = [];
      }
      
      console.log('Processed skills data:', skillsData);
      setSkills(skillsData);
    } catch (error) {
      console.error('Error loading skills:', error);
      setSkills([]);
      toast.error('Failed to load skills');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCareerGoals = async () => {
    try {
      const data = await userService.getCareerGoals();
      if (Array.isArray(data)) {
        setCareerGoals(data);
      } else if (data?.results) {
        setCareerGoals(data.results);
      } else if (data?.data) {
        setCareerGoals(data.data);
      } else {
        setCareerGoals([]);
      }
    } catch (error) {
      console.error('Error loading career goals:', error);
      setCareerGoals([]);
    }
  };

  const handleAddSkill = async () => {
    try {
      // Ensure is_learning is properly sent to backend
      const skillData = {
        skill_name: newSkill.skill_name,
        proficiency_level: newSkill.proficiency_level,
        years_experience: newSkill.years_experience,
        last_used: newSkill.last_used,
        is_learning: newSkill.is_learning, // Explicitly include this field
        notes: newSkill.notes || '',
      };
      
      console.log('Adding skill with is_learning:', skillData.is_learning);
      const response = await userService.addSkill(skillData);
      console.log('Add skill response:', response);
      
      // Reload skills to get fresh data
      await loadSkills();
      
      setShowAddModal(false);
      setNewSkill({
        skill_name: '',
        proficiency_level: 'intermediate',
        years_experience: 0,
        last_used: new Date().getFullYear(),
        is_learning: false,
        notes: '',
      });
      toast.success('Skill added successfully');
    } catch (error) {
      console.error('Error adding skill:', error);
      toast.error('Failed to add skill');
    }
  };

  const handleUpdateSkill = async () => {
    try {
      // Ensure is_learning is properly sent
      const skillData = {
        skill_name: editingSkill.skill_name,
        proficiency_level: editingSkill.proficiency_level,
        years_experience: editingSkill.years_experience,
        last_used: editingSkill.last_used,
        is_learning: editingSkill.is_learning,
        notes: editingSkill.notes || '',
      };
      
      console.log('Updating skill with is_learning:', skillData.is_learning);
      const response = await userService.updateSkill(editingSkill.id, skillData);
      console.log('Update skill response:', response);
      
      // Reload skills to get fresh data
      await loadSkills();
      
      setEditingSkill(null);
      toast.success('Skill updated successfully');
    } catch (error) {
      console.error('Error updating skill:', error);
      toast.error('Failed to update skill');
    }
  };

  const handleDeleteSkill = async (skillId) => {
    if (!window.confirm('Are you sure you want to delete this skill?')) return;
    
    try {
      await userService.deleteSkill(skillId);
      await loadSkills(); // Reload to refresh list
      toast.success('Skill deleted successfully');
    } catch (error) {
      console.error('Error deleting skill:', error);
      toast.error('Failed to delete skill');
    }
  };

  // ULTRA AGGRESSIVE markdown cleaner - removes ALL markdown symbols
  const cleanMarkdown = (text) => {
    if (!text) return '';
    return text
      .replace(/\*\*/g, '')        // Remove bold markers
      .replace(/\*/g, '')           // Remove italic markers
      .replace(/#{1,6}\s*/g, '')    // Remove heading markers
      .replace(/`/g, '')             // Remove code markers
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Replace [text](url) with just text
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove image tags
      .replace(/~~/g, '')            // Remove strikethrough
      .replace(/_/g, '')             // Remove underscore emphasis
      .replace(/\n\s*\n/g, '\n\n')   // Normalize multiple newlines
      .trim();
  };

  // Clean a whole paragraph or section
  const cleanParagraph = (text) => {
    return cleanMarkdown(text);
  };

  // IMPROVED ANALYSIS PARSER - Removes all markdown symbols
  const parseAnalysisText = (text) => {
    if (!text) return null;
    
    // First clean the entire text aggressively
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#{1,6}\s*/g, '')
      .replace(/`/g, '');
    
    const result = {
      title: '',
      summary: '',
      matchScore: null,
      strengths: [],
      skillsToDevelop: [],
      marketInsights: {},
      recommendations: [],
      quickWins: [],
      raw: text
    };
    
    // Helper function to clean text of markdown symbols
    const clean = (str) => {
      if (!str) return '';
      return str
        .replace(/\*\*/g, '') // Remove bold markers
        .replace(/\*/g, '')    // Remove italic markers
        .replace(/#{1,6}\s/g, '') // Remove heading markers
        .replace(/`/g, '')     // Remove code markers
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Replace links with just text
        .trim();
    };
    
    // Extract title
    const titleMatch = text.match(/# (.*?)(?:\n|$)/);
    if (titleMatch) result.title = clean(titleMatch[1]);
    
    // Extract match score - look for percentage
    const scoreMatch = text.match(/(\d+)%/);
    if (scoreMatch) result.matchScore = parseInt(scoreMatch[1]);
    
    // Extract summary (paragraph after title)
    const summaryMatch = text.match(/# .*?\n\n(.*?)(?:\n\n|##)/s);
    if (summaryMatch) result.summary = clean(summaryMatch[1]);
    
    // Extract strengths section
    const strengthsSection = text.match(/YOUR CURRENT STRENGTHS.*?\n(.*?)(?=\n\n##|\n---|$)/s);
    if (strengthsSection) {
      const strengthLines = strengthsSection[1].split('\n');
      strengthLines.forEach(line => {
        const match = line.match(/[•\-*]\s*(.*)/);
        if (match) {
          result.strengths.push(clean(match[1]));
        }
      });
    }
    
    // Extract skills to develop with better parsing
    const skillsSection = text.match(/SKILLS TO DEVELOP.*?\n(.*?)(?=\n\n##|\n---|$)/s);
    if (skillsSection) {
      const skillBlocks = skillsSection[1].split(/\n\n+/);
      
      skillBlocks.forEach(block => {
        // Clean the block first
        const cleanBlock = clean(block);
        
        // Look for skill name (usually the first line)
        const lines = block.split('\n');
        if (lines.length > 0) {
          let skillName = clean(lines[0].replace(/^\*\*|\*\*$/g, ''));
          let description = '';
          
          // Get the rest as description
          if (lines.length > 1) {
            description = clean(lines.slice(1).join(' '));
          }
          
          if (skillName && !skillName.includes('Learning Resources')) {
            result.skillsToDevelop.push({
              name: skillName,
              description: description
            });
          }
        }
      });
    }
    
    // Extract market insights
    const marketSection = text.match(/MARKET INSIGHTS.*?\n(.*?)(?=\n\n##|\n---|$)/s);
    if (marketSection) {
      const lines = marketSection[1].split('\n');
      lines.forEach(line => {
        const cleanLine = clean(line);
        if (cleanLine.includes('Demand') || cleanLine.includes('demand')) {
          result.marketInsights.demand = cleanLine.replace(/.*?:\s*/, '').trim();
        } else if (cleanLine.includes('Salary')) {
          result.marketInsights.salary = cleanLine.replace(/.*?:\s*/, '').trim();
        } else if (cleanLine.includes('Industries')) {
          result.marketInsights.industries = cleanLine.replace(/.*?:\s*/, '').trim();
        }
      });
    }
    
    // Extract recommendations
    const recSection = text.match(/RECOMMENDED LEARNING PATH.*?\n(.*?)(?=\n\n##|\n---|$)/s);
    if (recSection) {
      const recLines = recSection[1].split('\n');
      recLines.forEach(line => {
        const match = line.match(/\d+\.\s*(.*)/);
        if (match) result.recommendations.push(clean(match[1]));
      });
    }
    
    // Extract quick wins
    const quickWinsSection = text.match(/QUICK WINS.*?\n(.*?)(?=\n\n##|\n---|$)/s);
    if (quickWinsSection) {
      const winLines = quickWinsSection[1].split('\n');
      winLines.forEach(line => {
        const match = line.match(/[•\-*]\s*(.*)/);
        if (match) result.quickWins.push(clean(match[1]));
      });
    }
    
    return result;
  };

  // In SkillsPage.jsx, where you call analyzeSkillGap:
const handleAnalyzeGaps = async () => {
  const activeGoals = careerGoals.filter(g => g.is_active && !g.is_completed);
  
  if (!activeGoals || activeGoals.length === 0) {
    toast.error('Please set at least one active career goal first');
    return;
  }

  if (skills.length === 0) {
    toast.error('Please add some skills first');
    return;
  }

  setIsAnalyzing(true);
  try {
    // Format skills as array of strings (skill names only)
    const skillNames = skills.map(s => s.skill_name);
    
    const analysisData = {
      target_role: activeGoals[0].target_role,
      current_skills: skillNames,
      experience_level: user?.years_experience ? String(user.years_experience) : '',
    };
    
    console.log('Calling analyzeSkillGap with:', analysisData);
    
    // ✅ This should now work
    const response = await analyzeSkillGap.mutateAsync(analysisData);
    console.log('Analysis response:', response);
    
    if (response && response.text) {
      // Parse the analysis text
      const parsed = parseAnalysisText(response.text);
      
      const analysisWithTimestamp = {
        text: response.text,
        parsed: parsed,
        timestamp: new Date().toISOString(),
        target_role: activeGoals[0].target_role
      };
      
      setGapAnalysis(analysisWithTimestamp);
      setShowFullAnalysis(true);
      toast.success('Skill gap analysis complete!');
    } else {
      toast.error('No analysis data received');
    }
  } catch (error) {
    console.error('Error in handleAnalyzeGaps:', error);
    toast.error(error.message || 'Failed to analyze skill gaps');
  } finally {
    setIsAnalyzing(false);
  }
};

  const clearAnalysis = () => {
    setGapAnalysis(null);
    localStorage.removeItem('skillGapAnalysis');
    toast.success('Analysis cleared');
  };

  const toggleSkillExpand = (skillId) => {
    setExpandedSkills(prev => ({
      ...prev,
      [skillId]: !prev[skillId]
    }));
  };

  const getProficiencyColor = (level) => {
    switch (level) {
      case 'expert': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'advanced': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'intermediate': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'beginner': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  const getProficiencyIcon = (level) => {
    switch (level) {
      case 'expert': return <FiZap className="w-3 h-3" />;
      case 'advanced': return <FiTrendingUp className="w-3 h-3" />;
      case 'intermediate': return <FiTarget className="w-3 h-3" />;
      case 'beginner': return <FiStar className="w-3 h-3" />;
      default: return <FiAward className="w-3 h-3" />;
    }
  };

  const filteredSkills = skills.filter(skill => {
    const matchesSearch = skill.skill_name?.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === 'all') return matchesSearch;
    if (filter === 'learning') return matchesSearch && skill.is_learning;
    if (filter === 'mastered') return matchesSearch && !skill.is_learning;
    if (filter === 'expert') return matchesSearch && skill.proficiency_level === 'expert';
    if (filter === 'advanced') return matchesSearch && skill.proficiency_level === 'advanced';
    if (filter === 'intermediate') return matchesSearch && skill.proficiency_level === 'intermediate';
    if (filter === 'beginner') return matchesSearch && skill.proficiency_level === 'beginner';
    return matchesSearch;
  });

  const activeGoal = careerGoals.find(g => g.is_active && !g.is_completed);

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
                  <FiAward className="w-4 h-4 mr-2" />
                  Skills & Competencies
                </div>
                
                <h1 className="text-3xl md:text-4xl font-bold">
                  Master Your Skills
                </h1>
                
                <p className="text-white/80 max-w-2xl">
                  Track, manage, and develop your professional skills to advance your career
                </p>

                <div className="flex items-center space-x-4 pt-4">
                  <div className="flex items-center space-x-2">
                    <FiAward className="w-4 h-4 text-white/70" />
                    <span className="text-sm">{stats.total} Total Skills</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiBookOpen className="w-4 h-4 text-white/70" />
                    <span className="text-sm">{stats.learning} Learning</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FiCheckCircle className="w-4 h-4 text-white/70" />
                    <span className="text-sm">{stats.mastered} Mastered</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleAnalyzeGaps}
                  disabled={isAnalyzing || skills.length === 0}
                  className={`group inline-flex items-center px-4 py-2.5 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all ${
                    skills.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <FiBarChart2 className="w-4 h-4 mr-2" />
                  <span>{isAnalyzing ? 'Analyzing...' : 'Gap Analysis'}</span>
                </button>
                
                <button
                  onClick={() => setShowAddModal(true)}
                  className="group inline-flex items-center px-6 py-2.5 bg-white text-gray-900 rounded-xl font-semibold hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-200"
                >
                  <FiPlus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform" />
                  Add Skill
                  <FiArrowUpRight className="w-4 h-4 ml-2 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</h3>
                </div>
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                  <FiLayers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Expert</p>
                  <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.expert}</h3>
                </div>
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <FiZap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Advanced</p>
                  <h3 className="text-xl font-bold text-green-600 dark:text-green-400">{stats.advanced}</h3>
                </div>
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <FiTrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Intermediate</p>
                  <h3 className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.intermediate}</h3>
                </div>
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <FiTarget className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Beginner</p>
                  <h3 className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{stats.beginner}</h3>
                </div>
                <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                  <FiStar className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Learning</p>
                  <h3 className="text-xl font-bold text-orange-600 dark:text-orange-400">{stats.learning}</h3>
                </div>
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <FiBookOpen className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Mastered</p>
                  <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.mastered}</h3>
                </div>
                <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <FiCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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
                  placeholder="Search skills by name..."
                  disabled={skills.length === 0}
                />
              </div>

              <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0">
                {[
                  { id: 'all', label: 'All', icon: FiLayers },
                  { id: 'learning', label: 'Learning', icon: FiBookOpen },
                  { id: 'mastered', label: 'Mastered', icon: FiCheckCircle },
                  { id: 'expert', label: 'Expert', icon: FiZap },
                  { id: 'advanced', label: 'Advanced', icon: FiTrendingUp },
                  { id: 'intermediate', label: 'Intermediate', icon: FiTarget },
                  { id: 'beginner', label: 'Beginner', icon: FiStar },
                ].map((f) => {
                  const Icon = f.icon;
                  const isActive = filter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{f.label}</span>
                      {isActive && (
                        <span className="ml-1 bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {filteredSkills.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Skills Grid */}
          {filteredSkills.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSkills.map((skill) => (
                <motion.div
                  key={skill.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden group"
                >
                  {/* Card Header with Color Bar */}
                  <div className={`h-2 ${
                    skill.proficiency_level === 'expert' ? 'bg-purple-500' :
                    skill.proficiency_level === 'advanced' ? 'bg-green-500' :
                    skill.proficiency_level === 'intermediate' ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`}></div>

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-xl text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {skill.skill_name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-medium border ${getProficiencyColor(skill.proficiency_level)}`}>
                            {getProficiencyIcon(skill.proficiency_level)}
                            <span className="capitalize">{skill.proficiency_level}</span>
                          </span>
                          
                          {/* LEARNING BADGE - This will now show when is_learning is true */}
                          {skill.is_learning && (
                            <span className="inline-flex items-center px-3 py-1.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-xl text-xs font-medium border border-orange-200 dark:border-orange-800">
                              <FiBookOpen className="w-3 h-3 mr-1" />
                              Learning
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingSkill(skill)}
                          className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSkill(skill.id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Skill Details */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Experience</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {skill.years_experience || 0} {skill.years_experience === 1 ? 'year' : 'years'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Last Used</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {skill.last_used || new Date().getFullYear()}
                        </span>
                      </div>

                      {skill.notes && (
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {skill.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Learning Progress Bar */}
                    {skill.is_learning && (
                      <div className="mt-4">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500 dark:text-gray-400">Learning Progress</span>
                          <span className="font-medium text-indigo-600 dark:text-indigo-400">65%</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full" style={{ width: '65%' }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-6">
                <FiAward className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {searchQuery || filter !== 'all' ? 'No skills found' : 'No skills added yet'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                {searchQuery || filter !== 'all'
                  ? `No skills match your current filters. Try adjusting your search.`
                  : 'Add your first skill to start building your professional profile'}
              </p>
              {!searchQuery && filter === 'all' && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg"
                >
                  <FiPlus className="w-5 h-5 mr-2" />
                  Add Your First Skill
                </button>
              )}
            </div>
          )}

          {/* Skill Gap Analysis Section - BEAUTIFULLY FORMATTED */}
          {gapAnalysis && gapAnalysis.parsed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                      <FiBarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Skill Gap Analysis
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Target: {gapAnalysis.target_role || activeGoal?.target_role || careerGoals[0]?.target_role || 'Career Goal'}
                        {gapAnalysis.timestamp && (
                          <span className="ml-2 text-xs text-gray-400">
                            • {new Date(gapAnalysis.timestamp).toLocaleString()}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowFullAnalysis(!showFullAnalysis)}
                      className="px-3 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    >
                      {showFullAnalysis ? 'Show Less' : 'View Full Analysis'}
                    </button>
                    <button
                      onClick={clearAnalysis}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      title="Clear analysis"
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {showFullAnalysis && (
                <div className="p-6">
                  <div className="space-y-6">
                    
                    {/* Title */}
                    {gapAnalysis.parsed.title && (
                      <div className="text-center mb-2">
                        <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                          {gapAnalysis.parsed.title}
                        </h2>
                      </div>
                    )}

                    {/* Match Score Card */}
                    {gapAnalysis.parsed.matchScore && (
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-gray-900 dark:text-white">
                            Overall Match Score
                          </span>
                          <span className={`text-4xl font-bold ${
                            gapAnalysis.parsed.matchScore >= 70 ? 'text-green-600' :
                            gapAnalysis.parsed.matchScore >= 50 ? 'text-yellow-600' :
                            'text-orange-600'
                          }`}>
                            {gapAnalysis.parsed.matchScore}%
                          </span>
                        </div>
                        <div className="mt-3 h-3 bg-white/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              gapAnalysis.parsed.matchScore >= 70 ? 'bg-green-500' :
                              gapAnalysis.parsed.matchScore >= 50 ? 'bg-yellow-500' :
                              'bg-orange-500'
                            }`}
                            style={{ width: `${gapAnalysis.parsed.matchScore}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {gapAnalysis.parsed.summary && (
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                          <FiTarget className="w-5 h-5 mr-2 text-indigo-600" />
                          Analysis Summary
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {gapAnalysis.parsed.summary}
                        </p>
                      </div>
                    )}

                    {/* Strengths */}
                    {gapAnalysis.parsed.strengths.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-green-50 dark:bg-green-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                            <FiCheckCircle className="w-5 h-5 mr-2 text-green-500" />
                            Your Strengths
                          </h4>
                        </div>
                        <div className="p-6">
                          <ul className="space-y-2">
                            {gapAnalysis.parsed.strengths.map((strength, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-green-500 mr-2">✓</span>
                                <span className="text-gray-700 dark:text-gray-300">{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Skills to Develop - COMPLETELY CLEANED */}
                    {gapAnalysis.parsed.skillsToDevelop.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-orange-50 dark:bg-orange-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                            <FiZap className="w-5 h-5 mr-2 text-orange-500" />
                            Skills to Develop
                          </h4>
                        </div>
                        <div className="p-6">
                          <div className="space-y-6">
                            {gapAnalysis.parsed.skillsToDevelop.map((skill, index) => (
                              <div key={index} className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-6 last:pb-0">
                                <h5 className="font-semibold text-lg text-gray-900 dark:text-white">
                                  {skill.name}
                                </h5>
                                {skill.description && (
                                  <p className="text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                                    {skill.description}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Market Insights */}
                    {Object.keys(gapAnalysis.parsed.marketInsights).length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                            <FiTrendingUp className="w-5 h-5 mr-2 text-blue-500" />
                            Market Insights
                          </h4>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {gapAnalysis.parsed.marketInsights.demand && (
                              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Demand</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {gapAnalysis.parsed.marketInsights.demand.replace(/-/g, '').trim()}
                                </p>
                              </div>
                            )}
                            {gapAnalysis.parsed.marketInsights.salary && (
                              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Average Salary</p>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {gapAnalysis.parsed.marketInsights.salary.replace(/\*\*/g, '').trim()}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {gapAnalysis.parsed.recommendations.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                            <FiTarget className="w-5 h-5 mr-2 text-indigo-500" />
                            Learning Path Recommendations
                          </h4>
                        </div>
                        <div className="p-6">
                          <ul className="space-y-3">
                            {gapAnalysis.parsed.recommendations.map((rec, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-indigo-600 dark:text-indigo-400 font-bold mr-3">{index + 1}.</span>
                                <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Quick Wins */}
                    {gapAnalysis.parsed.quickWins.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-green-50 dark:bg-green-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                            <FiZap className="w-5 h-5 mr-2 text-green-500" />
                            Quick Wins
                          </h4>
                        </div>
                        <div className="p-6">
                          <ul className="space-y-3">
                            {gapAnalysis.parsed.quickWins.map((win, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-green-500 mr-3">⚡</span>
                                <span className="text-gray-700 dark:text-gray-300">{win}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Add/Edit Skill Modal */}
          <AnimatePresence>
            {(showAddModal || editingSkill) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSkill(null);
                }}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                          {editingSkill ? (
                            <FiEdit2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <FiPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {editingSkill ? 'Edit Skill' : 'Add New Skill'}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {editingSkill ? 'Update your skill details' : 'Add a skill to your professional profile'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowAddModal(false);
                          setEditingSkill(null);
                        }}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Form Content */}
                  <div className="p-6 overflow-y-auto flex-1">
                    <div className="space-y-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Skill Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editingSkill ? editingSkill.skill_name : newSkill.skill_name}
                          onChange={(e) => {
                            if (editingSkill) {
                              setEditingSkill({ ...editingSkill, skill_name: e.target.value });
                            } else {
                              setNewSkill({ ...newSkill, skill_name: e.target.value });
                            }
                          }}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          placeholder="e.g., Python, React, Project Management"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Proficiency Level
                        </label>
                        <select
                          value={editingSkill ? editingSkill.proficiency_level : newSkill.proficiency_level}
                          onChange={(e) => {
                            if (editingSkill) {
                              setEditingSkill({ ...editingSkill, proficiency_level: e.target.value });
                            } else {
                              setNewSkill({ ...newSkill, proficiency_level: e.target.value });
                            }
                          }}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        >
                          <option value="beginner">Beginner - Just starting out</option>
                          <option value="intermediate">Intermediate - Can work independently</option>
                          <option value="advanced">Advanced - Deep understanding</option>
                          <option value="expert">Expert - Can teach others</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Years of Experience
                        </label>
                        <input
                          type="number"
                          value={editingSkill ? editingSkill.years_experience : newSkill.years_experience}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            if (editingSkill) {
                              setEditingSkill({ ...editingSkill, years_experience: val });
                            } else {
                              setNewSkill({ ...newSkill, years_experience: val });
                            }
                          }}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          min="0"
                          max="50"
                          step="0.5"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Last Used Year
                        </label>
                        <input
                          type="number"
                          value={editingSkill ? editingSkill.last_used : newSkill.last_used}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || new Date().getFullYear();
                            if (editingSkill) {
                              setEditingSkill({ ...editingSkill, last_used: val });
                            } else {
                              setNewSkill({ ...newSkill, last_used: val });
                            }
                          }}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          min="2000"
                          max={new Date().getFullYear()}
                        />
                      </div>

                      {/* Learning Checkbox */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                        <label className="flex items-start space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingSkill ? editingSkill.is_learning : newSkill.is_learning}
                            onChange={(e) => {
                              if (editingSkill) {
                                setEditingSkill({ 
                                  ...editingSkill, 
                                  is_learning: e.target.checked 
                                });
                              } else {
                                setNewSkill({ 
                                  ...newSkill, 
                                  is_learning: e.target.checked 
                                });
                              }
                            }}
                            className="mt-1 w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white block">
                              I'm currently learning this skill
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block">
                              This will mark the skill as "in progress" in your profile
                            </span>
                          </div>
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Notes (Optional)
                        </label>
                        <textarea
                          value={editingSkill ? editingSkill.notes || '' : newSkill.notes}
                          onChange={(e) => {
                            if (editingSkill) {
                              setEditingSkill({ ...editingSkill, notes: e.target.value });
                            } else {
                              setNewSkill({ ...newSkill, notes: e.target.value });
                            }
                          }}
                          rows="3"
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          placeholder="Add any additional details about this skill..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setShowAddModal(false);
                          setEditingSkill(null);
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={editingSkill ? handleUpdateSkill : handleAddSkill}
                        disabled={!editingSkill ? !newSkill.skill_name : !editingSkill.skill_name}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editingSkill ? 'Update Skill' : 'Add Skill'}
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

export default SkillsPage;