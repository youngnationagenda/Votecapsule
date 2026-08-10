/**
 * Vote Capsule™ Super Admin Portal — App Root
 *
 * Handles routing for the complete platform admin interface.
 * Route protection: all admin routes require PLATFORM_SUPER_ADMIN role.
 * Code-split: all pages are lazy-loaded; Login + Dashboard are eager
 * (always needed on first paint or immediately after hydration).
 */

import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAppSelector, useAppDispatch } from './store/hooks';
import { loginSuccess, logout } from './store/slices/authSlice';
import { identityClient } from './api/apiClient';

// ── Eagerly loaded — always needed on first paint ─────────────────────────────
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

// ── Lazy-loaded page chunks ───────────────────────────────────────────────────
// Tenant management
const TenantsPage            = lazy(() => import('./pages/TenantsPage').then(m => ({ default: m.TenantsPage })));
const TenantDetailPage       = lazy(() => import('./pages/TenantDetailPage').then(m => ({ default: m.TenantDetailPage })));
const TenantCreatePage       = lazy(() => import('./pages/TenantCreatePage').then(m => ({ default: m.TenantCreatePage })));
const TenantMembersPage      = lazy(() => import('./pages/TenantMembersPage').then(m => ({ default: m.TenantMembersPage })));
const TenantSubscriptionPage = lazy(() => import('./pages/TenantSubscriptionPage').then(m => ({ default: m.TenantSubscriptionPage })));

// User management
const UsersPage              = lazy(() => import('./pages/UsersPage').then(m => ({ default: m.UsersPage })));
const UserDetailPage         = lazy(() => import('./pages/UserDetailPage').then(m => ({ default: m.UserDetailPage })));

// Platform management
const RolesPage              = lazy(() => import('./pages/RolesPage').then(m => ({ default: m.RolesPage })));
const TrustLedgerPage        = lazy(() => import('./pages/TrustLedgerPage').then(m => ({ default: m.TrustLedgerPage })));
const SecurityPage           = lazy(() => import('./pages/SecurityPage').then(m => ({ default: m.SecurityPage })));
const AuditLogPage           = lazy(() => import('./pages/AuditLogPage').then(m => ({ default: m.AuditLogPage })));
const ConfigurationPage      = lazy(() => import('./pages/ConfigurationPage').then(m => ({ default: m.ConfigurationPage })));
const SettingsPage           = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

// Election operations
const EvidencePage           = lazy(() => import('./pages/EvidencePage').then(m => ({ default: m.EvidencePage })));
const ElectionsPage          = lazy(() => import('./pages/ElectionsPage').then(m => ({ default: m.ElectionsPage })));
const AiOperationsPage       = lazy(() => import('./pages/AiOperationsPage').then(m => ({ default: m.AiOperationsPage })));
const BillingAdminPage       = lazy(() => import('./pages/BillingAdminPage').then(m => ({ default: m.BillingAdminPage })));
const ComingSoonPage         = lazy(() => import('./pages/ComingSoonPage').then(m => ({ default: m.ComingSoonPage })));

// ── Page-level Suspense fallback ─────────────────────────────────────────────
function PageLoader(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#0B3C6D]/20 border-t-[#0B3C6D] rounded-full animate-spin" />
    </div>
  );
}

// ── Session hydration ────────────────────────────────────────────────────────
/**
 * Validates the stored token on app load.
 * Prevents "blink" where expired tokens pass the initial isAuthenticated
 * check, fire API calls that all 401, then the interceptor kills the session.
 */
function useSessionHydration() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.accessToken);
  const user  = useAppSelector((s) => s.auth.user);
  const [hydrating, setHydrating] = useState(!!token && !user);

  useEffect(() => {
    if (!token) { setHydrating(false); return; }
    if (user)   { setHydrating(false); return; }

    // Token present but user null — validate & hydrate
    let cancelled = false;
    identityClient
      .get('/users/me')
      .then(({ data }) => {
        if (cancelled) return;
        const me = (data as { data?: { id: string; email: string; roles: string[]; tenantId?: string } }).data ?? data as { id: string; email: string; roles: string[]; tenantId?: string };
        dispatch(loginSuccess({
          user: {
            id:       me.id       ?? '',
            email:    me.email    ?? '',
            roles:    me.roles    ?? ['PLATFORM_SUPER_ADMIN'],
            tenantId: me.tenantId,
          },
          accessToken: token,
        }));
      })
      .catch(() => { if (!cancelled) dispatch(logout()); })
      .finally(() => { if (!cancelled) setHydrating(false); });

    return () => { cancelled = true; };
  }, [token, user, dispatch]);

  return hydrating;
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App(): React.JSX.Element {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const hydrating = useSessionHydration();

  if (hydrating) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#0B3C6D]/20 border-t-[#0B3C6D] rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 mt-3">Verifying session…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      {/* Protected admin routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard — eager (immediate first-paint after login) */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Tenants */}
          <Route path="/tenants" element={
            <Suspense fallback={<PageLoader />}><TenantsPage /></Suspense>
          } />
          <Route path="/tenants/new" element={
            <Suspense fallback={<PageLoader />}><TenantCreatePage /></Suspense>
          } />
          <Route path="/tenants/:id" element={
            <Suspense fallback={<PageLoader />}><TenantDetailPage /></Suspense>
          } />
          <Route path="/tenants/:id/members" element={
            <Suspense fallback={<PageLoader />}><TenantMembersPage /></Suspense>
          } />
          <Route path="/tenants/:id/subscription" element={
            <Suspense fallback={<PageLoader />}><TenantSubscriptionPage /></Suspense>
          } />

          {/* Users */}
          <Route path="/users" element={
            <Suspense fallback={<PageLoader />}><UsersPage /></Suspense>
          } />
          <Route path="/users/:id" element={
            <Suspense fallback={<PageLoader />}><UserDetailPage /></Suspense>
          } />

          {/* Platform management */}
          <Route path="/roles" element={
            <Suspense fallback={<PageLoader />}><RolesPage /></Suspense>
          } />
          <Route path="/trust-ledger" element={
            <Suspense fallback={<PageLoader />}><TrustLedgerPage /></Suspense>
          } />
          <Route path="/security" element={
            <Suspense fallback={<PageLoader />}><SecurityPage /></Suspense>
          } />
          <Route path="/audit" element={
            <Suspense fallback={<PageLoader />}><AuditLogPage /></Suspense>
          } />
          <Route path="/configuration" element={
            <Suspense fallback={<PageLoader />}><ConfigurationPage /></Suspense>
          } />
          <Route path="/settings" element={
            <Suspense fallback={<PageLoader />}><SettingsPage /></Suspense>
          } />

          {/* Election operations */}
          <Route path="/evidence" element={
            <Suspense fallback={<PageLoader />}><EvidencePage /></Suspense>
          } />
          <Route path="/elections" element={
            <Suspense fallback={<PageLoader />}><ElectionsPage /></Suspense>
          } />
          <Route path="/ai-operations" element={
            <Suspense fallback={<PageLoader />}><AiOperationsPage /></Suspense>
          } />
          <Route path="/billing" element={
            <Suspense fallback={<PageLoader />}><BillingAdminPage /></Suspense>
          } />
          <Route path="/support" element={
            <Suspense fallback={<PageLoader />}>
              <ComingSoonPage title="Support" description="Support ticket overview. Coming soon." />
            </Suspense>
          } />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
