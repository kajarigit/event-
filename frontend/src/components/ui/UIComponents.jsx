import React from 'react';

export const StatusBadge = ({ status, className = '' }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'checked-in':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'checked-out':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'auto-checkout':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
        status
      )} ${className}`}
    >
      {status === 'auto-checkout' ? 'Auto Checkout' : status?.replace('-', ' ')?.toUpperCase()}
    </span>
  );
};

export const WarningAlert = ({ type, message, severity = 'warning', onDismiss, className = '' }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = (severity) => {
    switch (severity) {
      case 'error':
        return '⚠️';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getSeverityColor(severity)} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-lg">{getIcon(severity)}</span>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        {onDismiss && (
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={onDismiss}
              className="inline-flex rounded-md p-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const AttendanceCard = ({ title, value, subvalue, status, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 shadow-sm ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subvalue && <p className="text-sm text-gray-500 mt-1">{subvalue}</p>}
        </div>
        {status && (
          <div className="flex-shrink-0">
            <StatusBadge status={status} />
          </div>
        )}
      </div>
    </div>
  );
};

export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-blue-600 border-t-transparent`} />
    </div>
  );
};