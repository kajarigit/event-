import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { Users, Calendar, Building2, Activity } from 'lucide-react';

export default function AdminOverview() {
  const { data: eventsData } = useQuery({
    queryKey: ['admin-events'],
    queryFn: () => adminApi.getEvents({ limit: 5 }),
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.getUsers({ limit: 1 }),
  });

  const { data: stallsData } = useQuery({
    queryKey: ['admin-stalls'],
    queryFn: () => adminApi.getStalls({ limit: 1 }),
  });

  const events = eventsData?.data?.data || [];
  const totalUsers = usersData?.data?.total || 0;
  const totalStalls = stallsData?.data?.total || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-600 mt-2">Welcome to the Event Management System</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {eventsData?.data?.total || 0}
              </p>
            </div>
            <Calendar className="text-blue-600" size={40} />
          </div>
        </div>

        <div className="card bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{totalUsers}</p>
            </div>
            <Users className="text-green-600" size={40} />
          </div>
        </div>

        <div className="card bg-purple-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Stalls</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{totalStalls}</p>
            </div>
            <Building2 className="text-purple-600" size={40} />
          </div>
        </div>

        <div className="card bg-orange-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Events</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {events.filter((e) => e.isActive).length}
              </p>
            </div>
            <Activity className="text-orange-600" size={40} />
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Recent Events</h3>
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <h4 className="font-semibold text-gray-900">{event.name}</h4>
                  <p className="text-sm text-gray-600">
                    {new Date(event.startTime).toLocaleDateString()} -{' '}
                    {new Date(event.endTime).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    event.isActive
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {event.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No events found</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="btn-primary py-3">Create Event</button>
          <button className="btn-primary py-3">Add Stall</button>
          <button className="btn-primary py-3">Add User</button>
          <button className="btn-secondary py-3">View Analytics</button>
        </div>
      </div>
    </div>
  );
}
