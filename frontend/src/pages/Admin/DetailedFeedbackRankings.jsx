import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Star, 
  Trophy, 
  TrendingUp, 
  Users, 
  Award,
  BarChart3,
  Filter,
  Download,
  Eye,
  Medal,
  Target,
  Heart,
  Sparkles,
  Presentation,
  DollarSign,
  ExternalLink
} from 'lucide-react';
import { adminApi } from '../../services/api';

export default function DetailedFeedbackRankings() {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [sortBy, setSortBy] = useState('averageRating');
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedStall, setSelectedStall] = useState(null);

  // Fetch events
  const { data: eventsData } = useQuery({
    queryKey: ['admin-events'],
    queryFn: () => adminApi.getEvents(),
  });

  const events = eventsData?.data?.data || [];

  // Fetch detailed feedback rankings
  const { 
    data: rankingsData, 
    isLoading: rankingsLoading,
    refetch: refetchRankings 
  } = useQuery({
    queryKey: ['detailed-feedback-rankings', selectedEvent, selectedDepartment, sortBy, currentPage],
    queryFn: () => adminApi.getDetailedFeedbackRankings({ 
      eventId: selectedEvent || undefined,
      department: selectedDepartment || undefined,
      sortBy,
      page: currentPage,
      limit: 25
    }),
  });

  // Fetch feedback analytics overview
  const { 
    data: overviewData, 
    isLoading: overviewLoading 
  } = useQuery({
    queryKey: ['feedback-analytics-overview', selectedEvent, selectedDepartment],
    queryFn: () => adminApi.getFeedbackAnalyticsOverview({ 
      eventId: selectedEvent || undefined,
      department: selectedDepartment || undefined
    }),
  });

  // Fetch stall feedback details when a stall is selected
  const { 
    data: stallDetailsData,
    isLoading: stallDetailsLoading 
  } = useQuery({
    queryKey: ['stall-feedback-details', selectedStall],
    queryFn: () => adminApi.getStallFeedbackDetails(selectedStall),
    enabled: !!selectedStall
  });

  const rankings = rankingsData?.data?.rankings || [];
  const pagination = rankingsData?.data?.pagination || {};
  const summary = rankingsData?.data?.summary || {};
  const overview = overviewData?.data || {};
  const stallDetails = stallDetailsData?.data || {};

  // Get unique departments from rankings
  const departments = [...new Set(rankings.map(r => r.department).filter(Boolean))];

  const getCategoryIcon = (category) => {
    const icons = {
      quality: <Star className="w-4 h-4" />,
      service: <Heart className="w-4 h-4" />,
      innovation: <Sparkles className="w-4 h-4" />,
      presentation: <Presentation className="w-4 h-4" />,
      value: <DollarSign className="w-4 h-4" />
    };
    return icons[category] || <Star className="w-4 h-4" />;
  };

  const getCategoryColor = (category) => {
    const colors = {
      quality: 'text-blue-600 bg-blue-100',
      service: 'text-green-600 bg-green-100',
      innovation: 'text-purple-600 bg-purple-100',
      presentation: 'text-pink-600 bg-pink-100',
      value: 'text-orange-600 bg-orange-100'
    };
    return colors[category] || 'text-gray-600 bg-gray-100';
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-blue-600';
    if (rating >= 3.5) return 'text-yellow-600';
    if (rating >= 3.0) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-500" />;
    return <Target className="w-5 h-5 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Detailed Feedback Rankings</h1>
                <p className="text-gray-600">5-Category rating system with comprehensive analytics</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showDetails 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Eye className="w-4 h-4 inline mr-2" />
                {showDetails ? 'Hide' : 'Show'} Details
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                <Download className="w-4 h-4 inline mr-2" />
                Export Data
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={selectedEvent}
              onChange={(e) => {
                setSelectedEvent(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Events</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>

            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="averageRating">Overall Rating</option>
              <option value="totalFeedbacks">Feedback Count</option>
              <option value="qualityRating">Quality Rating</option>
              <option value="serviceRating">Service Rating</option>
              <option value="innovationRating">Innovation Rating</option>
              <option value="presentationRating">Presentation Rating</option>
              <option value="valueRating">Value Rating</option>
            </select>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {summary.totalStalls || 0} stalls, {summary.totalWithFeedbacks || 0} with feedback
              </span>
            </div>
          </div>
        </div>

        {/* Analytics Overview */}
        {overview.summary && !overviewLoading && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600">Total Feedbacks</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{overview.summary.totalFeedbacks}</p>
              <p className="text-xs text-gray-500">{overview.summary.uniqueStudents} unique students</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-gray-600">Overall Average</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{overview.summary.overallAverageRating}</p>
              <div className="flex items-center mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-3 h-3 ${
                      star <= overview.summary.overallAverageRating
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Category averages */}
            {Object.entries(overview.summary.categoryAverages || {}).map(([category, average]) => (
              <div key={category} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`p-1 rounded ${getCategoryColor(category)}`}>
                    {getCategoryIcon(category)}
                  </span>
                  <span className="text-sm font-medium text-gray-600 capitalize">{category}</span>
                </div>
                <p className={`text-2xl font-bold ${getRatingColor(average)}`}>
                  {parseFloat(average).toFixed(1)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Top Performers by Category */}
        {overview.topPerformers && Object.keys(overview.topPerformers).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Top Performers by Category</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {Object.entries(overview.topPerformers).map(([category, performers]) => (
                <div key={category} className="space-y-2">
                  <h4 className="font-semibold text-gray-700 capitalize flex items-center gap-2">
                    <span className={`p-1 rounded ${getCategoryColor(category)}`}>
                      {getCategoryIcon(category)}
                    </span>
                    {category}
                  </h4>
                  {performers.slice(0, 3).map((performer, index) => (
                    <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                      <div className="flex items-center gap-1">
                        {getRankIcon(index + 1)}
                        <span className="font-medium truncate">{performer.stallName}</span>
                      </div>
                      <div className="text-gray-600 text-xs">
                        {performer.avgRating.toFixed(1)} ⭐ ({performer.feedbackCount} reviews)
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rankings Table */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Stall Rankings</h3>
            <p className="text-gray-600">Sorted by {sortBy.replace(/([A-Z])/g, ' $1').toLowerCase()}</p>
          </div>

          {rankingsLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading rankings...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank & Stall
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overall Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category Ratings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Feedback Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {rankings.map((stall, index) => (
                    <tr key={stall.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {getRankIcon(stall.rank)}
                            <span className="font-bold text-gray-900">#{stall.rank}</span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{stall.name}</div>
                            <div className="text-sm text-gray-500">{stall.ownerName}</div>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {stall.department}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${getRatingColor(stall.overallAverageRating)}`}>
                            {stall.overallAverageRating.toFixed(1)}
                          </span>
                          <div className="flex items-center">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= stall.overallAverageRating
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="grid grid-cols-5 gap-1">
                          {[
                            { key: 'quality', value: stall.avgQualityRating, label: 'Q' },
                            { key: 'service', value: stall.avgServiceRating, label: 'S' },
                            { key: 'innovation', value: stall.avgInnovationRating, label: 'I' },
                            { key: 'presentation', value: stall.avgPresentationRating, label: 'P' },
                            { key: 'value', value: stall.avgValueRating, label: 'V' }
                          ].map((category) => (
                            <div key={category.key} className="text-center">
                              <div className={`text-xs font-bold ${getRatingColor(category.value)}`}>
                                {category.value.toFixed(1)}
                              </div>
                              <div className="text-xs text-gray-500">{category.label}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stall.totalFeedbacks} reviews</div>
                        {stall.totalFeedbacks > 0 && (
                          <div className="text-xs text-gray-500">
                            Range: {stall.minRating.toFixed(1)} - {stall.maxRating.toFixed(1)}
                          </div>
                        )}
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedStall(stall.id)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {pagination.page} of {pagination.totalPages} 
                ({pagination.total} total stalls)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stall Details Modal */}
        {selectedStall && stallDetails.stall && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{stallDetails.stall.name}</h3>
                  <p className="text-gray-600">{stallDetails.stall.department} • {stallDetails.stall.category}</p>
                </div>
                <button
                  onClick={() => setSelectedStall(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Statistics */}
                {stallDetails.statistics && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Total Feedbacks</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {stallDetails.statistics.totalFeedbacks}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Overall Average</div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {stallDetails.statistics.overallAverage.toFixed(1)}
                      </div>
                    </div>
                    {Object.entries(stallDetails.statistics.categoryAverages || {}).map(([category, average]) => (
                      <div key={category} className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 capitalize">{category}</div>
                        <div className={`text-2xl font-bold ${getRatingColor(average)}`}>
                          {average.toFixed(1)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Individual Feedbacks */}
                <div>
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Individual Feedbacks</h4>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {stallDetails.feedbacks?.map((feedback) => (
                      <div key={feedback.id} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium text-gray-900">{feedback.student.name}</div>
                            <div className="text-sm text-gray-600">
                              {feedback.student.rollNumber} • {feedback.student.department}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-yellow-600">
                              {feedback.averageRating.toFixed(1)} ⭐
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(feedback.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {/* Category Ratings */}
                        <div className="grid grid-cols-5 gap-2 mb-3">
                          {[
                            { key: 'qualityRating', label: 'Quality', value: feedback.qualityRating },
                            { key: 'serviceRating', label: 'Service', value: feedback.serviceRating },
                            { key: 'innovationRating', label: 'Innovation', value: feedback.innovationRating },
                            { key: 'presentationRating', label: 'Presentation', value: feedback.presentationRating },
                            { key: 'valueRating', label: 'Value', value: feedback.valueRating }
                          ].map((category) => (
                            <div key={category.key} className="text-center">
                              <div className="text-xs text-gray-600">{category.label}</div>
                              <div className="text-sm font-bold">{category.value}/5</div>
                            </div>
                          ))}
                        </div>

                        {/* Comment */}
                        {feedback.comments && (
                          <div className="bg-white p-3 rounded border italic text-gray-700">
                            "{feedback.comments}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}