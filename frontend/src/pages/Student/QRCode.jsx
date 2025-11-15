import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { studentApi } from '../../services/api';
import { Download, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StudentQR() {
  const [selectedEvent, setSelectedEvent] = useState(null);

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
  const { data: statusData } = useQuery({
    queryKey: ['student-status', selectedEvent],
    queryFn: async () => {
      const response = await studentApi.getStatus(selectedEvent);
      return response.data?.data || response.data || {};
    },
    enabled: !!selectedEvent,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch QR code
  const { data: qrData, isLoading, refetch } = useQuery({
    queryKey: ['student-qr', selectedEvent],
    queryFn: async () => {
      const response = await studentApi.getQRCode(selectedEvent);
      return response.data?.data || response.data || {};
    },
    enabled: !!selectedEvent,
  });

  useEffect(() => {
    if (eventsData?.length > 0 && !selectedEvent) {
      setSelectedEvent(eventsData[0].id);
    }
  }, [eventsData, selectedEvent]);

  const events = eventsData || [];
  const qr = qrData;
  const status = statusData;

  const handleDownload = () => {
    const svg = document.getElementById('qr-code');
    if (svg) {
      // Convert SVG to canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const svgData = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `event-qr-${selectedEvent}-${new Date().getTime()}.png`;
        downloadLink.click();
        toast.success('QR code downloaded');
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card">
        <h2 className="text-2xl font-bold mb-6">My Event QR Code</h2>

        {/* Event Selector */}
        {events.length > 0 && (
          <div className="mb-6">
            <label className="label">Select Event</label>
            <select
              className="input-field"
              value={selectedEvent || ''}
              onChange={(e) => setSelectedEvent(e.target.value)}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Check-in Status Banner - CRITICAL: Shows persisted status */}
        {status && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            status.isCheckedIn 
              ? 'bg-green-50 border-2 border-green-500' 
              : 'bg-yellow-50 border-2 border-yellow-500'
          }`}>
            {status.isCheckedIn ? (
              <>
                <CheckCircle className="text-green-600" size={32} />
                <div>
                  <p className="font-bold text-green-900">You are currently CHECKED IN</p>
                  <p className="text-sm text-green-700">
                    You can vote and give feedback. No need to scan again until you check out.
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className="text-yellow-600" size={32} />
                <div>
                  <p className="font-bold text-yellow-900">You are NOT checked in</p>
                  <p className="text-sm text-yellow-700">
                    Show this QR code at the gate to check in.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {qr && (
          <div className="space-y-6">
            {/* QR Code Display */}
            <div className="flex flex-col items-center p-8 bg-gray-50 rounded-lg">
              <QRCodeSVG
                id="qr-code"
                value={qr.token}
                size={300}
                level="M"
                includeMargin={true}
              />
              <p className="mt-4 text-sm text-gray-600">
                Show this QR code at the event gate
              </p>
            </div>

            {/* QR Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">QR Code Information</h3>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>Valid until:</strong> {new Date(qr.expiresAt).toLocaleString()}</p>
                <p><strong>Usage:</strong> Check-in/Check-out at event gates</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download QR
              </button>
              <button
                onClick={() => refetch()}
                className="flex-1 btn-secondary flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                Refresh
              </button>
            </div>

            {/* Instructions */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">How to use:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                <li>Show this QR code to the volunteer at the event gate</li>
                <li>First scan will check you IN to the event</li>
                <li>Once checked in, you can vote and give feedback without scanning again</li>
                <li><strong>Even if you log out and log back in, you stay checked in</strong></li>
                <li>Second scan will check you OUT from the event</li>
                <li>After checking out, you'll need to scan again to check back in</li>
                <li>Save or screenshot this QR code for quick access</li>
              </ol>
            </div>
          </div>
        )}

        {!isLoading && !qr && events.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
              <svg className="w-16 h-16 mx-auto mb-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">No Active Events</h3>
              <p className="text-yellow-800 mb-4">
                There are currently no active events available. Please wait for an admin to create and activate an event.
              </p>
              <p className="text-sm text-yellow-700">
                Once an event is created, you'll be able to generate your QR code here for check-in.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
