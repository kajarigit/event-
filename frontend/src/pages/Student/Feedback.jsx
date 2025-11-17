import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Star, Send, CheckCircle, AlertCircle, MessageSquare, Camera, X, Scan } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function StudentFeedback() {
  const [selectedEvent, setSelectedEvent] = useState('');
  const [scannedStall, setScannedStall] = useState(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scanner, setScanner] = useState(null);
  const [isProcessingScan, setIsProcessingScan] = useState(false);
  const [scanValidation, setScanValidation] = useState(null); // { status: 'valid'|'invalid', message: '', details: '' }
  const [isCameraLoading, setIsCameraLoading] = useState(false);
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
      let qrData;
      try {
        qrData = JSON.parse(decodedText);
        console.log('[Feedback QR] Parsed QR data:', qrData);
      } catch (parseError) {
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

      // Validate QR type
      if (type !== 'stall') {
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
      if (eventId !== selectedEvent) {
        const eventName = events.find(e => e.id === eventId)?.name || 'another event';
        const currentEventName = events.find(e => e.id === selectedEvent)?.name || 'current event';
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
      const stall = stalls.find(s => s.id === stallId);
      console.log('[Feedback QR] Found stall:', stall?.name || 'Not found');
      
      if (!stall) {
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
      console.log('[Feedback QR] ✅ Scan successful! Stall:', stall.name);
      
      setScanValidation({
        status: 'valid',
        message: '✅ Valid Stall QR Code',
        details: `Scanned: "${stall.name}" from ${stall.department} department. You can now submit your feedback!`,
        timestamp: new Date().toLocaleTimeString()
      });
      
      // Close and clean up scanner
      if (scanner) {
        try {
          await scanner.stop();
          await scanner.clear();
          console.log('[Feedback QR] Scanner stopped after successful scan');
        } catch (err) {
          console.log('[Feedback QR] Error stopping scanner:', err.message);
        }
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
      setScanValidation({
        status: 'invalid',
        message: '❌ Scan Error',
        details: `An unexpected error occurred: ${error.message}. Please try scanning again.`,
        timestamp: new Date().toLocaleTimeString()
      });
      toast.error('Invalid QR code format. Please scan a stall QR code.');
      setIsProcessingScan(false);
    }
  }, [isProcessingScan, selectedEvent, stalls, myFeedbacks, scanner, events]);

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
        setIsCameraLoading(true); // Start loading
        try {
          console.log('[Feedback QR] 🚀 Starting scanner initialization...');
          console.log('[Feedback QR] Browser:', navigator.userAgent);
          console.log('[Feedback QR] HTTPS:', window.location.protocol === 'https:');
          
          // Wait for DOM element to be ready
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if element exists
          const element = document.getElementById('qr-scanner');
          if (!element) {
            console.error('[Feedback QR] ❌ Scanner element not found in DOM');
            toast.error('Scanner initialization failed. Please try again.');
            setShowScanner(false);
            setIsCameraLoading(false);
            return;
          }

          console.log('[Feedback QR] ✅ Scanner element found');
          console.log('[Feedback QR] Creating Html5Qrcode instance...');
          
          // Use Html5Qrcode directly for better control
          qrScanner = new Html5Qrcode('qr-scanner');
          console.log('[Feedback QR] ✅ Html5Qrcode instance created');
          
          toast.loading('Requesting camera access...', { id: 'camera-init' });
          
          console.log('[Feedback QR] 📹 Getting available cameras...');
          
          // Get cameras
          let cameras;
          try {
            cameras = await Html5Qrcode.getCameras();
            console.log('[Feedback QR] ✅ Cameras found:', cameras.length);
            cameras.forEach((cam, idx) => {
              console.log(`  Camera ${idx}: ${cam.label} (${cam.id})`);
            });
          } catch (camError) {
            console.error('[Feedback QR] ❌ Failed to get cameras:', camError);
            toast.error('Failed to access camera. Please check permissions.', { id: 'camera-init' });
            throw camError;
          }
          
          if (!cameras || cameras.length === 0) {
            toast.error('No cameras found on this device.', { id: 'camera-init' });
            throw new Error('No cameras found');
          }

          // Select camera (prefer back/environment camera)
          let selectedCameraId;
          
          // Try to find back camera
          const backCamera = cameras.find(camera => 
            camera.label.toLowerCase().includes('back') || 
            camera.label.toLowerCase().includes('rear') ||
            camera.label.toLowerCase().includes('environment')
          );
          
          if (backCamera) {
            selectedCameraId = backCamera.id;
            console.log('[Feedback QR] 📸 Using back camera:', backCamera.label);
          } else {
            selectedCameraId = cameras[cameras.length > 1 ? cameras.length - 1 : 0].id;
            console.log('[Feedback QR] 📸 Using camera:', cameras.find(c => c.id === selectedCameraId)?.label);
          }
          
          // Configure scanner with mobile-friendly settings
          const config = {
            fps: 10,
            qrbox: function(viewfinderWidth, viewfinderHeight) {
              const minEdgePercentage = 0.7;
              const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
              return {
                width: qrboxSize,
                height: qrboxSize
              };
            },
            aspectRatio: 1.0,
            disableFlip: false,
            videoConstraints: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          };
          
          console.log('[Feedback QR] 🎬 Starting camera...');
          toast.loading('Starting camera...', { id: 'camera-init' });
          
          // Start scanning
          await qrScanner.start(
            selectedCameraId,
            config,
            handleScan,
            handleScanError
          );
          
          if (isActive) {
            setScanner(qrScanner);
            setIsCameraLoading(false);
            console.log('[Feedback QR] ✅✅✅ Scanner started successfully!');
            toast.success('📸 Camera ready! Point at stall QR code', { 
              id: 'camera-init',
              duration: 3000
            });
          } else {
            console.log('[Feedback QR] Component unmounted, stopping scanner');
            await qrScanner.stop();
            await qrScanner.clear();
            setIsCameraLoading(false);
          }
        } catch (error) {
          setIsCameraLoading(false);
          toast.dismiss('camera-init');
          console.error('[Feedback QR] ❌ Failed to initialize scanner:', error);
          console.error('[Feedback QR] Error name:', error.name);
          console.error('[Feedback QR] Error message:', error.message);
          console.error('[Feedback QR] Error stack:', error.stack);
          
          // Better error messages based on error type
          let userMessage = 'Camera error: Please check camera permissions';
          
          if (error.name === 'NotAllowedError') {
            userMessage = '🚫 Camera permission denied. Please:\n1. Click the camera icon in your browser address bar\n2. Allow camera access\n3. Refresh the page';
          } else if (error.name === 'NotFoundError') {
            userMessage = '📷 No camera found on this device. Please ensure your device has a camera.';
          } else if (error.name === 'NotReadableError') {
            userMessage = '⚠️ Camera is already in use by another application. Please close other apps using the camera.';
          } else if (error.name === 'OverconstrainedError') {
            userMessage = '⚙️ Camera configuration error. Your camera may not support the required settings.';
          } else if (error.name === 'SecurityError') {
            userMessage = '🔒 Security error. Camera access requires HTTPS. Please ensure you\'re using a secure connection.';
          } else if (error.message) {
            userMessage = `❌ ${error.message}`;
          }
          
          toast.error(userMessage, { duration: 8000 });
          setShowScanner(false);
        }
      }
    };

    initScanner();

    return () => {
      isActive = false;
      if (qrScanner) {
        console.log('[Feedback QR] 🧹 Cleaning up scanner...');
        qrScanner.stop().then(() => {
          console.log('[Feedback QR] ✅ Scanner stopped successfully');
          qrScanner.clear();
        }).catch((err) => {
          console.log('[Feedback QR] ⚠️ Cleanup error (safe to ignore):', err.message);
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

  const cancelScan = async () => {
    console.log('[Feedback QR] Cancel scan requested');
    setIsProcessingScan(false);
    setScanValidation(null); // Clear validation message
    setIsCameraLoading(false); // Clear loading state
    if (scanner) {
      try {
        console.log('[Feedback QR] Stopping scanner...');
        await scanner.stop();
        await scanner.clear();
        console.log('[Feedback QR] Scanner stopped and cleared');
      } catch (err) {
        console.log('[Feedback QR] Error stopping scanner:', err.message);
      }
      setScanner(null);
    }
    setShowScanner(false);
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
                    setScanValidation(null); // Clear previous validation
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

                {/* Camera Loading State */}
                {isCameraLoading && (
                  <div className="bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-300 dark:border-purple-600 rounded-xl p-6 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-600"></div>
                      <p className="text-purple-900 dark:text-purple-100 font-semibold">
                        📸 Initializing Camera...
                      </p>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Please allow camera permissions if prompted
                      </p>
                    </div>
                  </div>
                )}

                {/* Scan Validation Feedback */}
                {scanValidation && (
                  <div 
                    className={`p-4 rounded-xl border-2 animate-scaleIn ${
                      scanValidation.status === 'valid'
                        ? 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-600'
                        : 'bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {scanValidation.status === 'valid' ? (
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h4 className={`font-bold text-lg mb-1 ${
                          scanValidation.status === 'valid'
                            ? 'text-green-900 dark:text-green-100'
                            : 'text-red-900 dark:text-red-100'
                        }`}>
                          {scanValidation.message}
                        </h4>
                        <p className={`text-sm ${
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
                          Scanned at {scanValidation.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div 
                  id="qr-scanner" 
                  className="rounded-xl overflow-hidden border-4 border-purple-300 dark:border-purple-600 bg-black w-full"
                  style={{ 
                    minHeight: '400px', 
                    maxWidth: '100%',
                    position: 'relative'
                  }}
                >
                  {/* Placeholder while camera loads */}
                  {!scanner && (
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <div className="text-center">
                        <div className="animate-pulse text-6xl mb-4">📹</div>
                        <p className="text-lg">Initializing camera...</p>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={cancelScan}
                  className="w-full py-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all duration-300 flex items-center justify-center gap-2 shadow-lg"
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
                    onClick={() => {
                      setScannedStall(null);
                      setScanValidation(null);
                    }}
                    className="p-2 hover:bg-green-200 dark:hover:bg-green-800 rounded-full transition-colors"
                    title="Scan different stall"
                  >
                    <X className="text-green-700 dark:text-green-300" size={24} />
                  </button>
                </div>
              </div>
            )}

            {/* Show last scan validation if scanner is closed and no stall selected */}
            {!showScanner && !scannedStall && scanValidation && (
              <div 
                className={`p-4 rounded-xl border-2 animate-fadeIn ${
                  scanValidation.status === 'valid'
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-400 dark:border-green-600'
                    : 'bg-red-50 dark:bg-red-900/30 border-red-400 dark:border-red-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  {scanValidation.status === 'valid' ? (
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <h4 className={`font-bold text-lg mb-1 ${
                      scanValidation.status === 'valid'
                        ? 'text-green-900 dark:text-green-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {scanValidation.message}
                    </h4>
                    <p className={`text-sm ${
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
                    className={`p-1 rounded-full transition-colors ${
                      scanValidation.status === 'valid'
                        ? 'hover:bg-green-200 dark:hover:bg-green-800'
                        : 'hover:bg-red-200 dark:hover:bg-red-800'
                    }`}
                    title="Dismiss"
                  >
                    <X className={`w-5 h-5 ${
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
                    className="mt-3 w-full py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Camera size={18} />
                    Try Scanning Again
                  </button>
                )}
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
