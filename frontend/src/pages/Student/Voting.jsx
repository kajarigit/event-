import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Trophy, Award, Medal, Star, CheckCircle, AlertCircle, Filter } from 'lucide-react';

export default function StudentVoting() {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedStalls, setSelectedStalls] = useState({ 1: '', 2: '', 3: '' });
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch events (active or all)
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      // First try to get active events
      let response = await studentApi.getEvents({ isActive: 'true' });
      let events = response.data?.data || response.data || [];
      
      // If no active events found, get all events as fallback
      if (events.length === 0) {
        response = await studentApi.getEvents({});
        events = response.data?.data || response.data || [];
      }
      
      return events;
    },
  });

  // Fetch stalls for selected event
  const { data: stalls = [] } = useQuery({
    queryKey: ['stalls', selectedEvent],
    queryFn: async () => {
      const response = await studentApi.getStalls({ eventId: selectedEvent });
      return response.data?.data || response.data || [];
    },
    enabled: !!selectedEvent,
  });

  // Fetch current votes
  const { data: currentVotes = [], refetch: refetchVotes } = useQuery({
    queryKey: ['myVotes', selectedEvent],
    queryFn: async () => {
      const response = await studentApi.getMyVotes(selectedEvent);
      return response.data?.data || response.data || [];
    },
    enabled: !!selectedEvent,
  });

  // Fetch status to check if checked in
  const { data: status } = useQuery({
    queryKey: ['status', selectedEvent],
    queryFn: async () => {
      const response = await studentApi.getStatus(selectedEvent);
      return response.data?.data || response.data || {};
    },
    enabled: !!selectedEvent,
    refetchInterval: 5000, // Refresh every 5 seconds (faster for better UX)
    refetchOnWindowFocus: true, // Refresh when user returns to page
    staleTime: 0, // Always consider data stale, fetch on mount
  });

  // Cast vote mutation
  const voteMutation = useMutation({
    mutationFn: (voteData) => studentApi.castVote(voteData),
    onSuccess: () => {
      toast.success('Vote cast successfully!');
      refetchVotes();
      setSelectedStalls({ 1: '', 2: '', 3: '' });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to cast vote');
    },
  });

  // Auto-select first event
  useEffect(() => {
    if (events.length > 0 && !selectedEvent) {
      setSelectedEvent(events[0].id);
    }
  }, [events, selectedEvent]);

  // Pre-populate with existing votes (only when currentVotes changes, not selectedStalls)
  useEffect(() => {
    if (currentVotes.length > 0) {
      const voteMap = {};
      currentVotes.forEach((vote) => {
        voteMap[vote.rank] = vote.stallId.id;
      });
      setSelectedStalls(voteMap);
    } else {
      setSelectedStalls({ 1: '', 2: '', 3: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVotes.length, selectedEvent]); // Only trigger when votes count or event changes

  const handleSubmitVote = (rank) => {
    if (!selectedStalls[rank]) {
      toast.error('Please select a stall');
      return;
    }

    if (!status?.isCheckedIn) {
      toast.error('You must be checked in to vote');
      return;
    }

    voteMutation.mutate({
      eventId: selectedEvent,
      stallId: selectedStalls[rank],
      rank: parseInt(rank),
    });
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Award className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-orange-600" />;
      default:
        return <Star className="w-5 h-5" />;
    }
  };

  const getRankLabel = (rank) => {
    switch (rank) {
      case 1:
        return 'First Choice';
      case 2:
        return 'Second Choice';
      case 3:
        return 'Third Choice';
      default:
        return `Rank ${rank}`;
    }
  };

  const getAvailableStalls = (currentRank) => {
    // Filter out stalls already voted for in other ranks
    const votedStallIds = Object.entries(selectedStalls)
      .filter(([rank, stallId]) => rank != currentRank && stallId)
      .map(([_, stallId]) => stallId);

    let availableStalls = stalls.filter((stall) => !votedStallIds.includes(stall.id));

    // Apply department filter
    if (departmentFilter === 'my-department' && user?.department) {
      availableStalls = availableStalls.filter(stall => stall.department === user.department);
    } else if (departmentFilter !== 'all') {
      availableStalls = availableStalls.filter(stall => stall.department === departmentFilter);
    }

    // Apply search filter
    if (searchFilter.trim()) {
      const search = searchFilter.toLowerCase();
      availableStalls = availableStalls.filter(stall =>
        stall.name?.toLowerCase().includes(search) ||
        stall.description?.toLowerCase().includes(search) ||
        stall.category?.toLowerCase().includes(search) ||
        stall.department?.toLowerCase().includes(search)
      );
    }

    return availableStalls;
  };

  // Get unique departments from stalls for filter
  const departments = [...new Set(stalls.map(stall => stall.department).filter(Boolean))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Cast Your Votes</h2>
        <p className="text-gray-600 mt-1">Vote for your favorite stalls (Top 3)</p>
      </div>

      {/* Event Selector */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Event
        </label>
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">-- Select Event --</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </div>

      {selectedEvent && (
        <>
          {/* Filters */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Filter Stalls</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Departments</option>
                  {user?.department && (
                    <option value="my-department">My Department ({user.department})</option>
                  )}
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search by name, category..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Check-in Status Warning */}
          {!status?.isCheckedIn && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">Not Checked In</h4>
                <p className="text-sm text-yellow-800">
                  You must check-in to the event before voting. Show your QR code at the
                  gate to check in.
                </p>
              </div>
            </div>
          )}

          {/* Current Votes Summary */}
          {currentVotes.length > 0 && (
            <div className="card bg-blue-50 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                Your Current Votes
              </h3>
              <div className="space-y-2">
                {currentVotes.map((vote) => (
                  <div
                    key={vote.id}
                    className="flex items-center justify-between bg-white p-3 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {getRankIcon(vote.rank)}
                      <div>
                        <p className="font-medium">{vote.stallId.name}</p>
                        <p className="text-sm text-gray-600">
                          {vote.stallId.department}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {getRankLabel(vote.rank)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-700 mt-3">
                You can change your votes by selecting different stalls below.
              </p>
            </div>
          )}

          {/* Voting Forms */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((rank) => (
              <div key={rank} className="card">
                <div className="flex items-center space-x-2 mb-4">
                  {getRankIcon(rank)}
                  <h3 className="font-semibold text-lg">{getRankLabel(rank)}</h3>
                </div>

                <select
                  value={selectedStalls[rank] || ''}
                  onChange={(e) =>
                    setSelectedStalls({ ...selectedStalls, [rank]: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3"
                  disabled={!status?.isCheckedIn}
                >
                  <option value="">-- Select Stall --</option>
                  {getAvailableStalls(rank).map((stall) => (
                    <option key={stall.id} value={stall.id}>
                      {stall.name} ({stall.department})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleSubmitVote(rank)}
                  disabled={!selectedStalls[rank] || voteMutation.isLoading || !status?.isCheckedIn}
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {voteMutation.isLoading ? 'Submitting...' : `Vote for Rank ${rank}`}
                </button>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="card bg-gray-50">
            <h3 className="font-semibold mb-2">Voting Instructions:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Select your top 3 favorite stalls</li>
              <li>• Rank 1 gets 3 points, Rank 2 gets 2 points, Rank 3 gets 1 point</li>
              <li>• You cannot vote for the same stall multiple times</li>
              <li>• You can change your votes anytime before the event ends</li>
              <li>• Must be checked-in to vote</li>
            </ul>
          </div>

          {/* Available Stalls */}
          {stalls.length === 0 && (
            <div className="card text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No stalls available for this event</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
