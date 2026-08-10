/**
 * Vote Capsule™ Election Authority Portal — App Root
 * Role: ELECTION_AUTHORITY — V9 Chapter 5
 * Code-split: all pages are lazy-loaded for faster initial bundle
 */
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthorityLayout } from './layouts/AuthorityLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAppSelector } from './store/hooks';

// Eagerly loaded (always needed on first paint)
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

// Lazy-loaded page chunks — only fetched when the user navigates to that route
const ElectionSetupPage       = lazy(() => import('./pages/ElectionSetupPage').then(m => ({ default: m.ElectionSetupPage })));
const CandidateApprovalPage   = lazy(() => import('./pages/CandidateApprovalPage').then(m => ({ default: m.CandidateApprovalPage })));
const GeographyPage           = lazy(() => import('./pages/GeographyPage').then(m => ({ default: m.GeographyPage })));
const LiveReportingPage       = lazy(() => import('./pages/LiveReportingPage').then(m => ({ default: m.LiveReportingPage })));
const ValidationMonitorPage   = lazy(() => import('./pages/ValidationMonitorPage').then(m => ({ default: m.ValidationMonitorPage })));
const AIReviewPage            = lazy(() => import('./pages/AIReviewPage').then(m => ({ default: m.AIReviewPage })));
const PublicationControlPage  = lazy(() => import('./pages/PublicationControlPage').then(m => ({ default: m.PublicationControlPage })));
const ObserverCoordinationPage = lazy(() => import('./pages/ObserverCoordinationPage').then(m => ({ default: m.ObserverCoordinationPage })));
const OfficialReportsPage     = lazy(() => import('./pages/OfficialReportsPage').then(m => ({ default: m.OfficialReportsPage })));
const FormBEntryPage          = lazy(() => import('./pages/FormBEntryPage').then(m => ({ default: m.FormBEntryPage })));
const FormCDeclarationPage    = lazy(() => import('./pages/FormCDeclarationPage').then(m => ({ default: m.FormCDeclarationPage })));

function PageLoader(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
    </div>
  );
}

export default function App(): React.JSX.Element {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AuthorityLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/elections" element={
            <Suspense fallback={<PageLoader />}><ElectionSetupPage /></Suspense>
          } />
          <Route path="/candidates" element={
            <Suspense fallback={<PageLoader />}><CandidateApprovalPage /></Suspense>
          } />
          <Route path="/geography" element={
            <Suspense fallback={<PageLoader />}><GeographyPage /></Suspense>
          } />
          <Route path="/live-reporting" element={
            <Suspense fallback={<PageLoader />}><LiveReportingPage /></Suspense>
          } />
          <Route path="/validation" element={
            <Suspense fallback={<PageLoader />}><ValidationMonitorPage /></Suspense>
          } />
          <Route path="/ai-review" element={
            <Suspense fallback={<PageLoader />}><AIReviewPage /></Suspense>
          } />
          <Route path="/publication" element={
            <Suspense fallback={<PageLoader />}><PublicationControlPage /></Suspense>
          } />
          <Route path="/observers" element={
            <Suspense fallback={<PageLoader />}><ObserverCoordinationPage /></Suspense>
          } />
          <Route path="/reports" element={
            <Suspense fallback={<PageLoader />}><OfficialReportsPage /></Suspense>
          } />
          <Route path="/form-b-entry" element={
            <Suspense fallback={<PageLoader />}><FormBEntryPage /></Suspense>
          } />
          <Route path="/form-c-declaration" element={
            <Suspense fallback={<PageLoader />}><FormCDeclarationPage /></Suspense>
          } />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
