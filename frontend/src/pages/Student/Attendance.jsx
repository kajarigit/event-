import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import { Clock, Calendar } from 'lucide-react';

export default function StudentAttendance() {
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'active'],
    queryFn: async () => {
      // First try to get active events
      let response = await studentApi.getEvents({ isActive: 'true', limit: 10 });
      let events = response.data?.data || response.data || [];
      
      // If no active events found, get all events as fallback
      if (events.length === 0) {
        response = await studentApi.getEvents({ limit: 10 });
        events = response.data?.data || response.data || [];
      }
      
      return events;
    },
  });

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['student-attendance', selectedEvent],
    queryFn: async () => {
      const response = await studentApi.getAttendance(selectedEvent);
      return response.data?.data || response.data || { attendances: [], totalDurationSeconds: 0 };
    },
    enabled: !!selectedEvent,
  });

  const events = eventsData || [];
  const attendances = attendanceData?.attendances || attendanceData || [];
  const totalDuration = attendanceData?.totalDurationSeconds || 0;

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">My Attendance</h2>

        {/* Event Selector */}
        {events.length > 0 && (
          <div className="mb-6">
            <label className="label">Select Event</label>
            <select
              className="input-field"
              value={selectedEvent || ''}
              onChange={(e) => setSelectedEvent(e.target.value)}
            >
              <option value="">Choose an event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Total Duration */}
        {selectedEvent && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <div className="flex items-center gap-3">
              <Clock className="text-blue-600" size={32} />
              <div>
                <p className="text-sm text-blue-800">Total Time Spent</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatDuration(totalDuration)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Records */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!isLoading && attendances.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700">Check-in History</h3>
            {attendances.map((record, index) => (
              <div key={record.id || index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900">
                      {record.status === 'checked-in' ? 'Currently Checked In' : 'Completed Visit'}
                    </p>
                    {record.gate && (
                      <p className="text-sm text-gray-600">Gate: {record.gate}</p>
                    )}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      record.status === 'checked-in'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {record.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Check-in</p>
                    <p className="font-medium">
                      {new Date(record.inTimestamp).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Check-out</p>
                    <p className="font-medium">
                      {record.outTimestamp
                        ? new Date(record.outTimestamp).toLocaleString()
                        : 'Not checked out'}
                    </p>
                  </div>
                </div>

                {record.durationSeconds && (
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-sm text-gray-600">
                      Duration: <span className="font-medium">{formatDuration(record.durationSeconds)}</span>
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!isLoading && selectedEvent && attendances.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Calendar size={48} className="mx-auto mb-4 opacity-50" />
            <p>No attendance records found for this event</p>
          </div>
        )}
      </div>
    </div>
  );
}
