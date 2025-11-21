import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Trophy, Award, Medal, Star, CheckCircle, AlertCircle, Filter } from 'lucide-react';

export default function StudentVoting() {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedStalls, setSelectedStalls] = useState({ 1: '', 2: '', 3: '' });
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

  // Fetch voting eligibility status
  const { data: votingEligibility, refetch: refetchEligibility } = useQuery({
    queryKey: ['votingEligibility', selectedEvent],
    queryFn: async () => {
      const response = await studentApi.getVotingEligibility(selectedEvent);
      return response.data?.data || {};
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
      refetchEligibility();
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

    // DEPARTMENT RESTRICTION: Students can only vote for stalls from their own department
    if (user?.department) {
      availableStalls = availableStalls.filter(stall => stall.department === user.department);
    }

    // NEW REQUIREMENT: Only show stalls that student has given feedback to
    if (votingEligibility?.eligibleStallIds) {
      availableStalls = availableStalls.filter(stall => 
        votingEligibility.eligibleStallIds.includes(stall.id)
      );
    }

    // Apply search filter (after department and feedback filters)
    if (searchFilter.trim()) {
      const search = searchFilter.toLowerCase();
      availableStalls = availableStalls.filter(stall =>
        stall.name?.toLowerCase().includes(search) ||
        stall.description?.toLowerCase().includes(search) ||
        stall.category?.toLowerCase().includes(search)
      );
    }

    return availableStalls;
  };

  // Get stalls count for user's department
  const departmentStallsCount = user?.department 
    ? stalls.filter(stall => stall.department === user.department).length 
    : stalls.length;

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
          {/* Department Restriction Notice */}
          {user?.department && (
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-blue-900 text-lg">Department Voting Restriction</h4>
                <p className="text-sm text-blue-800 mt-1">
                  You can only vote for stalls from your department: <span className="font-semibold">{user.department}</span>
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  📊 Available stalls from {user.department}: {departmentStallsCount} stall{departmentStallsCount !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-blue-600 mt-2 italic">
                  Note: Feedback can be given to any stall, but voting is restricted to your department.
                </p>
              </div>
            </div>
          )}

          {/* Voting Requirements & Eligibility */}
          {votingEligibility && (
            <div className={`border-2 rounded-lg p-4 flex items-start space-x-3 ${
              votingEligibility.votingUnlocked 
                ? 'bg-green-50 border-green-300'
                : 'bg-orange-50 border-orange-300'
            }`}>
              <div className={`w-6 h-6 mt-0.5 flex-shrink-0 ${
                votingEligibility.votingUnlocked 
                  ? 'text-green-600'
                  : 'text-orange-600'
              }`}>
                {votingEligibility.votingUnlocked ? <CheckCircle className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <h4 className={`font-bold text-lg ${
                  votingEligibility.votingUnlocked 
                    ? 'text-green-900'
                    : 'text-orange-900'
                }`}>
                  {votingEligibility.votingUnlocked ? '🔓 Voting Unlocked!' : '🔒 Voting Locked'}
                </h4>
                <p className={`text-sm mt-1 ${
                  votingEligibility.votingUnlocked 
                    ? 'text-green-800'
                    : 'text-orange-800'
                }`}>
                  {votingEligibility.message}
                </p>
                
                <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
                  <div className={`p-2 rounded ${
                    votingEligibility.votingUnlocked 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    <div className="font-semibold">Feedback Progress</div>
                    <div>{votingEligibility.feedbacksInOwnDept}/{votingEligibility.minimumRequired} feedbacks in {votingEligibility.studentDepartment}</div>
                  </div>
                  <div className={`p-2 rounded ${
                    votingEligibility.votesRemaining > 0 
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className="font-semibold">Votes Available</div>
                    <div>{votingEligibility.votesRemaining}/{votingEligibility.maxVotes} remaining</div>
                  </div>
                </div>

                {!votingEligibility.votingUnlocked && (
                  <div className="mt-3 p-3 bg-orange-100 rounded-lg">
                    <div className="text-xs text-orange-800">
                      <div className="font-semibold mb-1">To unlock voting:</div>
                      <div>1. ✅ Must be from same department (already met)</div>
                      <div>2. {votingEligibility.feedbacksInOwnDept >= 3 ? '✅' : '❌'} Give feedback to 3+ stalls in {votingEligibility.studentDepartment}</div>
                      <div>3. ✅ Must have given feedback to stall before voting for it</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Search Filter */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Search Stalls</h3>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by Name or Category
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

          {/* Check-in Status Warning */}
          {!status?.isCheckedIn && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-yellow-900 text-lg">Not Checked In</h4>
                <p className="text-sm text-yellow-800 mt-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-3 disabled:bg-gray-100 disabled:text-gray-500"
                  disabled={!status?.isCheckedIn || !votingEligibility?.votingUnlocked}
                >
                  <option value="">
                    {!votingEligibility?.votingUnlocked 
                      ? "-- Voting Locked (Need 3+ feedbacks) --"
                      : getAvailableStalls(rank).length === 0
                        ? "-- No eligible stalls (need feedback first) --"
                        : "-- Select Stall --"
                    }
                  </option>
                  {getAvailableStalls(rank).map((stall) => (
                    <option key={stall.id} value={stall.id}>
                      {stall.name} ({stall.department})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleSubmitVote(rank)}
                  disabled={
                    !selectedStalls[rank] || 
                    voteMutation.isLoading || 
                    !status?.isCheckedIn || 
                    !votingEligibility?.votingUnlocked ||
                    votingEligibility?.votesRemaining <= 0
                  }
                  className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  title={
                    !votingEligibility?.votingUnlocked 
                      ? "Complete 3+ feedbacks in your department to unlock voting"
                      : !status?.isCheckedIn 
                        ? "Must be checked in to vote"
                        : votingEligibility?.votesRemaining <= 0
                          ? "No votes remaining"
                          : ""
                  }
                >
                  {voteMutation.isLoading 
                    ? 'Submitting...' 
                    : !votingEligibility?.votingUnlocked
                      ? `🔒 Locked (Need ${3 - (votingEligibility?.feedbacksInOwnDept || 0)} more feedbacks)`
                      : votingEligibility?.votesRemaining <= 0
                        ? '❌ No votes remaining'
                        : `Vote for Rank ${rank}`
                  }
                </button>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div className="card bg-gray-50">
            <h3 className="font-semibold mb-2">New Voting Requirements:</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• <span className="font-semibold text-red-600">NEW:</span> Must give feedback to at least 3 stalls in your department ({user?.department || 'your department'}) before voting is unlocked</li>
              <li>• <span className="font-semibold text-red-600">NEW:</span> Can only vote for stalls you have already given feedback to</li>
              <li>• Must be from same department: You can only vote for stalls from {user?.department || 'your department'}</li>
              <li>• Select your top 3 favorite stalls (ranked voting)</li>
              <li>• Cannot vote for the same stall multiple times</li>
              <li>• Can change votes anytime before the event ends</li>
              <li>• Must be checked-in to vote</li>
            </ul>
            <div className="mt-3 p-3 bg-blue-100 rounded-lg">
              <div className="text-xs text-blue-800">
                <div className="font-semibold">💡 How to unlock voting:</div>
                <div>1. Visit stalls in your department and give feedback</div>
                <div>2. Complete at least 3 feedbacks in {user?.department || 'your department'}</div>
                <div>3. Return here to vote for those stalls</div>
              </div>
            </div>
          </div>

          {/* No Stalls Available Message */}
          {departmentStallsCount === 0 && stalls.length > 0 && (
            <div className="card text-center py-8 border-2 border-orange-200 bg-orange-50">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-orange-500" />
              <h4 className="font-semibold text-orange-900 text-lg mb-2">No Stalls from Your Department</h4>
              <p className="text-orange-800 text-sm">
                There are {stalls.length} total stalls, but none from your department ({user?.department}).
              </p>
              <p className="text-orange-700 text-xs mt-2">
                You can still give feedback to all stalls, but voting is restricted to your department only.
              </p>
            </div>
          )}
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
