import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { LogOut, Scan, Clock, User } from 'lucide-react';
import Scanner from './Scanner';
import { scanApi } from '../../services/api';

export default function VolunteerDashboard() {
  const { user, logout } = useAuth();

  // Fetch recent scans
  const { data: recentScansData, refetch } = useQuery({
    queryKey: ['recentScans'],
    queryFn: async () => {
      const response = await scanApi.getMyRecentScans();
      return response.data?.data || [];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
    refetchOnWindowFocus: true,
  });

  const recentScans = recentScansData || [];

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-green-50/30">
      {/* Header - Mobile Responsive */}
      <header className="bg-white/95 backdrop-blur-md shadow-lg border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 sm:py-4 gap-2 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-600 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <Scan className="text-white w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                  Volunteer Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">Welcome, {user?.name}</p>
                {user?.assignedGate && (
                  <p className="text-xs sm:text-sm text-blue-600 font-medium">📍 {user.assignedGate}</p>
                )}
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-sm sm:text-base touch-manipulation active:scale-95 w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        {/* Scanner Section */}
        <Scanner onScanSuccess={refetch} />

        {/* Recent Scans Section - Mobile Responsive */}
        <div className="bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-blue-100 p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5">
            <div className="p-2 bg-gradient-to-r from-blue-100 to-green-100 rounded-lg">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Recent Scans</h3>
          </div>
          
          {recentScans.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Scan className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-300" />
              <p className="text-gray-500 text-sm sm:text-base">No recent scans</p>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">Start scanning student QR codes!</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-lg sm:rounded-xl hover:from-gray-100 hover:to-blue-100/50 transition-all duration-200 border border-gray-100 gap-3 sm:gap-4"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-100 to-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">{scan.student?.name}</p>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {scan.student?.rollNumber} • <span className="truncate">{scan.student?.department}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1 flex-shrink-0">
                    <div className="flex items-center gap-2 sm:gap-1 sm:flex-col sm:items-end">
                      <span
                        className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                          scan.scanType === 'check-in'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {scan.scanType === 'check-in' ? '✅ Check In' : '🚪 Check Out'}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">{scan.gate}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="whitespace-nowrap">{formatTime(scan.scanTime)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
