import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { 
  Activity,
  Users,
  BarChart3,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  RefreshCw,
  Calendar,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  Target,
  Timer,
  Search,
  Filter
} from 'lucide-react';

const AdminScanLogManagement = () => {
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedVolunteer, setSelectedVolunteer] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [showPerformance, setShowPerformance] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch events for filtering
  const { data: eventsData } = useQuery({
    queryKey: ['admin-events'],
    queryFn: () => adminApi.getEvents(),
  });

  // Fetch scan log analytics
  const { 
    data: analytics, 
    isLoading: analyticsLoading, 
    refetch: refetchAnalytics 
  } = useQuery({
    queryKey: ['admin-scan-analytics', timeRange, selectedVolunteer, selectedEvent],
    queryFn: () => adminApi.getScanLogAnalytics({ 
      timeRange,
      volunteerId: selectedVolunteer || undefined,
      eventId: selectedEvent || undefined
    }),
    refetchInterval: 30000,
  });

  // Fetch volunteer performance data
  const { 
    data: performanceData, 
    isLoading: performanceLoading 
  } = useQuery({
    queryKey: ['volunteer-performance', timeRange],
    queryFn: () => adminApi.getVolunteerPerformance({ timeRange }),
    enabled: showPerformance,
  });

  // Fetch detailed logs
  const { 
    data: detailedLogs, 
    isLoading: logsLoading 
  } = useQuery({
    queryKey: ['detailed-scan-logs', selectedEvent, selectedVolunteer, searchTerm],
    queryFn: () => adminApi.getDetailedScanLogs({ 
      eventId: selectedEvent || undefined,
      volunteerId: selectedVolunteer || undefined,
      limit: 100
    }),
  });

  const handleRefreshAll = () => {
    refetchAnalytics();
  };

  const handleExportLogs = () => {
    adminApi.exportScanLogs({ 
      timeRange,
      volunteerId: selectedVolunteer || undefined,
      eventId: selectedEvent || undefined
    }).then(response => {
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scan_logs_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
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
                <h1 className="text-2xl font-bold text-gray-900">Scan Log Management</h1>
                <p className="text-gray-600">Monitor volunteer scanning activity and system performance</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPerformance(!showPerformance)}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  showPerformance 
                    ? 'bg-purple-600 text-white' 
                    : 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                }`}
              >
                <Award className="w-4 h-4" />
                Performance
              </button>
              
              <button
                onClick={handleRefreshAll}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>

              <button
                onClick={handleExportLogs}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 flex flex-wrap items-center gap-4">
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
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Events</option>
              {eventsData?.data?.data?.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search volunteers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Analytics Overview */}
        {analytics?.data?.data && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="text-xs font-medium text-blue-600">TOTAL</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">{analytics.data.data.totalScans}</p>
                <p className="text-xs text-blue-600">Total Scans</p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-medium text-green-600">SUCCESS</span>
                </div>
                <p className="text-2xl font-bold text-green-900">{analytics.data.data.scansByStatus?.success || 0}</p>
                <p className="text-xs text-green-600">Successful</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-xs font-medium text-red-600">FAILED</span>
                </div>
                <p className="text-2xl font-bold text-red-900">{analytics.data.data.scansByStatus?.failed || 0}</p>
                <p className="text-xs text-red-600">Failed</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                  <span className="text-xs font-medium text-purple-600">CHECK-IN</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">{analytics.data.data.scansByType?.['check-in'] || 0}</p>
                <p className="text-xs text-purple-600">Check-ins</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Timer className="w-5 h-5 text-orange-600" />
                  <span className="text-xs font-medium text-orange-600">CHECK-OUT</span>
                </div>
                <p className="text-2xl font-bold text-orange-900">{analytics.data.data.scansByType?.['check-out'] || 0}</p>
                <p className="text-xs text-orange-600">Check-outs</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs font-medium text-indigo-600">VOLUNTEERS</span>
                </div>
                <p className="text-2xl font-bold text-indigo-900">{Object.keys(analytics.data.data.scansByVolunteer || {}).length}</p>
                <p className="text-xs text-indigo-600">Active</p>
              </div>
            </div>

            {/* Volunteer Performance */}
            {showPerformance && (
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-6 border-b bg-purple-50">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Volunteer Performance Rankings
                  </h3>
                  <p className="text-gray-600 mt-1">Performance metrics for the selected time period</p>
                </div>

                {performanceLoading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading performance data...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volunteer</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Scans</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Scans/Hour</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Working Hours</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {performanceData?.data?.data?.map((volunteer, index) => (
                          <tr key={volunteer.volunteer.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                    <span className="text-purple-600 font-bold text-sm">#{index + 1}</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{volunteer.volunteer.name}</p>
                                  <p className="text-sm text-gray-500">{volunteer.volunteer.role}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-lg font-bold text-gray-900">{volunteer.metrics.totalScans}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${
                                volunteer.metrics.successRate >= 95 
                                  ? 'bg-green-100 text-green-800'
                                  : volunteer.metrics.successRate >= 85
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {volunteer.metrics.successRate}%
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="font-medium text-gray-900">{volunteer.metrics.scansPerHour}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className="text-gray-600">{volunteer.metrics.workingHours}h</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Recent Scan Logs */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-6 border-b bg-gray-50">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Scan Activity
                </h3>
                <p className="text-gray-600 mt-1">Latest scanning activity across all volunteers</p>
              </div>

              {logsLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading scan logs...</p>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Volunteer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {detailedLogs?.data?.data?.slice(0, 20).map((log) => (
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
                                <p className="text-gray-500">{log.user.regNo} • {log.user.department}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400">N/A</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.scanner ? (
                              <div>
                                <p className="font-medium">{log.scanner.name}</p>
                                <p className="text-gray-500">{log.scanner.role}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400">System</span>
                            )}
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
          </>
        )}
      </div>
    </div>
  );
};

export default AdminScanLogManagement;