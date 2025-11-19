import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { 
  MessageSquare, 
  Users, 
  Trophy, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  RefreshCw,
  Search,
  Award
} from 'lucide-react';

export default function TopFeedbackGivers() {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch events for filter
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await adminApi.getEvents({ active: true });
      return response.data?.data || response.data || [];
    },
  });

  // Fetch top feedback givers for selected event
  const { 
    data: feedbackData, 
    refetch: refetchFeedbackData, 
    isLoading: feedbackLoading,
    error: feedbackError 
  } = useQuery({
    queryKey: ['topFeedbackGivers', selectedEvent, currentPage, pageSize],
    queryFn: async () => {
      const params = {
        page: currentPage,
        limit: pageSize
      };
      const response = await adminApi.getTopFeedbackGivers(selectedEvent, params);
      setLastUpdated(new Date());
      return response.data?.data || response.data;
    },
    enabled: !!selectedEvent,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch feedback overview for all events
  const { data: overviewData } = useQuery({
    queryKey: ['feedbackOverview'],
    queryFn: async () => {
      const response = await adminApi.getFeedbackOverview({ limit: 10 });
      return response.data?.data || response.data;
    },
  });

  // Manual refresh
  const handleRefresh = () => {
    if (selectedEvent) {
      refetchFeedbackData();
    }
  };

  // Page navigation
  const goToPage = (page) => {
    setCurrentPage(page);
  };

  const goToPrevious = () => {
    if (feedbackData?.pagination?.hasPrev) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNext = () => {
    if (feedbackData?.pagination?.hasNext) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Export to CSV
  const handleExport = () => {
    if (!feedbackData?.students) return;

    try {
      const csvContent = [
        ['Rank', 'Student Name', 'Registration Number', 'Department', 'Faculty', 'Programme', 'Year', 'Email', 'Phone', 'Feedback Count'].join(','),
        ...feedbackData.students.map(student => [
          student.rank,
          student.name,
          student.regNo || '',
          student.department || '',
          student.faculty || '',
          student.programme || '',
          student.year || '',
          student.email || '',
          student.phone || '',
          student.feedbackCount
        ].map(cell => `"${cell}"`).join(','))
      ].join('\\n');

      const filename = `top-feedback-givers-${feedbackData.event.name}-page-${currentPage}-${new Date().toISOString().split('T')[0]}.csv`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Top Feedback Givers</h2>
          <p className="text-gray-600 mt-1">
            Students ranked by feedback count • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={!selectedEvent}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>

          {feedbackData?.students && (
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="card space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Event Filter */}
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Event</label>
            <select
              value={selectedEvent}
              onChange={(e) => {
                setSelectedEvent(e.target.value);
                setCurrentPage(1); // Reset to first page when changing event
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Event --</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>

          {/* Page Size */}
          <div className="min-w-32">
            <label className="block text-sm font-medium text-gray-700 mb-2">Per Page</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setCurrentPage(1); // Reset to first page when changing page size
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Feedback Overview */}
      {overviewData && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
            Feedback Overview - Top Events
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {overviewData.events?.slice(0, 6).map((eventData, index) => (
              <div key={eventData.event.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 truncate">{eventData.event.name}</h4>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      <div>{eventData.feedbackCount} total feedbacks</div>
                      <div>{eventData.uniqueFeedbackGivers} contributors</div>
                      <div>{eventData.averageFeedbacksPerUser} avg/student</div>
                    </div>
                  </div>
                  <div className="ml-2">
                    <div className="text-lg font-bold text-blue-600">#{index + 1}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {feedbackData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Feedback Givers</p>
                <p className="text-2xl font-bold text-blue-900">
                  {feedbackData.summary?.totalFeedbackGivers || 0}
                </p>
              </div>
              <Users className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="card bg-green-50 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Feedbacks</p>
                <p className="text-2xl font-bold text-green-900">
                  {feedbackData.summary?.totalFeedbacks || 0}
                </p>
              </div>
              <MessageSquare className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div className="card bg-purple-50 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Average per Student</p>
                <p className="text-2xl font-bold text-purple-900">
                  {feedbackData.summary?.averageFeedbacksPerStudent || 0}
                </p>
              </div>
              <Award className="w-10 h-10 text-purple-600" />
            </div>
          </div>

          <div className="card bg-orange-50 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Top Score</p>
                <p className="text-2xl font-bold text-orange-900">
                  {feedbackData.summary?.topFeedbackCount || 0}
                </p>
              </div>
              <Trophy className="w-10 h-10 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Main Data Display */}
      {feedbackLoading ? (
        <div className="card text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading feedback analytics...</p>
        </div>
      ) : feedbackError ? (
        <div className="card text-center py-16 text-red-600">
          <MessageSquare className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <p className="text-lg mb-2">Error loading feedback data</p>
          <p className="text-sm">{feedbackError.message}</p>
        </div>
      ) : feedbackData ? (
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                Top Feedback Givers - {feedbackData.event?.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Showing {feedbackData.summary?.showing || '0'} students
              </p>
            </div>
          </div>

          {/* Students Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Programme</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Feedback Count</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {feedbackData.students?.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                          student.rank <= 3 
                            ? student.rank === 1 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : student.rank === 2 
                                ? 'bg-gray-100 text-gray-800' 
                                : 'bg-orange-100 text-orange-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {student.rank}
                        </span>
                        {student.rank <= 3 && (
                          <Trophy className={`w-4 h-4 ml-2 ${
                            student.rank === 1 ? 'text-yellow-500' : 
                            student.rank === 2 ? 'text-gray-500' : 'text-orange-500'
                          }`} />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-sm text-gray-500">{student.regNo}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{student.department || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{student.faculty || ''}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{student.programme || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{student.year || 'N/A'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 text-sm font-bold bg-green-100 text-green-800 rounded-full">
                        {student.feedbackCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{student.email || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{student.phone || ''}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {feedbackData.pagination && feedbackData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t">
              <div className="text-sm text-gray-600">
                Page {feedbackData.pagination.currentPage} of {feedbackData.pagination.totalPages}
                {' • '}
                {feedbackData.pagination.totalStudents} total students
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={goToPrevious}
                  disabled={!feedbackData.pagination.hasPrev}
                  className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Previous
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {[...Array(Math.min(5, feedbackData.pagination.totalPages))].map((_, index) => {
                    const page = Math.max(1, feedbackData.pagination.currentPage - 2) + index;
                    if (page <= feedbackData.pagination.totalPages) {
                      return (
                        <button
                          key={page}
                          onClick={() => goToPage(page)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg ${
                            page === feedbackData.pagination.currentPage
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={goToNext}
                  disabled={!feedbackData.pagination.hasNext}
                  className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={16} className="ml-1" />
                </button>
              </div>
            </div>
          )}

          {(!feedbackData.students || feedbackData.students.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">No feedback givers found for this event</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-16 text-gray-500">
          <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg">Select an event to view top feedback givers</p>
        </div>
      )}
    </div>
  );
}