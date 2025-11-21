import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import { useState, useEffect } from 'react';
import { Home, QrCode, Vote, MessageSquare, Clock, LogOut, Lock, Sparkles, CheckCircle2, AlertCircle, Moon, Sun, History } from 'lucide-react';

// Student sub-pages
import StudentHome from './Home';
import StudentQR from './QRCode';
import StudentVoting from './Voting';
import StudentFeedback from './Feedback';
import StudentAttendance from './Attendance';
import AttendanceHistory from './AttendanceHistory';
import StudentAttendanceSummary from './AttendanceSummary';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Fetch active events
  const { data: eventsData } = useQuery({
    queryKey: ['student-events-nav'],
    queryFn: async () => {
      let response = await studentApi.getEvents({ isActive: 'true', limit: 10 });
      let events = response.data?.data || response.data || [];
      if (events.length === 0) {
        response = await studentApi.getEvents({ limit: 10 });
        events = response.data?.data || response.data || [];
      }
      return events;
    },
  });

  // Fetch check-in status
  const { data: statusData } = useQuery({
    queryKey: ['student-checkin-status', selectedEvent],
    queryFn: async () => {
      const response = await studentApi.getStatus(selectedEvent);
      return response.data?.data || response.data || {};
    },
    enabled: !!selectedEvent,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const events = eventsData || [];
  const isCheckedIn = statusData?.isCheckedIn || false;

  // Auto-select first event
  useEffect(() => {
    if (events.length > 0 && !selectedEvent) {
      setSelectedEvent(events[0].id);
    }
  }, [events, selectedEvent]);

  // Redirect to QR page on first login if not checked in
  useEffect(() => {
    if (selectedEvent && !isCheckedIn && location.pathname === '/student') {
      navigate('/student/qr', { replace: true });
    }
  }, [selectedEvent, isCheckedIn, location.pathname, navigate]);

  const navItems = [
    { name: 'Home', path: '', icon: Home, requiresCheckin: false },
    { name: 'My QR', path: 'qr', icon: QrCode, requiresCheckin: false },
    { name: 'Voting', path: 'voting', icon: Vote, requiresCheckin: true },
    { name: 'Feedback', path: 'feedback', icon: MessageSquare, requiresCheckin: true },
    { name: 'Attendance', path: 'attendance', icon: Clock, requiresCheckin: false },
    { name: 'Summary', path: 'attendance-summary', icon: History, requiresCheckin: false },
    { name: 'History', path: 'history', icon: History, requiresCheckin: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900 transition-colors duration-500">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-400/20 dark:from-blue-600/10 dark:to-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-orange-400/20 dark:from-pink-600/10 dark:to-orange-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-green-400/10 to-blue-400/10 dark:from-green-600/5 dark:to-blue-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header - Mobile Responsive */}
      <header className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg border-b border-purple-100 dark:border-purple-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center py-3 sm:py-4 lg:py-6 gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg animate-pulse flex-shrink-0">
                <Sparkles className="text-white w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent animate-gradient">
                  Student Portal
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1 truncate">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span>
                  <span className="hidden sm:inline">Welcome back,</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400 truncate">{user?.name || 'Student'}</span>
                  <span className="hidden sm:inline">! 🎉</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2 lg:gap-3 flex-shrink-0">
              {/* Theme Toggle - Mobile Responsive */}
              <button
                onClick={toggleTheme}
                className="p-2 sm:p-2.5 lg:p-3 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-gray-700 dark:to-gray-600 rounded-lg sm:rounded-xl hover:from-purple-200 hover:to-pink-200 dark:hover:from-gray-600 dark:hover:to-gray-500 transition-all duration-300 shadow-lg hover:shadow-xl transform active:scale-95 sm:hover:scale-110 touch-manipulation"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="text-purple-600 dark:text-yellow-400 w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Sun className="text-yellow-400 w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
              
              <button
                onClick={logout}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-gradient-to-r from-gray-600 to-gray-700 dark:from-gray-700 dark:to-gray-800 text-white rounded-lg sm:rounded-xl hover:from-gray-700 hover:to-gray-800 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform active:scale-95 sm:hover:scale-105 touch-manipulation"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium text-sm sm:text-base hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        {/* Check-in Status Banner - Mobile Responsive */}
        {selectedEvent && (
          <div className={`mb-4 sm:mb-6 lg:mb-8 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border-2 shadow-xl transform transition-all duration-300 active:scale-[0.98] sm:hover:scale-[1.02] animate-fadeIn ${
            isCheckedIn 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-green-400 dark:border-green-600' 
              : 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 border-yellow-400 dark:border-yellow-600'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              {isCheckedIn ? (
                <>
                  <div className="relative flex-shrink-0">
                    <CheckCircle2 className="text-green-600 dark:text-green-400 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                    <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full animate-ping"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
                      ✨ You're Checked In!
                    </p>
                    <p className="text-sm sm:text-base text-green-700 dark:text-green-300 mt-1 leading-relaxed">
                      Awesome! You now have full access to voting and feedback features. Make your voice heard! 🎯
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative flex-shrink-0">
                    <AlertCircle className="text-yellow-600 dark:text-yellow-400 w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
                    <Lock className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/50 rounded-full p-0.5 w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-900 dark:text-yellow-100 flex items-center gap-2">
                      🔒 Check-in Required
                    </p>
                    <p className="text-sm sm:text-base text-yellow-700 dark:text-yellow-300 mt-1 leading-relaxed">
                      Please scan your QR code at the gate to unlock voting and feedback features. It only takes a moment! 📱
                    </p>
                  </div>
                  <NavLink
                    to="qr"
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 shadow-lg hover:shadow-xl transform active:scale-95 sm:hover:scale-105 whitespace-nowrap text-center touch-manipulation flex-shrink-0"
                  >
                    <span className="sm:hidden">Show My QR</span>
                    <span className="hidden sm:inline">Show QR Code</span>
                  </NavLink>
                </>
              )}
            </div>
          </div>
        )}

        {/* Navigation - Mobile Responsive */}
        <nav className="mb-4 sm:mb-6 lg:mb-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl p-2 sm:p-3 border border-purple-100 dark:border-purple-800 transition-colors duration-300 animate-slideUp">
          {/* Mobile: Horizontal scroll navigation */}
          <div className="sm:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isLocked = item.requiresCheckin && !isCheckedIn;
                
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === ''}
                    onClick={(e) => {
                      if (isLocked) {
                        e.preventDefault();
                      }
                    }}
                    className={({ isActive }) =>
                      `flex flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-lg transition-all duration-300 font-medium shadow-md active:scale-95 whitespace-nowrap flex-shrink-0 ${
                        isLocked
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60'
                          : isActive
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-300 dark:shadow-purple-900'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
                      }`
                    }
                  >
                    <Icon size={18} />
                    <span className="text-xs">{item.name}</span>
                    {isLocked && <Lock size={12} />}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Desktop: Grid navigation */}
          <ul className="hidden sm:flex flex-wrap gap-2 lg:gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isLocked = item.requiresCheckin && !isCheckedIn;
              
              return (
                <li key={item.path} className="flex-1 min-w-[120px] lg:min-w-[140px]">
                  <NavLink
                    to={item.path}
                    end={item.path === ''}
                    onClick={(e) => {
                      if (isLocked) {
                        e.preventDefault();
                      }
                    }}
                    className={({ isActive }) =>
                      `flex items-center justify-center gap-2 px-3 sm:px-4 lg:px-5 py-3 sm:py-4 rounded-lg sm:rounded-xl transition-all duration-300 font-semibold shadow-md hover:shadow-lg transform active:scale-95 sm:hover:scale-105 touch-manipulation ${
                        isLocked
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-60 active:scale-100 sm:hover:scale-100'
                          : isActive
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-purple-300 dark:shadow-purple-900'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/30 dark:hover:to-pink-900/30 border border-gray-200 dark:border-gray-600'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base">{item.name}</span>
                    {isLocked && <Lock className="w-3 h-3 sm:w-4 sm:h-4" />}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Content - Mobile Responsive */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 border border-purple-100 dark:border-purple-800 min-h-[400px] sm:min-h-[500px] transition-colors duration-300 animate-fadeIn">
          <Routes>
            <Route index element={<StudentHome />} />
            <Route path="qr" element={<StudentQR />} />
            <Route 
              path="voting" 
              element={
                isCheckedIn ? <StudentVoting /> : <Navigate to="/student/qr" replace />
              } 
            />
            <Route 
              path="feedback" 
              element={
                isCheckedIn ? <StudentFeedback /> : <Navigate to="/student/qr" replace />
              } 
            />
            <Route path="attendance" element={<StudentAttendance />} />
            <Route path="attendance-summary" element={<StudentAttendanceSummary />} />
            <Route path="history" element={<AttendanceHistory />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
