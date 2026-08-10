/**
 * Vote Capsule™ Observer Portal — App Root
 * Role: OBSERVER — V9 Chapter 8
 * Access: Read-only — only officially published information displayed
 * Code-split: all pages are lazy-loaded for faster initial bundle
 */
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ObserverLayout } from './layouts/ObserverLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAppSelector } from './store/hooks';

// Eagerly loaded (always needed on first paint)
import { LoginPage } from './pages/LoginPage';
import { NationalDashboardPage } from './pages/NationalDashboardPage';

// Lazy-loaded page chunks — only fetched when the user navigates to that route
const RegionalMonitoringPage = lazy(() => import('./pages/RegionalMonitoringPage').then(m => ({ default: m.RegionalMonitoringPage })));
const LiveReportingPage      = lazy(() => import('./pages/LiveReportingPage').then(m => ({ default: m.LiveReportingPage })));
const RiskAnalysisPage       = lazy(() => import('./pages/RiskAnalysisPage').then(m => ({ default: m.RiskAnalysisPage })));
const AIAlertsPage           = lazy(() => import('./pages/AIAlertsPage').then(m => ({ default: m.AIAlertsPage })));
const EvidenceViewerPage     = lazy(() => import('./pages/EvidenceViewerPage').then(m => ({ default: m.EvidenceViewerPage })));
const IncidentTrackingPage   = lazy(() => import('./pages/IncidentTrackingPage').then(m => ({ default: m.IncidentTrackingPage })));
const DownloadsPage          = lazy(() => import('./pages/DownloadsPage').then(m => ({ default: m.DownloadsPage })));
const APIAccessPage          = lazy(() => import('./pages/APIAccessPage').then(m => ({ default: m.APIAccessPage })));

function PageLoader(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
    </div>
  );
}

export default function App(): React.JSX.Element {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<ObserverLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<NationalDashboardPage />} />

          <Route path="/regional" element={
            <Suspense fallback={<PageLoader />}><RegionalMonitoringPage /></Suspense>
          } />
          <Route path="/live-reporting" element={
            <Suspense fallback={<PageLoader />}><LiveReportingPage /></Suspense>
          } />
          <Route path="/risk-analysis" element={
            <Suspense fallback={<PageLoader />}><RiskAnalysisPage /></Suspense>
          } />
          <Route path="/ai-alerts" element={
            <Suspense fallback={<PageLoader />}><AIAlertsPage /></Suspense>
          } />
          <Route path="/evidence" element={
            <Suspense fallback={<PageLoader />}><EvidenceViewerPage /></Suspense>
          } />
          <Route path="/incidents" element={
            <Suspense fallback={<PageLoader />}><IncidentTrackingPage /></Suspense>
          } />
          <Route path="/downloads" element={
            <Suspense fallback={<PageLoader />}><DownloadsPage /></Suspense>
          } />
          <Route path="/api-access" element={
            <Suspense fallback={<PageLoader />}><APIAccessPage /></Suspense>
          } />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
