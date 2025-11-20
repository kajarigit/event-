import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit2, Trash2, Upload, Users as UsersIcon, X, Search, Download } from 'lucide-react';
import { DEPARTMENTS } from '../../constants/departments';

export default function Users() {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    regNo: '',
    faculty: '',
    department: '',
    programme: '',
    year: '',
    role: 'student',
    password: '',
    phone: '',
  });
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['adminUsers', roleFilter],
    queryFn: async () => {
      const response = await adminApi.getUsers({ role: roleFilter });
      // API returns { success: true, data: [...] }
      return response.data?.data || response.data || [];
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createUser(data),
    onSuccess: () => {
      toast.success('User created successfully!');
      queryClient.invalidateQueries(['adminUsers']);
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create user');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      toast.success('User updated successfully!');
      queryClient.invalidateQueries(['adminUsers']);
      closeModal();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update user');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => adminApi.deleteUser(id),
    onSuccess: () => {
      toast.success('User deleted successfully!');
      queryClient.invalidateQueries(['adminUsers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    },
  });

  // Bulk upload mutation
  const bulkUploadMutation = useMutation({
    mutationFn: (file) => {
      const formData = new FormData();
      formData.append('file', file);
      return adminApi.bulkUploadUsers(formData);
    },
    onSuccess: (response) => {
      const data = response.data?.data || response.data;
      const { created, uploadErrors, emailsSent, emailsFailed } = data;
      
      toast.success(
        <div>
          <div className="font-bold">✅ Bulk Upload Successful!</div>
          <div className="text-sm mt-1">
            {created} users created • {emailsSent} welcome emails sent
            {emailsFailed > 0 && ` • ${emailsFailed} email failures`}
          </div>
        </div>,
        { duration: 6000 }
      );
      
      if (uploadErrors?.length > 0) {
        toast.error(`${uploadErrors.length} upload errors occurred - check console for details`);
        console.error('Upload errors:', uploadErrors);
      }
      
      if (data.emailErrors?.length > 0) {
        console.error('Email errors:', data.emailErrors);
      }
      
      queryClient.invalidateQueries(['adminUsers']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Bulk upload failed');
    },
  });

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      email: '',
      regNo: '',
      faculty: '',
      department: '',
      programme: '',
      year: '',
      role: 'student',
      password: '',
      phone: '',
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      regNo: user.regNo || '',
      faculty: user.faculty || '',
      department: user.department || '',
      programme: user.programme || '',
      year: user.year || '',
      role: user.role,
      password: '',
      phone: user.phone || '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const dataToSubmit = { ...formData };
    if (editingUser && !dataToSubmit.password) {
      delete dataToSubmit.password;
    }
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: dataToSubmit });
    } else {
      createMutation.mutate(dataToSubmit);
    }
  };

  const handleDelete = (user) => {
    if (window.confirm(`Are you sure you want to delete "${user.name}"?`)) {
      deleteMutation.mutate(user.id);
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
    const csvContent = `name,email,password,role,phone,regNo,faculty,department,programme,year
Rahul Kumar,rahul.kumar@student.com,Student@123,student,9876543210,2024CS001,School of Engineering,Computer Science,B.Tech Computer Science,2024
Priya Sharma,priya.sharma@student.com,Student@123,student,9876543211,2024EC002,School of Engineering,Electronics,B.Tech Electronics,2024
Amit Patel,amit.patel@student.com,Student@123,student,9876543212,2023ME045,School of Engineering,Mechanical,B.Tech Mechanical,2023
Sneha Reddy,sneha.reddy@student.com,Student@123,student,9876543213,2024CE015,School of Engineering,Civil Engineering,B.Tech Civil,2024`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'sample-students-upload.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sample template downloaded!');
  };

  // Download blank template
  const downloadBlankTemplate = () => {
    const csvContent = 'name,email,password,role,phone,regNo,faculty,department,programme,year\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'blank-students-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Blank template downloaded!');
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.regNo && user.regNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Users Management</h2>
          <p className="text-gray-600 mt-1">Manage students and administrators</p>
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
            title="Download sample CSV with example data"
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
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Roles</option>
              <option value="student">Students</option>
              <option value="admin">Admins</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, email, or roll no..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <UsersIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      {user.phone && <div className="text-sm text-gray-500">{user.phone}</div>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {user.regNo && <div className="font-medium">Reg: {user.regNo}</div>}
                      {user.faculty && <div className="text-gray-600">{user.faculty}</div>}
                      {user.programme && <div className="text-gray-600">{user.programme}</div>}
                      {user.department && <div className="text-gray-600">{user.department}</div>}
                      {user.year && <div className="text-gray-500">Year: {user.year}</div>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full my-8">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-bold">{editingUser ? 'Edit User' : 'Create New User'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password {!editingUser && '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required={!editingUser}
                    placeholder={editingUser ? 'Leave empty to keep unchanged' : ''}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {formData.role === 'student' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Registration No</label>
                      <input
                        type="text"
                        value={formData.regNo}
                        onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 2024CS001"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Faculty/School</label>
                      <input
                        type="text"
                        value={formData.faculty}
                        onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., School of Engineering"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Programme</label>
                      <input
                        type="text"
                        value={formData.programme}
                        onChange={(e) => setFormData({ ...formData, programme: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., B.Tech Computer Science"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                      <input
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 2024"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                    : editingUser
                    ? 'Update User'
                    : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
