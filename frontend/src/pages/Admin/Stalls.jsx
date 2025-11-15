import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit2,
  Trash2,
  Upload,
  QrCode,
  X,
  Store,
  Download,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function Stalls() {
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [editingStall, setEditingStall] = useState(null);
  const [selectedStall, setSelectedStall] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    description: '',
    coordinatorName: '',
    coordinatorContact: '',
    eventId: '', // Add eventId field
  });
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch events for dropdown
  const { data: events = [] } = useQuery({
    queryKey: ['adminEvents'],
    queryFn: async () => {
      const response = await adminApi.getEvents();
      return response.data?.data || response.data || [];
    },
  });

  // Fetch stalls
  const { data: stalls = [], isLoading } = useQuery({
    queryKey: ['adminStalls'],
    queryFn: async () => {
      const response = await adminApi.getStalls();
      // API returns { success: true, data: [...] }
      return response.data?.data || response.data || [];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createStall(data),
    onSuccess: () => {
      toast.success('Stall created successfully!');
      queryClient.invalidateQueries(['adminStalls']);
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create stall');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateStall(id, data),
    onSuccess: () => {
      toast.success('Stall updated successfully!');
      queryClient.invalidateQueries(['adminStalls']);
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update stall');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteStall(id),
    onSuccess: () => {
      toast.success('Stall deleted successfully!');
      queryClient.invalidateQueries(['adminStalls']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete stall');
    },
  });

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return adminApi.bulkUploadStalls(formData);
    },
    onSuccess: (response) => {
      const { created, errors } = response.data;
      toast.success(`${created} stalls uploaded successfully!`);
      if (errors.length > 0) {
        toast.error(`${errors.length} errors occurred`);
        console.error('Upload errors:', errors);
      }
      queryClient.invalidateQueries(['adminStalls']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Bulk upload failed');
    },
  });

  const openCreateModal = () => {
    setEditingStall(null);
    setFormData({
      name: '',
      department: '',
      description: '',
      coordinatorName: '',
      coordinatorContact: '',
      eventId: '', // Add eventId
    });
    setShowModal(true);
  };

  const openEditModal = (stall) => {
    setEditingStall(stall);
    setFormData({
      name: stall.name,
      department: stall.department,
      description: stall.description || '',
      // Map backend owner fields to frontend coordinator fields
      coordinatorName: stall.ownerName || '',
      coordinatorContact: stall.ownerContact || '',
      eventId: stall.eventId?.id || stall.eventId || '', // Handle populated or ID
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStall(null);
    setFormData({
      name: '',
      department: '',
      description: '',
      coordinatorName: '',
      coordinatorContact: '',
      eventId: '', // Add eventId
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Map frontend field names to backend field names
    const stallData = {
      name: formData.name,
      department: formData.department,
      description: formData.description,
      ownerName: formData.coordinatorName,       // Map to backend field
      ownerContact: formData.coordinatorContact, // Map to backend field
      eventId: formData.eventId,                 // Required field
    };
    
    if (editingStall) {
      updateMutation.mutate({ id: editingStall.id, data: stallData });
    } else {
      createMutation.mutate(stallData);
    }
  };

  const handleDelete = (stall) => {
    if (window.confirm(`Are you sure you want to delete "${stall.name}"?`)) {
      deleteMutation.mutate(stall.id);
    }
  };

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Please upload a CSV file');
        return;
      }
      bulkUploadMutation.mutate(file);
      e.target.value = '';
    }
  };

  const showQR = (stall) => {
    setSelectedStall(stall);
    setShowQRModal(true);
  };

  const downloadQR = () => {
    const svg = document.getElementById('stall-qr-code');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `${selectedStall.name}-QR.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Stalls Management</h2>
          <p className="text-gray-600 mt-1">Manage event stalls and booths</p>
        </div>
        <div className="flex space-x-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleBulkUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary flex items-center space-x-2"
            disabled={bulkUploadMutation.isLoading}
          >
            <Upload className="w-5 h-5" />
            <span>{bulkUploadMutation.isLoading ? 'Uploading...' : 'Bulk Upload'}</span>
          </button>
          <button onClick={openCreateModal} className="btn-primary flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Add Stall</span>
          </button>
        </div>
      </div>

      {/* Stalls Grid */}
      <div className="card">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading stalls...</p>
          </div>
        ) : stalls.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Store className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">No stalls yet</p>
            <p className="text-sm">Click "Add Stall" or use bulk upload</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stalls.map((stall) => (
              <div key={stall.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{stall.name}</h3>
                    <p className="text-sm text-gray-600">{stall.department}</p>
                  </div>
                  <button
                    onClick={() => showQR(stall)}
                    className="text-blue-600 hover:text-blue-800"
                    title="View QR Code"
                  >
                    <QrCode className="w-6 h-6" />
                  </button>
                </div>

                {stall.description && (
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">{stall.description}</p>
                )}

                {stall.coordinatorName && (
                  <div className="text-xs text-gray-600 mb-3">
                    <div>Coordinator: {stall.coordinatorName}</div>
                    {stall.coordinatorContact && <div>{stall.coordinatorContact}</div>}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-center text-sm mb-3 p-2 bg-gray-50 rounded">
                  <div>
                    <div className="font-semibold">{stall.stats?.totalVotes || 0}</div>
                    <div className="text-xs text-gray-600">Votes</div>
                  </div>
                  <div>
                    <div className="font-semibold">{stall.stats?.totalFeedbacks || 0}</div>
                    <div className="text-xs text-gray-600">Feedbacks</div>
                  </div>
                  <div>
                    <div className="font-semibold">
                      {stall.stats?.averageRating?.toFixed(1) || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-600">Rating</div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => openEditModal(stall)}
                    className="text-blue-600 hover:text-blue-900"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(stall)}
                    className="text-red-600 hover:text-red-900"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">
                {editingStall ? 'Edit Stall' : 'Create New Stall'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event *
                </label>
                <select
                  value={formData.eventId}
                  onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select an event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stall Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Department *
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coordinator Name
                  </label>
                  <input
                    type="text"
                    value={formData.coordinatorName}
                    onChange={(e) => setFormData({ ...formData, coordinatorName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coordinator Contact
                  </label>
                  <input
                    type="text"
                    value={formData.coordinatorContact}
                    onChange={(e) => setFormData({ ...formData, coordinatorContact: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className="btn-primary disabled:opacity-50"
                >
                  {createMutation.isLoading || updateMutation.isLoading
                    ? 'Saving...'
                    : editingStall
                    ? 'Update Stall'
                    : 'Create Stall'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedStall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">{selectedStall.name} - QR Code</h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 text-center">
              {selectedStall.qrToken ? (
                <>
                  <QRCodeSVG
                    id="stall-qr-code"
                    value={selectedStall.qrToken}
                    size={300}
                    level="H"
                    includeMargin
                  />
                  <p className="text-sm text-gray-600 mt-4">
                    Students can scan this QR code while checked-in
                  </p>
                  <button
                    onClick={downloadQR}
                    className="btn-primary mt-4 flex items-center space-x-2 mx-auto"
                  >
                    <Download className="w-5 h-5" />
                    <span>Download QR Code</span>
                  </button>
                </>
              ) : (
                <p className="text-gray-500">No QR token generated for this stall</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
