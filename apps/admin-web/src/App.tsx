/**
 * Vote Capsule™ Super Admin Portal — App Root
 *
 * Handles routing for the complete platform admin interface.
 * Route protection: all admin routes require PLATFORM_SUPER_ADMIN role.
 */

import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TenantsPage } from './pages/TenantsPage';
import { TenantDetailPage } from './pages/TenantDetailPage';
import { TenantCreatePage } from './pages/TenantCreatePage';
import { TenantMembersPage } from './pages/TenantMembersPage';
import { TenantSubscriptionPage } from './pages/TenantSubscriptionPage';
import { UsersPage } from './pages/UsersPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { RolesPage } from './pages/RolesPage';
import { TrustLedgerPage } from './pages/TrustLedgerPage';
import { SecurityPage } from './pages/SecurityPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ConfigurationPage } from './pages/ConfigurationPage';
import { SettingsPage } from './pages/SettingsPage';
import { EvidencePage } from './pages/EvidencePage';
import { ElectionsPage } from './pages/ElectionsPage';
import { AiOperationsPage } from './pages/AiOperationsPage';
import { BillingAdminPage } from './pages/BillingAdminPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { loginSuccess, logout } from './store/slices/authSlice';
import { identityClient } from './api/apiClient';

/**
 * Session hydration — validates stored token on app load.
 * Prevents the "blink and disappear" bug where expired tokens
 * pass the initial isAuthenticated check, fire API calls that all
 * 401, and then the interceptor kills the session mid-render.
 */
function useSessionHydration() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.accessToken);
  const user = useAppSelector((s) => s.auth.user);
  const [hydrating, setHydrating] = useState(!!token && !user);

  useEffect(() => {
    if (!token) {
      setHydrating(false);
      return;
    }
    if (user) {
      // Already hydrated (e.g. just logged in)
      setHydrating(false);
      return;
    }

    // Token exists but user is null — validate & hydrate
    let cancelled = false;
    identityClient
      .get('/users/me')
      .then(({ data }) => {
        if (cancelled) return;
        const me = data.data ?? data;
        dispatch(loginSuccess({
          user: {
            id: me.id ?? '',
            email: me.email ?? '',
            roles: me.roles ?? ['PLATFORM_SUPER_ADMIN'],
            tenantId: me.tenantId,
          },
          accessToken: token,
        }));
      })
      .catch(() => {
        if (cancelled) return;
        // Token is invalid/expired — log out gracefully (no blink)
        dispatch(logout());
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });

    return () => { cancelled = true; };
  }, [token, user, dispatch]);

  return hydrating;
}

export default function App(): React.JSX.Element {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const hydrating = useSessionHydration();

  // Show loading state while validating stored token
  if (hydrating) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-[#0B3C6D] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Verifying session…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      {/* Protected admin routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Tenants */}
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/tenants/new" element={<TenantCreatePage />} />
          <Route path="/tenants/:id" element={<TenantDetailPage />} />
          <Route path="/tenants/:id/members" element={<TenantMembersPage />} />
          <Route path="/tenants/:id/subscription" element={<TenantSubscriptionPage />} />

          {/* Users */}
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:id" element={<UserDetailPage />} />

          {/* Platform management */}
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/trust-ledger" element={<TrustLedgerPage />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/configuration" element={<ConfigurationPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Evidence Capsules — now with real data from Evidence Service */}
          <Route path="/evidence" element={<EvidencePage />} />

          {/* Elections — full lifecycle management */}
          <Route path="/elections" element={<ElectionsPage />} />

          {/* AI Operations — verification monitoring */}
          <Route path="/ai-operations" element={<AiOperationsPage />} />

          {/* Billing — plans, subscriptions, invoices */}
          <Route path="/billing" element={<BillingAdminPage />} />

          {/* Support — coming soon */}
          <Route path="/support" element={<ComingSoonPage title="Support" description="Support ticket overview. Coming soon." />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
