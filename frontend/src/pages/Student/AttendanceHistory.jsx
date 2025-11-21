import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import { Clock, Calendar, CheckCircle, LogOut, MapPin, AlertTriangle, XCircle } from 'lucide-react';

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

  const formatDuration = (seconds) => {
    if (!seconds) return '0h 0m';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDurationFromTimes = (checkIn, checkOut) => {
    if (!checkOut) return 'Still checked in';
    const duration = new Date(checkOut) - new Date(checkIn);
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getCheckoutInfo = (attendance) => {
    if (attendance.status === 'auto-checkout') {
      return {
        icon: AlertTriangle,
        iconColor: 'text-orange-600',
        label: 'Auto-checkout (Event ended)',
        time: attendance.eventStopTime 
          ? new Date(attendance.eventStopTime).toLocaleString()
          : (attendance.checkOutTime ? new Date(attendance.checkOutTime).toLocaleString() : 'Unknown'),
        bgColor: 'bg-orange-50',
        textColor: 'text-orange-800'
      };
    } else if (attendance.checkOutTime) {
      return {
        icon: LogOut,
        iconColor: 'text-gray-600',
        label: 'Manual checkout',
        time: new Date(attendance.checkOutTime).toLocaleString(),
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-800'
      };
    }
    return null;
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
              {attendanceData.map((attendance) => {
                const checkoutInfo = getCheckoutInfo(attendance);
                
                return (
                  <div
                    key={attendance.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {/* Event Info */}
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <h4 className="font-medium text-gray-900">
                            {attendance.event?.name}
                          </h4>
                        </div>

                        {/* Check-in Time */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>Check-in:</span>
                          <span className="font-medium">
                            {new Date(attendance.checkInTime).toLocaleString()}
                          </span>
                        </div>

                        {/* Check-out Time with enhanced display */}
                        {checkoutInfo ? (
                          <div className={`flex items-start gap-2 text-sm mb-2 p-2 rounded-lg ${checkoutInfo.bgColor}`}>
                            <checkoutInfo.icon className={`w-4 h-4 mt-0.5 ${checkoutInfo.iconColor}`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={checkoutInfo.textColor}>Check-out:</span>
                                <span className={`font-medium ${checkoutInfo.textColor}`}>
                                  {checkoutInfo.time}
                                </span>
                              </div>
                              <div className={`text-xs mt-1 ${checkoutInfo.textColor} italic`}>
                                {checkoutInfo.label}
                              </div>
                              {attendance.nullifiedReason && (
                                <div className="text-xs mt-1 text-red-600">
                                  Reason: {attendance.nullifiedReason}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-green-600 mb-2">
                            <Clock className="w-4 h-4" />
                            <span className="font-medium">Currently checked in</span>
                          </div>
                        )}

                        {/* Duration */}
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>Duration:</span>
                          <div className="flex-1">
                            {attendance.nullifiedDurationSeconds > 0 ? (
                              <div className="space-y-1">
                                <div className="font-medium text-green-700">
                                  {formatDuration(attendance.countableDurationSeconds)} (Countable)
                                </div>
                                <div className="text-xs text-gray-500">
                                  Total: {formatDuration(attendance.durationSeconds)} | 
                                  Nullified: <span className="text-orange-600">{formatDuration(attendance.nullifiedDurationSeconds)}</span>
                                </div>
                              </div>
                            ) : (
                              <span className="font-medium">
                                {attendance.durationSeconds 
                                  ? formatDuration(attendance.durationSeconds)
                                  : formatDurationFromTimes(attendance.checkInTime, attendance.checkOutTime)
                                }
                              </span>
                            )}
                          </div>
                          {attendance.isNullified && (
                            <span className="inline-flex items-center gap-1 ml-2 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              Nullified
                            </span>
                          )}
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
                        {attendance.status === 'auto-checkout' ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Auto Checkout
                          </span>
                        ) : attendance.checkOutTime ? (
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
                );
              })}
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
