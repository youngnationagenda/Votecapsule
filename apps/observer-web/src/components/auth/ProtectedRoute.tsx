import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

/**
 * Required roles for observer portal (read-only).
 * OBSERVER_ADMIN is the canonical DB role (packages/types SystemRole enum).
 * OBSERVER and OBSERVER_AGENT are additional recognised values.
 * ELECTION_COMMISSIONER allows authority staff to view observer dashboards.
 */
const REQUIRED_ROLES = [
  'OBSERVER_ADMIN',          // canonical DB role
  'OBSERVER_AGENT',          // observer field agent
  'OBSERVER',                // legacy alias
  'ELECTION_COMMISSIONER',   // canonical authority role
  'ELECTION_AUTHORITY',      // legacy alias
  'SUPER_ADMIN',
  'PLATFORM_SUPER_ADMIN',
];

export function ProtectedRoute(): React.JSX.Element {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  const user = useAppSelector((s: any) => s.auth.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !user.roles?.some((r: string) => REQUIRED_ROLES.includes(r))) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-sky-200 shadow-sm p-8 max-w-sm text-center">
          <h2 className="text-lg font-bold text-gray-900">Observer Portal Access Required</h2>
          <p className="text-sm text-gray-500 mt-2">
            This portal is restricted to accredited election observers.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
