import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Upload, Users as UsersIcon, X, Search, Download } from 'lucide-react';
import { DEPARTMENTS } from '../../constants/departments';

export default function Volunteers() {
  const [showModal, setShowModal] = useState(false);
  const [editingVolunteer, setEditingVolunteer] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    volunteerId: '',
    department: '',
    phone: '',
    permissions: {
      canScanQR: true,
      canManageAttendance: true,
      canViewReports: false
    },
    password: 'volunteer123'
  });
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch volunteers
  const { data: volunteers = [], isLoading } = useQuery({
    queryKey: ['adminVolunteers'],
    queryFn: async () => {
      const response = await adminApi.getVolunteers();
      return response.data?.data?.volunteers || response.data || [];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createVolunteer(data),
    onSuccess: () => {
      toast.success('Volunteer created successfully!');
      queryClient.invalidateQueries(['adminVolunteers']);
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create volunteer');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateVolunteer(id, data),
    onSuccess: () => {
      toast.success('Volunteer updated successfully!');
      queryClient.invalidateQueries(['adminVolunteers']);
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update volunteer');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteVolunteer(id),
    onSuccess: () => {
      toast.success('Volunteer deleted successfully!');
      queryClient.invalidateQueries(['adminVolunteers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete volunteer');
    },
  });

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: (formData) => adminApi.bulkUploadVolunteers(formData),
    onSuccess: (response) => {
      const data = response.data?.data || response.data;
      toast.success(`${data.created} volunteers uploaded successfully!`);
      queryClient.invalidateQueries(['adminVolunteers']);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to upload volunteers');
    },
  });

  // Download credentials mutation
  const downloadCredentialsMutation = useMutation({
    mutationFn: () => adminApi.downloadVolunteerCredentials(),
    onSuccess: (response) => {
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'volunteer-credentials.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Credentials downloaded successfully!');
    },
    onError: (error) => {
      toast.error('Failed to download credentials');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingVolunteer) {
      updateMutation.mutate({ id: editingVolunteer.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (volunteer) => {
    setEditingVolunteer(volunteer);
    setFormData({
      name: volunteer.name,
      email: volunteer.email || '',
      volunteerId: volunteer.volunteerId,
      department: volunteer.department,
      phone: volunteer.phone || '',
      permissions: volunteer.permissions || {
        canScanQR: true,
        canManageAttendance: true,
        canViewReports: false
      },
      password: '' // Don't pre-fill password for security
    });
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this volunteer?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    bulkUploadMutation.mutate(formData);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingVolunteer(null);
    setFormData({
      name: '',
      email: '',
      volunteerId: '',
      department: '',
      phone: '',
      permissions: {
        canScanQR: true,
        canManageAttendance: true,
        canViewReports: false
      },
      password: 'volunteer123'
    });
  };

  const filteredVolunteers = volunteers.filter(volunteer =>
    volunteer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    volunteer.volunteerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    volunteer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    volunteer.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDownloadCredentials = () => {
    downloadCredentialsMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UsersIcon className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Volunteer Management</h1>
              <p className="text-gray-600 mt-1">Manage event volunteers and their permissions</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleDownloadCredentials}
              disabled={downloadCredentialsMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadCredentialsMutation.isPending ? 'Downloading...' : 'Download Credentials'}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleBulkUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={bulkUploadMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm bg-green-600 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              {bulkUploadMutation.isPending ? 'Uploading...' : 'Bulk Upload'}
            </button>
            
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Volunteer
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">Total Volunteers</p>
                <p className="text-2xl font-semibold text-green-900">{volunteers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">Can Scan QR</p>
                <p className="text-2xl font-semibold text-blue-900">
                  {volunteers.filter(v => v.permissions?.canScanQR).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">Can View Reports</p>
                <p className="text-2xl font-semibold text-purple-900">
                  {volunteers.filter(v => v.permissions?.canViewReports).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search volunteers..."
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Volunteers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Volunteer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Volunteer ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVolunteers.map((volunteer) => (
                <tr key={volunteer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-600">
                            {volunteer.name?.charAt(0)?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{volunteer.name}</div>
                        <div className="text-sm text-gray-500">{volunteer.email || 'No email'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{volunteer.volunteerId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{volunteer.department}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{volunteer.phone || 'No phone'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {volunteer.permissions?.canScanQR && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          QR Scan
                        </span>
                      )}
                      {volunteer.permissions?.canManageAttendance && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          Attendance
                        </span>
                      )}
                      {volunteer.permissions?.canViewReports && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          Reports
                        </span>
                      )}
                      {!volunteer.permissions?.canScanQR && !volunteer.permissions?.canManageAttendance && !volunteer.permissions?.canViewReports && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          No Permissions
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(volunteer)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(volunteer.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredVolunteers.length === 0 && (
            <div className="text-center py-12">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No volunteers found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try adjusting your search.' : 'Get started by adding a new volunteer.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {editingVolunteer ? 'Edit Volunteer' : 'Add New Volunteer'}
                    </h3>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name *</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Volunteer ID *</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.volunteerId}
                        onChange={(e) => setFormData({ ...formData, volunteerId: e.target.value })}
                        disabled={editingVolunteer} // Don't allow changing volunteer ID when editing
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department *</label>
                      <select
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.department}
                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      >
                        <option value="">Select Department</option>
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="tel"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            checked={formData.permissions.canScanQR}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              permissions: { 
                                ...formData.permissions, 
                                canScanQR: e.target.checked 
                              }
                            })}
                          />
                          <span className="ml-2 text-sm text-gray-700">Can Scan QR Codes</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            checked={formData.permissions.canManageAttendance}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              permissions: { 
                                ...formData.permissions, 
                                canManageAttendance: e.target.checked 
                              }
                            })}
                          />
                          <span className="ml-2 text-sm text-gray-700">Can Manage Attendance</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            checked={formData.permissions.canViewReports}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              permissions: { 
                                ...formData.permissions, 
                                canViewReports: e.target.checked 
                              }
                            })}
                          />
                          <span className="ml-2 text-sm text-gray-700">Can View Reports</span>
                        </label>
                      </div>
                    </div>

                    {!editingVolunteer && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                          type="password"
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder="Default: volunteer123"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending 
                      ? 'Saving...' 
                      : editingVolunteer ? 'Update' : 'Create'
                    }
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}