import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Trophy, MessageSquare, Download } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Analytics() {
  const [selectedEvent, setSelectedEvent] = useState('');

  // Fetch events for filter
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await adminApi.getEvents({ active: true });
      // API returns { success: true, data: [...] }
      return response.data?.data || response.data || [];
    },
  });

  // Fetch analytics data with auto-refresh
  const { data: topStudents = [] } = useQuery({
    queryKey: ['topStudents', selectedEvent],
    queryFn: async () => {
      const response = await adminApi.getTopStudents({ eventId: selectedEvent, limit: 10 });
      return response.data?.data || response.data || [];
    },
    enabled: !!selectedEvent,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  const { data: mostReviewers = [] } = useQuery({
    queryKey: ['mostReviewers', selectedEvent],
    queryFn: async () => {
      const response = await adminApi.getMostReviewers({ eventId: selectedEvent, limit: 10 });
      return response.data?.data || response.data || [];
    },
    enabled: !!selectedEvent,
    refetchInterval: 5000,
  });

  const { data: topStalls = [] } = useQuery({
    queryKey: ['topStalls', selectedEvent],
    queryFn: async () => {
      const response = await adminApi.getTopStalls({ eventId: selectedEvent, limit: 10 });
      return response.data?.data || response.data || [];
    },
    enabled: !!selectedEvent,
    refetchInterval: 5000,
  });

  const { data: deptStats = [] } = useQuery({
    queryKey: ['deptStats', selectedEvent],
    queryFn: async () => {
      const response = await adminApi.getDepartmentStats({ eventId: selectedEvent });
      return response.data?.data || response.data || [];
    },
    enabled: !!selectedEvent,
    refetchInterval: 5000,
  });

  const handleExport = async (type) => {
    try {
      const params = selectedEvent ? { eventId: selectedEvent } : {};
      let response;
      let filename;

      switch (type) {
        case 'attendance':
          response = await adminApi.exportAttendance(params);
          filename = 'attendance.csv';
          break;
        case 'feedbacks':
          response = await adminApi.exportFeedbacks(params);
          filename = 'feedbacks.csv';
          break;
        case 'votes':
          response = await adminApi.exportVotes(params);
          filename = 'votes.csv';
          break;
        default:
          return;
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Transform data for charts
  const topStudentsData = topStudents.map((s) => ({
    name: s.name || 'Unknown',
    minutes: Math.round(s.stayTimeMinutes || 0),
    department: s.department || 'N/A',
  }));

  const topReviewersData = mostReviewers.map((s) => ({
    name: s.name || 'Unknown',
    feedbacks: parseInt(s.feedbackCount) || 0,
    votes: parseInt(s.voteCount) || 0,
    total: parseInt(s.totalReviews) || 0,
  }));

  const topStallsData = topStalls.map((s) => ({
    name: s.name || 'Unknown',
    score: parseFloat(s.averageRating) || 0,
    votes: parseInt(s.totalVotes) || 0,
    department: s.department || 'N/A',
  }));

  const deptStatsData = deptStats.map((d) => ({
    name: d.department || 'Unknown',
    students: parseInt(d.studentCount) || 0,
    votes: parseInt(d.totalVotes) || 0,
    feedbacks: parseInt(d.totalFeedbacks) || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Insights and statistics</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => handleExport('attendance')}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Export Attendance</span>
          </button>
          <button
            onClick={() => handleExport('feedbacks')}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Export Feedbacks</span>
          </button>
          <button
            onClick={() => handleExport('votes')}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Export Votes</span>
          </button>
        </div>
      </div>

      {/* Event Filter */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Event</label>
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- Select Event --</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      {selectedEvent ? (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card bg-blue-50 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Top Students</p>
                  <p className="text-2xl font-bold text-blue-900">{topStudents.length}</p>
                </div>
                <Users className="w-10 h-10 text-blue-600" />
              </div>
            </div>

            <div className="card bg-green-50 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Top Stalls</p>
                  <p className="text-2xl font-bold text-green-900">{topStalls.length}</p>
                </div>
                <Trophy className="w-10 h-10 text-green-600" />
              </div>
            </div>

            <div className="card bg-purple-50 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Active Reviewers</p>
                  <p className="text-2xl font-bold text-purple-900">{mostReviewers.length}</p>
                </div>
                <MessageSquare className="w-10 h-10 text-purple-600" />
              </div>
            </div>

            <div className="card bg-orange-50 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Departments</p>
                  <p className="text-2xl font-bold text-orange-900">{deptStats.length}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Students by Stay Time */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Top Students by Stay Time</h3>
              {topStudentsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topStudentsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="minutes" fill="#3B82F6" name="Stay Time (min)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>

            {/* Top Stalls by Votes */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Top Stalls by Weighted Score</h3>
              {topStallsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topStallsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="score" fill="#10B981" name="Weighted Score" />
                    <Bar dataKey="votes" fill="#F59E0B" name="Total Votes" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Most Active Reviewers */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Most Active Reviewers</h3>
              {topReviewersData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topReviewersData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="feedbacks" fill="#8B5CF6" name="Feedbacks Submitted" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>

            {/* Department Statistics */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Department Participation</h3>
              {deptStatsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={deptStatsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, students }) => `${name}: ${students}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="students"
                    >
                      {deptStatsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Department Stats Table */}
          {deptStats.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Department-wise Detailed Statistics</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Unique Students
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total Votes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Total Feedbacks
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Avg Stay Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deptStats.map((dept, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{dept.id}</td>
                        <td className="px-6 py-4">{dept.uniqueStudents}</td>
                        <td className="px-6 py-4">{dept.totalVotes}</td>
                        <td className="px-6 py-4">{dept.totalFeedbacks}</td>
                        <td className="px-6 py-4">
                          {dept.avgStayTime ? `${Math.round(dept.avgStayTime / 60)} min` : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="card text-center py-16 text-gray-500">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg">Select an event to view analytics</p>
        </div>
      )}
    </div>
  );
}
