import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Building2,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Vote,
  TrendingUp,
  Activity,
  UserCheck,
} from 'lucide-react';

// Admin sub-pages
import AdminOverview from './Overview';
import Events from './Events';
import Stalls from './Stalls';
import UsersManagement from './Users';
import VolunteersManagement from './Volunteers';
import VolunteerScanTracking from './VolunteerScanTracking';
import Analytics from './Analytics';
import ComprehensiveAnalytics from './ComprehensiveAnalytics';
import SimpleAttendance from './SimpleAttendance';
import TopFeedbackGivers from './TopFeedbackGivers';
import TopStallsByDepartment from './TopStallsByDepartment';
import DepartmentAttendanceRankings from './DepartmentAttendanceRankings';
import ScanLogManagement from './ScanLogManagement';
import DetailedFeedbackRankings from './DetailedFeedbackRankings';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Overview', path: '', icon: LayoutDashboard },
    { name: 'Events', path: 'events', icon: Calendar },
    { name: 'Stalls', path: 'stalls', icon: Building2 },
    { name: 'Users', path: 'users', icon: Users },
    { name: 'Volunteers', path: 'volunteers', icon: UserCheck },
    { name: 'Volunteer Scanning', path: 'volunteer-tracking', icon: Activity },
    { name: 'Analytics', path: 'analytics', icon: BarChart3 },
    { name: 'Attendance Records', path: 'simple-attendance', icon: Users },
    { name: 'Top Feedback Givers', path: 'top-feedback', icon: MessageSquare },
    { name: 'Detailed Feedback Rankings', path: 'detailed-feedback', icon: BarChart3 },
    { name: 'Top Stalls Rankings', path: 'top-stalls-department', icon: Vote },
    { name: 'Department Attendance', path: 'department-attendance', icon: TrendingUp },
    { name: 'Scan Log Management', path: 'scan-logs', icon: Activity },
    { name: 'Attendance Detail', path: 'comprehensive-analytics', icon: BarChart3 },
  ];

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 flex">
      {/* Mobile Header - Enhanced */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-lg z-50 border-b border-gray-200">
        <div className="flex items-center justify-between p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="text-white w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-gray-900">Admin Panel</h1>
              <p className="text-xs text-gray-500 truncate max-w-[150px]">{user?.name}</p>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
          >
            {isSidebarOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar - Enhanced Mobile Responsive */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 sm:w-80 lg:w-64 bg-white/95 lg:bg-white backdrop-blur-md lg:backdrop-blur-none shadow-xl lg:shadow-lg 
          transform transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Desktop Header */}
        <div className="hidden lg:block p-4 sm:p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <LayoutDashboard className="text-white w-5 h-5" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Admin Panel</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 font-medium truncate">{user?.name}</p>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
        </div>

        <nav className="p-3 sm:p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          <ul className="space-y-1 sm:space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.path === ''}
                    onClick={() => setIsSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl transition-all duration-200 text-sm sm:text-base font-medium touch-manipulation ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 active:bg-gray-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`flex-shrink-0 w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                        <span>{item.name}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 w-full p-3 sm:p-4 border-t bg-white/80 backdrop-blur-sm">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 sm:px-4 py-3 w-full text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 text-sm sm:text-base font-medium touch-manipulation active:scale-95"
          >
            <LogOut className="flex-shrink-0 w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content - Enhanced Mobile Responsive */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0 bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="events" element={<Events />} />
            <Route path="stalls" element={<Stalls />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="volunteers" element={<VolunteersManagement />} />
            <Route path="volunteer-tracking" element={<VolunteerScanTracking />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="simple-attendance" element={<SimpleAttendance />} />
            <Route path="top-feedback" element={<TopFeedbackGivers />} />
            <Route path="detailed-feedback" element={<DetailedFeedbackRankings />} />
            <Route path="top-stalls-department" element={<TopStallsByDepartment />} />
            <Route path="department-attendance" element={<DepartmentAttendanceRankings />} />
            <Route path="scan-logs" element={<ScanLogManagement />} />
            <Route path="comprehensive-analytics" element={<ComprehensiveAnalytics />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
