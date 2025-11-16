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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Volunteer Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
              {user?.assignedGate && (
                <p className="text-sm text-blue-600">Assigned to: {user.assignedGate}</p>
              )}
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Scanner Section */}
        <Scanner onScanSuccess={refetch} />

        {/* Recent Scans Section */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-xl font-semibold mb-4">Recent Scans</h3>
          
          {recentScans.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No recent scans</p>
          ) : (
            <div className="space-y-2">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{scan.student?.name}</p>
                      <p className="text-sm text-gray-600">
                        {scan.student?.rollNumber} • {scan.student?.department}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 justify-end mb-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          scan.scanType === 'check-in'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {scan.scanType === 'check-in' ? 'Check In' : 'Check Out'}
                      </span>
                      <span className="text-xs text-gray-500">{scan.gate}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Clock size={14} />
                      {formatTime(scan.scanTime)}
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
