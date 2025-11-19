import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { stallOwnerApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Store, TrendingUp, TrendingDown, Trophy, Star, MessageSquare, 
  ThumbsUp, QrCode, Users, Award, Clock, ArrowUp, ArrowDown,
  Minus, BarChart3, Activity, LogOut, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function StallOwnerDashboard() {
  const navigate = useNavigate();
  const [stallData, setStallData] = useState(null);
  const [previousRank, setPreviousRank] = useState(null);
  const [previousLeaderboard, setPreviousLeaderboard] = useState([]);
  const [showQR, setShowQR] = useState(false);
  const [rankChanges, setRankChanges] = useState({}); // Track position changes for each stall
  const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(true); // User can toggle live updates
  const [lastUpdated, setLastUpdated] = useState(new Date());
  
  // Refs to track previous counts for notifications (to avoid stale closures)
  const prevVoteCountRef = useRef(0);
  const prevFeedbackCountRef = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem('stallData');
    if (stored) {
      setStallData(JSON.parse(stored));
    } else {
      navigate('/stall-owner/login');
    }
  }, [navigate]);

  // Fetch my stall details with QR code (refresh every 2 minutes or when manually refreshed)
  const { data: myStall, isLoading: loadingStall, refetch: refetchMyStall } = useQuery({
    queryKey: ['myStall'],
    queryFn: async () => {
      const response = await stallOwnerApi.getMyStall();
      setLastUpdated(new Date());
      return response.data.data.stall;
    },
    refetchInterval: liveUpdatesEnabled ? 120000 : false, // Refresh every 2 minutes if live updates enabled
    enabled: !!stallData,
  });

  // Smart polling strategy: Fast initial updates, then slow down if no changes
  const [pollingInterval, setPollingInterval] = useState(10000); // Start with 10 seconds
  const dataChangeDetected = useRef(false);
  
  // Reset activity detection after 2 minutes of no changes
  useEffect(() => {
    if (dataChangeDetected.current) {
      const resetTimer = setTimeout(() => {
        dataChangeDetected.current = false;
      }, 120000); // 2 minutes
      return () => clearTimeout(resetTimer);
    }
  }, [dataChangeDetected.current]);

  // Fetch department leaderboard (smart polling - adjusts based on activity)
  const { data: leaderboard, isLoading: loadingLeaderboard, refetch: refetchLeaderboard } = useQuery({
    queryKey: ['departmentLeaderboard'],
    queryFn: async () => {
      const response = await stallOwnerApi.getDepartmentLeaderboard();
      setLastUpdated(new Date());
      return response.data.data;
    },
    refetchInterval: liveUpdatesEnabled ? pollingInterval : false, // Dynamic polling interval
    enabled: !!stallData,
    onSuccess: (data) => {
      // Detect if data actually changed
      const hasChanges = previousRank !== null && previousRank !== data.myPosition;
      
      if (hasChanges) {
        dataChangeDetected.current = true;
        // Reset to faster polling when changes detected
        setPollingInterval(10000); // 10 seconds
        
        // Track rank changes for my stall
        if (data.myPosition < previousRank) {
          toast.success(`📈 You moved up to rank #${data.myPosition}!`, { duration: 5000, icon: '🎉' });
        } else {
          toast.error(`📉 You dropped to rank #${data.myPosition}`, { duration: 5000, icon: '⚠️' });
        }
      } else if (!dataChangeDetected.current) {
        // Gradually slow down polling if no changes
        setPollingInterval(prev => Math.min(prev * 1.2, 60000)); // Max 1 minute
      }
      
      setPreviousRank(data.myPosition);
      setLastUpdated(new Date());

      // Track position changes for all stalls in leaderboard
      if (previousLeaderboard.length > 0 && data.leaderboard) {
        const changes = {};
        data.leaderboard.forEach((stall) => {
          const prevStall = previousLeaderboard.find(s => s.id === stall.id);
          if (prevStall) {
            const positionChange = prevStall.rank - stall.rank; // Positive = moved up, Negative = moved down
            if (positionChange !== 0) {
              changes[stall.id] = positionChange;
            }
          }
        });
        setRankChanges(changes);

        // Clear rank change indicators after 10 seconds
        if (Object.keys(changes).length > 0) {
          setTimeout(() => {
            setRankChanges({});
          }, 10000);
        }
      }

      // Store current leaderboard for next comparison
      if (data.leaderboard) {
        setPreviousLeaderboard(data.leaderboard);
      }
    },
  });

  // Fetch competition stats (refresh every 1 minute when live updates enabled)
  const { data: competitionStats, refetch: refetchCompetitionStats } = useQuery({
    queryKey: ['competitionStats'],
    queryFn: async () => {
      const response = await stallOwnerApi.getCompetitionStats();
      setLastUpdated(new Date());
      return response.data.data;
    },
    refetchInterval: liveUpdatesEnabled ? 60000 : false, // Refresh every 1 minute if live updates enabled
    enabled: !!stallData,
  });

  // Fetch live votes (smart polling based on activity)
  const { data: liveVotes, refetch: refetchVotes } = useQuery({
    queryKey: ['liveVotes'],
    queryFn: async () => {
      const response = await stallOwnerApi.getLiveVotes({ limit: 20 });
      setLastUpdated(new Date());
      return response.data.data;
    },
    refetchInterval: liveUpdatesEnabled ? pollingInterval : false, // Dynamic polling
    enabled: !!stallData,
    onSuccess: (data) => {
      // Show notification for new votes using ref to avoid stale closure
      const currentCount = data.totalVotes || 0;
      if (prevVoteCountRef.current > 0 && currentCount > prevVoteCountRef.current) {
        const newVotesCount = currentCount - prevVoteCountRef.current;
        dataChangeDetected.current = true;
        setPollingInterval(10000); // Speed up polling when activity detected
        toast.success(`🎉 ${newVotesCount} new vote${newVotesCount > 1 ? 's' : ''}!`, {
          duration: 3000,
          icon: '🗳️',
        });
      }
      prevVoteCountRef.current = currentCount;
    },
  });

  // Fetch live feedbacks (smart polling based on activity)
  const { data: liveFeedbacks, refetch: refetchFeedbacks } = useQuery({
    queryKey: ['liveFeedbacks'],
    queryFn: async () => {
      const response = await stallOwnerApi.getLiveFeedbacks({ limit: 20 });
      setLastUpdated(new Date());
      return response.data.data;
    },
    refetchInterval: liveUpdatesEnabled ? pollingInterval : false, // Dynamic polling
    enabled: !!stallData,
    onSuccess: (data) => {
      // Show notification for new feedbacks using ref to avoid stale closure
      const currentCount = data.stats?.totalFeedbacks || data.totalFeedbacks || 0;
      if (prevFeedbackCountRef.current > 0 && currentCount > prevFeedbackCountRef.current) {
        const newFeedbacksCount = currentCount - prevFeedbackCountRef.current;
        dataChangeDetected.current = true;
        setPollingInterval(10000); // Speed up polling when activity detected
        toast.success(`💬 ${newFeedbacksCount} new feedback${newFeedbacksCount > 1 ? 's' : ''}!`, {
          duration: 3000,
          icon: '⭐',
        });
      }
      prevFeedbackCountRef.current = currentCount;
    },
  });

  // Fetch recent activity (refresh every 1 minute when live updates enabled)
  const { data: recentActivity, refetch: refetchRecentActivity } = useQuery({
    queryKey: ['recentActivity'],
    queryFn: async () => {
      const response = await stallOwnerApi.getRecentActivity({ limit: 15 });
      setLastUpdated(new Date());
      return response.data.data;
    },
    refetchInterval: liveUpdatesEnabled ? 60000 : false, // Refresh every 1 minute if live updates enabled
    enabled: !!stallData,
  });

  // Manual refresh function
  const handleManualRefresh = async () => {
    setLastUpdated(new Date());
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
        loading: 'Refreshing dashboard data...',
        success: '✅ Dashboard updated successfully!',
        error: '❌ Failed to refresh data'
      }
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('stallData');
    localStorage.removeItem('userRole');
    toast.success('Logged out successfully');
    navigate('/stall-owner/login');
  };

  const getRankIcon = (currentRank, stallId) => {
    const change = rankChanges[stallId];
    if (change > 0) return <ArrowUp className="text-green-500 animate-bounce" size={24} />;
    if (change < 0) return <ArrowDown className="text-red-500 animate-bounce" size={24} />;
    if (!previousRank || currentRank === previousRank) return <Minus className="text-gray-400" size={24} />;
    if (currentRank < previousRank) return <ArrowUp className="text-green-500" size={24} />;
    return <ArrowDown className="text-red-500" size={24} />;
  };

  const getPositionChangeText = (stallId) => {
    const change = rankChanges[stallId];
    if (!change) return null;
    if (change > 0) return `+${change}`;
    return change.toString();
  };

  const getPositionChangeBadge = (stallId) => {
    const change = rankChanges[stallId];
    if (!change) return null;
    
    if (change > 0) {
      return (
        <span className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-bold rounded-full animate-pulse">
          ↑ {change}
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="ml-2 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-bold rounded-full animate-pulse">
          ↓ {Math.abs(change)}
        </span>
      );
    }
    return null;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'text-yellow-600 dark:text-yellow-400';
    if (rank === 2) return 'text-gray-600 dark:text-gray-400';
    if (rank === 3) return 'text-orange-600 dark:text-orange-400';
    return 'text-blue-600 dark:text-blue-400';
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loadingStall || loadingLeaderboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900/20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // Rating distribution chart data
  const ratingChartData = liveFeedbacks?.ratingDistribution?.map(r => ({
    rating: `${r.rating} ⭐`,
    count: r.count
  })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-lg border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg">
                <Store className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {myStall?.name || stallData?.name}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {myStall?.department || stallData?.department} • {myStall?.ownerName || stallData?.ownerName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {liveUpdatesEnabled ? (
                    <>
                      🟢 Live updates enabled • Polling every {Math.round(pollingInterval/1000)}s • Last updated: {lastUpdated.toLocaleTimeString()}
                      {dataChangeDetected.current && <span className="text-green-600 font-semibold"> • Activity detected!</span>}
                    </>
                  ) : (
                    <>
                      🔴 Live updates disabled • Use refresh button to update data
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Live Updates Toggle */}
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Activity size={16} className={liveUpdatesEnabled ? 'text-green-500' : 'text-gray-400'} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Live Updates</span>
                <button
                  onClick={() => setLiveUpdatesEnabled(!liveUpdatesEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    liveUpdatesEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      liveUpdatesEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Manual Refresh Button */}
              <button
                onClick={handleManualRefresh}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
                title={`Last updated: ${lastUpdated.toLocaleTimeString()}`}
              >
                <RefreshCw size={16} />
                Refresh
              </button>

              <button
                onClick={() => setShowQR(!showQR)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <QrCode size={20} />
                Show QR Code
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

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
                  {getRankBadge(leaderboard?.myPosition || 0)}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  out of {leaderboard?.totalStalls || 0} stalls
                </p>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Trophy className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
                {getRankIcon(leaderboard?.myPosition || 0, myStall?.id)}
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
              <RefreshCw size={12} className="animate-spin" />
              <span>Live updates every 5 sec</span>
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
                <Activity size={18} className="text-blue-600 dark:text-blue-400 animate-pulse" />
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">LIVE</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <RefreshCw size={16} className="text-green-600 dark:text-green-400 animate-spin" />
                <span className="text-xs font-semibold text-green-900 dark:text-green-100">Auto-refresh: 5s</span>
              </div>
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
                        : rankChanges[stall.id]
                        ? rankChanges[stall.id] > 0
                          ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 animate-pulse'
                          : 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 animate-pulse'
                        : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                    } transition-all duration-500`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-2xl">
                          {stall.rank === 1 && '🥇'}
                          {stall.rank === 2 && '🥈'}
                          {stall.rank === 3 && '🥉'}
                          {stall.rank > 3 && `#${stall.rank}`}
                        </span>
                        {rankChanges[stall.id] && (
                          <div className="flex flex-col items-center">
                            {rankChanges[stall.id] > 0 ? (
                              <ArrowUp className="text-green-600 dark:text-green-400 animate-bounce" size={20} />
                            ) : (
                              <ArrowDown className="text-red-600 dark:text-red-400 animate-bounce" size={20} />
                            )}
                            <span className={`text-xs font-bold ${
                              rankChanges[stall.id] > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {rankChanges[stall.id] > 0 ? '+' : ''}{rankChanges[stall.id]}
                            </span>
                          </div>
                        )}
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
                            {getPositionChangeBadge(stall.id)}
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
                          <strong>{activity.student?.name}</strong> ({activity.student?.rollNumber})
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
                      {feedback.student?.rollNumber} • {feedback.student?.department}
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
                {feedback.comment && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic bg-white dark:bg-gray-900 p-3 rounded-lg mt-2">
                    "{feedback.comment}"
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
