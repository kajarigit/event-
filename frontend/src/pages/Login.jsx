import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [regNo, setRegNo] = useState('');
  const [volunteerId, setVolunteerId] = useState('');
  const [password, setPassword] = useState('');
  const [loginType, setLoginType] = useState('email'); // 'email', 'regNo', or 'volunteerId'
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Clear any stale tokens when login page loads
  useEffect(() => {
    // Only clear if there's no valid session (user will be null)
    const token = localStorage.getItem('accessToken');
    if (token) {
      console.log('Clearing potentially stale tokens on login page');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }

    // Show message if redirected from password reset
    if (location.state?.message) {
      if (location.state.type === 'success') {
        toast.success(location.state.message);
      } else {
        toast.error(location.state.message);
      }
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Prepare login data based on login type
      let loginData = { password };
      if (loginType === 'email') {
        loginData.email = email;
      } else if (loginType === 'regNo') {
        loginData.regNo = regNo;
      } else if (loginType === 'volunteerId') {
        loginData.volunteerId = volunteerId;
      }

      const response = await login(loginData);
      
      // Check if student needs verification
      if (response.needsVerification) {
        navigate('/student/verify');
        return;
      }
      
      // Redirect based on role
      if (response.user.role === 'admin') {
        navigate('/admin');
      } else if (response.user.role === 'volunteer') {
        navigate('/volunteer');
      } else if (response.user.role === 'stall_owner') {
        navigate('/stall-owner/dashboard');
      } else {
        navigate('/student');
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-sm sm:max-w-md lg:max-w-lg w-full">
        {/* Main Login Card - Mobile Responsive */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 lg:p-10 space-y-6 sm:space-y-8">
          
          {/* Header Section */}
          <div className="text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 sm:mb-3">
              Event Management
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Sign in to your account
            </p>
          </div>

          {/* Login Type Selection */}
          <div className="grid grid-cols-2 gap-2 bg-gray-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setLoginType('regNo')}
              className={`py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                loginType === 'regNo'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              👨‍🎓 Student (UID)
            </button>
            <button
              type="button"
              onClick={() => setLoginType('volunteerId')}
              className={`py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                loginType === 'volunteerId'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              👥 Volunteer
            </button>
          </div>
          
          {/* Admin & Stall Owner Links */}
          <div className="flex justify-center space-x-4 text-sm">
            <button
              type="button"
              onClick={() => setLoginType('email')}
              className={`text-blue-600 hover:text-blue-800 font-medium ${
                loginType === 'email' ? 'underline' : ''
              }`}
            >
              Admin Login
            </button>
            <Link
              to="/stall-owner/login"
              className="text-purple-600 hover:text-purple-800 font-medium"
            >
              Stall Owner Login
            </Link>
          </div>

          {/* Login Form */}
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Dynamic input based on login type */}
              <div>
                <label htmlFor={loginType} className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                  {loginType === 'email' ? 'Email Address' : 
                   loginType === 'regNo' ? 'Registration Number' : 'Volunteer ID'}
                </label>
                {loginType === 'email' ? (
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                ) : loginType === 'regNo' ? (
                  <input
                    id="regNo"
                    name="regNo"
                    type="text"
                    autoComplete="username"
                    required
                    className="w-full px-4 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Enter your registration number"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                  />
                ) : (
                  <input
                    id="volunteerId"
                    name="volunteerId"
                    type="text"
                    autoComplete="username"
                    required
                    className="w-full px-4 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                    placeholder="Enter your volunteer ID"
                    value={volunteerId}
                    onChange={(e) => setVolunteerId(e.target.value)}
                  />
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm sm:text-base font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 sm:py-4 text-sm sm:text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm sm:text-base text-blue-600 hover:text-blue-800 font-medium transition-colors touch-manipulation"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-base sm:text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 touch-manipulation"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Default Credentials Card - Mobile Responsive */}
        <div className="mt-4 sm:mt-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 sm:p-5">
          <h3 className="font-bold text-sm sm:text-base text-center text-gray-700 mb-3">Default Credentials</h3>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <span className="font-semibold text-blue-700">Admin:</span>
                <span className="text-gray-600 text-xs sm:text-sm font-mono">admin@event.com / Password@123</span>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                <span className="font-semibold text-purple-700">Student:</span>
                <span className="text-gray-600 text-xs sm:text-sm font-mono">rahul@student.com / Student@123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
