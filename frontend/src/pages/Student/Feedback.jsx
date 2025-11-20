import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Star, Send, CheckCircle, AlertCircle, MessageSquare, Camera, X, Scan } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function StudentFeedback() {
  // Define the 5 rating categories
  const ratingCategories = [
    {
      key: 'quality',
      title: 'Product/Service Quality',
      description: 'How good is the overall quality of products or services?',
      icon: '⭐',
      color: 'blue'
    },
    {
      key: 'service',
      title: 'Customer Service',
      description: 'How helpful and friendly was the staff?',
      icon: '🤝',
      color: 'green'
    },
    {
      key: 'innovation',
      title: 'Innovation & Creativity',
      description: 'How innovative and creative is their approach?',
      icon: '💡',
      color: 'purple'
    },
    {
      key: 'presentation',
      title: 'Presentation & Display',
      description: 'How attractive and well-organized is their stall?',
      icon: '🎨',
      color: 'pink'
    },
    {
      key: 'value',
      title: 'Value for Money',
      description: 'How good is the value compared to the price?',
      icon: '💰',
      color: 'orange'
    }
  ];

  const [selectedEvent, setSelectedEvent] = useState('');
  const [scannedStall, setScannedStall] = useState(null);
  // Keep old rating for backward compatibility
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  // New 5-category rating states
  const [ratings, setRatings] = useState({
    quality: 0,
    service: 0,
    innovation: 0,
    presentation: 0,
    value: 0
  });
  const [hoverRatings, setHoverRatings] = useState({
    quality: 0,
    service: 0,
    innovation: 0,
    presentation: 0,
    value: 0
  });
  const [comment, setComment] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanValidation, setScanValidation] = useState(null); // { status: 'valid'|'invalid', message: '', details: '' }
  const [debugLogs, setDebugLogs] = useState([]); // Debug logs for mobile viewing
  const queryClient = useQueryClient();
  const scannerRef = useRef(null); // Scanner instance reference

  // Helper to add debug logs
  const addDebugLog = (message, data = null) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, data };
    setDebugLogs(prev => [...prev.slice(-20), logEntry]); // Keep last 20 logs
    console.log(`[${timestamp}] ${message}`, data || '');
  };

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
      const response = await studentApi.getStalls({ eventId: selectedEvent, forFeedback: 'true' });
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
      // Reset 5-category ratings
      setRatings({
        quality: 0,
        service: 0,
        innovation: 0,
        presentation: 0,
        value: 0
      });
      setHoverRatings({
        quality: 0,
        service: 0,
        innovation: 0,
        presentation: 0,
        value: 0
      });
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
      addDebugLog('Already processing a scan, ignoring...');
      console.log('[Feedback QR] Already processing a scan, ignoring...');
      return;
    }

    setIsProcessingScan(true);
    addDebugLog('Raw scanned data:', decodedText);
    console.log('[Feedback QR] Raw scanned data:', decodedText);
    
    try {
      // Parse QR code data (expected format: JSON with stallId)
      let qrData;
      try {
        qrData = JSON.parse(decodedText);
        addDebugLog('Parsed QR data:', qrData);
        console.log('[Feedback QR] Parsed QR data:', qrData);
      } catch (parseError) {
        addDebugLog('Parse error - not valid JSON', parseError.message);
        setScanValidation({
          status: 'invalid',
          message: '❌ Invalid QR Code Format',
          details: 'This QR code is not a valid stall code. It must be a JSON format with stallId, eventId, and type fields.',
          timestamp: new Date().toLocaleTimeString()
        });
        toast.error('Invalid QR code format. Please scan a stall QR code.');
        setIsProcessingScan(false);
        return;
      }
      
      const { stallId, eventId, type } = qrData;
      addDebugLog('Extracted from QR:', { stallId, eventId, type });

      // Validate QR type
      if (type !== 'stall') {
        addDebugLog('Wrong type - expected "stall", got:', type);
        setScanValidation({
          status: 'invalid',
          message: '❌ Wrong QR Code Type',
          details: `This QR code is for "${type || 'unknown'}", not for a stall. Please scan the stall's QR code displayed at their booth.`,
          timestamp: new Date().toLocaleTimeString()
        });
        toast.error('This is not a stall QR code');
        setIsProcessingScan(false);
        return;
      }

      // Validate event match
      addDebugLog('Validating event match:', { qrEventId: eventId, selectedEvent });
      if (eventId !== selectedEvent) {
        const eventName = events.find(e => e.id === eventId)?.name || 'another event';
        const currentEventName = events.find(e => e.id === selectedEvent)?.name || 'current event';
        addDebugLog('Event mismatch!', { qrEvent: eventName, selectedEvent: currentEventName });
        setScanValidation({
          status: 'invalid',
          message: '❌ Wrong Event',
          details: `This QR code belongs to "${eventName}", but you have "${currentEventName}" selected. Please select the correct event first.`,
          timestamp: new Date().toLocaleTimeString()
        });
        toast.error('This QR code is for a different event');
        setIsProcessingScan(false);
        return;
      }

      // Find stall in current event's stalls
      addDebugLog('Looking for stallId:', stallId);
      addDebugLog('Available stalls:', stalls);
      addDebugLog('Stalls count:', stalls.length);
      addDebugLog('Stall IDs:', stalls.map(s => s.id));
      
      console.log('[Feedback QR] Looking for stallId:', stallId);
      console.log('[Feedback QR] Available stalls:', stalls);
      console.log('[Feedback QR] Stalls count:', stalls.length);
      console.log('[Feedback QR] Stall IDs:', stalls.map(s => s.id));
      
      const stall = stalls.find(s => s.id === stallId);
      addDebugLog('Found stall:', stall?.name || 'NOT FOUND');
      console.log('[Feedback QR] Found stall:', stall?.name || 'Not found');
      
      if (!stall) {
        addDebugLog('ERROR: Stall not found in event!');
        setScanValidation({
          status: 'invalid',
          message: '❌ Stall Not Found',
          details: `Stall ID "${stallId}" does not exist in this event, or the stall has been removed. Please verify with event organizers.`,
          timestamp: new Date().toLocaleTimeString()
        });
        toast.error('Stall not found in this event');
        setIsProcessingScan(false);
        return;
      }

      // Check if already given feedback to this stall
      const alreadyFeedback = myFeedbacks.find(f => f.stallId?.id === stallId || f.stallId === stallId);
      if (alreadyFeedback) {
        addDebugLog('Already submitted feedback for this stall');
        setScanValidation({
          status: 'invalid',
          message: '❌ Already Submitted',
          details: `You have already submitted feedback for "${stall.name}". You can only provide one feedback per stall. Check your submitted feedbacks below.`,
          timestamp: new Date().toLocaleTimeString()
        });
        toast.error('You have already submitted feedback for this stall');
        setIsProcessingScan(false);
        return;
      }

      // SUCCESS! Set scanned stall and close scanner
      addDebugLog('SUCCESS! Stall scanned:', stall.name);
      setScanValidation({
        status: 'valid',
        message: '✅ Valid Stall QR Code',
        details: `Scanned: "${stall.name}" from ${stall.department} department. You can now submit your feedback!`,
        timestamp: new Date().toLocaleTimeString()
      });
      
      // Close and clean up scanner
      console.log('[Feedback QR] ✅ Scan successful! Stall:', stall.name);
      
      setScannedStall(stall);
      setShowScanner(false); // This will trigger cleanup
      setIsProcessingScan(false);
      
      toast.success(`✅ Scanned: ${stall.name}! Now give your feedback.`, {
        duration: 3000,
        icon: '🎯',
      });
    } catch (error) {
      addDebugLog('Scan error:', error.message);
      console.error('[Feedback QR] Scan error:', error);
      setScanValidation({
        status: 'invalid',
        message: '❌ Scan Error',
        details: `An unexpected error occurred: ${error.message}. Please try scanning again.`,
        timestamp: new Date().toLocaleTimeString()
      });
      toast.error('Invalid QR code format. Please scan a stall QR code.');
      setIsProcessingScan(false);
    }
  }, [isProcessingScan, selectedEvent, stalls, myFeedbacks, events]);

  // Handle scan errors
  const handleScanError = useCallback((error) => {
    // These are normal scanning errors, don't show to user
    // Only log at debug level to avoid console spam
    if (error && !error.includes('NotFoundException')) {
      console.debug('[Feedback QR] Scanning... Waiting for QR code');
    }
  }, []);

  // Initialize QR Scanner - Using Html5QrcodeScanner (same as volunteer scanner)
  useEffect(() => {
    if (!showScanner) return; // Only init when scanner should be shown

    let scanner;
    let isActive = true; // Track if component is still mounted

    const initScanner = () => {
      scanner = new Html5QrcodeScanner('qr-reader', {
        fps: 30, // Increased from 10 to 30 for faster scanning like Paytm
        qrbox: undefined, // Remove box constraint - scan anywhere in camera view!
        aspectRatio: 1.777778, // 16:9 ratio for better camera coverage
        disableFlip: false, // Allow scanning mirrored QR codes
        showTorchButtonIfSupported: true, // Show flashlight button on mobile
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true // Use native barcode detector for speed
        },
        rememberLastUsedCamera: true, // Remember camera preference
        supportedScanTypes: [0, 1], // Support QR_CODE and AZTEC (max 2 allowed)
      });

      scanner.render(
        (decodedText) => {
          // QR code successfully scanned
          if (!isActive) return; // Don't process if component unmounted
          
          console.log('[Feedback QR] QR Code scanned:', decodedText);
          scanner.pause(true);
          
          // Process the scan
          handleScan(decodedText);
          
          // Resume scanning after 3 seconds (in case user wants to scan another)
          setTimeout(() => {
            if (isActive && scanner) {
              scanner.resume();
            }
          }, 3000);
        },
        (errorMessage) => {
          // Normal scanning errors - don't show to user
          // Only log at debug level to avoid console spam
          if (errorMessage && !errorMessage.includes('NotFoundException')) {
            console.debug('[Feedback QR] Scanning... Waiting for QR code');
          }
        }
      );

      scannerRef.current = scanner;
      console.log('[Feedback QR] ✅ Scanner initialized');
      toast.success('📸 Camera ready! Point at stall QR code', { id: 'camera-init', duration: 2000 });
    };

    // Initialize scanner
    try {
      initScanner();
    } catch (error) {
      console.error('[Feedback QR] Scanner initialization failed:', error);
      toast.error('Camera error: ' + error.message, { duration: 5000 });
      setShowScanner(false);
    }

    return () => {
      isActive = false; // Mark component as unmounted
      if (scanner) {
        try {
          // Clear scanner safely
          scanner.clear().catch((err) => {
            // Ignore DOM errors during cleanup
            if (!err.message?.includes('removeChild')) {
              console.error('[Feedback QR] Scanner cleanup error:', err);
            }
          });
        } catch (err) {
          // Silently ignore cleanup errors
          console.debug('[Feedback QR] Scanner already cleaned up');
        }
      }
      scannerRef.current = null;
    };
  }, [showScanner, handleScan]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!scannedStall) {
      toast.error('Please scan a stall QR code first');
      return;
    }

    // Check if all 5 ratings are provided
    const allRatingsProvided = Object.values(ratings).every(rating => rating > 0);
    if (!allRatingsProvided) {
      toast.error('Please provide all 5 ratings (Quality, Service, Innovation, Presentation, Value)');
      return;
    }

    if (!status?.isCheckedIn) {
      toast.error('You must be checked-in to submit feedback');
      return;
    }

    // Calculate average for backward compatibility
    const averageRating = Object.values(ratings).reduce((sum, rating) => sum + rating, 0) / 5;

    feedbackMutation.mutate({
      eventId: selectedEvent,
      stallId: scannedStall.id,
      rating: Math.round(averageRating), // Keep for backward compatibility
      comments: comment, // Backend expects 'comments' (plural)
      // New 5-category ratings
      qualityRating: ratings.quality,
      serviceRating: ratings.service,
      innovationRating: ratings.innovation,
      presentationRating: ratings.presentation,
      valueRating: ratings.value,
    });
  };

  const cancelScan = () => {
    console.log('[Feedback QR] Cancel requested');
    setIsProcessingScan(false);
    setScanValidation(null);
    setShowScanner(false); // This will trigger cleanup in useEffect
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      {/* Responsive Header with Status Bar */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700">
        <div className="px-3 sm:px-4 lg:px-6 py-3 safe-area-top">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white">Feedback</h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Rate your experience</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {status?.isCheckedIn ? (
                <div className="flex items-center space-x-1 bg-green-100 dark:bg-green-900/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">Live</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 bg-orange-100 dark:bg-orange-900/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-xs sm:text-sm font-medium text-orange-700 dark:text-orange-300">Check-in needed</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Debug Console - Collapsible */}
      {debugLogs.length > 0 && (
        <div className="mx-3 sm:mx-4 lg:mx-6 mt-4">
          <details className="bg-black rounded-lg lg:rounded-xl overflow-hidden shadow-lg">
            <summary className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-800 text-white text-sm sm:text-base font-medium cursor-pointer flex items-center justify-between hover:bg-gray-700 transition-colors">
              <span className="flex items-center gap-2">
                <span>🐛</span>
                <span className="hidden sm:inline">Debug Console</span>
                <span className="sm:hidden">Debug</span>
                <span className="text-xs sm:text-sm opacity-75">({debugLogs.length})</span>
              </span>
              <span className="text-xs sm:text-sm opacity-75">Tap to expand</span>
            </summary>
            <div className="p-3 sm:p-4 max-h-32 sm:max-h-48 lg:max-h-64 overflow-y-auto text-xs sm:text-sm font-mono">
              {debugLogs.slice(-5).map((log, idx) => (
                <div key={idx} className="mb-2 pb-2 border-b border-gray-700 last:border-b-0">
                  <div className="text-yellow-400 font-medium text-xs sm:text-sm">{log.timestamp} - {log.message}</div>
                  {log.data && (
                    <div className="text-green-300 mt-1 break-all text-xs leading-relaxed">
                      {typeof log.data === 'object' ? JSON.stringify(log.data, null, 1) : String(log.data)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* Main Content - Responsive Container */}
      <div className="px-3 sm:px-4 lg:px-6 pb-6 space-y-4 sm:space-y-6 max-w-sm sm:max-w-2xl lg:max-w-4xl mx-auto">

        {/* Event Selector - Mobile Optimized */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-6 animate-slideUp">
          <div className="flex items-center gap-2 sm:gap-3 mb-4">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 rounded-lg sm:rounded-xl">
              <MessageSquare className="text-purple-600 dark:text-purple-400 w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white">Select Event</h3>
          </div>
          
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900 dark:text-white transition-all duration-200 appearance-none cursor-pointer shadow-sm"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.75rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em'
            }}
          >
            <option value="">🎯 Choose an event...</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                🎪 {event.name}
              </option>
            ))}
          </select>
        </div>

      {selectedEvent && (
        <>
          {/* Check-in Status Warning - Mobile Responsive */}
          {!status?.isCheckedIn && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-300 dark:border-yellow-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-start space-x-3 shadow-lg animate-scaleIn">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-yellow-900 dark:text-yellow-100 text-base sm:text-lg">Not Checked In</h4>
                <p className="text-sm sm:text-base text-yellow-800 dark:text-yellow-300 mt-1 leading-relaxed">
                  You must check-in to the event before submitting feedback. Please show your QR code at the gate! 🚪
                </p>
              </div>
            </div>
          )}

          {/* QR Scanner Section - Mobile Optimized */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border-2 border-purple-200 dark:border-purple-700 p-4 sm:p-6 animate-slideUp">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-2.5 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 rounded-lg sm:rounded-xl">
                <Scan className="text-purple-600 dark:text-purple-400 w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Scan Stall QR Code</h3>
            </div>
            
            {!showScanner && !scannedStall && (
              <div className="space-y-3 sm:space-y-4">
                <button
                  onClick={() => {
                    console.log('[Feedback QR] Opening scanner...');
                    setScanValidation(null); // Clear previous validation
                    setShowScanner(true);
                  }}
                  disabled={!status?.isCheckedIn}
                  className="w-full py-4 sm:py-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform active:scale-95 sm:hover:scale-105 flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:scale-100 touch-manipulation"
                >
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="hidden sm:inline">Open Camera to Scan Stall QR</span>
                  <span className="sm:hidden">Scan QR Code</span>
                </button>
                {!status?.isCheckedIn && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3">
                    <p className="text-sm sm:text-base text-red-700 dark:text-red-300 text-center font-medium">
                      ⚠️ You must check-in first to scan stall QR codes
                    </p>
                  </div>
                )}
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded-lg p-3">
                  <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 text-center">
                    📱 <strong>Note:</strong> QR scanning requires a device with a camera (mobile, tablet, or laptop with webcam)
                  </p>
                </div>
              </div>
            )}

            {showScanner && (
              <div className="space-y-3 sm:space-y-4 animate-fadeIn">
                <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600 rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <p className="text-sm sm:text-base text-blue-800 dark:text-blue-200 font-medium text-center">
                    📱 Point your camera at the stall's QR code
                  </p>
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 opacity-75 text-center mt-1">
                    Keep the QR code within the frame and hold steady
                  </p>
                </div>

                {/* QR Reader Container - Mobile Responsive */}
                <div className="relative">
                  <div id="qr-reader" className="rounded-lg sm:rounded-xl overflow-hidden mb-4 bg-gray-100 dark:bg-gray-700 min-h-[250px] sm:min-h-[300px]"></div>
                </div>
                
                <button
                  onClick={cancelScan}
                  className="w-full py-3 sm:py-4 bg-red-600 text-white rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:bg-red-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg touch-manipulation active:scale-95"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  Cancel Scan
                </button>
              </div>
            )}

            {scannedStall && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-400 dark:border-green-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 animate-scaleIn">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="text-green-600 dark:text-green-400 w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                      <h4 className="font-bold text-green-900 dark:text-green-100 text-sm sm:text-base lg:text-lg">Stall Scanned Successfully!</h4>
                    </div>
                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-800 dark:text-green-200 mb-1">{scannedStall.name}</p>
                    <p className="text-sm sm:text-base text-green-700 dark:text-green-300">{scannedStall.department}</p>
                  </div>
                  <button
                    onClick={() => {
                      setScannedStall(null);
                      setScanValidation(null);
                    }}
                    className="p-2 hover:bg-green-200 dark:hover:bg-green-800 rounded-full transition-colors touch-manipulation flex-shrink-0"
                    title="Scan different stall"
                  >
                    <X className="text-green-700 dark:text-green-300 w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                </div>
              </div>
            )}

            {/* Show last scan validation - Mobile Responsive */}
            {!showScanner && !scannedStall && scanValidation && (
              <div 
                className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 animate-fadeIn ${
                  scanValidation.status === 'valid'
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-600'
                    : 'bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-600'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  {scanValidation.status === 'valid' ? (
                    <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-bold text-sm sm:text-base lg:text-lg mb-1 ${
                      scanValidation.status === 'valid'
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {scanValidation.message}
                    </h4>
                    <p className={`text-xs sm:text-sm leading-relaxed ${
                      scanValidation.status === 'valid'
                        ? 'text-green-800 dark:text-green-200'
                        : 'text-red-800 dark:text-red-200'
                    }`}>
                      {scanValidation.details}
                    </p>
                    <p className={`text-xs mt-2 opacity-75 ${
                      scanValidation.status === 'valid'
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      Last scan at {scanValidation.timestamp}
                    </p>
                  </div>
                  <button
                    onClick={() => setScanValidation(null)}
                    className={`p-1 sm:p-1.5 rounded-full transition-colors touch-manipulation flex-shrink-0 ${
                      scanValidation.status === 'valid'
                        ? 'hover:bg-green-200 dark:hover:bg-green-800'
                        : 'hover:bg-red-200 dark:hover:bg-red-800'
                    }`}
                    title="Dismiss"
                  >
                    <X className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      scanValidation.status === 'valid'
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-red-700 dark:text-red-300'
                    }`} />
                  </button>
                </div>
                {scanValidation.status === 'invalid' && (
                  <button
                    onClick={() => {
                      setScanValidation(null);
                      setShowScanner(true);
                    }}
                    className="mt-3 w-full py-2 sm:py-3 bg-purple-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 touch-manipulation active:scale-95"
                  >
                    <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                    Try Scanning Again
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Feedback Form - Mobile Optimized */}
          {scannedStall && (
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border-2 border-pink-200 dark:border-pink-700 p-4 sm:p-6 animate-fadeIn">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="p-2 sm:p-2.5 bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/50 dark:to-orange-800/50 rounded-lg sm:rounded-xl">
                  <Star className="text-yellow-500 w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Your Feedback</h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">{scannedStall.name}</p>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* 5-Category Rating System */}
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Rate Your Experience
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Please rate the stall on all 5 categories below
                    </p>
                  </div>

                  {ratingCategories.map((category, index) => {
                    const currentRating = ratings[category.key];
                    const currentHover = hoverRatings[category.key];
                    
                    const colorMap = {
                      blue: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
                      green: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
                      purple: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
                      pink: 'from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20',
                      orange: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20'
                    };
                    
                    return (
                      <div key={category.key} className={`p-4 rounded-xl bg-gradient-to-r ${colorMap[category.color]} border border-gray-200 dark:border-gray-700`}>
                        <div className="flex items-start gap-3 mb-3">
                          <span className="text-2xl">{category.icon}</span>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                              {category.title} <span className="text-red-500">*</span>
                            </h4>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {category.description}
                            </p>
                          </div>
                        </div>
                        
                        {/* Star Rating for this category */}
                        <div className="flex items-center justify-center space-x-1 sm:space-x-2 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRatings(prev => ({ ...prev, [category.key]: star }))}
                              onMouseEnter={() => setHoverRatings(prev => ({ ...prev, [category.key]: star }))}
                              onMouseLeave={() => setHoverRatings(prev => ({ ...prev, [category.key]: 0 }))}
                              className="focus:outline-none transition-transform active:scale-110 sm:hover:scale-125 touch-manipulation p-1"
                              disabled={!status?.isCheckedIn}
                            >
                              <Star
                                className={`w-6 h-6 sm:w-8 sm:h-8 transition-all duration-200 ${
                                  star <= (currentHover || currentRating)
                                    ? 'text-yellow-500 fill-yellow-500 drop-shadow-lg'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                        
                        {/* Rating Display */}
                        {currentRating > 0 && (
                          <p className="text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                            {currentRating}/5 {currentRating >= 4 ? '⭐' : currentRating >= 3 ? '👍' : ''}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {/* Average Rating Display */}
                  {Object.values(ratings).some(r => r > 0) && (
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
                      <div className="text-center">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Overall Average</h4>
                        <div className="flex items-center justify-center space-x-2">
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const average = Object.values(ratings).reduce((sum, r) => sum + r, 0) / Object.values(ratings).filter(r => r > 0).length || 0;
                              return (
                                <Star
                                  key={star}
                                  className={`w-5 h-5 ${
                                    star <= average
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-gray-300 dark:text-gray-600'
                                  }`}
                                />
                              );
                            })}
                          </div>
                          <span className="font-bold text-lg text-yellow-600 dark:text-yellow-400">
                            {Object.values(ratings).filter(r => r > 0).length > 0 
                              ? (Object.values(ratings).reduce((sum, r) => sum + r, 0) / Object.values(ratings).filter(r => r > 0).length).toFixed(1)
                              : '0.0'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Comment - Mobile Responsive */}
                <div>
                  <label className="block text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                    Your Comments (Optional)
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={4}
                    className="w-full px-3 sm:px-4 py-3 sm:py-4 text-sm sm:text-base bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-900 dark:text-white transition-all duration-200 resize-none"
                    maxLength={500}
                    placeholder="What did you like? What could be improved? Share your thoughts..."
                    disabled={!status?.isCheckedIn}
                  />
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 text-right">
                    {comment.length} / 500 characters
                  </p>
                </div>

                {/* Submit Button - Mobile Responsive */}
                <button
                  type="submit"
                  disabled={
                    !scannedStall ||
                    !Object.values(ratings).every(rating => rating > 0) ||
                    feedbackMutation.isLoading ||
                    !status?.isCheckedIn
                  }
                  className="w-full py-4 sm:py-5 lg:py-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg lg:text-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform active:scale-95 sm:hover:scale-105 flex items-center justify-center space-x-2 sm:space-x-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:scale-100 touch-manipulation"
                >
                  <Send className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>
                    {feedbackMutation.isLoading ? 'Submitting...' : 'Submit Feedback'}
                  </span>
                </button>
              </form>
            </div>
          )}

          {/* My Feedbacks - Mobile Responsive */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-4 sm:p-6 animate-slideUp">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-2.5 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-800/50 rounded-lg sm:rounded-xl">
                <MessageSquare className="text-indigo-600 dark:text-indigo-400 w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">My Submitted Feedbacks</h3>
            </div>
            
            {myFeedbacks.length === 0 ? (
              <div className="text-center py-8 sm:py-12 bg-gradient-to-br from-gray-50 to-indigo-50 dark:from-gray-800 dark:to-indigo-900/20 rounded-xl sm:rounded-2xl">
                <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-gray-400 dark:text-gray-600" />
                <p className="text-gray-600 dark:text-gray-400 font-semibold text-base sm:text-lg">No feedbacks submitted yet</p>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mt-1 px-4">Scan stall QR codes and share your experience! 🎯</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {myFeedbacks.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="p-4 sm:p-6 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-lg sm:rounded-2xl border border-gray-200 dark:border-gray-600 shadow-md hover:shadow-lg transition-all duration-300 transform active:scale-[0.98] sm:hover:scale-[1.02]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <h4 className="font-bold text-base sm:text-lg lg:text-xl text-gray-900 dark:text-white">{feedback.stallId.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                          📍 {feedback.stallId.department}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full self-start">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 sm:w-4 sm:h-4 ${
                              star <= feedback.rating
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                        <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-bold text-yellow-800 dark:text-yellow-200">
                          {feedback.rating}/5
                        </span>
                      </div>
                    </div>
                    {feedback.comment && (
                      <div className="mb-3">
                        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900/50 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-200 dark:border-gray-700 italic leading-relaxed">
                          "{feedback.comment}"
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                      <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span>Submitted on {new Date(feedback.createdAt).toLocaleDateString()} at {new Date(feedback.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions - Mobile Responsive */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-2 border-indigo-300 dark:border-indigo-700 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-800 rounded-lg">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-bold text-base sm:text-lg lg:text-xl text-indigo-900 dark:text-indigo-100">How to Submit Feedback</h3>
            </div>
            
            <ul className="text-xs sm:text-sm lg:text-base text-indigo-800 dark:text-indigo-200 space-y-2 sm:space-y-3">
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm sm:text-base lg:text-lg flex-shrink-0 bg-indigo-100 dark:bg-indigo-800 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center">1</span>
                <span className="leading-relaxed"><strong>Scan the stall's QR code</strong> displayed at their booth</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm sm:text-base lg:text-lg flex-shrink-0 bg-indigo-100 dark:bg-indigo-800 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center">2</span>
                <span className="leading-relaxed"><strong>Rate your experience</strong> from 1 to 5 stars</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm sm:text-base lg:text-lg flex-shrink-0 bg-indigo-100 dark:bg-indigo-800 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center">3</span>
                <span className="leading-relaxed"><strong>Add comments</strong> (optional but appreciated!)</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm sm:text-base lg:text-lg flex-shrink-0 bg-indigo-100 dark:bg-indigo-800 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center">4</span>
                <span className="leading-relaxed"><strong>Submit</strong> - You can only give one feedback per stall</span>
              </li>
              <li className="flex items-start gap-2 sm:gap-3 bg-red-50 dark:bg-red-900/20 p-2 sm:p-3 rounded-lg border border-red-200 dark:border-red-700">
                <span className="text-red-500 font-bold text-sm sm:text-base flex-shrink-0">⚠️</span>
                <span className="leading-relaxed text-red-700 dark:text-red-300"><strong>Important:</strong> You must be checked-in to submit feedback</span>
              </li>
            </ul>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
