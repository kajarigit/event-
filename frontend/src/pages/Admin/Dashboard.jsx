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
} from 'lucide-react';

// Admin sub-pages
import AdminOverview from './Overview';
import Events from './Events';
import Stalls from './Stalls';
import UsersManagement from './Users';
import Analytics from './Analytics';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Overview', path: '', icon: LayoutDashboard },
    { name: 'Events', path: 'events', icon: Calendar },
    { name: 'Stalls', path: 'stalls', icon: Building2 },
    { name: 'Users', path: 'users', icon: Users },
    { name: 'Analytics', path: 'analytics', icon: BarChart3 },
  ];

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-700 hover:bg-gray-100"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
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

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="p-4 sm:p-6 border-b">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">{user?.name}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{user?.email}</p>
        </div>

        <nav className="p-2 sm:p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
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
                      `flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg transition-colors text-sm sm:text-base ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                      }`
                    }
                  >
                    <Icon size={20} className="flex-shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 w-64 p-2 sm:p-4 border-t bg-white">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 w-full text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-sm sm:text-base font-medium"
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route index element={<AdminOverview />} />
            <Route path="events" element={<Events />} />
            <Route path="stalls" element={<Stalls />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
