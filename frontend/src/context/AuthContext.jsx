import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          
          // Verify token is still valid
          try {
            const isValid = await authService.verifyToken();
            if (!isValid) {
              throw new Error('Token expired');
            }
            
            // Refresh user data
            const freshUser = await authService.getCurrentUser();
            setUser(freshUser);
            localStorage.setItem('user', JSON.stringify(freshUser));
          } catch (error) {
            console.error('Auth initialization error:', error);
            logout();
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
          logout();
        }
      }
      
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await authService.login(credentials);
      setUser(data.user);
      toast.success(`Welcome back, ${data.user?.first_name || 'User'}!`);
      return data;
    } catch (error) {
      const message = error.response?.data?.detail || 
                     error.response?.data?.message || 
                     'Login failed. Please check your credentials.';
      setError(message);
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await authService.register(userData);
      setUser(data.user);
      toast.success('Account created successfully!');
      return data;
    } catch (error) {
      const errors = error.response?.data;
      let errorMessage = 'Registration failed. Please try again.';
      
      if (errors) {
        if (errors.email) {
          errorMessage = Array.isArray(errors.email) ? errors.email[0] : errors.email;
        } else if (errors.password) {
          errorMessage = Array.isArray(errors.password) ? errors.password[0] : errors.password;
        } else if (errors.username) {
          errorMessage = Array.isArray(errors.username) ? errors.username[0] : errors.username;
        } else if (errors.non_field_errors) {
          errorMessage = errors.non_field_errors[0];
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const updateProfile = async (userData) => {
    try {
      setLoading(true);
      const updatedUser = await authService.updateProfile(userData);
      setUser(updatedUser);
      toast.success('Profile updated successfully');
      return updatedUser;
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to update profile';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (passwordData) => {
    try {
      setLoading(true);
      await authService.changePassword(passwordData);
      toast.success('Password changed successfully');
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to change password';
      toast.error(message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    clearError,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};