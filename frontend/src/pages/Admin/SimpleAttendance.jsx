import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { Clock, Users, Download, RefreshCw, Calendar, User, TrendingUp, AlertTriangle, Award, Trophy } from 'lucide-react';
import AttendanceSummaryTable from '../../components/attendance/AttendanceSummaryTable';
import { WarningAlert, StatusBadge } from '../../components/ui/UIComponents';

export default function SimpleAttendance() {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [viewMode, setViewMode] = useState('comprehensive'); // 'comprehensive' or 'rankings'
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [rankingCategory, setRankingCategory] = useState('totalTime'); // 'totalTime', 'validTime', 'consistency'

  // Fetch events for filter
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await adminApi.getEvents();
      return response.data?.data || response.data || [];
    },
  });

  // Fetch comprehensive attendance data for rankings
  const { data: attendanceRankings, refetch: refetchRankings, isLoading: rankingsLoading } = useQuery({
    queryKey: ['attendanceRankings', selectedEvent, rankingCategory],
    queryFn: async () => {
      if (!selectedEvent) return null;
      
      const response = await adminApi.getEventAttendanceSummary(selectedEvent, {
        page: 1,
        limit: 100, // Get top 100 for rankings
        showOnlyProblematic: false
      });
      
      const data = response.data?.data;
      if (!data) return null;

      // Sort based on ranking category
      let sortedSummaries = [...data.summaries];
      
      switch (rankingCategory) {
        case 'totalTime':
          sortedSummaries.sort((a, b) => 
            (b.totalValidDuration + b.totalNullifiedDuration) - (a.totalValidDuration + a.totalNullifiedDuration)
          );
          break;
        case 'validTime':
          sortedSummaries.sort((a, b) => b.totalValidDuration - a.totalValidDuration);
          break;
        case 'consistency':
          sortedSummaries.sort((a, b) => {
            const aScore = a.hasImproperCheckouts ? 0 : a.totalValidDuration;
            const bScore = b.hasImproperCheckouts ? 0 : b.totalValidDuration;
            return bScore - aScore;
          });
          break;
        default:
          break;
      }

      return {
        ...data,
        summaries: sortedSummaries,
        rankedBy: rankingCategory
      };
    },
    enabled: !!selectedEvent && viewMode === 'rankings',
    refetchInterval: 60000, // Refresh every minute for rankings
  });

  // Auto-select first active event
  useEffect(() => {
    if (events.length > 0 && !selectedEvent) {
      const activeEvent = events.find(e => e.isActive) || events[0];
      setSelectedEvent(activeEvent.id);
    }
  }, [events, selectedEvent]);

  // Manual refresh
  const handleRefresh = () => {
    if (viewMode === 'rankings') {
      refetchRankings();
    }
    setLastUpdated(new Date());
  };

  // Export rankings to CSV
  const handleExportRankings = () => {
    if (!attendanceRankings?.summaries) return;

    const csvContent = [
      ['Rank', 'Student Name', 'Reg Number', 'Department', 'Total Time', 'Valid Time', 'Nullified Time', 'Sessions', 'Status', 'Issues'].join(','),
      ...attendanceRankings.summaries.map((summary, index) => [
        index + 1,
        summary.student.name,
        summary.student.regNo,
        summary.student.department || 'N/A',
        summary.totalValidDurationFormatted,
        summary.totalValidDurationFormatted,
        summary.totalNullifiedDurationFormatted,
        summary.totalSessions,
        summary.hasImproperCheckouts ? 'Has Issues' : 'Clean',
        summary.hasImproperCheckouts ? 'Improper Checkouts' : 'None'
      ].map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const event = events.find(e => e.id.toString() === selectedEvent);
    const filename = `attendance-rankings-${event?.name || 'event'}-${rankingCategory}-${new Date().toISOString().split('T')[0]}.csv`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getRankingTitle = () => {
    switch (rankingCategory) {
      case 'totalTime': return 'Total Attendance Time Rankings';
      case 'validTime': return 'Valid Attendance Time Rankings';
      case 'consistency': return 'Attendance Consistency Rankings';
      default: return 'Attendance Rankings';
    }
  };

  const getRankingDescription = () => {
    switch (rankingCategory) {
      case 'totalTime': return 'Ranked by total time spent (including nullified sessions)';
      case 'validTime': return 'Ranked by valid attendance time only';
      case 'consistency': return 'Ranked by consistency (students with clean records ranked higher)';
      default: return '';
    }
  };

  const getEventStatus = (event) => {
    if (!event) return 'unknown';
    const now = new Date();
    const startDate = new Date(event.startTime);
    const endDate = new Date(event.endTime);

    if (event.manuallyEnded) return 'ended';
    if (event.manuallyStarted) return 'live';
    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'ended';
    return 'ongoing';
  };

  const selectedEventData = events.find(e => e.id.toString() === selectedEvent);
  const eventStatus = getEventStatus(selectedEventData);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Comprehensive Attendance Analytics</h2>
          <p className="text-gray-600 mt-1">
            Advanced attendance tracking with nullification and ranking system • Last updated: {lastUpdated.toLocaleTimeString()}
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

          {viewMode === 'rankings' && attendanceRankings && (
            <button
              onClick={handleExportRankings}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={16} />
              <span>Export Rankings</span>
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="card space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* View Mode */}
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="comprehensive">Comprehensive View</option>
              <option value="rankings">Student Rankings</option>
            </select>
          </div>

          {/* Event Filter */}
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Event</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Event --</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} {event.isActive ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Ranking Category (only for rankings mode) */}
          {viewMode === 'rankings' && (
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ranking Category</label>
              <select
                value={rankingCategory}
                onChange={(e) => setRankingCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="totalTime">Total Attendance Time</option>
                <option value="validTime">Valid Time Only</option>
                <option value="consistency">Consistency Score</option>
              </select>
            </div>
          )}
        </div>

        {/* Event Status */}
        {selectedEventData && (
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <div>
                <div className="font-medium text-gray-900">{selectedEventData.name}</div>
                <div className="text-sm text-gray-500">
                  {new Date(selectedEventData.startTime).toLocaleDateString()} - {new Date(selectedEventData.endTime).toLocaleDateString()}
                </div>
              </div>
            </div>
            <StatusBadge status={eventStatus} />
          </div>
        )}
      </div>

      {/* Event Status Alerts */}
      {selectedEventData && eventStatus === 'ended' && (
        <WarningAlert
          type="info"
          message="This event has ended. All attendance records show final data including nullified sessions."
          severity="info"
        />
      )}
      
      {selectedEventData && eventStatus === 'live' && (
        <WarningAlert
          type="warning"
          message="This event is currently live. Data updates in real-time and may show ongoing sessions."
          severity="warning"
        />
      )}

      {/* Content */}
      {!selectedEvent ? (
        <div className="card text-center py-16 text-gray-500">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg">Select an event to view attendance analytics</p>
        </div>
      ) : viewMode === 'comprehensive' ? (
        <AttendanceSummaryTable eventId={selectedEvent} />
      ) : (
        // Rankings View
        <div className="space-y-6">
          {rankingsLoading ? (
            <div className="card text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading attendance rankings...</p>
            </div>
          ) : attendanceRankings ? (
            <>
              {/* Rankings Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card bg-blue-50 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Students</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {attendanceRankings.summaries?.length || 0}
                      </p>
                    </div>
                    <Users className="w-10 h-10 text-blue-600" />
                  </div>
                </div>

                <div className="card bg-green-50 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Clean Records</p>
                      <p className="text-2xl font-bold text-green-900">
                        {attendanceRankings.summaries?.filter(s => !s.hasImproperCheckouts).length || 0}
                      </p>
                    </div>
                    <Award className="w-10 h-10 text-green-600" />
                  </div>
                </div>

                <div className="card bg-orange-50 border border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">With Issues</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {attendanceRankings.summaries?.filter(s => s.hasImproperCheckouts).length || 0}
                      </p>
                    </div>
                    <AlertTriangle className="w-10 h-10 text-orange-600" />
                  </div>
                </div>

                <div className="card bg-purple-50 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Top Student</p>
                      <p className="text-lg font-bold text-purple-900">
                        {attendanceRankings.summaries?.[0]?.student?.name?.split(' ')[0] || 'N/A'}
                      </p>
                    </div>
                    <Trophy className="w-10 h-10 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Rankings Table */}
              <div className="card">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{getRankingTitle()}</h3>
                    <p className="text-sm text-gray-500 mt-1">{getRankingDescription()}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nullified Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sessions</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceRankings.summaries?.map((summary, index) => (
                        <tr key={summary.id} className={`hover:bg-gray-50 ${index < 3 ? 'bg-yellow-50' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              {index === 0 && <Trophy className="w-5 h-5 text-yellow-500 mr-2" />}
                              {index === 1 && <Award className="w-5 h-5 text-gray-400 mr-2" />}
                              {index === 2 && <Award className="w-5 h-5 text-orange-500 mr-2" />}
                              <span className={`font-bold ${index < 3 ? 'text-lg' : 'text-base'}`}>
                                #{index + 1}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900">{summary.student.name}</div>
                              <div className="text-sm text-gray-500">
                                {summary.student.regNo} • {summary.student.department}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {summary.totalValidDurationFormatted}
                            {summary.totalNullifiedDuration > 0 && (
                              <span className="text-orange-600 text-xs block">
                                + {summary.totalNullifiedDurationFormatted} nullified
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-green-600">
                            {summary.totalValidDurationFormatted}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-orange-600">
                            {summary.totalNullifiedDurationFormatted}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div>{summary.totalSessions} total</div>
                            {summary.nullifiedSessions > 0 && (
                              <div className="text-xs text-orange-600">
                                {summary.nullifiedSessions} nullified
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge 
                              status={summary.hasImproperCheckouts ? 'warning' : 'success'} 
                              label={summary.hasImproperCheckouts ? 'Has Issues' : 'Clean Record'}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(!attendanceRankings.summaries || attendanceRankings.summaries.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No attendance records found for this event
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card text-center py-16 text-gray-500">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">No ranking data available for selected event</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}