import React from 'react';
import { useAuth } from '../../context/AuthContext';
import StudentAttendanceDisplay from '../../components/attendance/StudentAttendanceDisplay';
import { Clock, TrendingUp, Calendar } from 'lucide-react';

const StudentAttendanceSummary = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              My Attendance Summary
            </h1>
            <p className="text-gray-600 mt-2">
              Track your attendance across all events with detailed session information
            </p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-sm text-gray-500">Student</div>
            <div className="font-medium text-gray-900">{user?.name}</div>
            <div className="text-sm text-gray-500">{user?.regNo}</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-blue-600">Attendance Overview</div>
              <div className="text-lg font-bold text-blue-900 mt-1">
                Track your progress across all events
              </div>
            </div>
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-green-600">Valid Sessions</div>
              <div className="text-lg font-bold text-green-900 mt-1">
                Time properly tracked
              </div>
            </div>
            <Clock className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-orange-600">Alerts & Issues</div>
              <div className="text-lg font-bold text-orange-900 mt-1">
                Nullified sessions
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Main Attendance Display */}
      <StudentAttendanceDisplay studentId={user?.id} />
    </div>
  );
};

export default StudentAttendanceSummary;