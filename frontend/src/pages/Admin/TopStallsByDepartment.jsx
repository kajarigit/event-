import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { 
  Building2, 
  Trophy, 
  Vote, 
  Calendar, 
  ChevronDown, 
  ChevronUp,
  Download,
  RefreshCw,
  Search,
  Award,
  Star,
  Medal,
  Crown,
  Users
} from 'lucide-react';

export default function TopStallsByDepartment() {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [expandedDepartments, setExpandedDepartments] = useState(new Set());
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Fetch events for filter
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await adminApi.getEvents({ active: true });
      return response.data?.data || response.data || [];
    },
  });

  // Fetch department-wise stall rankings
  const { 
    data: stallRankings, 
    refetch: refetchStallRankings, 
    isLoading: stallsLoading,
    error: stallsError 
  } = useQuery({
    queryKey: ['topStallsByDepartment', selectedEvent],
    queryFn: async () => {
      const params = { limit: 25 };
      const response = await adminApi.getTopStallsByDepartment(selectedEvent, params);
      setLastUpdated(new Date());
      return response.data?.data || response.data;
    },
    enabled: !!selectedEvent,
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch voting overview for all events
  const { data: votingOverview } = useQuery({
    queryKey: ['votingOverview'],
    queryFn: async () => {
      const response = await adminApi.getVotingOverview({ limit: 8 });
      return response.data?.data || response.data;
    },
  });

  // Manual refresh
  const handleRefresh = () => {
    if (selectedEvent) {
      refetchStallRankings();
    }
  };

  // Toggle department expansion
  const toggleDepartment = (department) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(department)) {
      newExpanded.delete(department);
    } else {
      newExpanded.add(department);
    }
    setExpandedDepartments(newExpanded);
  };

  // Expand all departments
  const expandAll = () => {
    if (stallRankings?.departmentRankings) {
      setExpandedDepartments(new Set(stallRankings.departmentRankings.map(d => d.department)));
    }
  };

  // Collapse all departments
  const collapseAll = () => {
    setExpandedDepartments(new Set());
  };

  // Export to CSV
  const handleExport = () => {
    if (!stallRankings?.departmentRankings) return;

    try {
      const csvData = [];
      
      stallRankings.departmentRankings.forEach(deptRanking => {
        deptRanking.stalls.forEach(stall => {
          csvData.push([
            deptRanking.department,
            stall.departmentRank,
            stall.overallRank,
            stall.name,
            stall.ownerName || '',
            stall.ownerContact || '',
            stall.ownerEmail || '',
            stall.category || '',
            stall.location || '',
            stall.voteCount,
            stall.description || ''
          ]);
        });
      });

      const csvContent = [
        ['Department', 'Dept Rank', 'Overall Rank', 'Stall Name', 'Owner Name', 'Owner Contact', 'Owner Email', 'Category', 'Location', 'Vote Count', 'Description'].join(','),
        ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\\n');

      const filename = `top-stalls-by-department-${stallRankings.event.name}-${new Date().toISOString().split('T')[0]}.csv`;
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Get rank medal component
  const getRankMedal = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" title="1st Place" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" title="2nd Place" />;
      case 3:
        return <Award className="w-6 h-6 text-orange-600" title="3rd Place" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-sm font-bold text-blue-600">#{rank}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Top Stalls by Department</h2>
          <p className="text-gray-600 mt-1">
            Department-wise stall rankings based on votes • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={!selectedEvent}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>

          {stallRankings?.departmentRankings && (
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download size={16} />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="card space-y-4">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Event Filter */}
          <div className="flex-1 min-w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Event</label>
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

          {/* Expand/Collapse Controls */}
          {stallRankings?.departmentRankings && (
            <div className="flex space-x-2">
              <button
                onClick={expandAll}
                className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Collapse All
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Voting Overview */}
      {votingOverview && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Vote className="w-5 h-5 mr-2 text-purple-600" />
            Voting Overview - Top Events
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {votingOverview.events?.slice(0, 6).map((eventData, index) => (
              <div key={eventData.event.id} className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 truncate">{eventData.event.name}</h4>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      <div>{eventData.voteCount} total votes</div>
                      <div>{eventData.stallsWithVotes} stalls with votes</div>
                      <div>{eventData.uniqueVoters} unique voters</div>
                      <div>{eventData.averageVotesPerStall} avg/stall</div>
                    </div>
                  </div>
                  <div className="ml-2">
                    <div className="text-lg font-bold text-purple-600">#{index + 1}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Statistics */}
      {stallRankings && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Departments</p>
                <p className="text-2xl font-bold text-blue-900">
                  {stallRankings.summary?.totalDepartments || 0}
                </p>
              </div>
              <Building2 className="w-10 h-10 text-blue-600" />
            </div>
          </div>

          <div className="card bg-green-50 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Stalls</p>
                <p className="text-2xl font-bold text-green-900">
                  {stallRankings.summary?.totalStalls || 0}
                </p>
              </div>
              <Star className="w-10 h-10 text-green-600" />
            </div>
          </div>

          <div className="card bg-purple-50 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Votes</p>
                <p className="text-2xl font-bold text-purple-900">
                  {stallRankings.summary?.totalVotes || 0}
                </p>
              </div>
              <Vote className="w-10 h-10 text-purple-600" />
            </div>
          </div>

          <div className="card bg-yellow-50 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Top Department</p>
                <p className="text-lg font-bold text-yellow-900 truncate">
                  {stallRankings.summary?.topDepartment || 'N/A'}
                </p>
              </div>
              <Trophy className="w-10 h-10 text-yellow-600" />
            </div>
          </div>
        </div>
      )}

      {/* Main Data Display */}
      {stallsLoading ? (
        <div className="card text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stall rankings...</p>
        </div>
      ) : stallsError ? (
        <div className="card text-center py-16 text-red-600">
          <Building2 className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <p className="text-lg mb-2">Error loading stall rankings</p>
          <p className="text-sm">{stallsError.message}</p>
        </div>
      ) : stallRankings ? (
        <div className="space-y-4">
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                  Stall Rankings - {stallRankings.event?.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {stallRankings.summary?.totalDepartments} departments • {stallRankings.summary?.totalStalls} stalls • {stallRankings.summary?.totalVotes} votes
                </p>
              </div>
            </div>

            {/* Department Rankings */}
            <div className="space-y-4">
              {stallRankings.departmentRankings?.map((deptRanking, deptIndex) => {
                const isExpanded = expandedDepartments.has(deptRanking.department);
                
                return (
                  <div key={deptRanking.department} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Department Header */}
                    <div
                      className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => toggleDepartment(deptRanking.department)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            deptIndex === 0 ? 'bg-yellow-500' : deptIndex === 1 ? 'bg-gray-500' : deptIndex === 2 ? 'bg-orange-500' : 'bg-blue-500'
                          }`}>
                            {deptIndex + 1}
                          </div>
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">{deptRanking.department}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span>{deptRanking.stallCount} stalls</span>
                              <span>{deptRanking.totalVotes} votes</span>
                              <span>Top: {deptRanking.topStall.voteCount} votes</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {deptIndex <= 2 && (
                            <div className="text-right">
                              {getRankMedal(deptIndex + 1)}
                            </div>
                          )}
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>

                    {/* Stalls List */}
                    {isExpanded && (
                      <div className="bg-white">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dept Rank</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Overall</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stall Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Votes</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {deptRanking.stalls.map((stall) => (
                                <tr key={stall.id} className={`hover:bg-gray-50 ${stall.departmentRank <= 3 ? 'bg-yellow-50' : ''}`}>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center space-x-2">
                                      {getRankMedal(stall.departmentRank)}
                                      <span className="font-medium">#{stall.departmentRank}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-sm font-medium text-gray-900">#{stall.overallRank}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div>
                                      <div className="font-medium text-gray-900">{stall.name}</div>
                                      <div className="text-sm text-gray-500">{stall.location || 'Location not specified'}</div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div>
                                      <div className="font-medium text-gray-900">{stall.ownerName || 'N/A'}</div>
                                      <div className="text-sm text-gray-500">{stall.ownerContact || stall.ownerEmail || ''}</div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-900">{stall.category || 'N/A'}</td>
                                  <td className="px-6 py-4 text-center">
                                    <span className={`inline-flex items-center justify-center px-3 py-1 text-sm font-bold rounded-full ${
                                      stall.departmentRank === 1 
                                        ? 'bg-yellow-100 text-yellow-800' 
                                        : stall.departmentRank === 2 
                                          ? 'bg-gray-100 text-gray-800' 
                                          : stall.departmentRank === 3 
                                            ? 'bg-orange-100 text-orange-800'
                                            : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      {stall.voteCount}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {(!stallRankings.departmentRankings || stallRankings.departmentRankings.length === 0) && (
            <div className="card text-center py-8 text-gray-500">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">No stall voting data found for this event</p>
            </div>
          )}
        </div>
      ) : (
        <div className="card text-center py-16 text-gray-500">
          <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg">Select an event to view department-wise stall rankings</p>
        </div>
      )}
    </div>
  );
}