import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Trophy, MessageSquare, Download, Activity, RefreshCw, Clock, Calendar, Eye } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Analytics() {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [viewMode, setViewMode] = useState('comprehensive'); // 'comprehensive' or 'student-detail'
  const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(30000);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const dataChangeDetected = useRef(false);
  
  // Reset activity detection after 3 minutes
  useEffect(() => {
    if (dataChangeDetected.current) {
      const resetTimer = setTimeout(() => {
        dataChangeDetected.current = false;
      }, 180000);
      return () => clearTimeout(resetTimer);
    }
  }, [dataChangeDetected.current]);

  // Fetch events for filter
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await adminApi.getEvents({ active: true });
      return response.data?.data || response.data || [];
    },
  });

  // Fetch comprehensive attendance data
  const { data: attendanceData, refetch: refetchAttendance } = useQuery({
    queryKey: ['comprehensiveAttendance', selectedEvent],
    queryFn: async () => {
      const response = await adminApi.getComprehensiveAttendance({ eventId: selectedEvent });
      setLastUpdated(new Date());
      return response.data?.data || response.data;
    },
    enabled: !!selectedEvent && viewMode === 'comprehensive',
    refetchInterval: liveUpdatesEnabled ? pollingInterval : false,
    onSuccess: (data) => {
      if (data?.students?.length > 0) {
        dataChangeDetected.current = true;
      }
    },
  });

  // Fetch student history data
  const { data: studentHistory, refetch: refetchStudentHistory } = useQuery({
    queryKey: ['studentHistory', selectedStudent, selectedEvent],
    queryFn: async () => {
      const response = await adminApi.getStudentAttendanceHistory(selectedStudent, selectedEvent ? { eventId: selectedEvent } : {});
      return response.data?.data || response.data;
    },
    enabled: !!selectedStudent && viewMode === 'student-detail',
    refetchInterval: liveUpdatesEnabled ? pollingInterval : false,
  });

  // Fetch department attendance stats
  const { data: departmentStats, refetch: refetchDepartmentStats } = useQuery({
    queryKey: ['departmentAttendance', selectedEvent],
    queryFn: async () => {
      const response = await adminApi.getDepartmentAttendanceStats({ eventId: selectedEvent });
      return response.data?.data || response.data;
    },
    enabled: !!selectedEvent && viewMode === 'comprehensive',
    refetchInterval: liveUpdatesEnabled ? pollingInterval * 2 : false,
  });

  // Manual refresh function
  const handleManualRefresh = async () => {
    if (!selectedEvent) return;
    
    setLastUpdated(new Date());
    try {
      if (viewMode === 'comprehensive') {
        await Promise.all([
          refetchAttendance(),
          refetchDepartmentStats()
        ]);
      } else if (viewMode === 'student-detail' && selectedStudent) {
        await refetchStudentHistory();
      }
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
    }
  };

  const handleExportComprehensive = async () => {
    if (!selectedEvent || !attendanceData) return;
    
    try {
      // Create CSV content
      const csvRows = [
        ['Student Name', 'Roll Number', 'Department', 'Total Sessions', 'Total Time (Hours)', 'Currently Checked In', 'First Check-in', 'Last Activity']
      ];
      
      attendanceData.students.forEach(studentData => {
        csvRows.push([
          studentData.student.name,
          studentData.student.rollNumber || '',
          studentData.student.department || '',
          studentData.statistics.totalSessions,
          studentData.statistics.totalTimeHours,
          studentData.statistics.currentlyCheckedIn ? 'Yes' : 'No',
          studentData.statistics.firstCheckIn ? new Date(studentData.statistics.firstCheckIn).toLocaleString() : '',
          studentData.statistics.lastActivity ? new Date(studentData.statistics.lastActivity).toLocaleString() : ''
        ]);
      });

      const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `comprehensive-attendance-${attendanceData.event.name}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Transform data for charts
  const topStudentsChartData = attendanceData?.students?.slice(0, 10).map(s => ({
    name: s.student.name.split(' ')[0], // First name only for chart readability
    hours: s.statistics.totalTimeHours,
    sessions: s.statistics.totalSessions,
    department: s.student.department || 'Unknown'
  })) || [];

  const departmentChartData = departmentStats?.map(d => ({
    name: d.department,
    students: d.uniqueStudents,
    totalHours: d.totalTimeHours,
    sessions: d.totalSessions
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Comprehensive Analytics</h2>
          <p className="text-gray-600 mt-1">
            Detailed attendance tracking with multiple sessions • 
            {liveUpdatesEnabled ? (
              <span className="text-green-600">🟢 Live updates every {Math.round(pollingInterval/1000)}s</span>
            ) : (
              <span className="text-red-600">🔴 Live updates disabled</span>
            )}
            • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Live Updates Toggle */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
            <Activity size={16} className={liveUpdatesEnabled ? 'text-green-500' : 'text-gray-400'} />
            <button
              onClick={() => setLiveUpdatesEnabled(!liveUpdatesEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                liveUpdatesEnabled ? 'bg-green-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  liveUpdatesEnabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          {/* Manual Refresh */}
          <button
            onClick={handleManualRefresh}
            disabled={!selectedEvent}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>

          {/* Export Button */}
          {viewMode === 'comprehensive' && attendanceData && (
            <button
              onClick={handleExportComprehensive}
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
        <div className="flex flex-wrap gap-4">
          {/* Event Filter */}
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">Event</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
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

          {/* View Mode Toggle */}
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => {
                setViewMode(e.target.value);
                setSelectedStudent('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="comprehensive">Comprehensive Overview</option>
              <option value="student-detail">Individual Student Detail</option>
            </select>
          </div>

          {/* Student Filter (for detail view) */}
          {viewMode === 'student-detail' && (
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={!attendanceData?.students}
              >
                <option value="">-- Select Student --</option>
                {attendanceData?.students?.map((studentData) => (
                  <option key={studentData.student.id} value={studentData.student.id}>
                    {studentData.student.name} ({studentData.student.rollNumber})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {selectedEvent && viewMode === 'comprehensive' && attendanceData ? (
        <>
          {/* Overall Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card bg-blue-50 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Unique Students</p>
                  <p className="text-2xl font-bold text-blue-900">{attendanceData.overallStatistics?.totalUniqueStudents || 0}</p>
                </div>
                <Users className="w-10 h-10 text-blue-600" />
              </div>
            </div>

            <div className="card bg-green-50 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Total Sessions</p>
                  <p className="text-2xl font-bold text-green-900">{attendanceData.overallStatistics?.totalAttendanceSessions || 0}</p>
                </div>
                <Calendar className="w-10 h-10 text-green-600" />
              </div>
            </div>

            <div className="card bg-purple-50 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Currently Active</p>
                  <p className="text-2xl font-bold text-purple-900">{attendanceData.overallStatistics?.currentlyCheckedIn || 0}</p>
                </div>
                <Activity className="w-10 h-10 text-purple-600" />
              </div>
            </div>

            <div className="card bg-orange-50 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Avg Time/Student</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {Math.round(attendanceData.overallStatistics?.averageTimePerStudent || 0)}m
                  </p>
                </div>
                <Clock className="w-10 h-10 text-orange-600" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Students by Total Time */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Top Students by Total Time</h3>
              {topStudentsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topStudentsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'hours' ? `${value}h` : value,
                        name === 'hours' ? 'Total Time' : 'Sessions'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="hours" fill="#3B82F6" name="Total Hours" />
                    <Bar dataKey="sessions" fill="#10B981" name="Total Sessions" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No attendance data available
                </div>
              )}
            </div>

            {/* Department Participation */}
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Department Participation</h3>
              {departmentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={departmentChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, students }) => `${name}: ${students}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="students"
                    >
                      {departmentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-gray-500">
                  No department data available
                </div>
              )}
            </div>
          </div>

          {/* Detailed Students Table */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Detailed Student Attendance</h3>
              <button
                onClick={() => setViewMode('student-detail')}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Eye size={16} />
                <span>View Individual Details</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Sessions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Session</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceData.students.map((studentData, idx) => (
                    <tr key={studentData.student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{studentData.student.name}</div>
                          <div className="text-sm text-gray-500">{studentData.student.rollNumber}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{studentData.student.department || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{studentData.statistics.totalSessions}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{studentData.statistics.formattedTotalTime}</div>
                        <div className="text-xs text-gray-500">{studentData.statistics.totalTimeHours}h</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{studentData.statistics.averageSessionMinutes}m</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          studentData.statistics.currentlyCheckedIn 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {studentData.statistics.currentlyCheckedIn ? 'Active' : 'Not Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setSelectedStudent(studentData.student.id);
                            setViewMode('student-detail');
                          }}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          View Sessions
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : selectedEvent && viewMode === 'student-detail' && selectedStudent && studentHistory ? (
        <>
          {/* Student Header */}
          <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{studentHistory.student?.name}</h3>
                <p className="text-gray-600 mt-1">
                  Roll No: {studentHistory.student?.rollNumber} • Department: {studentHistory.student?.department}
                </p>
                <div className="flex items-center space-x-4 mt-3 text-sm">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>{studentHistory.statistics?.totalSessions} sessions</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span>{studentHistory.statistics?.formattedTotalTime} total time</span>
                  </span>
                  {studentHistory.statistics?.currentlyActive && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Currently Active
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setViewMode('comprehensive')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Overview
              </button>
            </div>
          </div>

          {/* Session History */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Session History</h3>
            <div className="space-y-4">
              {studentHistory.attendanceHistory?.map((session, idx) => (
                <div key={session.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      session.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <div>
                      <div className="font-medium">Session {idx + 1}</div>
                      <div className="text-sm text-gray-500">
                        {session.event?.name || 'Unknown Event'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium">{session.formattedDuration}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(session.checkInTime).toLocaleDateString()} {new Date(session.checkInTime).toLocaleTimeString()}
                    </div>
                    {session.checkOutTime && (
                      <div className="text-xs text-gray-400">
                        to {new Date(session.checkOutTime).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      session.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {session.status === 'active' ? 'Active' : 'Completed'}
                    </span>
                  </div>
                </div>
              ))}
              
              {(!studentHistory.attendanceHistory || studentHistory.attendanceHistory.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No session history available for this student
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-16 text-gray-500">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg">Select an event to view comprehensive attendance analytics</p>
          <p className="text-sm mt-2">Track multiple check-in/check-out sessions per student with detailed time calculations</p>
        </div>
      )}
    </div>
  );
}