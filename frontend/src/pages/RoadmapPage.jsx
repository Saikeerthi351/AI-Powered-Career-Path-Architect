import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  FiGrid,
  FiList,
  FiCalendar,
  FiBarChart2,
  FiPlus,
  FiFilter,
  FiSearch,
  FiChevronRight,
  FiChevronLeft,
  FiDownload,
  FiShare2,
  FiEdit2,
  FiTrash2,
  FiEye,
  FiClock,
  FiTarget,
  FiTrendingUp,
  FiAward,
  FiBookOpen,
  FiZap,
  FiLayers,
  FiX,
  FiArrowUpRight,
  FiCheckCircle,
  FiStar,
  FiBriefcase,
  FiMapPin,
  FiDollarSign,
  FiUsers,
  FiChevronUp,
  FiChevronDown,
} from 'react-icons/fi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HiOutlineSparkles } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoadmap } from '../hooks/useRoadmap.jsx';
import { useAI } from '../hooks/useAI.jsx';
import RoadmapBuilder from '../components/roadmap/RoadmapBuilder';
import RoadmapVisualizer from '../components/dashboard/RoadmapVisualizer';
import TimelineView from '../components/roadmap/TimelineView';
import ProgressTracker from '../components/roadmap/ProgressTracker';
import LoadingSpinner, { LoadingSkeleton } from '../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { roadmapService } from '../services/roadmapService';

const RoadmapPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    roadmaps,
    selectedRoadmap,
    selectRoadmap,
    clearSelectedRoadmap,
    viewMode,
    setViewMode,
    filters,
    updateFilters,
    clearFilters,
    isLoading,
    createRoadmapMutation,
    generateRoadmapMutation,
    deleteRoadmapMutation,
    searchRoadmaps,
    sortRoadmaps,
  } = useRoadmap();
  
  const { generateRoadmapStepsMutation } = useAI();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [stats, setStats] = useState({
    totalRoadmaps: 0,
    activeRoadmaps: 0,
    completedRoadmaps: 0,
    totalSteps: 0,
    completedSteps: 0,
    averageProgress: 0,
  });
  
  const [newRoadmapData, setNewRoadmapData] = useState({
    title: '',
    description: '',
    target_role: '',
    target_industry: '',
    total_duration_months: 12,
  });
  
  const [generateData, setGenerateData] = useState({
    target_role: '',
    target_industry: '',
    timeframe_months: 12,
    include_salary_data: true,
    include_market_insights: true,
  });

  // Calculate stats when roadmaps change
  useEffect(() => {
    if (roadmaps && Array.isArray(roadmaps)) {
      const active = roadmaps.filter(r => !r.is_completed);
      const completed = roadmaps.filter(r => r.is_completed);
      const totalSteps = roadmaps.reduce((acc, r) => acc + (r.steps?.length || 0), 0);
      const completedSteps = roadmaps.reduce(
        (acc, r) => acc + (r.steps?.filter(s => s.is_completed).length || 0), 
        0
      );
      const avgProgress = roadmaps.reduce((acc, r) => acc + (r.completion_percentage || 0), 0) / (roadmaps.length || 1);

      setStats({
        totalRoadmaps: roadmaps.length,
        activeRoadmaps: active.length,
        completedRoadmaps: completed.length,
        totalSteps,
        completedSteps,
        averageProgress: avgProgress,
      });
    }
  }, [roadmaps]);

  // Check if we should show roadmap generator
  useEffect(() => {
    const shouldGenerate = searchParams.get('generate') === 'true';
    if (shouldGenerate) {
      setShowGenerateModal(true);
      navigate('/roadmap', { replace: true });
    }
  }, [searchParams, navigate]);

  // Select roadmap if ID is provided in URL
  useEffect(() => {
    if (id && roadmaps) {
      const roadmap = roadmaps.find(r => r.id === parseInt(id));
      if (roadmap) {
        selectRoadmap(roadmap);
      }
    }
  }, [id, roadmaps, selectRoadmap]);

  const handleCreateRoadmap = async () => {
    try {
      const roadmap = await createRoadmapMutation.mutateAsync(newRoadmapData);
      setShowCreateModal(false);
      setNewRoadmapData({
        title: '',
        description: '',
        target_role: '',
        target_industry: '',
        total_duration_months: 12,
      });
      // Navigate to the new roadmap
      navigate(`/roadmap/${roadmap.id}`);
      toast.success('Roadmap created successfully');
    } catch (error) {
      toast.error('Failed to create roadmap');
    }
  };

  const handleGenerateRoadmap = async () => {
    try {
      const roadmap = await generateRoadmapMutation.mutateAsync(generateData);
      setShowGenerateModal(false);
      setGenerateData({
        target_role: '',
        target_industry: '',
        timeframe_months: 12,
        include_salary_data: true,
        include_market_insights: true,
      });
      // Navigate to the new roadmap
      navigate(`/roadmap/${roadmap.id}`);
      toast.success('AI roadmap generated successfully');
    } catch (error) {
      toast.error('Failed to generate roadmap');
    }
  };

  const handleDeleteRoadmap = async (roadmapId) => {
    if (!window.confirm('Are you sure you want to delete this roadmap? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteRoadmapMutation.mutateAsync(roadmapId);
      if (selectedRoadmap?.id === roadmapId) {
        clearSelectedRoadmap();
        navigate('/roadmap');
      }
      toast.success('Roadmap deleted successfully');
    } catch (error) {
      toast.error('Failed to delete roadmap');
    }
  };
  
  // Helper function to generate PDF content
  const generatePDFContent = (roadmap) => {
    const steps = roadmap.steps || [];
    const completedSteps = steps.filter(s => s.is_completed).length;
    const totalSteps = steps.length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    
    const totalHours = steps.reduce((acc, step) => acc + (step.estimated_duration_hours || 0), 0);
    
    // Create HTML content for PDF
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${roadmap.title} - Roadmap Export</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          h1 { color: #4f46e5; font-size: 28px; margin-bottom: 10px; }
          .header { border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 30px; }
          .meta { display: flex; gap: 30px; margin: 20px 0; flex-wrap: wrap; }
          .meta-item { background: #f3f4f6; padding: 15px 20px; border-radius: 8px; flex: 1; min-width: 150px; }
          .meta-label { font-size: 12px; color: #6b7280; margin-bottom: 5px; }
          .meta-value { font-size: 24px; font-weight: bold; color: #4f46e5; }
          .progress-bar { background: #e5e7eb; height: 20px; border-radius: 10px; margin: 20px 0; overflow: hidden; }
          .progress-fill { background: #4f46e5; height: 100%; width: ${progress}%; }
          h2 { color: #4f46e5; font-size: 20px; margin: 30px 0 20px; border-left: 4px solid #4f46e5; padding-left: 15px; }
          .step { background: #f9fafb; border-left: 4px solid #4f46e5; padding: 15px; margin-bottom: 15px; border-radius: 0 8px 8px 0; }
          .step.completed { border-left-color: #10b981; opacity: 0.8; }
          .step-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
          .step-title { font-weight: bold; font-size: 16px; }
          .step-badge { 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 12px;
            background: ${progress === 100 ? '#10b981' : '#f3f4f6'};
            color: ${progress === 100 ? '#fff' : '#4b5563'};
          }
          .step-desc { color: #6b7280; font-size: 14px; margin-bottom: 10px; }
          .step-meta { display: flex; gap: 20px; font-size: 12px; color: #9ca3af; }
          .skills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
          .skill-tag { background: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 20px; font-size: 11px; }
          .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
          .stat-card { background: #f9fafb; padding: 20px; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 28px; font-weight: bold; color: #4f46e5; }
          .stat-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${roadmap.title}</h1>
          <p style="color: #6b7280;">${roadmap.description ? roadmap.description.split('\n')[0] : 'Career Roadmap'}</p>
        </div>
        
        <div class="meta">
          <div class="meta-item">
            <div class="meta-label">Target Role</div>
            <div class="meta-value">${roadmap.target_role || 'Not specified'}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Duration</div>
            <div class="meta-value">${roadmap.total_duration_months || 12} months</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Total Steps</div>
            <div class="meta-value">${totalSteps}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Total Hours</div>
            <div class="meta-value">${totalHours}h</div>
          </div>
        </div>
        
        <h2>Progress Overview</h2>
        <div style="margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span>Overall Progress</span>
            <span style="font-weight: bold; color: #4f46e5;">${progress}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        </div>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${completedSteps}/${totalSteps}</div>
            <div class="stat-label">Steps Completed</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${progress}%</div>
            <div class="stat-label">Completion Rate</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${totalHours}</div>
            <div class="stat-label">Total Hours</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${steps.filter(s => s.step_type === 'certification').length}</div>
            <div class="stat-label">Certifications</div>
          </div>
        </div>
        
        <h2>Step-by-Step Plan</h2>
        ${steps.map((step, index) => `
          <div class="step ${step.is_completed ? 'completed' : ''}">
            <div class="step-header">
              <span class="step-title">Step ${index + 1}: ${step.title}</span>
              <span class="step-badge">${step.is_completed ? '✓ Completed' : 'Pending'}</span>
            </div>
            <div class="step-desc">${step.description || 'No description'}</div>
            <div class="step-meta">
              <span>⏱️ ${step.estimated_duration_hours || 0} hours</span>
              <span>📋 ${step.step_type?.replace('_', ' ') || 'learning'}</span>
            </div>
            ${step.skills_to_develop && step.skills_to_develop.length > 0 ? `
              <div class="skills">
                ${step.skills_to_develop.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
        
        <div class="footer">
          <p>Generated by AI-Powered Career Path Architect on ${new Date().toLocaleDateString()}</p>
          <p>© ${new Date().getFullYear()} CareerArchitect - Your AI Career Companion</p>
        </div>
      </body>
      </html>
    `;
    
    return content;
  };

  const handleExportRoadmap = async (roadmapId) => {
    try {
      const roadmap = selectedRoadmap || roadmaps.find(r => r.id === roadmapId);
      if (!roadmap) {
        toast.error('Roadmap not found');
        return;
      }

      toast.loading('Generating PDF...', { id: 'export' });

      const steps = roadmap.steps || [];
      const completedSteps = steps.filter(s => s.is_completed).length;
      const totalSteps = steps.length;
      const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
      const totalHours = steps.reduce((acc, step) => acc + (step.estimated_duration_hours || 0), 0);

      // Create new PDF document
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;

      // Helper function to add text with wrapping
      const addWrappedText = (text, x, y, maxWidth, fontSize = 12, isBold = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * fontSize * 0.35);
      };

      // Header with gradient effect (simulated with colors)
      doc.setFillColor(79, 70, 229); // Indigo color
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Career Roadmap', margin, 25);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, margin, 35);

      // Reset text color for rest of document
      doc.setTextColor(0, 0, 0);
      yPos = 50;

      // Roadmap Title and Description
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      yPos = addWrappedText(roadmap.title || 'Untitled Roadmap', margin, yPos, pageWidth - 40, 18, true) + 5;
      
      if (roadmap.description) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        yPos = addWrappedText(roadmap.description.split('\n')[0], margin, yPos, pageWidth - 40, 11) + 10;
      }

      // Key Info Table
      const infoData = [
        ['Target Role', roadmap.target_role || 'Not specified'],
        ['Duration', `${roadmap.total_duration_months || 12} months`],
        ['Total Steps', totalSteps.toString()],
        ['Completed Steps', `${completedSteps}/${totalSteps}`],
        ['Progress', `${progress}%`],
        ['Total Hours', `${totalHours}h`],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Metric', 'Value']],
        body: infoData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 80 } },
        margin: { left: margin, right: margin },
      });

      yPos = doc.lastAutoTable.finalY + 15;

      // Progress Bar
      doc.setFillColor(229, 231, 235); // Light gray background
      doc.roundedRect(margin, yPos, pageWidth - 40, 15, 3, 3, 'F');
      
      doc.setFillColor(79, 70, 229); // Indigo fill
      doc.roundedRect(margin, yPos, (pageWidth - 40) * (progress / 100), 15, 3, 3, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`${progress}% Complete`, margin + 5, yPos + 10);
      
      yPos += 25;

      // Steps Section
      if (steps.length > 0) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229);
        doc.text('Step-by-Step Plan', margin, yPos);
        yPos += 10;

        steps.forEach((step, index) => {
          // Check if we need a new page
          if (yPos > 250) {
            doc.addPage();
            yPos = 20;
          }

          // Step header
          doc.setFillColor(step.is_completed ? 209 : 243, 
                          step.is_completed ? 250 : 244, 
                          step.is_completed ? 229 : 255);
          doc.rect(margin - 2, yPos - 2, pageWidth - 36, 8, 'F');

          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(step.is_completed ? 22 : 79, 
                          step.is_completed ? 163 : 70, 
                          step.is_completed ? 74 : 229);
          
          const stepTitle = `Step ${index + 1}: ${step.title}`;
          doc.text(stepTitle, margin, yPos);
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(107, 114, 128);
          doc.text(`⏱️ ${step.estimated_duration_hours || 0}h • ${step.step_type?.replace('_', ' ') || 'learning'}`, 
                   pageWidth - 60, yPos);
          
          yPos += 8;

          // Description
          if (step.description) {
            doc.setFontSize(10);
            doc.setTextColor(75, 85, 99);
            yPos = addWrappedText(step.description, margin + 2, yPos, pageWidth - 44, 10) + 2;
          }

          // Skills
          if (step.skills_to_develop && step.skills_to_develop.length > 0) {
            doc.setFontSize(9);
            doc.setTextColor(79, 70, 229);
            doc.text('Skills:', margin + 2, yPos);
            
            let skillX = margin + 30;
            step.skills_to_develop.slice(0, 5).forEach((skill) => {
              doc.setFillColor(224, 231, 255);
              doc.setTextColor(79, 70, 229);
              const skillWidth = doc.getTextWidth(skill) + 6;
              
              if (skillX + skillWidth > pageWidth - 20) {
                skillX = margin + 30;
                yPos += 6;
              }
              
              doc.roundedRect(skillX - 3, yPos - 3, skillWidth, 6, 2, 2, 'F');
              doc.text(skill, skillX, yPos);
              skillX += skillWidth + 5;
            });
            
            yPos += 8;
          }

          yPos += 5;

          // Divider
          if (index < steps.length - 1) {
            doc.setDrawColor(229, 231, 235);
            doc.line(margin, yPos - 2, pageWidth - 20, yPos - 2);
            yPos += 5;
          }
        });
      } else {
        doc.setFontSize(12);
        doc.setTextColor(107, 114, 128);
        doc.text('No steps added to this roadmap yet.', margin, yPos);
      }

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `Generated by AI-Powered Career Path Architect • Page ${i} of ${pageCount}`,
          margin,
          doc.internal.pageSize.getHeight() - 10
        );
      }

      // Save the PDF
      doc.save(`${roadmap.title.replace(/\s+/g, '_')}_Roadmap.pdf`);

      toast.success('Roadmap exported successfully!', { id: 'export' });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export roadmap. Please try again.', { id: 'export' });
    }
  };
  
  const handleShareRoadmap = (roadmapId) => {
    const shareUrl = `${window.location.origin}/roadmap/${roadmapId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredRoadmaps = searchRoadmaps(searchQuery);
  const sortedRoadmaps = sortRoadmaps(filteredRoadmaps, filters.sortBy, filters.sortOrder);

  // Handle selecting a roadmap from the list
  const handleSelectRoadmap = (roadmap) => {
    selectRoadmap(roadmap);
    navigate(`/roadmap/${roadmap.id}`);
  };

  if (isLoading && !selectedRoadmap) {
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
            <LoadingSkeleton count={3} className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  // If a roadmap is selected, show detailed view
  if (selectedRoadmap) {
    // Parse the roadmap text to extract sections for beautiful display
    const parseRoadmapText = (text) => {
      if (!text) return null;
      
      const sections = {
        overview: '',
        skills: [],
        marketInsights: {},
        salary: {},
        steps: [],
        tips: [],
        nextSteps: ''
      };
      
      // Extract overview
      const overviewMatch = text.match(/## OVERVIEW\n(.*?)(?=\n##|$)/s);
      if (overviewMatch) {
        sections.overview = overviewMatch[1].trim();
      }
      
      // Extract required skills
      const skillsMatch = text.match(/\*\*Required Skills:\*\*\n(.*?)(?=\n\*\*|$)/s);
      if (skillsMatch) {
        const skillsText = skillsMatch[1];
        const skillLines = skillsText.split('\n');
        skillLines.forEach(line => {
          const match = line.match(/[•\-*]\s*\*\*(.*?)\*\*\s*-\s*(.*)/);
          if (match) {
            sections.skills.push({
              name: match[1].trim(),
              description: match[2].trim()
            });
          }
        });
      }
      
      // Extract market insights
      const marketMatch = text.match(/## MARKET INSIGHTS\n(.*?)(?=\n##|$)/s);
      if (marketMatch) {
        const marketText = marketMatch[1];
        const demandMatch = marketText.match(/-\s*\*\*Demand Trend:\*\*\s*(.*)/i);
        const salaryMatch = marketText.match(/-\s*\*\*Average Salary Range:\*\*\s*(.*)/i);
        const growthMatch = marketText.match(/-\s*\*\*Growth Outlook:\*\*\s*(.*)/i);
        const industriesMatch = marketText.match(/-\s*\*\*Top Industries Hiring:\*\*\s*(.*)/i);
        
        sections.marketInsights = {
          demand: demandMatch ? demandMatch[1].trim() : 'High',
          salary: salaryMatch ? salaryMatch[1].trim() : '$75,000 - $145,000',
          growth: growthMatch ? growthMatch[1].trim() : '25%',
          industries: industriesMatch ? industriesMatch[1].trim() : 'Technology, Finance, Healthcare'
        };
      }
      
      // Extract salary projection
      const salaryMatch = text.match(/## SALARY PROJECTION\n(.*?)(?=\n##|$)/s);
      if (salaryMatch) {
        const salaryText = salaryMatch[1];
        const entryMatch = salaryText.match(/-\s*\*\*Entry Level:\*\*\s*(.*)/i);
        const midMatch = salaryText.match(/-\s*\*\*Mid Level:\*\*\s*(.*)/i);
        const seniorMatch = salaryText.match(/-\s*\*\*Senior Level:\*\*\s*(.*)/i);
        const leadershipMatch = salaryText.match(/-\s*\*\*Leadership.*:\*\*\s*(.*)/i);
        
        sections.salary = {
          entry: entryMatch ? entryMatch[1].trim() : '$70,000 - $95,000',
          mid: midMatch ? midMatch[1].trim() : '$110,000 - $155,000',
          senior: seniorMatch ? seniorMatch[1].trim() : '$160,000 - $220,000',
          leadership: leadershipMatch ? leadershipMatch[1].trim() : '$250,000+'
        };
      }
      
      // Extract steps
      const stepsSection = text.match(/## STEP-BY-STEP ROADMAP\n(.*?)(?=\n## TIPS|$)/s);
      if (stepsSection) {
        const stepRegex = /### Step \d+: ([^\n]+)\n\*\*Duration:\*\* ([^\n]+)\n\*\*Skills to Learn:\*\* ([^\n]+)\n\n(.*?)(?=\n\n###|$)/gs;
        let stepMatch;
        while ((stepMatch = stepRegex.exec(stepsSection[1])) !== null) {
          sections.steps.push({
            title: stepMatch[1].trim(),
            duration: stepMatch[2].trim(),
            skills: stepMatch[3].split(',').map(s => s.trim()),
            description: stepMatch[4].trim()
          });
        }
      }
      
      // Extract tips
      const tipsMatch = text.match(/## TIPS FOR SUCCESS\n(.*?)(?=\n## NEXT STEPS|$)/s);
      if (tipsMatch) {
        const tipsText = tipsMatch[1];
        const tipLines = tipsText.split('\n');
        tipLines.forEach(line => {
          const match = line.match(/[•\-*]\s*(.*)/);
          if (match) {
            sections.tips.push(match[1].trim());
          }
        });
      }
      
      // Extract next steps
      const nextStepsMatch = text.match(/## NEXT STEPS\n(.*?)(?=\n---|$)/s);
      if (nextStepsMatch) {
        const nextStepsText = nextStepsMatch[1];
        const nextStepLines = nextStepsText.split('\n');
        nextStepLines.forEach(line => {
          const match = line.match(/\d+\.\s*(.*)/);
          if (match) {
            sections.nextSteps += (sections.nextSteps ? '\n' : '') + match[1].trim();
          }
        });
      }
      
      return sections;
    };
    
    const parsedContent = selectedRoadmap.description ? parseRoadmapText(selectedRoadmap.description) : null;
    const steps = selectedRoadmap.steps || [];
    const completedSteps = steps.filter(s => s.is_completed).length;
    const totalSteps = steps.length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    const totalHours = steps.reduce((acc, step) => acc + (step.estimated_duration_hours || 0), 0);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6">
            {/* Roadmap Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button
                onClick={() => {
                  clearSelectedRoadmap();
                  navigate('/roadmap');
                }}
                className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 group"
              >
                <FiChevronLeft className="w-5 h-5 mr-1 group-hover:-translate-x-1 transition-transform" />
                <span>Back to All Roadmaps</span>
              </button>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleExportRoadmap(selectedRoadmap.id)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FiDownload className="w-4 h-4 mr-2" />
                  Export
                </button>
                <button
                  onClick={() => handleShareRoadmap(selectedRoadmap.id)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <FiShare2 className="w-4 h-4 mr-2" />
                  Share
                </button>
                <button
                  onClick={() => handleDeleteRoadmap(selectedRoadmap.id)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
                >
                  <FiTrash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>

            {/* Roadmap Header - Beautiful Gradient Card */}
            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              
              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm">
                      <FiTarget className="w-4 h-4 mr-2" />
                      {selectedRoadmap.target_role || 'Career Roadmap'}
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl font-bold">
                      {selectedRoadmap.title}
                    </h1>
                    
                    <div className="flex items-center space-x-2">
                      <p className="text-white/80 max-w-2xl line-clamp-2">
                        {selectedRoadmap.description ? selectedRoadmap.description.split('\n')[0] : 'No description provided'}
                      </p>
                      {selectedRoadmap.description && selectedRoadmap.description.split('\n').length > 1 && (
                        <button
                          onClick={() => setShowFullDescription(!showFullDescription)}
                          className="text-white/80 hover:text-white text-sm font-medium whitespace-nowrap"
                        >
                          {showFullDescription ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-4">
                      <div className="flex items-center space-x-2">
                        <FiClock className="w-4 h-4 text-white/70" />
                        <span className="text-sm">{selectedRoadmap.total_duration_months} months</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FiAward className="w-4 h-4 text-white/70" />
                        <span className="text-sm capitalize">{selectedRoadmap.difficulty_level || 'intermediate'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <FiTrendingUp className="w-4 h-4 text-white/70" />
                        <span className="text-sm">{steps.length} steps</span>
                      </div>
                      {selectedRoadmap.generated_by_ai && (
                        <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full flex items-center">
                          <HiOutlineSparkles className="w-4 h-4 mr-1" />
                          <span className="text-xs font-medium">AI Generated</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Full description when expanded */}
                <AnimatePresence>
                  {showFullDescription && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden mt-4"
                    >
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-white/90 text-sm whitespace-pre-wrap">
                        {selectedRoadmap.description}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Progress Bar */}
                <div className="mt-8">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span>Overall Progress</span>
                    <span className="font-bold">{progress}%</span>
                  </div>
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Steps</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalSteps}</p>
                  </div>
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                    <FiLayers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{completedSteps}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                    <FiCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Hours</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalHours}</p>
                  </div>
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                    <FiClock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Certifications</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {steps.filter(s => s.step_type === 'certification').length}
                    </p>
                  </div>
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <FiAward className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Roadmap View Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-1 inline-flex">
              {[
                { id: 'builder', label: 'Builder', icon: FiEdit2 },
                { id: 'timeline', label: 'Timeline', icon: FiCalendar },
                { id: 'progress', label: 'Progress', icon: FiBarChart2 },
                { id: 'preview', label: 'Preview', icon: FiEye },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = viewMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Roadmap Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={viewMode}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"
              >
                {viewMode === 'builder' && <RoadmapBuilder />}
                {viewMode === 'timeline' && (
                  <TimelineView
                    roadmap={selectedRoadmap}
                    steps={steps}
                  />
                )}
                {viewMode === 'progress' && (
                  <ProgressTracker 
                    roadmap={selectedRoadmap} 
                    steps={steps} 
                    onStepComplete={async (stepId, isCompleted) => {
                      try {
                        await roadmapService.toggleStepCompletion(stepId, isCompleted);
                        queryClient.invalidateQueries(['roadmap', selectedRoadmap.id]);
                        toast.success('Step status updated');
                      } catch (error) {
                        console.error('Error toggling step:', error);
                        toast.error('Failed to update step status');
                      }
                    }}
                  />
                )}
                {viewMode === 'preview' && (
                  <div className="space-y-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <FiEye className="w-5 h-5 mr-2 text-indigo-600" />
                      Roadmap Preview
                    </h3>
                    
                    {/* Overview Section */}
                    {parsedContent?.overview && (
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                          <FiTarget className="w-4 h-4 mr-2 text-indigo-600" />
                          Overview
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {parsedContent.overview}
                        </p>
                      </div>
                    )}

                    {/* Required Skills */}
                    {parsedContent?.skills && parsedContent.skills.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                            <FiAward className="w-5 h-5 mr-2 text-indigo-600" />
                            Required Skills
                          </h4>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {parsedContent.skills.map((skill, index) => (
                              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <FiZap className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-medium text-gray-900 dark:text-white">{skill.name}</span>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{skill.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Market Insights */}
                    {parsedContent?.marketInsights && Object.keys(parsedContent.marketInsights).length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-green-50 dark:bg-green-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                            <FiTrendingUp className="w-5 h-5 mr-2 text-green-600" />
                            Market Insights
                          </h4>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Demand</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{parsedContent.marketInsights.demand}</span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Salary Range</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{parsedContent.marketInsights.salary}</span>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Growth Outlook</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{parsedContent.marketInsights.growth}</span>
                              </div>
                              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Top Industries</span>
                                <span className="font-semibold text-gray-900 dark:text-white">{parsedContent.marketInsights.industries}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Salary Projection */}
                    {parsedContent?.salary && Object.keys(parsedContent.salary).length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-purple-50 dark:bg-purple-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                            <FiDollarSign className="w-5 h-5 mr-2 text-purple-600" />
                            Salary Projection
                          </h4>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Entry Level</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{parsedContent.salary.entry}</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Mid Level</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{parsedContent.salary.mid}</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Senior Level</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{parsedContent.salary.senior}</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Leadership</p>
                              <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">{parsedContent.salary.leadership}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Steps Preview */}
                    {steps.length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
                            <FiLayers className="w-5 h-5 mr-2 text-indigo-600" />
                            Step-by-Step Plan
                          </h4>
                        </div>
                        <div className="p-6">
                          <div className="space-y-4">
                            {steps.map((step, index) => (
                              <div
                                key={step.id}
                                className={`p-4 rounded-lg border ${
                                  step.is_completed
                                    ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                                }`}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-2">
                                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        step.is_completed
                                          ? 'bg-green-500 text-white'
                                          : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                      }`}>
                                        {step.step_number || index + 1}
                                      </span>
                                      <h5 className={`font-medium ${
                                        step.is_completed
                                          ? 'text-green-700 dark:text-green-400'
                                          : 'text-gray-900 dark:text-white'
                                      }`}>
                                        {step.title}
                                      </h5>
                                      {step.is_completed && (
                                        <FiCheckCircle className="w-4 h-4 text-green-500" />
                                      )}
                                    </div>
                                    
                                    {step.description && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 ml-8">
                                        {step.description}
                                      </p>
                                    )}
                                    
                                    <div className="flex items-center space-x-4 mt-3 ml-8">
                                      <span className="text-xs flex items-center text-gray-500 dark:text-gray-400">
                                        <FiClock className="w-3 h-3 mr-1" />
                                        {step.estimated_duration_hours || 0} hrs
                                      </span>
                                      <span className="text-xs flex items-center text-gray-500 dark:text-gray-400 capitalize">
                                        <FiBriefcase className="w-3 h-3 mr-1" />
                                        {step.step_type?.replace('_', ' ') || 'learning'}
                                      </span>
                                    </div>

                                    {step.skills_to_develop && step.skills_to_develop.length > 0 && (
                                      <div className="mt-3 ml-8">
                                        <div className="flex flex-wrap gap-2">
                                          {step.skills_to_develop.map((skill, i) => (
                                            <span
                                              key={i}
                                              className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs rounded-lg"
                                            >
                                              {skill}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tips for Success */}
                    {parsedContent?.tips && parsedContent.tips.length > 0 && (
                      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                          <FiStar className="w-5 h-5 mr-2 text-amber-600" />
                          Tips for Success
                        </h4>
                        <ul className="space-y-2">
                          {parsedContent.tips.map((tip, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="text-amber-600 dark:text-amber-400 font-bold mt-1">•</span>
                              <span className="text-gray-700 dark:text-gray-300">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Next Steps */}
                    {parsedContent?.nextSteps && (
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                          <FiArrowUpRight className="w-5 h-5 mr-2 text-indigo-600" />
                          Next Steps
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300">{parsedContent.nextSteps}</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // Show roadmap list view
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Career Roadmaps
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Plan and track your career development journey
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <FiPlus className="w-4 h-4 mr-2" />
                Create Manual
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-lg"
              >
                <HiOutlineSparkles className="w-4 h-4 mr-2" />
                Generate with AI
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          {stats.totalRoadmaps > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Roadmaps</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats.totalRoadmaps}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                    <FiLayers className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats.activeRoadmaps}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                    <FiTrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats.completedRoadmaps}
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <FiCheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Progress</p>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats.averageProgress.toFixed(1)}%
                    </h3>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                    <FiBarChart2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Search roadmaps by title or target role..."
                />
              </div>

              <div className="flex items-center space-x-3">
                <select
                  value={filters.status}
                  onChange={(e) => updateFilters({ status: e.target.value })}
                  className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused</option>
                </select>

                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilters({ sortBy: e.target.value })}
                  className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                >
                  <option value="created_at">Newest First</option>
                  <option value="updated_at">Recently Updated</option>
                  <option value="title">Title A-Z</option>
                  <option value="progress">Progress</option>
                </select>

                <button
                  onClick={clearFilters}
                  className="px-4 py-3 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* View Toggle and Count */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {sortedRoadmaps.length} roadmap{sortedRoadmaps.length !== 1 ? 's' : ''} found
            </div>

            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                title="Grid View"
              >
                <FiGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'list'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                title="List View"
              >
                <FiList className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Roadmaps Grid/List */}
          {sortedRoadmaps.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedRoadmaps.map((roadmap) => (
                  <motion.div
                    key={roadmap.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -4 }}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden cursor-pointer group"
                    onClick={() => handleSelectRoadmap(roadmap)}
                  >
                    {/* Card Header with Gradient */}
                    <div className="h-32 bg-gradient-to-br from-indigo-600 to-purple-600 relative overflow-hidden">
                      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                      {roadmap.generated_by_ai && (
                        <div className="absolute top-3 right-3 px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full flex items-center">
                          <HiOutlineSparkles className="w-3 h-3 text-white mr-1" />
                          <span className="text-xs text-white">AI</span>
                        </div>
                      )}
                      <div className="absolute bottom-3 left-3">
                        <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white">
                          {roadmap.target_role || 'Career Roadmap'}
                        </span>
                      </div>
                    </div>

                    <div className="p-6">
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1">
                        {roadmap.title}
                      </h3>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                        {roadmap.description ? roadmap.description.split('\n')[0] : 'No description provided'}
                      </p>

                      {/* Progress Section */}
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">Progress</span>
                          <span className="font-medium text-indigo-600 dark:text-indigo-400">
                            {roadmap.completion_percentage?.toFixed(1) || 0}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${roadmap.completion_percentage || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center">
                            <FiClock className="w-4 h-4 mr-1" />
                            {roadmap.total_duration_months}m
                          </span>
                          <span className="flex items-center">
                            <FiLayers className="w-4 h-4 mr-1" />
                            {roadmap.steps?.length || 0} steps
                          </span>
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportRoadmap(roadmap.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <FiDownload className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareRoadmap(roadmap.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <FiShare2 className="w-4 h-4" />
                          </button>
                          <FiChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg divide-y divide-gray-200 dark:divide-gray-700">
                {sortedRoadmaps.map((roadmap) => (
                  <div
                    key={roadmap.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                    onClick={() => handleSelectRoadmap(roadmap)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          roadmap.generated_by_ai
                            ? 'bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30'
                            : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          {roadmap.generated_by_ai ? (
                            <HiOutlineSparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <FiLayers className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {roadmap.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {roadmap.target_role} • {roadmap.total_duration_months} months
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            {roadmap.completion_percentage?.toFixed(1) || 0}%
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {roadmap.steps?.filter(s => s.is_completed).length || 0}/{roadmap.steps?.length || 0} steps
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportRoadmap(roadmap.id);
                            }}
                            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <FiDownload className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareRoadmap(roadmap.id);
                            }}
                            className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <FiShare2 className="w-4 h-4" />
                          </button>
                        </div>
                        <FiChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mb-6">
                <HiOutlineSparkles className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No roadmaps yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                {searchQuery
                  ? 'No roadmaps match your search. Try a different search term.'
                  : 'Create your first career roadmap to start your development journey.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <FiPlus className="w-4 h-4 mr-2" />
                  Create Manual Roadmap
                </button>
                <button
                  onClick={() => setShowGenerateModal(true)}
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-colors shadow-lg"
                >
                  <HiOutlineSparkles className="w-4 h-4 mr-2" />
                  Generate with AI
                </button>
              </div>
            </div>
          )}

          {/* Create Roadmap Modal - SCROLLABLE & MODERNIZED */}
          <AnimatePresence>
            {showCreateModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={() => setShowCreateModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Fixed Header */}
                  <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                          <FiPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Create New Roadmap
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Plan your career journey step by step
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCreateModal(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-6 pt-2">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Roadmap Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newRoadmapData.title}
                          onChange={(e) => setNewRoadmapData(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          placeholder="e.g., Become Senior Developer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Target Role <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={newRoadmapData.target_role}
                          onChange={(e) => setNewRoadmapData(prev => ({ ...prev, target_role: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          placeholder="e.g., Senior Software Engineer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Description
                        </label>
                        <textarea
                          value={newRoadmapData.description}
                          onChange={(e) => setNewRoadmapData(prev => ({ ...prev, description: e.target.value }))}
                          rows="3"
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          placeholder="Describe your career goals and objectives..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Duration (months)
                          </label>
                          <input
                            type="number"
                            value={newRoadmapData.total_duration_months}
                            onChange={(e) => setNewRoadmapData(prev => ({ ...prev, total_duration_months: parseInt(e.target.value) || 12 }))}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            min="1"
                            max="60"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Industry
                          </label>
                          <input
                            type="text"
                            value={newRoadmapData.target_industry}
                            onChange={(e) => setNewRoadmapData(prev => ({ ...prev, target_industry: e.target.value }))}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            placeholder="e.g., Technology"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fixed Footer */}
                  <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowCreateModal(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateRoadmap}
                        disabled={!newRoadmapData.title || !newRoadmapData.target_role}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Create Roadmap
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generate Roadmap Modal - SCROLLABLE & MODERNIZED */}
          <AnimatePresence>
            {showGenerateModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={() => setShowGenerateModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Fixed Header */}
                  <div className="flex-shrink-0 p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl flex items-center justify-center">
                          <HiOutlineSparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            AI Roadmap Generator
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Let AI create a personalized roadmap for you
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowGenerateModal(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <FiX className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-6 pt-2">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          What role are you targeting? <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={generateData.target_role}
                          onChange={(e) => setGenerateData(prev => ({ ...prev, target_role: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          placeholder="e.g., Data Scientist, Product Manager"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Target Industry
                        </label>
                        <input
                          type="text"
                          value={generateData.target_industry}
                          onChange={(e) => setGenerateData(prev => ({ ...prev, target_industry: e.target.value }))}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          placeholder="e.g., Technology, Healthcare"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Timeframe (months)
                        </label>
                        <input
                          type="number"
                          value={generateData.timeframe_months}
                          onChange={(e) => setGenerateData(prev => ({ ...prev, timeframe_months: parseInt(e.target.value) || 12 }))}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                          min="1"
                          max="60"
                        />
                      </div>

                      <div className="space-y-2 bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={generateData.include_salary_data}
                            onChange={(e) => setGenerateData(prev => ({ ...prev, include_salary_data: e.target.checked }))}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Include salary data and projections
                          </span>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={generateData.include_market_insights}
                            onChange={(e) => setGenerateData(prev => ({ ...prev, include_market_insights: e.target.checked }))}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Include market insights and trends
                          </span>
                        </label>
                      </div>

                      <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                        <p className="text-sm text-indigo-700 dark:text-indigo-300">
                          💡 The AI will analyze current market trends and create a step-by-step roadmap with learning resources, projects, and timelines tailored to your goals.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fixed Footer */}
                  <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowGenerateModal(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleGenerateRoadmap}
                        disabled={!generateData.target_role}
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <HiOutlineSparkles className="w-4 h-4 mr-2" />
                        Generate Roadmap
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

export default RoadmapPage;