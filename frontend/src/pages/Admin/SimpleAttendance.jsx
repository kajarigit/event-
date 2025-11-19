import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { Clock, Users, Download, RefreshCw, Calendar, User } from 'lucide-react';

export default function SimpleAttendance() {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [viewMode, setViewMode] = useState('event'); // 'event' or 'student'
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch events for filter
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await adminApi.getEvents({ active: true });
      return response.data?.data || response.data || [];
    },
  });

  // Fetch event attendance records
  const { data: eventAttendance, refetch: refetchEventAttendance, isLoading: eventLoading } = useQuery({
    queryKey: ['eventAttendance', selectedEvent],
    queryFn: async () => {
      const response = await adminApi.getEventAttendanceRecords(selectedEvent);
      setLastUpdated(new Date());
      return response.data?.data || response.data;
    },
    enabled: !!selectedEvent && viewMode === 'event',
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch student attendance records
  const { data: studentAttendance, refetch: refetchStudentAttendance, isLoading: studentLoading } = useQuery({
    queryKey: ['studentAttendance', selectedStudent, selectedEvent],
    queryFn: async () => {
      const params = selectedEvent ? { eventId: selectedEvent } : {};
      const response = await adminApi.getStudentAttendanceRecords(selectedStudent, params);
      setLastUpdated(new Date());
      return response.data?.data || response.data;
    },
    enabled: !!selectedStudent && viewMode === 'student',
    refetchInterval: 30000,
  });

  // Manual refresh
  const handleRefresh = () => {
    if (viewMode === 'event' && selectedEvent) {
      refetchEventAttendance();
    } else if (viewMode === 'student' && selectedStudent) {
      refetchStudentAttendance();
    }
  };

  // Export to CSV
  const handleExport = () => {
    try {
      let csvContent = '';
      let filename = '';
      
      if (viewMode === 'event' && eventAttendance) {
        csvContent = [
          ['Student Name', 'Roll Number', 'Department', 'Check In Date', 'Check In Time', 'Check Out Date', 'Check Out Time', 'Duration', 'Status'].join(','),
          ...eventAttendance.records.map(record => [
            record.student.name,
            record.student.rollNumber || '',
            record.student.department || '',
            record.checkInDate,
            record.checkInTimeFormatted,
            record.checkOutDate || '',
            record.checkOutTimeFormatted || '',
            record.durationFormatted,
            record.isActive ? 'Active' : 'Completed'
          ].map(cell => `"${cell}"`).join(','))
        ].join('\\n');
        filename = `attendance-${eventAttendance.event.name}-${new Date().toISOString().split('T')[0]}.csv`;
      } else if (viewMode === 'student' && studentAttendance) {
        csvContent = [
          ['Event', 'Check In Date', 'Check In Time', 'Check Out Date', 'Check Out Time', 'Duration', 'Status'].join(','),
          ...studentAttendance.records.map(record => [
            record.event.name,
            record.checkInDate,
            record.checkInTimeFormatted,
            record.checkOutDate || '',
            record.checkOutTimeFormatted || '',
            record.durationFormatted,
            record.isActive ? 'Active' : 'Completed'
          ].map(cell => `"${cell}"`).join(','))
        ].join('\\n');
        filename = `student-attendance-${studentAttendance.student.name}-${new Date().toISOString().split('T')[0]}.csv`;
      }

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

  const currentData = viewMode === 'event' ? eventAttendance : studentAttendance;
  const isLoading = viewMode === 'event' ? eventLoading : studentLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Attendance Records</h2>
          <p className="text-gray-600 mt-1">
            Direct attendance data from database • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={(!selectedEvent && viewMode === 'event') || (!selectedStudent && viewMode === 'student')}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>

          {currentData && (
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
        <div className="flex flex-wrap gap-4">
          {/* View Mode */}
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
            <select
              value={viewMode}
              onChange={(e) => {
                setViewMode(e.target.value);
                setSelectedEvent('');
                setSelectedStudent('');
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="event">Event Attendance</option>
              <option value="student">Student History</option>
            </select>
          </div>

          {/* Event Filter */}
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {viewMode === 'event' ? 'Select Event' : 'Filter by Event (Optional)'}
            </label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- {viewMode === 'event' ? 'Select Event' : 'All Events'} --</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>

          {/* Student Filter (only for student mode) */}
          {viewMode === 'student' && (
            <div className="flex-1 min-w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
              <input
                type="text"
                placeholder="Enter student ID or select from event data"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      {currentData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">
                  {viewMode === 'event' ? 'Total Records' : 'Total Sessions'}
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {viewMode === 'event' ? currentData.summary?.totalRecords : currentData.summary?.totalSessions}
                </p>
              </div>
              <Calendar className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="card bg-green-50 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">
                  {viewMode === 'event' ? 'Unique Students' : 'Completed Sessions'}
                </p>
                <p className="text-2xl font-bold text-green-900">
                  {viewMode === 'event' ? currentData.summary?.uniqueStudents : currentData.summary?.completedSessions}
                </p>
              </div>
              <Users className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div className="card bg-purple-50 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Currently Active</p>
                <p className="text-2xl font-bold text-purple-900">
                  {viewMode === 'event' ? currentData.summary?.activeStudents : currentData.summary?.activeSessions}
                </p>
              </div>
              <User className="w-10 h-10 text-purple-600" />
            </div>
          </div>

          <div className="card bg-orange-50 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Total Time</p>
                <p className="text-2xl font-bold text-orange-900">
                  {currentData.summary?.totalHoursSpent || 0}h
                </p>
              </div>
              <Clock className="w-10 h-10 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Data Display */}
      {isLoading ? (
        <div className="card text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance records...</p>
        </div>
      ) : currentData ? (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">
              {viewMode === 'event' 
                ? `Attendance Records for ${currentData.event?.name || 'Event'}` 
                : `Attendance History for ${currentData.student?.name || 'Student'}`
              }
            </h3>
            <span className="text-sm text-gray-500">
              {currentData.recordCount || 0} records found
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {viewMode === 'event' ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                    </>
                  ) : (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentData.records?.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    {viewMode === 'event' ? (
                      <>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{record.student.name}</div>
                            <div className="text-sm text-gray-500">{record.student.rollNumber}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{record.student.department || 'N/A'}</td>
                      </>
                    ) : (
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{record.event.name}</div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{record.checkInDate}</div>
                      <div className="text-xs text-gray-500">{record.checkInTimeFormatted}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {record.checkOutDate ? (
                        <>
                          <div>{record.checkOutDate}</div>
                          <div className="text-xs text-gray-500">{record.checkOutTimeFormatted}</div>
                        </>
                      ) : (
                        <span className="text-gray-400">Not checked out</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {record.durationFormatted}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        record.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {record.isActive ? 'Active' : 'Completed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(!currentData.records || currentData.records.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No attendance records found
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-16 text-gray-500">
          <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg">
            {viewMode === 'event' 
              ? 'Select an event to view attendance records' 
              : 'Enter a student ID to view their attendance history'
            }
          </p>
        </div>
      )}
    </div>
  );
}