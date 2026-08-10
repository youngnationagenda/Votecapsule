/**
 * Vote Capsule™ Candidate Portal — App Root
 * Role: CANDIDATE — V9 Chapter 7
 * Access restricted by: position + geography + license + tenant policies
 * Code-split: all pages lazy-loaded; Login + Dashboard are eager.
 */
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CandidateLayout } from './layouts/CandidateLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAppSelector } from './store/hooks';

// Eagerly loaded — always needed on first paint
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

// Lazy-loaded page chunks
const AssignedRegionPage  = lazy(() => import('./pages/AssignedRegionPage').then(m => ({ default: m.AssignedRegionPage })));
const LiveResultsPage     = lazy(() => import('./pages/LiveResultsPage').then(m => ({ default: m.LiveResultsPage })));
const StationProgressPage = lazy(() => import('./pages/StationProgressPage').then(m => ({ default: m.StationProgressPage })));
const EvidenceCapsulesPage = lazy(() => import('./pages/EvidenceCapsulesPage').then(m => ({ default: m.EvidenceCapsulesPage })));
const AnalyticsPage       = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const NotificationsPage   = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const DownloadsPage       = lazy(() => import('./pages/DownloadsPage').then(m => ({ default: m.DownloadsPage })));
const TeamManagementPage  = lazy(() => import('./pages/TeamManagementPage').then(m => ({ default: m.TeamManagementPage })));
const BillingPage         = lazy(() => import('./pages/BillingPage').then(m => ({ default: m.BillingPage })));

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
        <Route element={<CandidateLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/region" element={
            <Suspense fallback={<PageLoader />}><AssignedRegionPage /></Suspense>
          } />
          <Route path="/live-results" element={
            <Suspense fallback={<PageLoader />}><LiveResultsPage /></Suspense>
          } />
          <Route path="/stations" element={
            <Suspense fallback={<PageLoader />}><StationProgressPage /></Suspense>
          } />
          <Route path="/evidence" element={
            <Suspense fallback={<PageLoader />}><EvidenceCapsulesPage /></Suspense>
          } />
          <Route path="/analytics" element={
            <Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>
          } />
          <Route path="/notifications" element={
            <Suspense fallback={<PageLoader />}><NotificationsPage /></Suspense>
          } />
          <Route path="/downloads" element={
            <Suspense fallback={<PageLoader />}><DownloadsPage /></Suspense>
          } />
          <Route path="/team" element={
            <Suspense fallback={<PageLoader />}><TeamManagementPage /></Suspense>
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
