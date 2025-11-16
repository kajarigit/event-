import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import { Clock, Calendar, CheckCircle, LogOut, MapPin } from 'lucide-react';

export default function AttendanceHistory() {
  const [selectedEvent, setSelectedEvent] = useState('');

  // Fetch events
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await studentApi.getEvents({});
      return response.data?.data || response.data || [];
    },
  });

  // Fetch attendance history
  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance-history', selectedEvent],
    queryFn: async () => {
      if (!selectedEvent) return [];
      const response = await studentApi.getAttendance(selectedEvent);
      // Handle new backend format: { data: { attendances: [...], totalDurationSeconds: N } }
      const data = response.data?.data || response.data;
      return data?.attendances || data || [];
    },
    enabled: !!selectedEvent,
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true,
  });

  const formatDuration = (checkIn, checkOut) => {
    if (!checkOut) return 'Still checked in';
    const duration = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">My Attendance History</h2>
        <p className="text-gray-600 mt-1">View your check-in and check-out records</p>
      </div>

      {/* Event Filter */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Event
        </label>
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

      {/* Attendance List */}
      {selectedEvent && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Attendance Records</h3>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : attendanceData && attendanceData.length > 0 ? (
            <div className="space-y-3">
              {attendanceData.map((attendance) => (
                <div
                  key={attendance.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Event Info */}
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <h4 className="font-medium text-gray-900">
                          {attendance.event?.name}
                        </h4>
                      </div>

                      {/* Check-in Time */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span>Check-in:</span>
                        <span className="font-medium">
                          {new Date(attendance.checkInTime).toLocaleString()}
                        </span>
                      </div>

                      {/* Check-out Time */}
                      {attendance.checkOutTime ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                          <LogOut className="w-4 h-4 text-red-600" />
                          <span>Check-out:</span>
                          <span className="font-medium">
                            {new Date(attendance.checkOutTime).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-green-600 mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">Currently checked in</span>
                        </div>
                      )}

                      {/* Duration */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>Duration:</span>
                        <span className="font-medium">
                          {formatDuration(attendance.checkInTime, attendance.checkOutTime)}
                        </span>
                      </div>

                      {/* Gate Info */}
                      {attendance.gate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>Gate:</span>
                          <span>{attendance.gate}</span>
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div>
                      {attendance.checkOutTime ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No attendance records found for this event
            </div>
          )}
        </div>
      )}

      {!selectedEvent && (
        <div className="card text-center py-12 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select an event to view your attendance history</p>
        </div>
      )}
    </div>
  );
}
