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
const AssignedRegionPage   = lazy(() => import('./pages/AssignedRegionPage').then(m => ({ default: m.AssignedRegionPage })));
const LiveResultsPage      = lazy(() => import('./pages/LiveResultsPage').then(m => ({ default: m.LiveResultsPage })));
const StationProgressPage  = lazy(() => import('./pages/StationProgressPage').then(m => ({ default: m.StationProgressPage })));
const EvidenceCapsulesPage = lazy(() => import('./pages/EvidenceCapsulesPage').then(m => ({ default: m.EvidenceCapsulesPage })));
const AnalyticsPage        = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const NotificationsPage    = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const DownloadsPage        = lazy(() => import('./pages/DownloadsPage').then(m => ({ default: m.DownloadsPage })));
// TeamManagementPage removed — /team now redirects to /campaign/team (the old page called admin-only /identity/users)
const BillingPage          = lazy(() => import('./pages/BillingPage').then(m => ({ default: m.BillingPage })));
const NominationStatusPage = lazy(() => import('./pages/NominationStatusPage').then(m => ({ default: m.NominationStatusPage })));

// ── Campaign Manager pages ────────────────────────────────────
const MyCampaignDashboard    = lazy(() => import('./pages/MyCampaignDashboard').then(m => ({ default: m.MyCampaignDashboard })));
const MyCampaignCalendarPage = lazy(() => import('./pages/MyCampaignCalendarPage').then(m => ({ default: m.MyCampaignCalendarPage })));
const MyCampaignTeamPage     = lazy(() => import('./pages/MyCampaignTeamPage').then(m => ({ default: m.MyCampaignTeamPage })));
const MySupplierCataloguePage = lazy(() => import('./pages/MySupplierCataloguePage').then(m => ({ default: m.MySupplierCataloguePage })));
const MyBudgetPage           = lazy(() => import('./pages/MyBudgetPage').then(m => ({ default: m.MyBudgetPage })));
const MyCampaignNeedsPage    = lazy(() => import('./pages/MyCampaignNeedsPage').then(m => ({ default: m.MyCampaignNeedsPage })));
const MySMSPage              = lazy(() => import('./pages/MySMSPage').then(m => ({ default: m.MySMSPage })));
const MyIncidentsPage        = lazy(() => import('./pages/MyIncidentsPage').then(m => ({ default: m.MyIncidentsPage })));
const MyMaterialsPage        = lazy(() => import('./pages/MyMaterialsPage').then(m => ({ default: m.MyMaterialsPage })));
const MyPrintingDesignPage   = lazy(() => import('./pages/MyPrintingDesignPage').then(m => ({ default: m.MyPrintingDesignPage })));
const MyCampaignMediaPage    = lazy(() => import('./pages/MyCampaignMediaPage').then(m => ({ default: m.MyCampaignMediaPage })));
const MyAIImageGeneratorPage = lazy(() => import('./pages/MyAIImageGeneratorPage').then(m => ({ default: m.MyAIImageGeneratorPage })));

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
          <Route path="/team" element={<Navigate to="/campaign/team" replace />} />
          <Route path="/billing" element={
            <Suspense fallback={<PageLoader />}><BillingPage /></Suspense>
          } />
          <Route path="/nomination" element={
            <Suspense fallback={<PageLoader />}><NominationStatusPage /></Suspense>
          } />

          {/* ── Campaign Manager ───────────────────────────────── */}
          <Route path="/campaign" element={
            <Suspense fallback={<PageLoader />}><MyCampaignDashboard /></Suspense>
          } />
          <Route path="/campaign/calendar" element={
            <Suspense fallback={<PageLoader />}><MyCampaignCalendarPage /></Suspense>
          } />
          {/* Supplier Catalogue — unified page: supplier products + material types */}
          <Route path="/campaign/suppliers" element={
            <Suspense fallback={<PageLoader />}><MySupplierCataloguePage /></Suspense>
          } />
          {/* Materials — material types only (colour-select + quick order) */}
          {/* Campaign Materials — merged into Supplier Catalogue (MySupplierCataloguePage) */}
          <Route path="/campaign/materials" element={
            <Suspense fallback={<PageLoader />}><MySupplierCataloguePage /></Suspense>
          } />
          {/* Printing & Design — merged into My Campaign Needs (MyCampaignNeedsPage) */}
          <Route path="/campaign/printing" element={
            <Suspense fallback={<PageLoader />}><MyCampaignNeedsPage /></Suspense>
          } />
          <Route path="/campaign/team" element={
            <Suspense fallback={<PageLoader />}><MyCampaignTeamPage /></Suspense>
          } />
          <Route path="/campaign/budget" element={
            <Suspense fallback={<PageLoader />}><MyBudgetPage /></Suspense>
          } />
          <Route path="/campaign/needs" element={
            <Suspense fallback={<PageLoader />}><MyCampaignNeedsPage /></Suspense>
          } />
          <Route path="/campaign/sms" element={
            <Suspense fallback={<PageLoader />}><MySMSPage /></Suspense>
          } />
          <Route path="/campaign/incidents" element={
            <Suspense fallback={<PageLoader />}><MyIncidentsPage /></Suspense>
          } />
          <Route path="/campaign/media" element={
            <Suspense fallback={<PageLoader />}><MyCampaignMediaPage /></Suspense>
          } />
          <Route path="/campaign/ai-images" element={
            <Suspense fallback={<PageLoader />}><MyAIImageGeneratorPage /></Suspense>
          } />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
