import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { RoadmapProvider } from './context/RoadmapContext';
import { AIProvider } from './context/AIContext';

// Components
import PrivateRoute from './components/common/PrivateRoute';
import Layout from "./components/common/Layout";

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import RoadmapPage from './pages/RoadmapPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import GoalsPage from './pages/GoalsPage';
import SkillsPage from './pages/SkillsPage';
import LearningPage from './pages/LearningPage';
import ResumePage from './pages/ResumePage';
import JobsPage from './pages/JobsPage';
import AnalyticsPage from './pages/AnalyticsPage';

// Services - we don't need to import api here since interceptors are in api.js
import { api } from './services/api';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  // Add a simple token refresh check on app load
  useEffect(() => {
    const refreshTokenOnLoad = async () => {
      const token = localStorage.getItem('access_token');
      const refresh = localStorage.getItem('refresh_token');
      
      // If we have a refresh token but no access token, try to refresh
      if (!token && refresh) {
        try {
          const response = await api.post('/auth/token/refresh/', {
            refresh: refresh
          });
          localStorage.setItem('access_token', response.data.access);
          console.log('✅ Token refreshed on app load');
        } catch (error) {
          console.log('❌ Token refresh failed, user may need to login');
          // Don't redirect - let the protected routes handle it
        }
      }
    };
    
    refreshTokenOnLoad();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RoadmapProvider>
          <AIProvider>
            <Router>
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#10B981',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 4000,
                    iconTheme: {
                      primary: '#EF4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                
                {/* Protected Routes */}
                <Route element={<PrivateRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/roadmap" element={<RoadmapPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/goals" element={<GoalsPage />} />
                    <Route path="/skills" element={<SkillsPage />} />
                    <Route path="/learning" element={<LearningPage />} />
                    <Route path="/resume" element={<ResumePage />} />
                    <Route path="/jobs" element={<JobsPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/roadmap/:id" element={<RoadmapPage />} />
                  </Route>
                </Route>
                
                {/* Catch all route */}
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Router>
          </AIProvider>
        </RoadmapProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;