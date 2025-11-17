import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Star, Send, CheckCircle, AlertCircle, MessageSquare, Camera, X, Scan } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function StudentFeedback() {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [scannedStall, setScannedStall] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const queryClient = useQueryClient();
  const scannerRef = useRef(null);

  // Fetch events (active or all)
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      let response = await studentApi.getEvents({ isActive: 'true' });
      let events = response.data?.data || response.data || [];
      
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

  // Fetch my feedbacks
  const { data: myFeedbacks = [], refetch: refetchFeedbacks } = useQuery({
    queryKey: ['myFeedbacks', selectedEvent],
    queryFn: async () => {
      const response = await studentApi.getMyFeedbacks(selectedEvent);
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
    refetchInterval: 5000, // Refresh every 5 seconds
    refetchOnWindowFocus: true, // Refresh when user returns to page
    staleTime: 0, // Always fetch fresh data
  });

  // Submit feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: (feedbackData) => studentApi.submitFeedback(feedbackData),
    onSuccess: () => {
      toast.success('Feedback submitted successfully! 🎉');
      refetchFeedbacks();
      setScannedStall(null);
      setRating(0);
      setComment('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    },
  });

  // Auto-select first event
  useEffect(() => {
    if (events.length > 0 && !selectedEvent) {
      setSelectedEvent(events[0].id);
    }
  }, [events, selectedEvent]);

  // Handle QR Scan - useCallback to prevent recreating on every render
  const handleScan = useCallback(async (decodedText) => {
    // Prevent processing multiple scans at once
    if (isProcessingScan) {
      console.log('[Feedback QR] Already processing a scan, ignoring...');
      return;
    }

    setIsProcessingScan(true);
    console.log('[Feedback QR] Raw scanned data:', decodedText);
    
    try {
      // Parse QR code data (expected format: JSON with stallId)
      const qrData = JSON.parse(decodedText);
      console.log('[Feedback QR] Parsed QR data:', qrData);
      
      const { stallId, eventId, type } = qrData;

      // Validate QR type
      if (type !== 'stall') {
        toast.error('This is not a stall QR code');
        setIsProcessingScan(false);
        return;
      }

      // Validate event match
      if (eventId !== selectedEvent) {
        toast.error('This QR code is for a different event');
        setIsProcessingScan(false);
        return;
      }

      // Find stall in current event's stalls
      const stall = stalls.find(s => s.id === stallId);
      console.log('[Feedback QR] Found stall:', stall?.name || 'Not found');
      
      if (!stall) {
        toast.error('Stall not found in this event');
        setIsProcessingScan(false);
        return;
      }

      // Check if already given feedback to this stall
      const alreadyFeedback = myFeedbacks.find(f => f.stallId?.id === stallId || f.stallId === stallId);
      if (alreadyFeedback) {
        toast.error('You have already submitted feedback for this stall');
        setIsProcessingScan(false);
        return;
      }

      // SUCCESS! Set scanned stall and close scanner
      console.log('[Feedback QR] ✅ Scan successful! Stall:', stall.name);
      
      // Close and clean up scanner
      if (scanner) {
        await scanner.clear().catch(console.error);
        setScanner(null);
      }
      
      setScannedStall(stall);
      setShowScanner(false);
      setIsProcessingScan(false);
      
      toast.success(`✅ Scanned: ${stall.name}! Now give your feedback.`, {
        duration: 3000,
        icon: '🎯',
      });
    } catch (error) {
      console.error('[Feedback QR] Scan error:', error);
      toast.error('Invalid QR code format. Please scan a stall QR code.');
      setIsProcessingScan(false);
    }
  }, [isProcessingScan, selectedEvent, stalls, myFeedbacks, scanner]);

  // Handle scan errors
  const handleScanError = useCallback((error) => {
    // These are normal scanning errors, don't show to user
    // Only log at debug level to avoid console spam
    if (error && !error.includes('NotFoundException')) {
      console.debug('[Feedback QR] Scanning... Waiting for QR code');
    }
  }, []);

  // Initialize QR Scanner
  useEffect(() => {
    let isActive = true;
    let qrScanner = null;

    const initScanner = async () => {
      if (showScanner && !scanner && isActive) {
        try {
          // Wait for DOM element to be ready
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Check if element exists
          const element = document.getElementById('qr-scanner');
          if (!element) {
            console.error('[Feedback QR] Scanner element not found in DOM');
            toast.error('Scanner initialization failed. Please try again.');
            setShowScanner(false);
            return;
          }

          console.log('[Feedback QR] Initializing scanner with mobile-optimized settings...');
          
          qrScanner = new Html5QrcodeScanner(
            'qr-scanner',
            { 
              fps: 10, 
              qrbox: 250,
              aspectRatio: 1.777778,
              rememberLastUsedCamera: true,
              showTorchButtonIfSupported: true,
              showZoomSliderIfSupported: true,
              defaultZoomValueIfSupported: 2,
              supportedScanTypes: [0, 1],
            },
            false
          );

          console.log('[Feedback QR] Scanner initialized, starting render...');
          qrScanner.render(handleScan, handleScanError);
          
          if (isActive) {
            setScanner(qrScanner);
            console.log('[Feedback QR] ✅ Scanner ready! Waiting for QR code scan...');
          }
        } catch (error) {
          console.error('[Feedback QR] Failed to initialize scanner:', error);
          toast.error(`Camera error: ${error.message || 'Please check camera permissions'}`);
          setShowScanner(false);
        }
      }
    };

    initScanner();

    return () => {
      isActive = false;
      if (qrScanner) {
        console.log('[Feedback QR] Cleaning up scanner...');
        qrScanner.clear().catch((err) => {
          console.log('[Feedback QR] Cleanup error (safe to ignore):', err.message);
        });
      }
    };
  }, [showScanner, scanner, handleScan, handleScanError]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!scannedStall) {
      toast.error('Please scan a stall QR code first');
      return;
    }

    if (rating === 0) {
      toast.error('Please provide a rating');
      return;
    }

    if (!status?.isCheckedIn) {
      toast.error('You must be checked-in to submit feedback');
      return;
    }

    feedbackMutation.mutate({
      eventId: selectedEvent,
      stallId: scannedStall.id,
      rating,
      comment,
    });
  };

  const cancelScan = () => {
    console.log('[Feedback QR] Cancel scan requested');
    setShowScanner(false);
    setIsProcessingScan(false);
    if (scanner) {
      console.log('[Feedback QR] Clearing scanner...');
      scanner.clear().catch(err => {
        console.log('[Feedback QR] Error clearing scanner:', err.message);
      });
      setScanner(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fadeIn">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
          Submit Feedback
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Share your experience by scanning stall QR codes 📱</p>
      </div>

      {/* Event Selector */}
      <div className="card animate-slideUp shadow-lg">
        <label className="label flex items-center gap-2">
          <MessageSquare className="text-purple-600 dark:text-purple-400" size={20} />
          Select Event
        </label>
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="input-field"
        >
          <option value="">-- Select Event --</option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              🎪 {event.name}
            </option>
          ))}
        </select>
      </div>

      {selectedEvent && (
        <>
          {/* Check-in Status Warning */}
          {!status?.isCheckedIn && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-300 dark:border-yellow-600 rounded-2xl p-6 flex items-start space-x-3 shadow-lg animate-scaleIn">
              <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-bold text-yellow-900 dark:text-yellow-100 text-lg">Not Checked In</h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                  You must check-in to the event before submitting feedback. Please show your QR code at the gate! 🚪
                </p>
              </div>
            </div>
          )}

          {/* QR Scanner Section */}
          <div className="card shadow-xl animate-slideUp border-2 border-purple-200 dark:border-purple-700">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
              <Scan className="text-purple-600 dark:text-purple-400" size={28} />
              Scan Stall QR Code
            </h3>
            
            {!showScanner && !scannedStall && (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    console.log('[Feedback QR] Opening scanner...');
                    setShowScanner(true);
                  }}
                  disabled={!status?.isCheckedIn}
                  className="w-full py-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Camera size={28} />
                  Open Camera to Scan Stall QR
                </button>
                {!status?.isCheckedIn && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    ⚠️ You must check-in first to scan stall QR codes
                  </p>
                )}
              </div>
            )}

            {showScanner && (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600 rounded-xl p-4 mb-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium text-center">
                    📱 Point your camera at the stall's QR code
                    <br />
                    <span className="text-xs opacity-75">Keep the QR code within the frame and hold steady</span>
                  </p>
                </div>
                <div id="qr-scanner" className="rounded-xl overflow-hidden border-4 border-purple-300 dark:border-purple-600"></div>
                <button
                  onClick={cancelScan}
                  className="w-full py-4 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <X size={20} />
                  Cancel Scan
                </button>
              </div>
            )}

            {scannedStall && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-400 dark:border-green-600 rounded-2xl p-6 animate-scaleIn">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
                      <h4 className="font-bold text-green-900 dark:text-green-100 text-lg">Stall Scanned Successfully!</h4>
                    </div>
                    <p className="text-2xl font-bold text-green-800 dark:text-green-200">{scannedStall.name}</p>
                    <p className="text-green-700 dark:text-green-300">{scannedStall.department}</p>
                  </div>
                  <button
                    onClick={() => setScannedStall(null)}
                    className="p-2 hover:bg-green-200 dark:hover:bg-green-800 rounded-full transition-colors"
                    title="Scan different stall"
                  >
                    <X className="text-green-700 dark:text-green-300" size={24} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Feedback Form */}
          {scannedStall && (
            <div className="card shadow-xl animate-fadeIn border-2 border-pink-200 dark:border-pink-700">
              <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
                <Star className="text-yellow-500" size={28} />
                Your Feedback for {scannedStall.name}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Star Rating */}
                <div>
                  <label className="label">
                    Rating (1-5 stars) <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2 justify-center bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-2xl">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="focus:outline-none transition-transform hover:scale-125 active:scale-110"
                        disabled={!status?.isCheckedIn}
                      >
                        <Star
                          className={`w-14 h-14 transition-all duration-200 ${
                            star <= (hoverRating || rating)
                              ? 'text-yellow-500 fill-yellow-500 drop-shadow-lg'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <p className="text-center mt-3 text-2xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                      {rating} / 5 Stars {rating >= 4 ? '🌟' : rating >= 3 ? '⭐' : ''}
                    </p>
                  )}
                </div>

                {/* Comment */}
                <div>
                  <label className="label">
                    Your Comments (Optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={5}
                    maxLength={500}
                    className="input-field resize-none"
                    placeholder="What did you like? What could be improved? Share your thoughts..."
                    disabled={!status?.isCheckedIn}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                    {comment.length} / 500 characters
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={
                    !scannedStall ||
                    rating === 0 ||
                    feedbackMutation.isLoading ||
                    !status?.isCheckedIn
                  }
                  className="w-full py-5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Send size={24} />
                  <span>
                    {feedbackMutation.isLoading ? 'Submitting...' : 'Submit Feedback'}
                  </span>
                </button>
              </form>
            </div>
          )}

          {/* My Feedbacks */}
          <div className="card shadow-xl animate-slideUp">
            <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="text-indigo-600 dark:text-indigo-400" size={28} />
              My Submitted Feedbacks
            </h3>
            {myFeedbacks.length === 0 ? (
              <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-900/20 rounded-2xl">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                <p className="text-gray-600 dark:text-gray-400 font-semibold text-lg">No feedbacks submitted yet</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Scan stall QR codes and share your experience! 🎯</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myFeedbacks.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="p-6 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-600 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-[1.02]"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-xl text-gray-900 dark:text-white">{feedback.stallId.name}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          📍 {feedback.stallId.department}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-2 rounded-full">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${
                              star <= feedback.rating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm font-bold text-yellow-800 dark:text-yellow-200">
                          {feedback.rating}/5
                        </span>
                      </div>
                    </div>
                    {feedback.comment && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700 italic">
                        "{feedback.comment}"
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 flex items-center gap-2">
                      <CheckCircle size={14} />
                      Submitted on {new Date(feedback.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="card bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-2 border-indigo-300 dark:border-indigo-700 shadow-lg">
            <h3 className="font-bold text-lg mb-4 text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
              <AlertCircle size={24} />
              How to Submit Feedback
            </h3>
            <ul className="text-sm text-indigo-800 dark:text-indigo-200 space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">1.</span>
                <span><strong>Scan the stall's QR code</strong> displayed at their booth</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">2.</span>
                <span><strong>Rate your experience</strong> from 1 to 5 stars</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">3.</span>
                <span><strong>Add comments</strong> (optional but appreciated!)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">4.</span>
                <span><strong>Submit</strong> - You can only give one feedback per stall</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-red-500 font-bold text-lg">⚠️</span>
                <span><strong>Important:</strong> You must be checked-in to submit feedback</span>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
