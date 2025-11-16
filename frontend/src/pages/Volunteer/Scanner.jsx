import { useState, useEffect } from 'react';
import { Camera, CheckCircle, XCircle, User, Clock, AlertCircle, Keyboard } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { volunteerApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function Scanner({ onScanSuccess }) {
  const [scanResult, setScanResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [useManualMode, setUseManualMode] = useState(false);
  const [lastTokenSent, setLastTokenSent] = useState(null); // NEW: Track last token sent
  const queryClient = useQueryClient();

  // Fetch recent scans
  const { data: recentScans = [] } = useQuery({
    queryKey: ['recentScans'],
    queryFn: async () => {
      const response = await volunteerApi.getRecentScans();
      // Handle nested data structure: response.data.data or response.data
      return response.data?.data || response.data || [];
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: (scannedData) => {
      // Extract and clean token from scanned data
      // QR might contain:
      // 1. Just the JWT token string: "eyJhbGc..."
      // 2. JSON with token field: {"token":"eyJhbGc...", "studentId":"...", ...}
      let qrToken;
      
      console.log('[SCANNER] Raw scanned data:', {
        type: typeof scannedData,
        length: scannedData?.length,
        preview: scannedData?.substring(0, 50)
      });
      
      try {
        // Attempt to parse as JSON
        const parsed = JSON.parse(scannedData);
        console.log('[SCANNER] Parsed as JSON:', Object.keys(parsed));
        qrToken = parsed.token || parsed.qrToken || scannedData;
      } catch {
        // Not JSON - treat as raw token string
        console.log('[SCANNER] Not JSON, using as raw token');
        qrToken = scannedData;
      }
      
      // Clean the token (remove whitespace, newlines, etc.)
      const cleanToken = String(qrToken).trim().replace(/[\r\n\t]/g, '');
      
      console.log('[SCANNER] Sending to backend:', {
        originalLength: qrToken?.length,
        cleanedLength: cleanToken.length,
        preview: cleanToken.substring(0, 50) + '...'
      });
      
      // Store for debugging display
      setLastTokenSent({
        raw: scannedData,
        cleaned: cleanToken,
        length: cleanToken.length,
        preview: cleanToken.substring(0, 100) + '...' + cleanToken.substring(cleanToken.length - 50),
        timestamp: new Date().toLocaleTimeString()
      });
      
      if (!cleanToken) {
        throw new Error('QR token is empty after cleaning');
      }
      
      return volunteerApi.scanStudent(cleanToken);
    },
    onSuccess: (response) => {
      console.log('[SCANNER] Success response:', response.data);
      const data = response.data?.data || response.data;
      const { action, student, attendance } = data;
      
      toast.success(
        `${student.name} checked ${action.toUpperCase()} successfully!`,
        { duration: 4000 }
      );
      
      setScanResult({ success: true, action, student, attendance });
      
      // Invalidate recent scans query to trigger refetch
      queryClient.invalidateQueries(['recentScans']);
      
      // Call parent callback if provided (for Dashboard to refetch)
      if (onScanSuccess) {
        onScanSuccess();
      }
      
      // Clear result after 5 seconds
      setTimeout(() => setScanResult(null), 5000);
    },
    onError: (error) => {
      console.error('[SCANNER] Error:', {
        response: error.response?.data,
        message: error.message,
        status: error.response?.status
      });
      
      const message = error.response?.data?.message || error.message || 'Scan failed';
      toast.error(message, { duration: 5000 });
      setScanResult({ success: false, message });
      setTimeout(() => setScanResult(null), 5000);
    },
  });

  useEffect(() => {
    if (useManualMode) return; // Skip camera if manual mode is active

    let scanner;
    let isActive = true; // Track if component is still mounted

    const initScanner = () => {
      scanner = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      });

      scanner.render(
        (decodedText) => {
          // QR code successfully scanned
          if (!isActive) return; // Don't process if component unmounted
          
          console.log('QR Code scanned:', decodedText);
          scanner.pause(true);
          setScanning(false);
          
          // Send to backend
          scanMutation.mutate(decodedText);
          
          // Resume scanning after 3 seconds
          setTimeout(() => {
            if (isActive && scanner) {
              scanner.resume();
              setScanning(true);
            }
          }, 3000);
        },
        (errorMessage) => {
          // Check if camera access error
          if (errorMessage.includes('NotAllowedError') || errorMessage.includes('secure context')) {
            console.warn('Camera not available, switching to manual mode');
            if (isActive) {
              setUseManualMode(true);
            }
          }
        }
      );

      setScanning(true);
    };

    // Only initialize scanner if not in manual mode
    try {
      initScanner();
    } catch (error) {
      console.error('Scanner initialization failed:', error);
      if (isActive) {
        setUseManualMode(true);
      }
    }

    return () => {
      isActive = false; // Mark component as unmounted
      if (scanner) {
        try {
          // Clear scanner safely
          scanner.clear().catch((err) => {
            // Ignore DOM errors during cleanup
            if (!err.message?.includes('removeChild')) {
              console.error('Scanner cleanup error:', err);
            }
          });
        } catch (err) {
          // Silently ignore cleanup errors
          console.debug('Scanner already cleaned up');
        }
      }
    };
  }, [useManualMode]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) {
      toast.error('Please enter QR data');
      return;
    }
    
    // Send the manual input (will be parsed by scanMutation)
    scanMutation.mutate(manualInput.trim());
    setManualInput('');
  };

  // Check auth status for debugging
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');

  // Test auth endpoint
  const testAuth = async () => {
    try {
      console.log('🧪 Testing /auth/me endpoint...');
      const response = await volunteerApi.getRecentScans(); // This requires auth
      console.log('✅ Auth test successful:', response.data);
      toast.success('Authentication working!');
    } catch (error) {
      console.log('❌ Auth test failed:', error.response?.status, error.response?.data);
      toast.error(`Auth failed: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Auth Status Display - FOR DEBUGGING */}
      <div className={`p-4 rounded-lg border-2 ${accessToken ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">
              {accessToken ? '✅ Authenticated' : '❌ Not Authenticated'}
            </h3>
            <p className="text-xs mt-1">
              Access Token: {accessToken ? `Present (${accessToken.substring(0, 20)}...)` : 'Missing'}
            </p>
            <p className="text-xs">
              Refresh Token: {refreshToken ? `Present (${refreshToken.substring(0, 20)}...)` : 'Missing'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {!accessToken && (
              <div className="text-xs text-red-700">
                ⚠️ Please refresh page or re-login
              </div>
            )}
            {accessToken && (
              <button
                onClick={testAuth}
                className="btn-secondary text-xs px-3 py-1"
              >
                Test Auth
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* QR Scanner */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Scan Student QR Code</h2>
          <button
            onClick={() => setUseManualMode(!useManualMode)}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            {useManualMode ? (
              <>
                <Camera className="w-4 h-4" />
                Use Camera
              </>
            ) : (
              <>
                <Keyboard className="w-4 h-4" />
                Manual Input
              </>
            )}
          </button>
        </div>

        {/* Manual Input Mode */}
        {useManualMode ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Camera Not Available</p>
                  <p>Camera access requires HTTPS or localhost. Using manual input mode.</p>
                  <p className="mt-2">
                    <strong>To test:</strong> Copy the QR token from the student's QR code page and paste it here.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR Code Data (JSON Token)
                </label>
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder='Paste QR data here (e.g., {"token":"...", "studentId":"...", "eventId":"..."})'
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  rows="4"
                />
              </div>
              <button
                type="submit"
                disabled={scanMutation.isPending || !manualInput.trim()}
                className="btn-primary w-full"
              >
                {scanMutation.isPending ? 'Processing...' : 'Process QR Code'}
              </button>
            </form>
          </div>
        ) : (
          /* QR Scanner */
          <div id="qr-reader" className="mb-4"></div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <div
            className={`p-4 rounded-lg mb-4 ${
              scanResult.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {scanResult.success ? (
              <div className="flex items-start space-x-3">
                <CheckCircle className="w-6 h-6 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900">
                    Check {scanResult.action.toUpperCase()} Successful
                  </h4>
                  <p className="text-sm text-green-800 mt-1">
                    <strong>{scanResult.student.name}</strong>
                  </p>
                  <p className="text-sm text-green-700">
                    Roll: {scanResult.student.rollNo}
                  </p>
                  <p className="text-sm text-green-700">
                    Programme: {scanResult.student.programme}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start space-x-3">
                <XCircle className="w-6 h-6 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900">Scan Failed</h4>
                  <p className="text-sm text-red-800 mt-1">{scanResult.message}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DEBUG INFO - Last Token Sent */}
        {lastTokenSent && (
          <div className="bg-purple-50 border-2 border-purple-400 rounded-lg p-4 mb-4">
            <h4 className="font-bold text-purple-900 mb-2 flex items-center gap-2">
              🔍 Last Token Sent to Backend
              <span className="text-xs font-normal text-purple-600">({lastTokenSent.timestamp})</span>
            </h4>
            <div className="space-y-2 text-sm">
              <div className="bg-white p-2 rounded">
                <p className="font-semibold text-gray-700">Token Length:</p>
                <p className="font-mono text-lg text-green-600">{lastTokenSent.length} characters</p>
              </div>
              <div className="bg-white p-2 rounded">
                <p className="font-semibold text-gray-700">Token Preview (start + end):</p>
                <p className="font-mono text-xs text-gray-800 break-all">{lastTokenSent.preview}</p>
              </div>
              <div className="bg-white p-2 rounded">
                <p className="font-semibold text-gray-700">Full Token:</p>
                <textarea
                  readOnly
                  value={lastTokenSent.cleaned}
                  className="w-full p-2 text-xs font-mono border border-gray-300 rounded"
                  rows="3"
                />
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Instructions:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Point camera at student's QR code</li>
            <li>• First scan checks IN the student</li>
            <li>• Second scan checks OUT the student</li>
            <li>• Status will show below in recent scans</li>
          </ul>
        </div>
      </div>

      {/* Recent Scans */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
          <span>Recent Scans</span>
          <span className="text-sm text-gray-600">Auto-refreshes every 5s</span>
        </h2>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {recentScans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>No scans yet</p>
              <p className="text-sm">Start scanning student QR codes</p>
            </div>
          ) : (
            recentScans.map((scan) => {
              // Handle both MongoDB and Sequelize response formats
              const studentName = scan.studentId?.name || scan.user?.name || 'Unknown';
              const rollNo = scan.studentId?.rollNo || scan.user?.rollNumber || 'N/A';
              const scanAction = scan.action || (scan.scanType === 'check-in' ? 'in' : scan.scanType === 'check-out' ? 'out' : 'unknown');
              const hasError = scan.hasError || scan.status === 'failed';
              const errorMsg = scan.errorMessage || 'Scan failed';
              
              return (
                <div
                  key={scan.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    hasError
                      ? 'bg-red-50 border border-red-200'
                      : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <User className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="font-medium">{studentName}</p>
                      <p className="text-sm text-gray-600">
                        Roll: {rollNo}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center mt-1">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(scan.scanTime || scan.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    {hasError ? (
                      <>
                        <div className="flex items-center space-x-2">
                          <XCircle className="w-5 h-5 text-red-600" />
                          <span className="text-sm font-medium text-red-600">ERROR</span>
                        </div>
                        <p className="text-xs text-red-600">{errorMsg}</p>
                      </>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <CheckCircle
                          className={`w-5 h-5 ${
                            scanAction === 'in' ? 'text-green-600' : 'text-blue-600'
                          }`}
                        />
                        <span
                          className={`text-sm font-medium ${
                            scanAction === 'in' ? 'text-green-600' : 'text-blue-600'
                          }`}
                        >
                          {scanAction.toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
