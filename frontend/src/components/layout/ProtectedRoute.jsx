import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export function ProtectedRoute({ adminOnly = false, children }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-2">
          <div className="inline-block animate-spin text-3xl text-primary">⚡</div>
          <p className="text-xs font-bold text-gray-500">Resolving workspace session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center font-sans text-center">
        <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center text-2xl mb-3">
          🚫
        </div>
        <h2 className="text-base font-black text-gray-900 mb-1">Access Restricted (Admin Only)</h2>
        <p className="text-xs text-gray-500 max-w-xs mb-4">
          Your account has Member role access. Financial reports and staff administrative settings are restricted to Factory Admins.
        </p>
        <a href="/" className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow">
          Return to Dashboard
        </a>
      </div>
    );
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;
