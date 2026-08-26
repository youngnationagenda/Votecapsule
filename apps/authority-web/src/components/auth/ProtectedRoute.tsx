import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

/**
 * Required roles for authority portal (IEBC staff).
 * ELECTION_COMMISSIONER is the canonical DB role (packages/types SystemRole enum).
 * ELECTION_AUTHORITY is the legacy alias kept for backward-compat during auth hydration.
 */
const REQUIRED_ROLES = [
  'ELECTION_COMMISSIONER',   // canonical DB role
  'ELECTION_AUTHORITY',      // legacy alias — some Cognito tokens still carry this value
  'RETURNING_OFFICER',
  'SUPER_ADMIN',
  'PLATFORM_SUPER_ADMIN',
];

export function ProtectedRoute(): React.JSX.Element {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const user = useAppSelector((s) => s.auth.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !user.roles?.some((r: string) => REQUIRED_ROLES.includes(r))) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">Authority Portal Access Required</h2>
          <p className="text-sm text-gray-500 mt-2">
            This portal is restricted to IEBC election officials. Contact your administrator for access.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
