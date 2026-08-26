import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../store/hooks';

/**
 * Required roles for party portal.
 * Includes all campaign team roles that are assigned via the Campaign Manager
 * (CAMPAIGN_MANAGER, WARD_COORDINATOR, etc.) so team members can log in here.
 */
const REQUIRED_ROLES = [
  'PARTY_ADMIN',
  'PARTY_CAMPAIGN_DIRECTOR',
  'CAMPAIGN_MANAGER',
  'CAMPAIGN_COORDINATOR',      // legacy alias
  'WARD_COORDINATOR',
  'CONSTITUENCY_COORDINATOR',
  'LOGISTICS_OFFICER',
  'FINANCE_OFFICER',
  'COMMUNICATIONS_OFFICER',
  'BRAND_MANAGER',
  'CAMPAIGN_VOLUNTEER',
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
