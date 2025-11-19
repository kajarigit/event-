import React, { useState, useEffect, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { 
  Users, 
  TrendingUp, 
  Award, 
  Trophy, 
  Medal, 
  ChevronDown, 
  ChevronUp, 
  Download,
  Calendar,
  BookOpen,
  CheckCircle,
  XCircle,
  BarChart3,
  Eye,
  EyeOff,
  Percent,
  GraduationCap,
  UserCheck,
  UserX,
  RefreshCw,
  Target
} from 'lucide-react';

const DepartmentAttendanceRankings = () => {
  const [selectedEventId, setSelectedEventId] = useState('');
  const [expandedDepartments, setExpandedDepartments] = useState(new Set());
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Fetch events for selection
  const { data: eventsData } = useQuery({
    queryKey: ['admin-events'],
    queryFn: () => adminApi.getEvents(),
  });

  // Fetch department attendance statistics
  const { 
    data: attendanceData, 
    isLoading: attendanceLoading, 
    error: attendanceError,
    refetch: refetchAttendance
  } = useQuery({
    queryKey: ['department-attendance-stats', selectedEventId],
    queryFn: () => adminApi.getDepartmentAttendanceStats(selectedEventId),
    enabled: !!selectedEventId,
    refetchInterval: 60000, // Refresh every minute
  });

  // Helper functions for managing expanded departments
  const toggleDepartmentExpansion = (department) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(department)) {
      newExpanded.delete(department);
    } else {
      newExpanded.add(department);
    }
    setExpandedDepartments(newExpanded);
  };

  const isDepartmentExpanded = (department) => expandedDepartments.has(department);

  // Fetch department details for expanded departments
  const expandedDepartmentsList = Array.from(expandedDepartments);
  const departmentDetailsQueries = expandedDepartmentsList.map(department => {
    return useQuery({
      queryKey: ['department-attendance-details', selectedEventId, department],
      queryFn: () => adminApi.getDepartmentAttendanceDetails(selectedEventId, department),
      enabled: !!selectedEventId && expandedDepartments.has(department),
    });
  });

  // Auto-select first event if available and reset expanded departments when event changes
  useEffect(() => {
    if (eventsData?.data?.data && eventsData.data.data.length > 0 && !selectedEventId) {
      setSelectedEventId(eventsData.data.data[0].id);
    }
  }, [eventsData, selectedEventId]);

  useEffect(() => {
    setExpandedDepartments(new Set()); // Reset expanded departments when event changes
  }, [selectedEventId]);

  const getRankingIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-gray-500">#{rank}</span>;
    }
  };

  const getRankingColor = (rank) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200';
      case 2: return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200';
      case 3: return 'bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200';
      default: return 'bg-white border-gray-200';
    }
  };

  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 bg-green-50';
    if (percentage >= 75) return 'text-blue-600 bg-blue-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const exportToCsv = () => {
    if (!attendanceData?.data) return;

    const csvData = attendanceData.data.departmentStats.map(dept => ({
      Rank: dept.rank,
      Department: dept.department,
      'Total Students': dept.totalStudents,
      'Attended Students': dept.attendedStudents,
      'Absent Students': dept.absentStudents,
      'Attendance Percentage': dept.attendancePercentage
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `department_attendance_rankings_${attendanceData.data.event.name.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (attendanceLoading && selectedEventId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading department attendance rankings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Department Attendance Rankings</h1>
                <p className="text-gray-600">Compare attendance percentages across departments</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => refetchAttendance()}
                className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>

              {attendanceData?.data && (
                <>
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Grid View
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      List View
                    </button>
                  </div>
                  
                  <button
                    onClick={exportToCsv}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Event Selection */}
          <div className="mt-6 flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setSelectedDepartment('');
                setShowDetails(false);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Event</option>
              {eventsData?.data?.data?.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} - {new Date(event.startDate).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
        </div>

        {attendanceError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700">
                Failed to load attendance data: {attendanceError.response?.data?.error || attendanceError.message}
              </span>
            </div>
          </div>
        )}

        {attendanceData?.data && (
          <>
            {/* Summary Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border border-blue-200 p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-blue-600 font-medium">Total Departments</p>
                    <p className="text-xl md:text-2xl font-bold text-blue-900">{attendanceData.data.totalDepartments}</p>
                    <p className="text-xs text-blue-600 mt-1">Active departments</p>
                  </div>
                  <div className="p-3 bg-blue-500 rounded-lg">
                    <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-sm border border-green-200 p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-green-600 font-medium">Total Students</p>
                    <p className="text-xl md:text-2xl font-bold text-green-900">{attendanceData.data.summary.totalStudentsAcrossAllDepts}</p>
                    <p className="text-xs text-green-600 mt-1">Enrolled students</p>
                  </div>
                  <div className="p-3 bg-green-500 rounded-lg">
                    <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow-sm border border-purple-200 p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-purple-600 font-medium">Total Attended</p>
                    <p className="text-xl md:text-2xl font-bold text-purple-900">{attendanceData.data.summary.totalAttendedAcrossAllDepts}</p>
                    <p className="text-xs text-purple-600 mt-1">Present students</p>
                  </div>
                  <div className="p-3 bg-purple-500 rounded-lg">
                    <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-sm border border-orange-200 p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-orange-600 font-medium">Overall Rate</p>
                    <p className="text-xl md:text-2xl font-bold text-orange-900">{attendanceData.data.summary.overallAttendancePercentage}%</p>
                    <p className="text-xs text-orange-600 mt-1">Attendance rate</p>
                  </div>
                  <div className="p-3 bg-orange-500 rounded-lg">
                    <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Event Information */}
            <div className="bg-gradient-to-r from-indigo-50 via-white to-cyan-50 rounded-xl shadow-sm border p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Event Analytics Overview
                  </h2>
                  <p className="text-gray-600 mt-1">Detailed attendance breakdown for the selected event</p>
                </div>
                
                {/* Winner Badge */}
                {attendanceData.data.departmentStats.length > 0 && (
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    <span className="font-bold text-sm">
                      Winner: {attendanceData.data.departmentStats[0].department} 
                      ({attendanceData.data.departmentStats[0].attendancePercentage}%)
                    </span>
                  </div>
                )}
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-4 border border-indigo-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-medium text-gray-900">Event Name</h3>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{attendanceData.data.event.name}</p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-cyan-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-cyan-600" />
                    <h3 className="font-medium text-gray-900">Duration</h3>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {new Date(attendanceData.data.event.startDate).toLocaleDateString()} - {new Date(attendanceData.data.event.endDate).toLocaleDateString()}
                  </p>
                </div>
                
                <div className="bg-white rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-3 mb-2">
                    <Target className="w-5 h-5 text-green-600" />
                    <h3 className="font-medium text-gray-900">Competition Status</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-lg font-bold text-green-600">Active</span>
                  </div>
                </div>
              </div>

              {/* Quick Stats Bar */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-gray-600">Best Performance: {attendanceData.data.departmentStats[0]?.department}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-gray-600">Needs Improvement: {attendanceData.data.departmentStats[attendanceData.data.departmentStats.length - 1]?.department}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-gray-600">Last Updated</p>
                    <p className="font-medium">{new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Department Rankings */}
            {viewMode === 'grid' ? (
              /* Grid View */
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {attendanceData.data.departmentStats.map((dept, index) => {
                  const isExpanded = isDepartmentExpanded(dept.department);
                  const detailsQuery = departmentDetailsQueries.find(q => 
                    q.isEnabled && q.queryKey[2] === dept.department
                  );
                  
                  return (
                    <div key={dept.department} className="bg-white rounded-xl shadow-sm border hover:shadow-lg transition-all duration-300">
                      {/* Card Header */}
                      <div className={`p-6 rounded-t-xl ${getRankingColor(dept.rank)}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            {getRankingIcon(dept.rank)}
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg">{dept.department}</h3>
                              <p className="text-sm text-gray-600">Rank #{dept.rank}</p>
                            </div>
                          </div>
                          
                          <div className={`px-3 py-1 rounded-full font-bold text-xl ${getAttendanceColor(dept.attendancePercentage)}`}>
                            {dept.attendancePercentage}%
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                            style={{ width: `${Math.max(dept.attendancePercentage, 8)}%` }}
                          >
                            <Percent className="w-3 h-3 text-white" />
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="bg-white/50 rounded-lg p-3">
                            <Users className="w-5 h-5 text-gray-600 mx-auto mb-1" />
                            <p className="text-lg font-bold text-gray-900">{dept.totalStudents}</p>
                            <p className="text-xs text-gray-600">Total</p>
                          </div>
                          <div className="bg-white/50 rounded-lg p-3">
                            <UserCheck className="w-5 h-5 text-green-600 mx-auto mb-1" />
                            <p className="text-lg font-bold text-green-600">{dept.attendedStudents}</p>
                            <p className="text-xs text-gray-600">Present</p>
                          </div>
                          <div className="bg-white/50 rounded-lg p-3">
                            <UserX className="w-5 h-5 text-red-600 mx-auto mb-1" />
                            <p className="text-lg font-bold text-red-600">{dept.absentStudents}</p>
                            <p className="text-xs text-gray-600">Absent</p>
                          </div>
                        </div>
                      </div>

                      {/* View Details Button */}
                      <div className="px-6 py-4 border-t">
                        <button
                          onClick={() => toggleDepartmentExpansion(dept.department)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <EyeOff className="w-4 h-4" />
                              Hide Student Details
                              <ChevronUp className="w-4 h-4" />
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4" />
                              View Student Details
                              <ChevronDown className="w-4 h-4" />
                            </>
                          )}
                        </button>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t">
                            {detailsQuery?.isLoading ? (
                              <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-2 text-sm text-gray-600">Loading details...</p>
                              </div>
                            ) : detailsQuery?.data?.data ? (
                              <div className="space-y-4">
                                {/* Present Students */}
                                <div>
                                  <h5 className="font-medium text-green-600 mb-2 flex items-center text-sm">
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Present ({detailsQuery.data.data.attendedStudents.length})
                                  </h5>
                                  <div className="max-h-32 overflow-y-auto space-y-1">
                                    {detailsQuery.data.data.attendedStudents.slice(0, 5).map((student) => (
                                      <div key={student.id} className="text-xs bg-green-50 p-2 rounded border-l-2 border-green-400">
                                        <p className="font-medium text-gray-900">{student.name}</p>
                                        <p className="text-gray-600">{student.regNo}</p>
                                      </div>
                                    ))}
                                    {detailsQuery.data.data.attendedStudents.length > 5 && (
                                      <p className="text-xs text-gray-500 text-center">
                                        +{detailsQuery.data.data.attendedStudents.length - 5} more
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Absent Students */}
                                <div>
                                  <h5 className="font-medium text-red-600 mb-2 flex items-center text-sm">
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Absent ({detailsQuery.data.data.absentStudents.length})
                                  </h5>
                                  <div className="max-h-32 overflow-y-auto space-y-1">
                                    {detailsQuery.data.data.absentStudents.slice(0, 5).map((student) => (
                                      <div key={student.id} className="text-xs bg-red-50 p-2 rounded border-l-2 border-red-400">
                                        <p className="font-medium text-gray-900">{student.name}</p>
                                        <p className="text-gray-600">{student.regNo}</p>
                                      </div>
                                    ))}
                                    {detailsQuery.data.data.absentStudents.length > 5 && (
                                      <p className="text-xs text-gray-500 text-center">
                                        +{detailsQuery.data.data.absentStudents.length - 5} more
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <XCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600">Failed to load details</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List View */
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Department Attendance Rankings
                  </h2>
                  <p className="text-gray-600 mt-1">Ranked by attendance percentage (Present ÷ Total Enrolled)</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                        <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceData.data.departmentStats.map((dept, index) => {
                        const isExpanded = isDepartmentExpanded(dept.department);
                        const detailsQuery = departmentDetailsQueries.find(q => 
                          q.isEnabled && q.queryKey[2] === dept.department
                        );
                        
                        return (
                          <Fragment key={dept.department}>
                            <tr className={`hover:bg-gray-50 transition-colors ${getRankingColor(dept.rank)}`}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {getRankingIcon(dept.rank)}
                                  <span className="text-sm font-medium text-gray-900">#{dept.rank}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <GraduationCap className="w-5 h-5 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-900">{dept.department}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-sm font-bold text-gray-900">{dept.totalStudents}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-sm font-bold text-green-600">{dept.attendedStudents}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-sm font-bold text-red-600">{dept.absentStudents}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className={`px-3 py-1 rounded-full font-bold text-sm ${getAttendanceColor(dept.attendancePercentage)}`}>
                                    {dept.attendancePercentage}%
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <button
                                  onClick={() => toggleDepartmentExpansion(dept.department)}
                                  className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                                >
                                  {isExpanded ? (
                                    <>
                                      <EyeOff className="w-3 h-3 mr-1" />
                                      Hide
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-3 h-3 mr-1" />
                                      View
                                    </>
                                  )}
                                </button>
                              </td>
                            </tr>
                            
                            {/* Expanded Row */}
                            {isExpanded && (
                              <tr>
                                <td colSpan="7" className="px-6 py-0">
                                  <div className="bg-gray-50 border-t border-gray-200 p-6">
                                    {detailsQuery?.isLoading ? (
                                      <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-2 text-sm text-gray-600">Loading student details...</p>
                                      </div>
                                    ) : detailsQuery?.data?.data ? (
                                      <div className="grid md:grid-cols-2 gap-6">
                                        {/* Present Students */}
                                        <div>
                                          <h4 className="font-semibold text-green-600 mb-4 flex items-center">
                                            <CheckCircle className="w-5 h-5 mr-2" />
                                            Present Students ({detailsQuery.data.data.attendedStudents.length})
                                          </h4>
                                          <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {detailsQuery.data.data.attendedStudents.map((student) => (
                                              <div key={student.id} className="p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-3">
                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                <div>
                                                  <p className="font-medium text-gray-900">{student.name}</p>
                                                  <p className="text-sm text-gray-600">{student.regNo}</p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Absent Students */}
                                        <div>
                                          <h4 className="font-semibold text-red-600 mb-4 flex items-center">
                                            <XCircle className="w-5 h-5 mr-2" />
                                            Absent Students ({detailsQuery.data.data.absentStudents.length})
                                          </h4>
                                          <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {detailsQuery.data.data.absentStudents.map((student) => (
                                              <div key={student.id} className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-center gap-3">
                                                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                                                <div>
                                                  <p className="font-medium text-gray-900">{student.name}</p>
                                                  <p className="text-sm text-gray-600">{student.regNo}</p>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-center py-8">
                                        <XCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-sm text-gray-600">Failed to load student details</p>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!selectedEventId && (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select an Event</h3>
            <p className="text-gray-600">Choose an event from the dropdown above to view department attendance rankings.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentAttendanceRankings;