import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

/** Required roles for party portal */
const REQUIRED_ROLES = ['PARTY_ADMIN', 'CAMPAIGN_COORDINATOR', 'SUPER_ADMIN', 'PLATFORM_SUPER_ADMIN'];

export function ProtectedRoute(): React.JSX.Element {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const user = useAppSelector((s: any) => s.auth.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !user.roles?.some((r: string) => REQUIRED_ROLES.includes(r))) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-violet-200 shadow-sm p-8 max-w-sm text-center">
          <h2 className="text-lg font-bold text-gray-900">Party Portal Access Required</h2>
          <p className="text-sm text-gray-500 mt-2">
            This portal is restricted to party administrators and campaign coordinators.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
