import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { stallOwnerApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Store, TrendingUp, Trophy, Star, MessageSquare, 
  ThumbsUp, QrCode, Users, Award, Clock, BarChart3, Activity, 
  LogOut, RefreshCw, Menu, X, Home, PieChart, FileText,
  ArrowUp, ArrowDown, Eye, EyeOff
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function StallOwnerDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [stallData, setStallData] = useState(null);
  const [currentPage, setCurrentPage] = useState('overview'); // overview, qr, rankings, feedback
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Notification tracking refs
  const prevVoteCountRef = useRef(0);
  const prevFeedbackCountRef = useRef(0);
  const prevRankRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('stallData');
    const token = localStorage.getItem('accessToken');
    
    console.log('Dashboard loading - checking auth:', { stored: !!stored, token: !!token });
    
    if (stored && token) {
      setStallData(JSON.parse(stored));
    } else {
      console.log('Missing auth data, redirecting to login');
      toast.error('Please login to access the dashboard');
      navigate('/stall-owner/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('stallData');
    localStorage.removeItem('userRole');
    toast.success('Logged out successfully');
    navigate('/stall-owner/login');
  };

  // Navigation handler
  const handlePageChange = (pageId) => {
    setCurrentPage(pageId);
    setSidebarOpen(false); // Close mobile sidebar
  };

  // Optimized data fetching with proper caching and error handling
  const { data: myStall, isLoading: loadingStall, error: stallError, refetch: refetchMyStall } = useQuery({
    queryKey: ['stallOwner', 'myStall'],
    queryFn: async () => {
      try {
        const response = await stallOwnerApi.getMyStall();
        setLastUpdated(new Date());
        return response.data.data.stall;
      } catch (error) {
        console.error('Failed to fetch stall data:', error);
        
        // Handle authentication errors - but don't logout immediately, let user try manual refresh first
        if (error.response?.status === 401 || error.message?.includes('Session expired')) {
          console.log('Authentication error in stall data fetch:', error);
          toast.error('Authentication failed. Please try refreshing or login again.');
          // Don't auto-logout immediately - let user try manual refresh first
        }
        throw error;
      }
    },
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds only if auto-refresh is enabled
    staleTime: 15000, // Consider data fresh for 15 seconds
    cacheTime: 300000, // Keep in cache for 5 minutes
    enabled: !!stallData,
    retry: 1, // Reduce retries for auth errors
    onError: (error) => {
      // Don't show generic error toast if it's an auth error (already handled above)
      if (error.response?.status !== 401 && !error.message?.includes('Session expired')) {
        toast.error('Failed to load stall data');
      }
    }
  });

  const { data: leaderboard, isLoading: loadingLeaderboard, error: leaderboardError, refetch: refetchLeaderboard } = useQuery({
    queryKey: ['stallOwner', 'leaderboard'],
    queryFn: async () => {
      try {
        const response = await stallOwnerApi.getDepartmentLeaderboard();
        setLastUpdated(new Date());
        return response.data.data;
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        
        // Handle authentication errors - log but don't auto-logout immediately
        if (error.response?.status === 401 || error.message?.includes('Session expired')) {
          console.log('Authentication error in leaderboard fetch:', error);
          // Don't auto-logout immediately - let user try manual refresh first
        }
        throw error;
      }
    },
    refetchInterval: autoRefresh ? 45000 : false, // 45 seconds
    staleTime: 20000, // Consider fresh for 20 seconds
    cacheTime: 300000, // Keep in cache for 5 minutes
    enabled: !!stallData,
    retry: 1, // Reduce retries for auth errors
    onSuccess: (data) => {
      // Smart notifications for rank changes
      if (prevRankRef.current !== null && data.myPosition !== prevRankRef.current) {
        if (data.myPosition < prevRankRef.current) {
          toast.success(`🎉 Moved up to rank #${data.myPosition}!`, { duration: 4000, icon: '📈' });
        } else {
          toast(`📉 Now rank #${data.myPosition}`, { duration: 3000, icon: '📊' });
        }
      }
      prevRankRef.current = data.myPosition;
    },
    onError: (error) => {
      // Don't show generic error toast if it's an auth error
      if (error.response?.status !== 401 && !error.message?.includes('Session expired')) {
        toast.error('Failed to load leaderboard');
      }
    }
  });

  // Helper function to handle auth errors consistently - but don't auto-logout immediately
  const handleAuthError = (error) => {
    if (error.response?.status === 401 || error.message?.includes('Session expired')) {
      console.log('Authentication error detected:', error);
      // Don't auto-logout immediately - let user see the error and try manual refresh
      return true; // Indicates auth error was detected
    }
    return false;
  };

  const { data: competitionStats, error: competitionError, refetch: refetchCompetitionStats } = useQuery({
    queryKey: ['stallOwner', 'competitionStats'],
    queryFn: async () => {
      try {
        const response = await stallOwnerApi.getCompetitionStats();
        setLastUpdated(new Date());
        return response.data.data;
      } catch (error) {
        if (!handleAuthError(error)) throw error;
      }
    },
    refetchInterval: autoRefresh ? 60000 : false, // 1 minute
    staleTime: 30000, // 30 seconds
    cacheTime: 300000,
    enabled: !!stallData,
    retry: 1,
    onError: (error) => {
      if (!handleAuthError(error)) {
        toast.error('Failed to load competition stats');
      }
    }
  });

  const { data: liveVotes, error: votesError, refetch: refetchVotes } = useQuery({
    queryKey: ['stallOwner', 'votes'],
    queryFn: async () => {
      try {
        const response = await stallOwnerApi.getLiveVotes({ limit: 20 });
        setLastUpdated(new Date());
        return response.data.data;
      } catch (error) {
        if (!handleAuthError(error)) throw error;
      }
    },
    refetchInterval: autoRefresh ? 30000 : false, // 30 seconds for votes
    staleTime: 15000,
    cacheTime: 300000,
    enabled: !!stallData,
    retry: 1,
    onSuccess: (data) => {
      const currentCount = data.totalVotes || 0;
      if (prevVoteCountRef.current > 0 && currentCount > prevVoteCountRef.current) {
        const newVotes = currentCount - prevVoteCountRef.current;
        toast.success(`🗳️ ${newVotes} new vote${newVotes > 1 ? 's' : ''}!`, { duration: 4000 });
      }
      prevVoteCountRef.current = currentCount;
    },
    onError: (error) => {
      if (!handleAuthError(error)) {
        toast.error('Failed to load votes');
      }
    }
  });

  const { data: liveFeedbacks, error: feedbacksError, refetch: refetchFeedbacks } = useQuery({
    queryKey: ['stallOwner', 'feedbacks'],
    queryFn: async () => {
      try {
        const response = await stallOwnerApi.getLiveFeedbacks({ limit: 20 });
        setLastUpdated(new Date());
        return response.data.data;
      } catch (error) {
        if (!handleAuthError(error)) throw error;
      }
    },
    refetchInterval: autoRefresh ? 45000 : false, // 45 seconds
    staleTime: 20000,
    cacheTime: 300000,
    enabled: !!stallData,
    retry: 1,
    onSuccess: (data) => {
      const currentCount = data.stats?.totalFeedbacks || 0;
      if (prevFeedbackCountRef.current > 0 && currentCount > prevFeedbackCountRef.current) {
        const newFeedbacks = currentCount - prevFeedbackCountRef.current;
        toast.success(`⭐ ${newFeedbacks} new feedback${newFeedbacks > 1 ? 's' : ''}!`, { duration: 4000 });
      }
      prevFeedbackCountRef.current = currentCount;
    },
    onError: (error) => {
      if (!handleAuthError(error)) {
        toast.error('Failed to load feedbacks');
      }
    }
  });

  const { data: recentActivity, error: activityError, refetch: refetchRecentActivity } = useQuery({
    queryKey: ['stallOwner', 'recentActivity'],
    queryFn: async () => {
      try {
        const response = await stallOwnerApi.getRecentActivity({ limit: 15 });
        setLastUpdated(new Date());
        return response.data.data;
      } catch (error) {
        if (!handleAuthError(error)) throw error;
      }
    },
    refetchInterval: autoRefresh ? 60000 : false, // 1 minute
    staleTime: 30000,
    cacheTime: 300000,
    enabled: !!stallData,
    retry: 1,
    onError: (error) => {
      if (!handleAuthError(error)) {
        toast.error('Failed to load recent activity');
      }
    }
  });

  // Manual refresh function
  const handleManualRefresh = async () => {
    setLastUpdated(new Date());
    queryClient.invalidateQueries({ queryKey: ['stallOwner'] });
    
    toast.promise(
      Promise.all([
        refetchMyStall(),
        refetchLeaderboard(),
        refetchCompetitionStats(),
        refetchVotes(),
        refetchFeedbacks(),
        refetchRecentActivity()
      ]),
      {
        loading: '🔄 Refreshing data...',
        success: '✅ Updated successfully!',
        error: '❌ Update failed'
      }
    );
  };

  // Check for any loading states or errors
  const isLoading = loadingStall || loadingLeaderboard;
  const hasErrors = stallError || leaderboardError || competitionError || votesError || feedbacksError || activityError;

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-slate-700 dark:text-slate-300">Loading Dashboard...</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Fetching your stall data...</p>
        </div>
      </div>
    );
  }

  // Handle auth errors
  const authErrorCount = [stallError, leaderboardError].filter(error => 
    error?.response?.status === 401 || error?.message?.includes('Session expired')
  ).length;
  
  const showSessionExpired = authErrorCount >= 2;

  if (showSessionExpired && !myStall) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <LogOut size={64} className="mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Session Expired</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Please log in again to access your dashboard.
          </p>
          <button
            onClick={() => navigate('/stall-owner/login')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <LogOut size={20} />
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Professional Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Store className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    {myStall?.name || stallData?.name || 'Stall Dashboard'}
                  </h1>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {myStall?.department || stallData?.department} • {myStall?.ownerName || stallData?.ownerName}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Auto-refresh toggle */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-slate-600 dark:text-slate-400">Auto-refresh</span>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    autoRefresh ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      autoRefresh ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Manual refresh */}
              <button
                onClick={handleManualRefresh}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Refresh data"
              >
                <RefreshCw size={20} />
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Professional Sidebar Navigation */}
        <nav className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 shadow-lg lg:shadow-none border-r border-slate-200 dark:border-slate-700 transition-transform duration-300 ease-in-out`}>
          <div className="flex flex-col h-full pt-20 lg:pt-6">
            <div className="px-6 mb-8">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Navigation</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>

            <div className="flex-1 px-3">
              <ul className="space-y-2">
                {navigationItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = currentPage === item.id;
                  
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => handlePageChange(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        <IconComponent size={20} />
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                            {item.description}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Quick Stats in Sidebar */}
            <div className="p-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Rank</span>
                  <span className={`font-medium ${getRankColor(leaderboard?.myPosition || 0)}`}>
                    {getRankIcon(leaderboard?.myPosition || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Votes</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    {myStall?.stats?.totalVotes || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Reviews</span>
                  <span className="font-medium text-purple-600 dark:text-purple-400">
                    {myStall?.stats?.totalFeedbacks || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Rating</span>
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {myStall?.stats?.averageRating || '0.0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 lg:ml-0">
          <div className="p-6">
            {renderCurrentPage()}
          </div>
        </main>
      </div>
    </div>
  );

  // Render different pages based on current selection
  function renderCurrentPage() {
    switch (currentPage) {
      case 'overview':
        return renderOverviewPage();
      case 'qr':
        return renderQRCodePage();
      case 'rankings':
        return renderRankingsPage();
      case 'feedback':
        return renderFeedbackPage();
      default:
        return renderOverviewPage();
    }
  }

  // Overview page - Professional dashboard
  function renderOverviewPage() {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Dashboard Overview</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Real-time performance metrics for your stall
          </p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Current Rank */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Current Rank</p>
                <p className={`text-3xl font-bold ${getRankColor(leaderboard?.myPosition || 0)}`}>
                  {getRankIcon(leaderboard?.myPosition || 0)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  of {leaderboard?.totalStalls || 0} stalls
                </p>
              </div>
              <Trophy className={`w-8 h-8 ${getRankColor(leaderboard?.myPosition || 0)}`} />
            </div>
          </div>

          {/* Total Votes */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Votes</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {myStall?.stats?.totalVotes || 0}
                </p>
              </div>
              <ThumbsUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          {/* Total Feedback */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Reviews</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {myStall?.stats?.totalFeedbacks || 0}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          {/* Average Rating */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Avg Rating</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {myStall?.stats?.averageRating || '0.0'}
                </p>
                <div className="flex items-center mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(parseFloat(myStall?.stats?.averageRating || 0))
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Votes Trend */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Votes Trend (24h)</h3>
            {liveVotes?.votesTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={liveVotes.votesTrend.reverse()}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(value) => new Date(value).getHours() + ':00'}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} />
                  <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <BarChart3 size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No trend data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Recent Activity</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {recentActivity?.activities?.slice(0, 6).map((activity, idx) => (
                <div
                  key={`${activity.type}-${activity.id}-${idx}`}
                  className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                >
                  <div className={`p-1.5 rounded-lg ${
                    activity.type === 'vote' 
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                      : 'bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400'
                  }`}>
                    {activity.type === 'vote' ? <ThumbsUp size={16} /> : <MessageSquare size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {activity.student?.name}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {activity.type === 'vote' ? 'Voted' : 'Left feedback'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {(!recentActivity?.activities?.length) && (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // QR Code page
  function renderQRCodePage() {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Your Stall QR Code</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Display this QR code for students to scan and interact with your stall
          </p>
        </div>

        {/* QR Code Display */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <div className="text-center">
            {myStall?.qrCode ? (
              <div className="inline-block">
                <div className="bg-white p-8 rounded-2xl shadow-lg border-2 border-slate-200">
                  <img 
                    src={myStall.qrCode} 
                    alt="Stall QR Code" 
                    className="w-80 h-80 mx-auto"
                    onError={(e) => {
                      console.error('QR Code image failed to load:', e);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <div className="mt-6 space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    {myStall.name}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {myStall.department} • {myStall.ownerName}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-500 font-mono bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded">
                    Stall ID: {myStall.id}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-100 dark:bg-slate-700 p-8 rounded-2xl w-80 h-80 mx-auto flex items-center justify-center">
                <div className="text-center">
                  <QrCode size={64} className="mx-auto mb-4 text-slate-400" />
                  <p className="text-slate-600 dark:text-slate-400">
                    QR Code is being generated...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">How to use your QR Code</h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              Display this QR code prominently at your stall
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              Students can scan to vote for your stall
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              Students can leave feedback and ratings
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              All interactions will appear in your live dashboard
            </li>
          </ul>
        </div>
      </div>
    );
  }

  // Rankings page - Live vote-wise rankings
  function renderRankingsPage() {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Live Rankings</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Real-time vote-based competition standings for {leaderboard?.department} Department
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">LIVE</span>
            </div>
          </div>
        </div>

        {/* Your Position Card */}
        {competitionStats && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Your Current Position</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Your Rank</p>
                <p className={`text-3xl font-bold ${getRankColor(competitionStats.myRank)}`}>
                  {getRankIcon(competitionStats.myRank)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Your Votes</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{competitionStats.myVotes}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Leader Votes</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{competitionStats.leadingVotes}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Gap</p>
                <p className={`text-3xl font-bold ${
                  competitionStats.voteGap === 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {competitionStats.voteGap === 0 ? '✓' : `-${competitionStats.voteGap}`}
                </p>
              </div>
            </div>
            
            {competitionStats.isLeading ? (
              <div className="mt-4 p-4 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-center">
                <p className="text-lg font-bold text-amber-900 dark:text-amber-100 flex items-center justify-center gap-2">
                  <Trophy className="text-amber-600" size={24} />
                  🎉 You're in the lead! Keep it up! 🎉
                </p>
              </div>
            ) : competitionStats.voteGap <= 5 ? (
              <div className="mt-4 p-4 bg-orange-100 dark:bg-orange-900/50 rounded-lg text-center">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  🔥 You're close! Only {competitionStats.voteGap} vote{competitionStats.voteGap > 1 ? 's' : ''} behind!
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Department Leaderboard</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Stall
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Owner
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Votes
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Reviews
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Rating
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {leaderboard?.leaderboard?.map((stall) => (
                  <tr
                    key={stall.id}
                    className={`${
                      stall.isMyStall
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    } transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-2xl font-bold ${getRankColor(stall.rank)}`}>
                        {getRankIcon(stall.rank)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                            {stall.name}
                            {stall.isMyStall && (
                              <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {stall.location}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {stall.ownerName}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {stall.voteCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                        {stall.feedbackCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                        <span className="font-bold text-slate-900 dark:text-white">
                          {stall.roundedRating}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Feedback page - Comments and ratings
  function renderFeedbackPage() {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Feedback & Reviews</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Student feedback and ratings for your stall
          </p>
        </div>

        {/* Feedback Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Reviews</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {myStall?.stats?.totalFeedbacks || 0}
              </p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Average Rating</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {myStall?.stats?.averageRating || '0.0'}
              </p>
              <div className="flex items-center justify-center mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round(parseFloat(myStall?.stats?.averageRating || 0))
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Latest Review</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-2">
                {liveFeedbacks?.feedbacks?.[0] 
                  ? new Date(liveFeedbacks.feedbacks[0].createdAt).toLocaleDateString()
                  : 'No reviews yet'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Recent Feedbacks */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Reviews</h3>
          </div>
          
          <div className="p-6">
            {liveFeedbacks?.feedbacks?.length > 0 ? (
              <div className="space-y-4">
                {liveFeedbacks.feedbacks.slice(0, 10).map((feedback) => (
                  <div
                    key={feedback.id}
                    className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          {feedback.student?.name || 'Anonymous'}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {feedback.student?.regNo} • {feedback.student?.department}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= feedback.rating 
                                  ? 'text-amber-500 fill-amber-500' 
                                  : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {new Date(feedback.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    {feedback.comments && (
                      <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3">
                        <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                          "{feedback.comments}"
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No reviews yet</p>
                <p className="text-sm">Reviews will appear here when students provide feedback</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* QR Code Modal */}
        {showQR && (
          <div className="card shadow-2xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20 border-4 border-blue-500 animate-scaleIn">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Your Stall QR Code</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Display this QR code so students can scan it to give feedback and votes
              </p>
              
              {/* QR Code Display with Error Handling */}
              {myStall?.qrCode ? (
                <div className="bg-white p-6 rounded-2xl inline-block shadow-xl">
                  <img 
                    src={myStall.qrCode} 
                    alt="Stall QR Code" 
                    className="w-80 h-80"
                    onError={(e) => {
                      console.error('QR Code image failed to load:', e);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl inline-block shadow-xl w-80 h-80 flex items-center justify-center">
                  <div className="text-center">
                    <QrCode size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 dark:text-gray-400">
                      QR Code is being generated...
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Please wait a moment
                    </p>
                  </div>
                </div>
              )}
              
              {myStall && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 font-mono bg-gray-100 dark:bg-gray-900 p-3 rounded-lg inline-block">
                  {myStall.name} • {myStall.department}
                </p>
              )}
              
              <div className="flex gap-4 justify-center mt-6">
                <button
                  onClick={() => setShowQR(false)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-colors"
                  title="Refresh to regenerate QR code"
                >
                  <RefreshCw size={16} className="inline mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Rank & Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Current Rank */}
          <div className="card bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-300 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 mb-1">Your Rank</p>
                <p className={`text-5xl font-bold ${getRankColor(leaderboard?.myPosition || 0)}`}>
                  {getRankIcon(leaderboard?.myPosition || 0)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  out of {leaderboard?.totalStalls || 0} stalls
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Trophy className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            {competitionStats?.isLeading && (
              <div className="mt-3 px-3 py-2 bg-yellow-200 dark:bg-yellow-900/50 rounded-lg text-center">
                <p className="text-sm font-bold text-yellow-900 dark:text-yellow-100">🎉 YOU'RE LEADING!</p>
              </div>
            )}
          </div>

          {/* Total Votes */}
          <div className="card bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border-2 border-blue-300 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">Total Votes</p>
                <p className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                  {myStall?.stats?.totalVotes || 0}
                </p>
                {competitionStats?.voteGap > 0 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    -{competitionStats.voteGap} behind leader
                  </p>
                )}
              </div>
              <ThumbsUp className="w-12 h-12 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              {autoRefresh ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Auto-updating every 30s</span>
                </>
              ) : (
                <>
                  <RefreshCw size={12} className="text-gray-400" />
                  <span>Manual refresh only</span>
                </>
              )}
            </div>
          </div>

          {/* Total Feedbacks */}
          <div className="card bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-300 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">Total Feedbacks</p>
                <p className="text-5xl font-bold text-purple-600 dark:text-purple-400">
                  {myStall?.stats?.totalFeedbacks || 0}
                </p>
              </div>
              <MessageSquare className="w-12 h-12 text-purple-600 dark:text-purple-400" />
            </div>
          </div>

          {/* Average Rating */}
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-300 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-1">Avg Rating</p>
                <p className="text-5xl font-bold text-green-600 dark:text-green-400">
                  {myStall?.stats?.averageRating || '0.0'}
                </p>
                <div className="flex items-center mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(parseFloat(myStall?.stats?.averageRating || 0))
                          ? 'text-yellow-500 fill-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <Star className="w-12 h-12 text-yellow-500 fill-yellow-500" />
            </div>
          </div>
        </div>

        {/* Department Leaderboard */}
        <div className="card shadow-2xl border-2 border-yellow-300 dark:border-yellow-600">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Trophy className="text-yellow-600 dark:text-yellow-400" size={28} />
              🏆 {leaderboard?.department} Department Leaderboard
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Activity size={18} className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">LIVE</span>
              </div>
              {autoRefresh && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <RefreshCw size={16} className="text-green-600 dark:text-green-400 animate-spin" />
                  <span className="text-xs font-semibold text-green-900 dark:text-green-100">Auto-refresh: 45s</span>
                </div>
              )}
            </div>
          </div>

          {/* Competition Status Card */}
          {competitionStats && (
            <div className="mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl border-2 border-yellow-300 dark:border-yellow-600">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Position</p>
                  <p className={`text-3xl font-bold ${getRankColor(competitionStats.myRank)}`}>
                    {getRankBadge(competitionStats.myRank)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Votes</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{competitionStats.myVotes}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Leader Votes</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">{competitionStats.leadingVotes}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Gap to Leader</p>
                  <p className={`text-3xl font-bold ${
                    competitionStats.voteGap === 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {competitionStats.voteGap === 0 ? '✓' : `-${competitionStats.voteGap}`}
                  </p>
                </div>
              </div>
              {competitionStats.isLeading ? (
                <div className="mt-4 p-3 bg-yellow-200 dark:bg-yellow-900/50 rounded-lg text-center">
                  <p className="text-lg font-bold text-yellow-900 dark:text-yellow-100 flex items-center justify-center gap-2">
                    <Trophy className="text-yellow-600" size={24} />
                    🎉 YOU ARE THE LEADER! Keep it up! 🎉
                  </p>
                </div>
              ) : competitionStats.voteGap <= 5 ? (
                <div className="mt-4 p-3 bg-orange-200 dark:bg-orange-900/50 rounded-lg text-center">
                  <p className="text-sm font-bold text-orange-900 dark:text-orange-100">
                    🔥 You're close! Only {competitionStats.voteGap} vote{competitionStats.voteGap > 1 ? 's' : ''} behind the leader!
                  </p>
                </div>
              ) : null}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/50 dark:to-orange-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Stall Name</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Owner</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Votes</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Feedbacks</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Avg Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {leaderboard?.leaderboard?.map((stall) => (
                  <tr
                    key={stall.id}
                    className={`${
                      stall.isMyStall
                        ? 'bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 border-l-4 border-blue-600'
                        : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                    } transition-all duration-300`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-2xl">
                          {stall.rank === 1 && '🥇'}
                          {stall.rank === 2 && '🥈'}
                          {stall.rank === 3 && '🥉'}
                          {stall.rank > 3 && `#${stall.rank}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            {stall.name}
                            {stall.isMyStall && (
                              <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">YOU</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{stall.location}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{stall.ownerName}</td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stall.voteCount}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-lg font-semibold text-purple-600 dark:text-purple-400">{stall.feedbackCount}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-gray-900 dark:text-white">{stall.roundedRating}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Stream */}
        <div className="card shadow-xl border-2 border-green-200 dark:border-green-700">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="text-green-600 dark:text-green-400 animate-pulse" size={28} />
            🔴 Live Activity Feed
          </h2>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {recentActivity?.activities?.length > 0 ? (
              recentActivity.activities.map((activity, idx) => (
                <div
                  key={`${activity.type}-${activity.id}-${idx}`}
                  className="p-4 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-xl border-l-4 border-green-500 hover:shadow-lg transition-all duration-300 animate-fadeIn"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {activity.type === 'vote' ? (
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <ThumbsUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      ) : (
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {activity.type === 'vote' ? '👍 New Vote' : '💬 New Feedback'}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>{activity.student?.name}</strong> ({activity.student?.regNo})
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {activity.student?.department} • {activity.student?.year}
                        </p>
                        {activity.type === 'feedback' && (
                          <>
                            <div className="flex items-center mt-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= activity.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            {activity.comment && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 italic bg-gray-100 dark:bg-gray-900 p-2 rounded">
                                "{activity.comment}"
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Activity className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No recent activity yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Rating Distribution */}
          <div className="card shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">📊 Rating Distribution</h3>
            {ratingChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ratingChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="rating" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                No rating data yet
              </div>
            )}
          </div>

          {/* Votes Trend */}
          <div className="card shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">📈 Votes Trend (24 Hours)</h3>
            {liveVotes?.votesTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={liveVotes.votesTrend.reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={(value) => new Date(value).getHours() + ':00'}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} />
                  <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={3} name="Votes" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                No votes trend data yet
              </div>
            )}
          </div>
        </div>

        {/* Live Feedbacks */}
        <div className="card shadow-xl border-2 border-purple-200 dark:border-purple-700">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="text-purple-600 dark:text-purple-400" size={28} />
            💬 Recent Feedbacks
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveFeedbacks?.feedbacks?.slice(0, 10).map((feedback) => (
              <div
                key={feedback.id}
                className="p-4 bg-gradient-to-br from-white to-purple-50 dark:from-gray-700 dark:to-purple-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-700 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{feedback.student?.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {feedback.student?.regNo} • {feedback.student?.department}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= feedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {feedback.comments && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic bg-white dark:bg-gray-900 p-3 rounded-lg mt-2">
                    "{feedback.comments}"
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {new Date(feedback.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
