import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApi } from '../../services/api';
import AttendanceSummaryTable from '../../components/attendance/AttendanceSummaryTable';
import { WarningAlert, LoadingSpinner } from '../../components/ui/UIComponents';
import { Calendar, Clock, Users, AlertTriangle } from 'lucide-react';

const EventAttendanceManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const selectedEventId = searchParams.get('eventId');

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getEvents();
      setEvents(response.data.data || []);
      
      // Auto-select event if specified in URL params
      if (selectedEventId) {
        const event = response.data.data.find(e => e.id.toString() === selectedEventId);
        if (event) {
          setSelectedEvent(event);
        }
      }
      setError(null);
    } catch (err) {
      setError('Failed to load events');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [selectedEventId]);

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setSearchParams({ eventId: event.id });
  };

  const getEventStatus = (event) => {
    const now = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);

    if (now < startDate) return 'upcoming';
    if (now > endDate) return 'ended';
    return 'ongoing';
  };

  const getEventStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'ongoing': return 'text-green-600 bg-green-50 border-green-200';
      case 'ended': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <LoadingSpinner size="lg" className="py-12" />
          <p className="text-center text-gray-500 mt-4">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <WarningAlert
          type="error"
          message={error}
          severity="error"
          onDismiss={() => setError(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              Event Attendance Management
            </h1>
            <p className="text-gray-600 mt-2">
              Monitor and track student attendance across events with detailed analytics
            </p>
          </div>
          {selectedEvent && (
            <div className="text-right">
              <div className="text-sm text-gray-500">Selected Event</div>
              <div className="font-medium text-gray-900">{selectedEvent.name}</div>
              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border mt-1 ${getEventStatusColor(getEventStatus(selectedEvent))}`}>
                {getEventStatus(selectedEvent)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Event Selection */}
      {!selectedEvent && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Select an Event</h2>
          {events.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <div className="text-gray-500 text-lg">No events found</div>
              <div className="text-sm text-gray-400 mt-2">
                Create events in the Events section to view attendance data.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => {
                const status = getEventStatus(event);
                return (
                  <div
                    key={event.id}
                    onClick={() => handleEventSelect(event)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-medium text-gray-900 truncate flex-1">{event.name}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ml-2 ${getEventStatusColor(status)}`}>
                        {status}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                      </div>
                      {event.description && (
                        <p className="text-sm text-gray-500 truncate">{event.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Event Selection Controls */}
      {selectedEvent && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  setSearchParams({});
                }}
                className="text-blue-600 hover:text-blue-500 text-sm font-medium"
              >
                ← Back to Events
              </button>
              <div className="text-sm text-gray-500">|</div>
              <div className="text-sm text-gray-900">
                <strong>{selectedEvent.name}</strong> - Attendance Summary
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                {new Date(selectedEvent.startDate).toLocaleDateString()} - {new Date(selectedEvent.endDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Summary Table */}
      {selectedEvent && (
        <>
          {/* Info Alert for ended events */}
          {getEventStatus(selectedEvent) === 'ended' && (
            <WarningAlert
              type="info"
              message="This event has ended. All attendance records show final data including any nullified sessions from improper checkouts."
              severity="info"
            />
          )}

          {/* Warning Alert for ongoing events */}
          {getEventStatus(selectedEvent) === 'ongoing' && (
            <WarningAlert
              type="warning"
              message="This event is currently ongoing. Attendance data is live and will update as students check in/out. Nullified sessions will appear when the event ends if students don't check out properly."
              severity="warning"
            />
          )}

          <AttendanceSummaryTable eventId={selectedEvent.id} />
        </>
      )}
    </div>
  );
};

export default EventAttendanceManagement;