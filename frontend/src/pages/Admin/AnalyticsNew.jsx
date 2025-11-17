import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Trophy, MessageSquare, Download, FileSpreadsheet, Award, Clock, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function Analytics() {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch events for filter
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await adminApi.getEvents();
      return response.data?.data || response.data || [];
    },
  });

  // Fetch analytics data with auto-refresh
  const { data: topStudents = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['topStudents', selectedEvent],
    queryFn: async () => {
      const response = await adminApi.getTopStudents({ eventId: selectedEvent, limit: 50 });
      return response.data?.data || response.data || [];
    },
    enabled: !!selectedEvent,
    refetchInterval: 10000,
  });

  const { data: mostReviewers = [] } = useQuery({
    queryKey: ['mostReviewers', selectedEvent],
    queryFn: async () => {
      const response = await adminApi.getMostReviewers({ eventId: selectedEvent, limit: 20 });
      return response.data?.data || response.data || [];
    },
    enabled: !!selectedEvent,
    refetchInterval: 10000,
  });

  const { data: topStalls = [], isLoading: loadingStalls } = useQuery({
    queryKey: ['topStalls', selectedEvent, selectedDepartment],
    queryFn: async () => {
      const params = { eventId: selectedEvent, limit: 10 };
      if (selectedDepartment) params.department = selectedDepartment;
      const response = await adminApi.getTopStalls(params);
      return response.data?.data || response.data || [];
    },
    enabled: !!selectedEvent,
    refetchInterval: 10000,
  });

  const { data: deptStats = [], isLoading: loadingDeptStats } = useQuery({
    queryKey: ['deptStats', selectedEvent],
    queryFn: async () => {
      const response = await adminApi.getDepartmentStats({ eventId: selectedEvent });
      return response.data?.data || response.data || [];
    },
    enabled: !!selectedEvent,
    refetchInterval: 10000,
  });

  const { data: eventOverview } = useQuery({
    queryKey: ['eventOverview', selectedEvent],
    queryFn: async () => {
      const response = await adminApi.getEventOverview({ eventId: selectedEvent });
      return response.data?.data || response.data || {};
    },
    enabled: !!selectedEvent,
    refetchInterval: 10000,
  });

  // Export comprehensive analytics
  const handleExportComprehensive = async () => {
    if (!selectedEvent) {
      toast.error('Please select an event first');
      return;
    }

    setIsExporting(true);
    try {
      toast.loading('Generating comprehensive Excel report...', { id: 'export' });
      
      const response = await adminApi.exportComprehensiveAnalytics({ eventId: selectedEvent });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const eventName = events.find(e => e.id === selectedEvent)?.name || 'Event';
      const filename = `Event_Analytics_${eventName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('✅ Excel report downloaded successfully!', { id: 'export' });
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to generate Excel report', { id: 'export' });
    } finally {
      setIsExporting(false);
    }
  };

  // Get unique departments from stalls
  const departments = [...new Set(deptStats.map(d => d.department))].filter(Boolean);

  // Transform data for charts
  const topStudentsChartData = topStudents.slice(0, 10).map((s, idx) => ({
    rank: idx + 1,
    name: s.name?.substring(0, 15) || 'Unknown',
    minutes: Math.round(parseFloat(s.stayTimeMinutes) || 0),
    hours: parseFloat(s.stayTimeHours || 0).toFixed(2),
    votes: parseInt(s.totalVotes || 0),
    feedbacks: parseInt(s.totalFeedbacks || 0),
  }));

  const topStallsChartData = topStalls.map((s, idx) => ({
    rank: idx + 1,
    name: s.name?.substring(0, 20) || 'Unknown',
    votes: parseInt(s.voteCount || 0),
    feedbacks: parseInt(s.feedbackCount || 0),
    rating: parseFloat(s.roundedRating || s.avgRating || 0),
  }));

  const deptAttendanceData = deptStats.map((d) => ({
    department: d.department?.substring(0, 15) || 'Unknown',
    total: parseInt(d.totalStudents || 0),
    attended: parseInt(d.attendedStudents || 0),
    percentage: parseFloat(d.attendancePercentage || 0),
  }));

  const deptEngagementData = deptStats.map((d) => ({
    department: d.department?.substring(0, 15) || 'Unknown',
    votes: parseInt(d.totalVotes || 0),
    feedbacks: parseInt(d.totalFeedbacks || 0),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            📊 Comprehensive Analytics Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Event-wise insights, rankings, and prize distribution reports
          </p>
        </div>
        
        {selectedEvent && (
          <button
            onClick={handleExportComprehensive}
            disabled={isExporting}
            className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-5 h-5" />
                <span>Download Comprehensive Excel Report</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Event Filter */}
      <div className="card shadow-lg border-2 border-blue-200 dark:border-blue-700">
        <label className="label text-lg font-semibold mb-3">🎪 Select Event</label>
        <select
          value={selectedEvent}
          onChange={(e) => {
            setSelectedEvent(e.target.value);
            setSelectedDepartment('');
          }}
          className="input-field text-lg"
        >
          <option value="">-- Select Event to View Analytics --</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name} ({new Date(event.startDate).toLocaleDateString()})
            </option>
          ))}
        </select>
      </div>

      {selectedEvent ? (
        <>
          {/* Quick Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-2 border-blue-300 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-semibold">Total Stalls</p>
                  <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">{eventOverview?.totalStalls || 0}</p>
                </div>
                <Trophy className="w-14 h-14 text-blue-600 dark:text-blue-400 opacity-80" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-2 border-green-300 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700 dark:text-green-300 font-semibold">Total Attendees</p>
                  <p className="text-4xl font-bold text-green-900 dark:text-green-100">{eventOverview?.totalAttendees || 0}</p>
                </div>
                <Users className="w-14 h-14 text-green-600 dark:text-green-400 opacity-80" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-2 border-purple-300 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700 dark:text-purple-300 font-semibold">Total Votes</p>
                  <p className="text-4xl font-bold text-purple-900 dark:text-purple-100">{eventOverview?.totalVotes || 0}</p>
                </div>
                <Award className="w-14 h-14 text-purple-600 dark:text-purple-400 opacity-80" />
              </div>
            </div>

            <div className="card bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-2 border-orange-300 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700 dark:text-orange-300 font-semibold">Total Feedbacks</p>
                  <p className="text-4xl font-bold text-orange-900 dark:text-orange-100">{eventOverview?.totalFeedbacks || 0}</p>
                </div>
                <MessageSquare className="w-14 h-14 text-orange-600 dark:text-orange-400 opacity-80" />
              </div>
            </div>
          </div>

          {/* Department Filter for Stalls */}
          {departments.length > 0 && (
            <div className="card shadow-lg">
              <label className="label font-semibold mb-2">🏫 Filter Top Stalls by Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="input-field"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Top 10 Students by Engagement Time */}
          <div className="card shadow-xl border-2 border-green-200 dark:border-green-700">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Clock className="text-green-600 dark:text-green-400" size={28} />
                  🏆 Top 10 Students by Engagement Time
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Showing top {topStudentsChartData.length} students who spent the most time at the event
                </p>
              </div>
            </div>
            
            {loadingStudents ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : topStudentsChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topStudentsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} />
                    <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border-2 border-green-500">
                            <p className="font-bold text-gray-900 dark:text-white">Rank #{data.rank} - {data.name}</p>
                            <p className="text-green-600">⏱️ Stay Time: {data.minutes} min ({data.hours} hrs)</p>
                            <p className="text-blue-600">🗳️ Votes: {data.votes}</p>
                            <p className="text-orange-600">💬 Feedbacks: {data.feedbacks}</p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Legend />
                    <Bar dataKey="minutes" fill="#10B981" name="Stay Time (minutes)" />
                  </BarChart>
                </ResponsiveContainer>

                {/* Top 10 Students Table */}
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/50 dark:to-emerald-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Rank</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Student Name</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Stay Time</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Votes</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Feedbacks</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Prize</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {topStudents.slice(0, 10).map((student, idx) => (
                        <tr key={student.id} className="hover:bg-green-50 dark:hover:bg-green-900/20">
                          <td className="px-4 py-3 font-bold text-lg">
                            {idx === 0 && '🥇'}
                            {idx === 1 && '🥈'}
                            {idx === 2 && '🥉'}
                            {idx > 2 && `#${idx + 1}`}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">{student.name}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">{student.rollNumber} • {student.department}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-green-600">{Math.round(parseFloat(student.stayTimeMinutes))} min</div>
                            <div className="text-sm text-gray-600">({parseFloat(student.stayTimeHours).toFixed(2)} hrs)</div>
                          </td>
                          <td className="px-4 py-3 text-center text-blue-600 font-semibold">{student.totalVotes}</td>
                          <td className="px-4 py-3 text-center text-orange-600 font-semibold">{student.totalFeedbacks}</td>
                          <td className="px-4 py-3">
                            {idx === 0 && <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">🥇 1st Prize</span>}
                            {idx === 1 && <span className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-xs font-bold">🥈 2nd Prize</span>}
                            {idx === 2 && <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">🥉 3rd Prize</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg">No student engagement data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Top 10 Stalls by Department */}
          <div className="card shadow-xl border-2 border-blue-200 dark:border-blue-700">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Trophy className="text-blue-600 dark:text-blue-400" size={28} />
                  🏪 Top 10 Stalls by Votes {selectedDepartment && `(${selectedDepartment})`}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Department-wise ranking for prize distribution
                </p>
              </div>
            </div>

            {loadingStalls ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : topStallsChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={topStallsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={120} />
                    <YAxis />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border-2 border-blue-500">
                            <p className="font-bold text-gray-900 dark:text-white">Rank #{data.rank} - {data.name}</p>
                            <p className="text-blue-600">🗳️ Votes: {data.votes}</p>
                            <p className="text-orange-600">💬 Feedbacks: {data.feedbacks}</p>
                            <p className="text-yellow-600">⭐ Rating: {data.rating}/5</p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Legend />
                    <Bar dataKey="votes" fill="#3B82F6" name="Total Votes" />
                    <Bar dataKey="feedbacks" fill="#F59E0B" name="Total Feedbacks" />
                  </BarChart>
                </ResponsiveContainer>

                {/* Top Stalls Table */}
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Rank</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Stall Name</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Department</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Votes</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Feedbacks</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Rating</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Prize</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {topStalls.map((stall, idx) => (
                        <tr key={stall.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          <td className="px-4 py-3 font-bold text-lg">
                            {idx === 0 && '🥇'}
                            {idx === 1 && '🥈'}
                            {idx === 2 && '🥉'}
                            {idx > 2 && `#${idx + 1}`}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-gray-900 dark:text-white">{stall.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{stall.ownerName}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">{stall.department}</td>
                          <td className="px-4 py-3 text-center text-blue-600 font-bold text-lg">{stall.voteCount}</td>
                          <td className="px-4 py-3 text-center text-orange-600 font-semibold">{stall.feedbackCount}</td>
                          <td className="px-4 py-3 text-center text-yellow-600 font-semibold">
                            ⭐ {parseFloat(stall.roundedRating || stall.avgRating || 0).toFixed(1)}/5
                          </td>
                          <td className="px-4 py-3">
                            {idx === 0 && <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">🥇 1st Prize</span>}
                            {idx === 1 && <span className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-xs font-bold">🥈 2nd Prize</span>}
                            {idx === 2 && <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold">🥉 3rd Prize</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg">No stall voting data available</p>
                </div>
              </div>
            )}
          </div>

          {/* Department-wise Attendance Statistics */}
          <div className="card shadow-xl border-2 border-purple-200 dark:border-purple-700">
            <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="text-purple-600 dark:text-purple-400" size={28} />
              📊 Department-wise Attendance Statistics
            </h3>

            {loadingDeptStats ? (
              <div className="h-[400px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : deptAttendanceData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={deptAttendanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" angle={-45} textAnchor="end" height={120} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="attended" fill="#8B5CF6" name="Students Attended" />
                    <Bar dataKey="total" fill="#EC4899" name="Total Students" />
                  </BarChart>
                </ResponsiveContainer>

                {/* Department Stats Table */}
                <div className="mt-6 overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Rank</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Department</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Total Students</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Attended</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Attendance %</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Students Voted</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase">Students Feedback</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {deptStats.map((dept, idx) => (
                        <tr key={idx} className="hover:bg-purple-50 dark:hover:bg-purple-900/20">
                          <td className="px-4 py-3 font-bold">#{idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{dept.department}</td>
                          <td className="px-4 py-3 text-center font-semibold">{dept.totalStudents}</td>
                          <td className="px-4 py-3 text-center text-green-600 font-semibold">{dept.attendedStudents}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                                <div
                                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-4 rounded-full"
                                  style={{ width: `${Math.min(parseFloat(dept.attendancePercentage || 0), 100)}%` }}
                                ></div>
                              </div>
                              <span className="font-bold text-sm">{parseFloat(dept.attendancePercentage || 0).toFixed(2)}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-blue-600 font-semibold">{dept.studentsWhoVoted}</td>
                          <td className="px-4 py-3 text-center text-orange-600 font-semibold">{dept.studentsWhoFeedback}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Engagement Comparison Chart */}
                <div className="mt-8">
                  <h4 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Department Engagement Comparison</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={deptEngagementData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="votes" stroke="#3B82F6" name="Total Votes" strokeWidth={3} />
                      <Line type="monotone" dataKey="feedbacks" stroke="#F59E0B" name="Total Feedbacks" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg">No department statistics available</p>
                </div>
              </div>
            )}
          </div>

          {/* Download Section */}
          <div className="card shadow-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-300 dark:border-green-700">
            <div className="flex items-start gap-4">
              <FileSpreadsheet className="w-12 h-12 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  📑 Comprehensive Excel Report for Prize Distribution
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Download a detailed Excel file with 7 sheets including:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300 mb-4">
                  <li><strong>Top 10 Stalls by Department</strong> - Department-wise rankings with prizes</li>
                  <li><strong>Top 50 Students by Engagement</strong> - Complete ranking with stay time, votes, feedbacks</li>
                  <li><strong>Department Attendance Stats</strong> - Attendance percentage and engagement metrics</li>
                  <li><strong>All Votes Detail</strong> - Complete proof of all votes cast</li>
                  <li><strong>All Feedbacks Detail</strong> - Complete proof of all feedback submissions</li>
                  <li><strong>All Attendances Detail</strong> - Complete proof of check-ins and check-outs</li>
                  <li><strong>Event Summary</strong> - Overall event statistics and metrics</li>
                </ul>
                <button
                  onClick={handleExportComprehensive}
                  disabled={isExporting}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      <span>Generating Excel Report...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-6 h-6" />
                      <span>Download Complete Report</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-24 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900/20">
          <TrendingUp className="w-24 h-24 mx-auto mb-6 text-gray-400 animate-pulse" />
          <p className="text-2xl font-semibold text-gray-700 dark:text-gray-300">Select an event to view comprehensive analytics</p>
          <p className="text-gray-500 dark:text-gray-400 mt-2">All reports and rankings will be generated event-wise</p>
        </div>
      )}
    </div>
  );
}
