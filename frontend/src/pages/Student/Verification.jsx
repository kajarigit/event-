import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, MapPin, AlertCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

const StudentVerification = () => {
  const [formData, setFormData] = useState({
    birthDate: '',
    permanentAddressPinCode: ''
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/auth/verify-student', formData);
      
      if (response.data.success) {
        toast.success(response.data.message);
        // Redirect to password reset page
        navigate('/student/reset-password', { 
          state: { 
            fromVerification: true,
            userId: response.data.data.userId 
          }
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Student Verification</h1>
          <p className="text-blue-100 text-sm">
            Please verify your identity to continue
          </p>
        </div>

        {/* Form */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span>This is a one-time verification process</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Birth Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Birth Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* PIN Code */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Permanent Address PIN Code
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  name="permanentAddressPinCode"
                  value={formData.permanentAddressPinCode}
                  onChange={handleChange}
                  placeholder="e.g., 123456"
                  required
                  minLength="6"
                  maxLength="10"
                  pattern="[0-9]{6,10}"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter the PIN code of your permanent address
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify & Continue</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Why do we need this?</p>
                <p>This information helps us verify your identity and ensure account security. Your data is kept confidential.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentVerification;