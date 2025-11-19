import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { volunteerApi } from '../../services/api';
import { 
  Activity,
  BarChart3,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  RefreshCw,
  Filter,
  Calendar,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  Target,
  Timer,
  Award
} from 'lucide-react';

const VolunteerScanManagement = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [filterType, setFilterType] = useState('all');
  const [showDetails, setShowDetails] = useState(false);
  const [selectedScanType, setSelectedScanType] = useState('');

  // Fetch scan analytics
  const { 
    data: analytics, 
    isLoading: analyticsLoading, 
    refetch: refetchAnalytics 
  } = useQuery({
    queryKey: ['volunteer-scan-analytics', timeRange, filterType],
    queryFn: () => volunteerApi.getScanAnalytics({ 
      timeRange, 
      scanType: filterType === 'all' ? undefined : filterType 
    }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch detailed scan logs
  const { 
    data: detailedLogs, 
    isLoading: logsLoading, 
    refetch: refetchLogs 
  } = useQuery({
    queryKey: ['volunteer-detailed-logs', timeRange, selectedScanType],
    queryFn: () => volunteerApi.getDetailedScanLogs({ 
      timeRange,
      scanType: selectedScanType || undefined,
      limit: 100
    }),
    enabled: showDetails,
  });

  // Fetch real-time activity
  const { 
    data: realTimeData, 
    refetch: refetchRealTime 
  } = useQuery({
    queryKey: ['volunteer-real-time-scans'],
    queryFn: () => volunteerApi.getRealTimeActivity(),
    refetchInterval: 5000, // Refresh every 5 seconds for real-time
  });

  const handleRefreshAll = () => {
    refetchAnalytics();
    refetchLogs();
    refetchRealTime();
  };

  const getScanTypeColor = (type) => {
    const colors = {
      'check-in': 'text-green-600 bg-green-50 border-green-200',
      'check-out': 'text-blue-600 bg-blue-50 border-blue-200',
      'vote': 'text-purple-600 bg-purple-50 border-purple-200',
      'feedback': 'text-orange-600 bg-orange-50 border-orange-200'
    };
    return colors[type] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  if (analyticsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading scan analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Scan Management</h1>
                <p className="text-gray-600">Monitor your scanning activity and performance</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="1h">Last Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Scans</option>
                <option value="check-in">Check-ins</option>
                <option value="check-out">Check-outs</option>
                <option value="vote">Votes</option>
                <option value="feedback">Feedback</option>
              </select>
              
              <button
                onClick={handleRefreshAll}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Overview */}
        {analytics?.data && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600">TOTAL</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{analytics.data.totalScans}</p>
                <p className="text-xs text-blue-600">Total Scans</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-medium text-green-600">SUCCESS</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{analytics.data.scansByStatus?.success || 0}</p>
                <p className="text-xs text-green-600">Successful</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-xs font-medium text-red-600">FAILED</span>
                </div>
                <p className="text-2xl font-bold text-red-900">{analytics.data.scansByStatus?.failed || 0}</p>
                <p className="text-xs text-red-600">Failed</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                  <span className="text-xs font-medium text-purple-600">CHECK-IN</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{analytics.data.scansByType?.['check-in'] || 0}</p>
                <p className="text-xs text-purple-600">Check-ins</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Timer className="w-5 h-5 text-orange-600" />
                  <span className="text-xs font-medium text-orange-600">CHECK-OUT</span>
                </div>
                <p className="text-2xl font-bold text-orange-900">{analytics.data.scansByType?.['check-out'] || 0}</p>
                <p className="text-xs text-orange-600">Check-outs</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs font-medium text-indigo-600">ACTIVE</span>
                </div>
                <p className="text-2xl font-bold text-indigo-900">{analytics.data.currentlyCheckedIn || 0}</p>
                <p className="text-xs text-indigo-600">Checked In</p>
              </div>
            </div>

            {/* Hourly Activity Chart */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Hourly Activity
                </h3>
                <span className="text-sm text-gray-500">Last 24 Hours</span>
              </div>
              
              <div className="grid grid-cols-12 gap-2 h-32">
                {analytics.data.hourlyTrends?.map((trend, index) => {
                  const maxCount = Math.max(...analytics.data.hourlyTrends.map(t => t.count));
                  const height = maxCount > 0 ? (trend.count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex flex-col items-center justify-end">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-sm min-h-1"
                        style={{ height: `${height}%` }}
                        title={`${trend.hour}:00 - ${trend.count} scans`}
                      ></div>
                      <span className="text-xs text-gray-500 mt-1">{trend.hour}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-6 border-b bg-gray-50 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </h3>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {showDetails ? 'Hide' : 'View'} Details
                </button>
              </div>

              <div className="divide-y divide-gray-200">
                {analytics.data.recentActivity?.slice(0, 10).map((scan) => (
                  <div key={scan.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(scan.status)}
                        
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getScanTypeColor(scan.scanType)}`}>
                              {scan.scanType}
                            </span>
                            {scan.user && (
                              <span className="font-medium text-gray-900">{scan.user.name}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            {scan.user?.regNo && (
                              <span>Reg: {scan.user.regNo}</span>
                            )}
                            {scan.user?.department && (
                              <span>{scan.user.department}</span>
                            )}
                            {scan.event?.name && (
                              <span>Event: {scan.event.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(scan.scanTime).toLocaleTimeString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(scan.scanTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Logs */}
            {showDetails && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-6 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Detailed Scan Logs</h3>
                    
                    <select
                      value={selectedScanType}
                      onChange={(e) => setSelectedScanType(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Types</option>
                      <option value="check-in">Check-ins</option>
                      <option value="check-out">Check-outs</option>
                      <option value="vote">Votes</option>
                      <option value="feedback">Feedback</option>
                    </select>
                  </div>
                </div>

                {logsLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading detailed logs...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {detailedLogs?.data?.data?.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <div>
                                <p className="font-medium">{new Date(log.scanTime).toLocaleTimeString()}</p>
                                <p className="text-gray-500">{new Date(log.scanTime).toLocaleDateString()}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getScanTypeColor(log.scanType)}`}>
                                {log.scanType}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(log.status)}
                                <span className="text-sm text-gray-900 capitalize">{log.status}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {log.user ? (
                                <div>
                                  <p className="font-medium">{log.user.name}</p>
                                  <p className="text-gray-500">{log.user.regNo}</p>
                                </div>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {log.user?.department || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {log.event?.name || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Performance Summary */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <Award className="w-5 h-5" />
                Performance Summary
              </h3>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {analytics.data.totalScans > 0 ? 
                      Math.round((analytics.data.scansByStatus?.success || 0) / analytics.data.totalScans * 100) : 0}%
                  </p>
                  <p className="text-sm text-gray-600">Success Rate</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round((analytics.data.totalScans / Math.max(timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 1, 1)) * 10) / 10}
                  </p>
                  <p className="text-sm text-gray-600">Scans per Hour</p>
                </div>
                
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Users className="w-8 h-8 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{analytics.data.topStudents?.length || 0}</p>
                  <p className="text-sm text-gray-600">Unique Students</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VolunteerScanManagement;