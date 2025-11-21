import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import { Clock, Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

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
  const totalCountableDuration = attendanceData?.totalCountableDurationSeconds || 0;
  const totalNullifiedDuration = attendanceData?.totalNullifiedDurationSeconds || 0;
  const hasNullifiedTime = attendanceData?.hasNullifiedTime || false;

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusInfo = (record) => {
    switch (record.status) {
      case 'checked-in':
        return {
          label: 'Currently Checked In',
          badge: 'bg-green-100 text-green-800',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        };
      case 'auto-checkout':
        return {
          label: 'Auto Checkout (Event Ended)',
          badge: 'bg-orange-100 text-orange-800',
          icon: AlertTriangle,
          iconColor: 'text-orange-600'
        };
      case 'checked-out':
      default:
        return {
          label: 'Manual Checkout',
          badge: 'bg-gray-100 text-gray-800',
          icon: XCircle,
          iconColor: 'text-gray-600'
        };
    }
  };

  const getCheckoutDisplay = (record) => {
    if (record.status === 'auto-checkout' && record.eventStopTime) {
      return {
        time: new Date(record.eventStopTime).toLocaleString(),
        reason: record.nullifiedReason || 'Event ended by admin'
      };
    } else if (record.outTimestamp) {
      return {
        time: new Date(record.outTimestamp).toLocaleString(),
        reason: 'Normal checkout'
      };
    }
    return {
      time: 'Not checked out',
      reason: 'Still active'
    };
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
              <div className="flex-1">
                <p className="text-sm text-blue-800 mb-1">Total Time Spent</p>
                {hasNullifiedTime ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatDuration(totalCountableDuration)}
                      <span className="text-sm font-normal text-blue-700 ml-2">(Countable)</span>
                    </p>
                    <div className="text-sm text-orange-600 flex items-center gap-1">
                      <AlertTriangle size={14} />
                      <span>
                        Total: {formatDuration(totalDuration)} | 
                        Nullified: {formatDuration(totalNullifiedDuration)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-blue-600">
                    {formatDuration(totalDuration)}
                  </p>
                )}
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
            {attendances.map((record, index) => {
              const statusInfo = getStatusInfo(record);
              const checkoutInfo = getCheckoutDisplay(record);
              const StatusIcon = statusInfo.icon;
              
              return (
                <div key={record.id || index} className="border rounded-lg p-4 bg-white shadow-sm">
                  {/* Header with status */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`w-5 h-5 ${statusInfo.iconColor}`} />
                      <div>
                        <p className="font-medium text-gray-900">
                          {statusInfo.label}
                        </p>
                        {record.gate && (
                          <p className="text-sm text-gray-600">Gate: {record.gate}</p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.badge}`}>
                      {record.status === 'auto-checkout' ? 'Auto Checkout' : 
                       record.status === 'checked-in' ? 'Active' : 'Completed'}
                    </span>
                  </div>

                  {/* Attendance details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-green-800 font-medium">Check-in</p>
                      <p className="text-green-900 mt-1">
                        {new Date(record.inTimestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className={`p-3 rounded-lg ${
                      record.status === 'auto-checkout' ? 'bg-orange-50' : 
                      record.status === 'checked-in' ? 'bg-blue-50' : 'bg-gray-50'
                    }`}>
                      <p className={`font-medium ${
                        record.status === 'auto-checkout' ? 'text-orange-800' : 
                        record.status === 'checked-in' ? 'text-blue-800' : 'text-gray-800'
                      }`}>
                        Check-out
                      </p>
                      <p className={`mt-1 ${
                        record.status === 'auto-checkout' ? 'text-orange-900' : 
                        record.status === 'checked-in' ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {checkoutInfo.time}
                      </p>
                      {record.status === 'auto-checkout' && (
                        <p className="text-xs text-orange-700 mt-1 italic">
                          {checkoutInfo.reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Duration and additional info */}
                  {record.durationSeconds && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex-1">
                          {record.nullifiedDurationSeconds > 0 ? (
                            <div className="space-y-1">
                              <div className="text-gray-600">
                                Countable: <span className="font-medium text-green-700">{formatDuration(record.countableDurationSeconds)}</span>
                              </div>
                              <div className="text-xs text-gray-500">
                                Total: {formatDuration(record.durationSeconds)} | 
                                Nullified: <span className="text-orange-600">{formatDuration(record.nullifiedDurationSeconds)}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-600">
                              Duration: <span className="font-medium">{formatDuration(record.durationSeconds)}</span>
                            </span>
                          )}
                        </div>
                        {record.isNullified && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Nullified
                          </span>
                        )}
                      </div>
                      {record.isNullified && record.nullifiedReason && (
                        <p className="text-xs text-red-600 mt-2 italic">
                          {record.nullifiedReason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
