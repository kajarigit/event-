import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit2,
  Trash2,
  Calendar,
  MapPin,
  Clock,
  ToggleLeft,
  ToggleRight,
  X,
  Play,
  Square,
} from 'lucide-react';

export default function Events() {
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    venue: '',
  });
  const queryClient = useQueryClient();

  // Fetch events
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['adminEvents'],
    queryFn: async () => {
      const response = await adminApi.getEvents();
      // API returns { success: true, data: [...] }
      return response.data?.data || response.data || [];
    },
  });

  // Create event mutation
  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createEvent(data),
    onSuccess: () => {
      toast.success('Event created successfully!');
      queryClient.invalidateQueries(['adminEvents']);
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create event');
    },
  });

  // Update event mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateEvent(id, data),
    onSuccess: () => {
      toast.success('Event updated successfully!');
      queryClient.invalidateQueries(['adminEvents']);
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update event');
    },
  });

  // Delete event mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteEvent(id),
    onSuccess: () => {
      toast.success('Event deleted successfully!');
      queryClient.invalidateQueries(['adminEvents']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete event');
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: (id) => adminApi.toggleEventActive(id),
    onSuccess: () => {
      toast.success('Event status updated!');
      queryClient.invalidateQueries(['adminEvents']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });

  // Manually start event mutation
  const startMutation = useMutation({
    mutationFn: (id) => adminApi.manuallyStartEvent(id),
    onSuccess: () => {
      toast.success('Event started manually!');
      queryClient.invalidateQueries(['adminEvents']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to start event');
    },
  });

  // Manually end event mutation
  const endMutation = useMutation({
    mutationFn: (id) => adminApi.manuallyEndEvent(id),
    onSuccess: () => {
      toast.success('Event ended manually!');
      queryClient.invalidateQueries(['adminEvents']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to end event');
    },
  });

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      venue: '',
    });
    setShowModal(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setFormData({
      name: event.name,
      description: event.description || '',
      // Backend sends startTime/endTime, map to frontend startDate/endDate
      startDate: event.startTime ? new Date(event.startTime).toISOString().slice(0, 16) : '',
      endDate: event.endTime ? new Date(event.endTime).toISOString().slice(0, 16) : '',
      venue: event.venue || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      venue: '',
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Map frontend field names to backend field names
    const eventData = {
      name: formData.name,
      description: formData.description,
      startTime: formData.startDate, // Backend expects startTime
      endTime: formData.endDate,     // Backend expects endTime
      venue: formData.venue,
    };

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: eventData });
    } else {
      createMutation.mutate(eventData);
    }
  };

  const handleDelete = (event) => {
    if (window.confirm(`Are you sure you want to delete "${event.name}"?`)) {
      deleteMutation.mutate(event.id);
    }
  };

  const handleToggle = (event) => {
    toggleMutation.mutate(event.id);
  };

  const handleManualStart = (event) => {
    if (window.confirm(`Manually start "${event.name}" now? This overrides the scheduled start time.`)) {
      startMutation.mutate(event.id);
    }
  };

  const handleManualEnd = (event) => {
    if (window.confirm(`Manually end "${event.name}" now? This will prevent all further check-ins.`)) {
      endMutation.mutate(event.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Events Management</h2>
          <p className="text-gray-600 mt-1">Create and manage events</p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>Add Event</span>
        </button>
      </div>

      {/* Events Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">No events yet</p>
            <p className="text-sm">Click "Add Event" to create your first event</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stats
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{event.name}</div>
                        {event.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {event.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex items-center space-x-1 mb-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>
                          {event.startTime
                            ? new Date(event.startTime).toLocaleString()
                            : 'Not set'}
                        </span>
                      </div>
                      {event.endTime && (
                        <div className="text-xs text-gray-500">
                          to {new Date(event.endTime).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {event.venue && (
                        <div className="flex items-center space-x-1">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{event.venue}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggle(event)}
                        className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
                          event.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {event.isActive ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                        <span>{event.isActive ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="space-y-1">
                        <div>Attendees: {event.stats?.totalAttendees || 0}</div>
                        <div>Votes: {event.stats?.totalVotes || 0}</div>
                        <div>Feedbacks: {event.stats?.totalFeedbacks || 0}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {/* Manual Start Button */}
                        {!event.manuallyStarted && !event.manuallyEnded && (
                          <button
                            onClick={() => handleManualStart(event)}
                            className="text-green-600 hover:text-green-900 flex items-center gap-1 px-2 py-1 border border-green-300 rounded hover:bg-green-50"
                            title="Start Event Now"
                          >
                            <Play className="w-4 h-4" />
                            <span className="text-xs">Start</span>
                          </button>
                        )}
                        
                        {/* Manual End Button */}
                        {event.manuallyStarted && !event.manuallyEnded && (
                          <button
                            onClick={() => handleManualEnd(event)}
                            className="text-red-600 hover:text-red-900 flex items-center gap-1 px-2 py-1 border border-red-300 rounded hover:bg-red-50"
                            title="End Event Now"
                          >
                            <Square className="w-4 h-4" />
                            <span className="text-xs">End</span>
                          </button>
                        )}
                        
                        {/* Status badges */}
                        {event.manuallyStarted && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Live
                          </span>
                        )}
                        {event.manuallyEnded && (
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            Ended
                          </span>
                        )}
                        
                        <button
                          onClick={() => openEditModal(event)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(event)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue
                </label>
                <input
                  type="text"
                  value={formData.venue}
                  onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Main Auditorium"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {createMutation.isLoading || updateMutation.isLoading
                    ? 'Saving...'
                    : editingEvent
                    ? 'Update Event'
                    : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
