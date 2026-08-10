/**
 * Vote Capsule™ Political Party Portal — App Root
 * Role: PARTY_ADMIN / CAMPAIGN_COORDINATOR — V9 Chapter 6
 * Code-split: all pages lazy-loaded; Login + Dashboard are eager.
 */
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PartyLayout } from './layouts/PartyLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAppSelector } from './store/hooks';

// Eagerly loaded — always needed on first paint
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

// Lazy-loaded page chunks
const CandidateManagementPage = lazy(() => import('./pages/CandidateManagementPage').then(m => ({ default: m.CandidateManagementPage })));
const CoordinatorsPage        = lazy(() => import('./pages/CoordinatorsPage').then(m => ({ default: m.CoordinatorsPage })));
const AgentAssignmentsPage    = lazy(() => import('./pages/AgentAssignmentsPage').then(m => ({ default: m.AgentAssignmentsPage })));
const LiveResultsPage         = lazy(() => import('./pages/LiveResultsPage').then(m => ({ default: m.LiveResultsPage })));
const AnalyticsPage           = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const InvitationsPage         = lazy(() => import('./pages/InvitationsPage').then(m => ({ default: m.InvitationsPage })));
const ReportsPage             = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const NominationsPage         = lazy(() => import('./pages/NominationsPage').then(m => ({ default: m.NominationsPage })));
const SubscriptionPage        = lazy(() => import('./pages/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })));
const BillingPage             = lazy(() => import('./pages/BillingPage').then(m => ({ default: m.BillingPage })));

function PageLoader(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );
}

export default function App(): React.JSX.Element {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<PartyLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/candidates" element={
            <Suspense fallback={<PageLoader />}><CandidateManagementPage /></Suspense>
          } />
          <Route path="/coordinators" element={
            <Suspense fallback={<PageLoader />}><CoordinatorsPage /></Suspense>
          } />
          <Route path="/agents" element={
            <Suspense fallback={<PageLoader />}><AgentAssignmentsPage /></Suspense>
          } />
          <Route path="/live-results" element={
            <Suspense fallback={<PageLoader />}><LiveResultsPage /></Suspense>
          } />
          <Route path="/analytics" element={
            <Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>
          } />
          <Route path="/invitations" element={
            <Suspense fallback={<PageLoader />}><InvitationsPage /></Suspense>
          } />
          <Route path="/reports" element={
            <Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>
          } />
          <Route path="/nominations" element={
            <Suspense fallback={<PageLoader />}><NominationsPage /></Suspense>
          } />
          <Route path="/subscription" element={
            <Suspense fallback={<PageLoader />}><SubscriptionPage /></Suspense>
          } />
          <Route path="/billing" element={
            <Suspense fallback={<PageLoader />}><BillingPage /></Suspense>
          } />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
