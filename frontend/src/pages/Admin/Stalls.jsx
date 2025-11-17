import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { DEPARTMENTS } from '../../constants/departments';
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
  const [qrToken, setQrToken] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    description: '',
    location: '',
    category: '',
    ownerName: '',
    ownerContact: '',
    ownerEmail: '',
    participants: [],
    eventId: '',
  });
  const [participantInput, setParticipantInput] = useState({
    name: '',
    regNo: '',
    department: ''
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
    onSuccess: (response) => {
      const stallData = response.data?.data || response.data;
      toast.success(
        <div>
          <div className="font-bold">✅ Stall Created Successfully!</div>
          <div className="text-sm mt-1">"{stallData?.name || 'Stall'}" has been added to the event.</div>
          {stallData?.id && <div className="text-xs mt-1 opacity-75">ID: {stallData.id}</div>}
        </div>,
        {
          duration: 4000,
          style: {
            background: '#10B981',
            color: '#fff',
          },
        }
      );
      queryClient.invalidateQueries(['adminStalls']);
      closeModal();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Failed to create stall';
      toast.error(
        <div>
          <div className="font-bold">❌ Failed to Create Stall</div>
          <div className="text-sm mt-1">{errorMessage}</div>
        </div>,
        {
          duration: 5000,
          style: {
            background: '#EF4444',
            color: '#fff',
          },
        }
      );
      console.error('[Stall Form] Create error:', error);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateStall(id, data),
    onSuccess: (response) => {
      const stallData = response.data?.data || response.data;
      toast.success(
        <div>
          <div className="font-bold">✅ Stall Updated Successfully!</div>
          <div className="text-sm mt-1">"{stallData?.name || 'Stall'}" has been updated.</div>
        </div>,
        {
          duration: 3000,
          style: {
            background: '#10B981',
            color: '#fff',
          },
        }
      );
      queryClient.invalidateQueries(['adminStalls']);
      closeModal();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.message || 'Failed to update stall';
      toast.error(
        <div>
          <div className="font-bold">❌ Failed to Update Stall</div>
          <div className="text-sm mt-1">{errorMessage}</div>
        </div>,
        {
          duration: 5000,
          style: {
            background: '#EF4444',
            color: '#fff',
          },
        }
      );
      console.error('[Stall Form] Update error:', error);
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
      location: '',
      category: '',
      ownerName: '',
      ownerContact: '',
      ownerEmail: '',
      participants: [],
      eventId: '',
    });
    setParticipantInput({ name: '', regNo: '', department: '' });
    setShowModal(true);
  };

  const openEditModal = (stall) => {
    setEditingStall(stall);
    setFormData({
      name: stall.name,
      department: stall.department || '',
      description: stall.description || '',
      location: stall.location || '',
      category: stall.category || '',
      ownerName: stall.ownerName || '',
      ownerContact: stall.ownerContact || '',
      ownerEmail: stall.ownerEmail || '',
      participants: stall.participants || [],
      eventId: stall.eventId?.id || stall.eventId || '',
    });
    setParticipantInput({ name: '', regNo: '', department: '' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStall(null);
    setFormData({
      name: '',
      department: '',
      description: '',
      location: '',
      category: '',
      ownerName: '',
      ownerContact: '',
      ownerEmail: '',
      participants: [],
      eventId: '',
    });
    setParticipantInput({ name: '', regNo: '', department: '' });
  };

  const addParticipant = () => {
    if (participantInput.name && participantInput.regNo && participantInput.department) {
      setFormData({
        ...formData,
        participants: [...formData.participants, { ...participantInput }]
      });
      setParticipantInput({ name: '', regNo: '', department: '' });
      toast.success('Participant added!');
    } else {
      toast.error('Please fill all participant fields');
    }
  };

  const removeParticipant = (index) => {
    setFormData({
      ...formData,
      participants: formData.participants.filter((_, i) => i !== index)
    });
    toast.success('Participant removed!');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prevent multiple submissions - check if already submitting
    if (createMutation.isLoading || updateMutation.isLoading) {
      console.log('[Stall Form] Already submitting, ignoring duplicate click...');
      toast.error('Please wait, your request is being processed...', { duration: 2000 });
      return;
    }
    
    // Validate required fields
    if (!formData.eventId || !formData.name || !formData.department) {
      toast.error('Please fill in all required fields (Event, Name, Department)');
      return;
    }
    
    const stallData = {
      name: formData.name.trim(),
      department: formData.department,
      description: formData.description.trim() || '',
      location: formData.location.trim() || '',
      category: formData.category.trim() || '',
      ownerName: formData.ownerName.trim() || '',
      ownerContact: formData.ownerContact.trim() || '',
      ownerEmail: formData.ownerEmail.trim() || '',
      participants: formData.participants,
      eventId: formData.eventId,
    };
    
    console.log('[Stall Form] Submitting stall:', stallData);
    
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

  // Download sample template
  const downloadSampleTemplate = () => {
    const csvContent = `eventId,name,description,location,category,ownerName,ownerContact,ownerEmail,department,participants
REPLACE_WITH_EVENT_UUID,AI & Machine Learning,Showcasing AI projects,Block A - Room 101,Technology,Dr. Rajesh Kumar,9876543210,rajesh.kumar@college.edu,Computer Science,"[{\\"name\\":\\"Amit Sharma\\",\\"regNo\\":\\"2024CS001\\",\\"department\\":\\"Computer Science\\"},{\\"name\\":\\"Priya Patel\\",\\"regNo\\":\\"2024CS045\\",\\"department\\":\\"Computer Science\\"}]"
REPLACE_WITH_EVENT_UUID,IoT Solutions,Smart devices and IoT,Block B - Room 202,Technology,Prof. Neha Singh,9876543211,neha.singh@college.edu,Electronics,"[{\\"name\\":\\"Vikram Reddy\\",\\"regNo\\":\\"2024EC012\\",\\"department\\":\\"Electronics\\"}]"`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample-stalls-upload.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sample template downloaded! Replace REPLACE_WITH_EVENT_UUID with actual event ID. Participants should be JSON array.');
  };

  // Download blank template
  const downloadBlankTemplate = () => {
    const csvContent = 'eventId,name,description,location,category,ownerName,ownerContact,ownerEmail,department,participants\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'blank-stalls-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Blank template downloaded!');
  };

  const showQR = async (stall) => {
    setSelectedStall(stall);
    setShowQRModal(true);
    setLoadingQR(true);
    setQrToken(null);

    try {
      // Fetch/generate QR code from backend
      const response = await adminApi.getStallQRCode(stall.id);
      const token = response.data?.data?.qrToken || response.data?.qrToken;
      setQrToken(token);
      
      // Update the stall in the list with the new token
      queryClient.setQueryData(['adminStalls'], (old) => {
        if (!old) return old;
        return old.map(s => s.id === stall.id ? { ...s, qrToken: token } : s);
      });
    } catch (error) {
      console.error('Error fetching QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setLoadingQR(false);
    }
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
            onClick={downloadSampleTemplate}
            className="btn-secondary flex items-center space-x-2"
            title="Download sample CSV with example stalls"
          >
            <Download className="w-5 h-5" />
            <span>Sample Template</span>
          </button>
          <button
            onClick={downloadBlankTemplate}
            className="btn-secondary flex items-center space-x-2"
            title="Download blank CSV template"
          >
            <Download className="w-5 h-5" />
            <span>Blank Template</span>
          </button>
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
                    <p className="text-xs text-gray-400 font-mono mt-1" title="Unique Stall ID">
                      ID: {stall.id}
                    </p>
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

                <div className="text-xs text-gray-600 mb-3 space-y-1">
                  {stall.location && <div>📍 {stall.location}</div>}
                  {stall.category && <div>🏷️ {stall.category}</div>}
                  {stall.ownerName && (
                    <div>
                      <span className="font-medium">Owner:</span> {stall.ownerName}
                      {stall.ownerContact && <span> • {stall.ownerContact}</span>}
                    </div>
                  )}
                  {stall.participants && stall.participants.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50 rounded">
                      <div className="font-medium text-blue-900 mb-1">
                        👥 Participants ({stall.participants.length})
                      </div>
                      <div className="space-y-1">
                        {stall.participants.slice(0, 3).map((participant, idx) => (
                          <div key={idx} className="text-xs text-blue-800">
                            {participant.name} • {participant.regNo}
                          </div>
                        ))}
                        {stall.participants.length > 3 && (
                          <div className="text-xs text-blue-600 italic">
                            +{stall.participants.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

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
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            {/* Loading Overlay */}
            {(createMutation.isLoading || updateMutation.isLoading) && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-lg font-semibold text-gray-700">
                    {editingStall ? 'Updating stall...' : 'Creating stall...'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">Please wait, do not close this window</p>
                </div>
              </div>
            )}
            
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">
                {editingStall ? 'Edit Stall' : 'Create New Stall'}
              </h3>
              <button 
                onClick={closeModal} 
                className="text-gray-400 hover:text-gray-600"
                disabled={createMutation.isLoading || updateMutation.isLoading}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Prevent any interaction during submission */}
              {(createMutation.isLoading || updateMutation.isLoading) && (
                <div className="absolute inset-0 z-5 cursor-not-allowed" style={{ pointerEvents: 'all' }}></div>
              )}
              
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
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Department</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
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
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Block A - Room 101"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Technology, Engineering"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Contact
                  </label>
                  <input
                    type="text"
                    value={formData.ownerContact}
                    onChange={(e) => setFormData({ ...formData, ownerContact: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Owner Email
                  </label>
                  <input
                    type="email"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="For QR code delivery"
                  />
                </div>
              </div>

              {/* Participants Section */}
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Participants
                </label>
                
                {/* Add Participant Form */}
                <div className="bg-gray-50 p-4 rounded-lg mb-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <input
                      type="text"
                      value={participantInput.name}
                      onChange={(e) => setParticipantInput({ ...participantInput, name: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Participant Name"
                    />
                    <input
                      type="text"
                      value={participantInput.regNo}
                      onChange={(e) => setParticipantInput({ ...participantInput, regNo: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Reg No (e.g., 2024CS001)"
                    />
                    <select
                      value={participantInput.department}
                      onChange={(e) => setParticipantInput({ ...participantInput, department: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Department</option>
                      {DEPARTMENTS.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={addParticipant}
                    className="btn-secondary text-sm"
                  >
                    + Add Participant
                  </button>
                </div>

                {/* Participants List */}
                {formData.participants.length > 0 && (
                  <div className="space-y-2">
                    {formData.participants.map((participant, index) => (
                      <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{participant.name}</div>
                          <div className="text-sm text-gray-600">
                            {participant.regNo} • {participant.department}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeParticipant(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {formData.participants.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No participants added yet</p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={closeModal} 
                  className="btn-secondary"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isLoading || updateMutation.isLoading}
                  className={`btn-primary flex items-center space-x-2 min-w-[140px] justify-center ${
                    (createMutation.isLoading || updateMutation.isLoading) 
                      ? 'opacity-60 cursor-not-allowed pointer-events-none' 
                      : ''
                  }`}
                >
                  {createMutation.isLoading || updateMutation.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>{editingStall ? 'Updating...' : 'Creating...'}</span>
                    </>
                  ) : (
                    <span>{editingStall ? 'Update Stall' : 'Create Stall'}</span>
                  )}
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
              {loadingQR ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Generating QR code...</p>
                </div>
              ) : qrToken ? (
                <>
                  <QRCodeSVG
                    id="stall-qr-code"
                    value={qrToken}
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
                <div className="py-8">
                  <p className="text-gray-500 mb-4">Failed to generate QR code</p>
                  <button
                    onClick={() => showQR(selectedStall)}
                    className="btn-secondary"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
