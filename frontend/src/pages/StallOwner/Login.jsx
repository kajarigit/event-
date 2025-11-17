import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { stallOwnerApi } from '../../services/api';
import toast from 'react-hot-toast';
import { Store, Mail, Lock, LogIn, TrendingUp } from 'lucide-react';

export default function StallOwnerLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    stallId: '',
    password: '',
  });

  const loginMutation = useMutation({
    mutationFn: ({ stallId, password }) => stallOwnerApi.login(stallId, password),
    onSuccess: (response) => {
      const { accessToken, refreshToken, stall } = response.data.data;
      
      // Store tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('userRole', 'stall_owner');
      localStorage.setItem('stallData', JSON.stringify(stall));
      
      toast.success(`Welcome back, ${stall.ownerName}! 🎉`);
      navigate('/stall-owner/dashboard');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Login failed');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.stallId || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    loginMutation.mutate(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20 px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8 animate-fadeIn">
          <div className="flex items-center justify-center mb-4">
            <div className="p-4 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl">
              <Store className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Stall Owner Login
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Access your live dashboard and track competition
          </p>
        </div>

        {/* Login Card */}
        <div className="card shadow-2xl border-2 border-blue-200 dark:border-blue-700 animate-slideUp">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Stall ID */}
            <div>
              <label className="label flex items-center gap-2">
                <Store size={18} className="text-blue-600 dark:text-blue-400" />
                Stall ID
              </label>
              <input
                type="text"
                name="stallId"
                value={formData.stallId}
                onChange={handleChange}
                className="input-field font-mono"
                placeholder="e.g., abc123-def4-5678-..."
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                📧 Check your email for your Stall ID
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="label flex items-center gap-2">
                <Lock size={18} className="text-blue-600 dark:text-blue-400" />
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="input-field font-mono"
                placeholder="Enter your password"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                � Password was sent to your email when stall was created
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginMutation.isLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loginMutation.isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <LogIn size={24} />
                  <span>Login to Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp size={20} className="text-green-600" />
              Dashboard Features:
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Live Rankings:</strong> See your position in department competition</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Real-time Votes:</strong> Track every vote as it comes in</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Live Feedback:</strong> Read student reviews instantly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Your QR Code:</strong> Display for easy scanning</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span><strong>Department Leaderboard:</strong> Compete with your school stalls</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Not a stall owner?{' '}
            <Link
              to="/login"
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Student/Admin Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
