import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import { CheckCircle, XCircle, Users, Building2, Vote, MessageSquare, Calendar, Trophy, Sparkles, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function StudentHome() {
  const { user } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Fetch active events (or all events if none are active)
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

  // Fetch student status for selected event
  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['student-status', selectedEvent],
    queryFn: async () => {
      const mod = await import('../../services/api');
      const response = await mod.studentApi.getStatus(selectedEvent);
      return response.data?.data || response.data || {};
    },
    enabled: !!selectedEvent,
  });

  useEffect(() => {
    if (eventsData?.length > 0 && !selectedEvent) {
      setSelectedEvent(eventsData[0].id);
    }
  }, [eventsData, selectedEvent]);

  useEffect(() => {
    // Refresh status every 30 seconds
    const interval = setInterval(() => {
      if (selectedEvent) {
        refetchStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedEvent, refetchStatus]);

  const status = statusData;
  const events = eventsData || [];

  return (
    <div className="space-y-8">
      {/* Welcome Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 p-8 shadow-2xl animate-fadeIn">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="text-yellow-300 animate-pulse" size={32} />
            <h2 className="text-3xl font-bold text-white">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Student'}! 👋
            </h2>
          </div>
          <p className="text-white/90 text-lg mb-6 max-w-2xl">
            Welcome to your event dashboard! Here you can participate in exciting activities, cast your votes, and share your valuable feedback. Let's make this event amazing together! 🎊
          </p>
          
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/30">
              <p className="text-white/80 text-sm">Current Status</p>
              <p className="text-white font-bold text-lg">
                {status?.isCheckedIn ? '✅ Checked In' : '⏳ Awaiting Check-in'}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/30">
              <p className="text-white/80 text-sm">Participation</p>
              <p className="text-white font-bold text-lg">
                {status?.votesCount || 0} Votes • {status?.feedbacksGiven || 0} Feedbacks
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* No Events Message */}
      {events.length === 0 && (
        <div className="card border-2 border-dashed border-gray-300">
          <div className="text-center py-16">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 max-w-md mx-auto shadow-lg">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Calendar className="text-white" size={40} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Events Available</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                There are currently no active events. Don't worry! New exciting events will be announced soon. Stay tuned! 🚀
              </p>
              <div className="bg-blue-100 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">💡 What happens next?</p>
                <p>When events are created, you'll be able to participate in voting, give feedback, and much more!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Selector */}
      {events.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg">
          <label className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="text-indigo-600" size={24} />
            Select Active Event
          </label>
          <select
            className="w-full px-6 py-4 bg-white border-2 border-indigo-300 rounded-xl text-gray-900 font-semibold focus:ring-4 focus:ring-indigo-200 focus:border-indigo-500 transition-all cursor-pointer shadow-md"
            value={selectedEvent || ''}
            onChange={(e) => setSelectedEvent(e.target.value)}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                🎪 {event.name} - {new Date(event.startTime).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Check-in Status */}
          <div className={`card shadow-xl border-2 transition-all duration-300 hover:scale-105 ${
            status.isCheckedIn 
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300' 
              : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-300'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Check-in Status</p>
                <p className="text-2xl font-bold mt-2">
                  {status.isCheckedIn ? (
                    <span className="text-green-600">Checked In ✓</span>
                  ) : (
                    <span className="text-gray-400">Not Yet</span>
                  )}
                </p>
              </div>
              <div className={`p-3 rounded-2xl ${status.isCheckedIn ? 'bg-green-200' : 'bg-gray-200'}`}>
                {status.isCheckedIn ? (
                  <CheckCircle className="text-green-600" size={40} />
                ) : (
                  <XCircle className="text-gray-400" size={40} />
                )}
              </div>
            </div>
          </div>

          {/* Votes Cast */}
          <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Votes Cast</p>
                <p className="text-2xl font-bold text-blue-600 mt-2">
                  {status.votesCount} / 3
                </p>
                <div className="mt-2 bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-500"
                    style={{ width: `${(status.votesCount / 3) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="p-3 bg-blue-200 rounded-2xl">
                <Vote className="text-blue-600" size={40} />
              </div>
            </div>
          </div>

          {/* Feedbacks Given */}
          <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600">Feedbacks Given</p>
                <p className="text-2xl font-bold text-purple-600 mt-2">
                  {status.feedbacksGiven}
                </p>
                <p className="text-xs text-purple-500 mt-1">Keep sharing! 💬</p>
              </div>
              <div className="p-3 bg-purple-200 rounded-2xl">
                <MessageSquare className="text-purple-600" size={40} />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-300 shadow-xl transition-all duration-300 hover:scale-105">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
                <Trophy className="text-orange-600" size={20} />
                Quick Actions
              </p>
              <div className="space-y-2">
                <button
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                  onClick={() => (window.location.href = '/student/qr')}
                >
                  View My QR
                  <ArrowRight size={18} />
                </button>
                {status.isCheckedIn && status.votesCount < 3 && (
                  <button
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                    onClick={() => (window.location.href = '/student/voting')}
                  >
                    Cast Votes
                    <Vote size={18} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Votes */}
      {status?.votes && status.votes.length > 0 && (
        <div className="card bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-300 shadow-xl">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 text-gray-900">
            <Trophy className="text-yellow-500" size={28} />
            Your Current Votes
          </h3>
          <div className="space-y-3">
            {status.votes.map((vote, index) => (
              <div key={vote.rank} className="flex items-center justify-between p-5 bg-white rounded-xl shadow-md border-2 border-indigo-200 transform transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-lg ${
                    vote.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                    vote.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                    'bg-gradient-to-br from-orange-400 to-red-500'
                  }`}>
                    {vote.rank}
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">
                      {vote.rank === 1 ? '🥇 First Choice' : vote.rank === 2 ? '🥈 Second Choice' : '🥉 Third Choice'}
                    </p>
                    <p className="text-lg font-bold text-gray-900">{vote.stall?.name || 'Loading...'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="card bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-yellow-200 rounded-xl">
            <Sparkles className="text-yellow-700" size={28} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-4 text-yellow-900">📋 Event Participation Guidelines</h3>
            <ul className="space-y-3 text-sm text-yellow-800">
              <li className="flex items-start gap-3">
                <span className="text-yellow-600 font-bold text-lg">•</span>
                <span><strong>Check-in Required:</strong> You must be checked in at the event gate to unlock voting and feedback features</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-yellow-600 font-bold text-lg">•</span>
                <span><strong>Voting:</strong> You can vote for up to 3 different stalls (ranked 1st, 2nd, and 3rd place)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-yellow-600 font-bold text-lg">•</span>
                <span><strong>Feedback:</strong> Share your thoughts! Each stall can receive one feedback from you</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-yellow-600 font-bold text-lg">•</span>
                <span><strong>QR Codes:</strong> Scan stall QR codes to quickly vote or provide feedback for specific stalls</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-yellow-600 font-bold text-lg">•</span>
                <span><strong>Check-out:</strong> Don't forget to scan your QR when leaving the event for accurate attendance tracking</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
