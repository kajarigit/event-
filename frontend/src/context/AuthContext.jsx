import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      console.log('🔍 AuthContext: Checking auth on mount...', { 
        hasToken: !!token, 
        hasRefreshToken: !!refreshToken 
      });
      
      if (token && refreshToken) {
        try {
          console.log('🔍 Fetching /auth/me...');
          const response = await api.get('/auth/me');
          setUser(response.data.data);
          console.log('✅ Auth restored successfully:', response.data.data.email, response.data.data.role);
        } catch (error) {
          console.error('❌ /auth/me failed:', {
            status: error.response?.status,
            message: error.response?.data?.message,
            error: error.message
          });
          
          // Only clear tokens if it's a 401/403 (unauthorized)
          // Don't clear on network errors (500, timeout, etc.)
          if (error.response?.status === 401 || error.response?.status === 403) {
            console.log('🔐 Unauthorized - clearing tokens');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
          } else if (error.code === 'ERR_NETWORK' || !error.response) {
            console.log('⚠️ Network error - will retry on next request');
            // Keep tokens but set user to null temporarily
            setUser(null);
          } else {
            console.log('⚠️ Server error - clearing tokens');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
          }
        }
      } else {
        console.log('ℹ️ No tokens found in localStorage');
        setUser(null);
      }
      
      setIsLoading(false);
      console.log('✅ Auth check complete');
    };

    checkAuth();
  }, []);

  const login = async (loginData) => {
    try {
      const response = await api.post('/auth/login', loginData);
      const { user, accessToken, refreshToken, needsVerification, redirectTo } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(user);

      // Handle first-time login verification
      if (needsVerification) {
        toast.success('Please complete verification to continue');
        return { user, needsVerification, redirectTo };
      }

      toast.success(`Welcome back, ${user.name}!`);
      return { user, needsVerification: false };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { user, accessToken, refreshToken } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      setUser(user);

      toast.success('Registration successful!');
      return user;
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      toast.success('Logged out successfully');
    }
  };

  const updateProfile = async (updates) => {
    try {
      const response = await api.put('/auth/update-profile', updates);
      setUser(response.data.data);
      toast.success('Profile updated successfully');
      return response.data.data;
    } catch (error) {
      const message = error.response?.data?.message || 'Update failed';
      toast.error(message);
      throw error;
    }
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
