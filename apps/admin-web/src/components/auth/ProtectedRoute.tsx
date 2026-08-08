import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

/** Required role for admin portal access */
const REQUIRED_ROLES = ['PLATFORM_SUPER_ADMIN', 'SUPER_ADMIN', 'SUPPORT_ADMIN'];

export function ProtectedRoute(): React.JSX.Element {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user is hydrated, check role. If still hydrating (user=null), allow through
  // — the session hydration hook in App.tsx handles the expired-token case.
  if (user && !user.roles.some((r) => REQUIRED_ROLES.includes(r))) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-2">
            This portal requires Super Admin privileges. Your role ({user.roles.join(', ')}) does not have access.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem('vc_access_token');
              window.location.assign('/login');
            }}
            className="vc-btn-secondary mt-4 w-full"
          >
            Sign in with a different account
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
