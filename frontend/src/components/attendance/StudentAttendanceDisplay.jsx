import React, { useState, useEffect } from 'react';
import { studentApi } from '../../services/api';
import { formatDuration, formatDetailedDuration, formatTimeAgo } from '../../utils/timeUtils';
import { StatusBadge, WarningAlert, LoadingSpinner, AttendanceCard } from '../ui/UIComponents';

const StudentAttendanceDisplay = ({ studentId }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const loadAttendanceSummary = async () => {
    try {
      setLoading(true);
      const response = await studentApi.getAttendanceSummary(studentId);
      setSummary(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load attendance summary');
      console.error('Error loading attendance summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      loadAttendanceSummary();
    }
  }, [studentId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSpinner size="lg" className="py-12" />
        <p className="text-center text-gray-500">Loading your attendance records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <WarningAlert
        type="error"
        message={error}
        severity="error"
        onDismiss={() => setError(null)}
      />
    );
  }

  if (!summary || !summary.events || summary.events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 text-lg">No attendance records found</div>
        <div className="text-sm text-gray-400 mt-2">
          You haven't checked into any events yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Statistics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Overall Attendance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm font-medium text-gray-600">Total Events Attended</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{summary.overallStats.totalEvents}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600">Total Valid Time</div>
            <div className="text-2xl font-bold text-green-600 mt-1">
              {formatDetailedDuration(summary.overallStats.totalValidDuration)}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600">Time Lost (Nullified)</div>
            <div className="text-2xl font-bold text-orange-600 mt-1">
              {formatDetailedDuration(summary.overallStats.totalNullifiedDuration)}
            </div>
          </div>
        </div>

        {/* Warning for nullified time */}
        {summary.overallStats.totalNullifiedDuration > 0 && (
          <WarningAlert
            type="warning"
            severity="warning"
            message={`You have ${formatDetailedDuration(summary.overallStats.totalNullifiedDuration)} of nullified attendance time due to improper checkouts.`}
            className="mt-4"
          />
        )}
      </div>

      {/* Event-wise Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Event-wise Attendance</h3>
          <p className="text-sm text-gray-500 mt-1">
            Click on an event to view detailed attendance sessions
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {summary.events.map((event) => (
            <div key={event.eventId} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-lg font-medium text-gray-900">{event.eventName}</h4>
                    <StatusBadge 
                      status={event.hasImproperCheckouts ? 'warning' : 'success'} 
                      label={event.hasImproperCheckouts ? 'Has Issues' : 'Clean Record'}
                    />
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Event Duration: {event.eventStartDate} - {event.eventEndDate}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEvent(selectedEvent === event.eventId ? null : event.eventId)}
                  className="text-blue-600 hover:text-blue-500 text-sm font-medium"
                >
                  {selectedEvent === event.eventId ? 'Hide Details' : 'View Details'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                <AttendanceCard
                  title="Valid Time"
                  value={event.totalValidDurationFormatted}
                  subtitle={`${event.validSessions} sessions`}
                  color="green"
                />
                <AttendanceCard
                  title="Nullified Time"
                  value={event.totalNullifiedDurationFormatted}
                  subtitle={`${event.nullifiedSessions} sessions`}
                  color={event.totalNullifiedDuration > 0 ? "orange" : "gray"}
                />
                <AttendanceCard
                  title="Total Sessions"
                  value={event.totalSessions.toString()}
                  subtitle="check-ins"
                  color="blue"
                />
                <AttendanceCard
                  title="Last Activity"
                  value={formatTimeAgo(event.lastCheckInTime)}
                  subtitle="ago"
                  color="gray"
                />
              </div>

              {/* Warning for this event */}
              {event.hasImproperCheckouts && (
                <WarningAlert
                  type="warning"
                  severity="warning"
                  message={`Some of your attendance sessions for this event were nullified due to improper checkout. Please ensure you properly check out after each event.`}
                  className="mt-4"
                />
              )}

              {/* Detailed Sessions */}
              {selectedEvent === event.eventId && event.sessions && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <h5 className="text-base font-medium text-gray-900 mb-4">Attendance Sessions</h5>
                  <div className="space-y-4">
                    {event.sessions.map((session, index) => (
                      <div 
                        key={session.id} 
                        className={`border rounded-lg p-4 ${session.isNullified ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h6 className="text-sm font-medium text-gray-900">
                                Session #{index + 1}
                              </h6>
                              <StatusBadge 
                                status={session.isNullified ? 'nullified' : 'valid'} 
                                label={session.isNullified ? 'Nullified' : 'Valid'}
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                              <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Check In</div>
                                <div className="text-sm text-gray-900 mt-1">
                                  {new Date(session.checkInTime).toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Check Out</div>
                                <div className="text-sm text-gray-900 mt-1">
                                  {session.checkOutTime 
                                    ? new Date(session.checkOutTime).toLocaleString()
                                    : session.eventStopTime
                                    ? `Auto-checkout: ${new Date(session.eventStopTime).toLocaleString()}`
                                    : 'Still checked in'
                                  }
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-6 mt-3">
                              <div>
                                <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Duration</div>
                                <div className={`text-sm font-medium mt-1 ${session.isNullified ? 'text-orange-600' : 'text-green-600'}`}>
                                  {session.durationFormatted}
                                </div>
                              </div>
                              {session.isNullified && (
                                <div>
                                  <div className="text-xs text-gray-500 uppercase tracking-wider font-medium">Reason</div>
                                  <div className="text-sm text-orange-600 mt-1">
                                    {session.nullifiedReason || 'Event stopped without proper checkout'}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tips for better attendance */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h3 className="text-base font-medium text-blue-900 mb-3">💡 Tips for Perfect Attendance</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>• Always remember to check out properly after each event session</li>
          <li>• If you forget to check out, your time will be nullified when the event ends</li>
          <li>• Use the mobile app for easier QR code scanning</li>
          <li>• Contact event administrators if you have issues with your attendance</li>
        </ul>
      </div>
    </div>
  );
};

export default StudentAttendanceDisplay;