import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { 
  Users, 
  Calendar, 
  Scan, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

export default function VolunteerScanTracking() {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedVolunteer, setSelectedVolunteer] = useState('');
  const [timeRange, setTimeRange] = useState('today');

  // Fetch events
  const { data: events = [] } = useQuery({
    queryKey: ['adminEvents'],
    queryFn: async () => {
      const response = await adminApi.getEvents();
      return response.data?.data || response.data || [];
    },
  });

  // Fetch volunteers
  const { data: volunteers = [] } = useQuery({
    queryKey: ['adminVolunteers'],
    queryFn: async () => {
      const response = await adminApi.getVolunteers();
      return response.data?.data?.volunteers || response.data || [];
    },
  });

  // Fetch scan analytics
  const { data: scanData = {}, isLoading, refetch } = useQuery({
    queryKey: ['volunteerScanTracking', selectedEvent, selectedVolunteer, timeRange],
    queryFn: async () => {
      const params = {};
      if (selectedEvent) params.eventId = selectedEvent;
      if (selectedVolunteer) params.volunteerId = selectedVolunteer;
      if (timeRange === 'today') {
        params.startDate = new Date().toISOString().split('T')[0];
      } else if (timeRange === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.startDate = weekAgo.toISOString().split('T')[0];
      }
      
      const response = await adminApi.getVolunteerScanAnalytics(params);
      return response.data?.data || response.data || {};
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'all': return 'All Time';
      default: return 'Today';
    }
  };

  const downloadReport = () => {
    const csvContent = [
      'Volunteer Name,Volunteer ID,Event,Total Scans,Last Scan Time,Status',
      ...(scanData.volunteerStats || []).map(stat => 
        `${stat.volunteerName},${stat.volunteerId},${stat.eventName || 'All Events'},${stat.scanCount},${stat.lastScanTime || 'Never'},${stat.isActive ? 'Active' : 'Inactive'}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volunteer-scan-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Volunteer Scan Tracking</h1>
              <p className="text-gray-600 mt-1">Monitor volunteer scanning activity across events</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={downloadReport}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Event</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Events</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Volunteer</label>
            <select
              value={selectedVolunteer}
              onChange={(e) => setSelectedVolunteer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Volunteers</option>
              {volunteers.map((volunteer) => (
                <option key={volunteer.id} value={volunteer.id}>
                  {volunteer.name} ({volunteer.volunteerId})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Volunteers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {scanData.summary?.activeVolunteers || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Scan className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Scans ({getTimeRangeLabel()})</p>
              <p className="text-2xl font-semibold text-gray-900">
                {scanData.summary?.totalScans || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Events Covered</p>
              <p className="text-2xl font-semibold text-gray-900">
                {scanData.summary?.eventsCovered || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Scans/Volunteer</p>
              <p className="text-2xl font-semibold text-gray-900">
                {scanData.summary?.averageScansPerVolunteer || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Volunteer Performance Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Volunteer Performance</h3>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Volunteer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scans ({getTimeRangeLabel()})
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Scan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {scanData.volunteerStats && scanData.volunteerStats.length > 0 ? (
                  scanData.volunteerStats.map((volunteer) => (
                    <tr key={volunteer.volunteerId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-indigo-600">
                                {volunteer.volunteerName?.charAt(0)?.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {volunteer.volunteerName}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {volunteer.volunteerId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {volunteer.currentEvent || 'Not assigned'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {volunteer.scanCount || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {volunteer.lastScanTime 
                            ? new Date(volunteer.lastScanTime).toLocaleString()
                            : 'Never'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          volunteer.isOnline
                            ? 'bg-green-100 text-green-800'
                            : volunteer.lastScanTime && 
                              new Date() - new Date(volunteer.lastScanTime) < 3600000 // 1 hour
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                            volunteer.isOnline
                              ? 'bg-green-400'
                              : volunteer.lastScanTime && 
                                new Date() - new Date(volunteer.lastScanTime) < 3600000
                              ? 'bg-yellow-400'
                              : 'bg-red-400'
                          }`}></div>
                          {volunteer.isOnline 
                            ? 'Online' 
                            : volunteer.lastScanTime && 
                              new Date() - new Date(volunteer.lastScanTime) < 3600000
                            ? 'Recently Active'
                            : 'Offline'
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                volunteer.scanCount >= 50 
                                  ? 'bg-green-500'
                                  : volunteer.scanCount >= 20
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ 
                                width: `${Math.min(100, (volunteer.scanCount / 50) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="ml-2 text-xs text-gray-500">
                            {volunteer.scanCount >= 50 ? 'Excellent' :
                             volunteer.scanCount >= 20 ? 'Good' : 'Low'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-sm font-medium text-gray-900 mb-2">No scan data found</h3>
                      <p className="text-sm">Try adjusting your filters or check back later.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Scan Activity</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {scanData.recentActivity && scanData.recentActivity.length > 0 ? (
            scanData.recentActivity.slice(0, 10).map((activity, index) => (
              <div key={index} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`h-2 w-2 rounded-full mr-3 ${
                      activity.type === 'student' ? 'bg-green-500' : 'bg-blue-500'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {activity.volunteerName} scanned {activity.type === 'student' ? 'student' : 'stall'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {activity.studentName || activity.stallName} • {activity.eventName}
                      </p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">
              <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>No recent activity found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}