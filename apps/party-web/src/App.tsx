/**
 * Vote Capsule™ Political Party Portal — App Root
 * Role: PARTY_ADMIN / CAMPAIGN_COORDINATOR — V9 Chapter 6
 * Code-split: all pages lazy-loaded; Login + Dashboard are eager.
 *
 * Routes include:
 *   - Core party ops: Dashboard, Nominations, Candidates, Agents
 *   - Campaign Manager: Dashboard, Calendar, Tasks, Teams, SMS, Budget
 *   - Party admin: Profile, Officials, Social Media, Billing
 */
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PartyLayout } from './layouts/PartyLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAppSelector } from './store/hooks';

// Eagerly loaded — always needed on first paint
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

// ── Party Core pages ────────────────────────────────────────
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
const PartyProfilePage        = lazy(() => import('./pages/PartyProfilePage').then(m => ({ default: m.PartyProfilePage })));
const PartyOfficialsPage      = lazy(() => import('./pages/PartyOfficialsPage').then(m => ({ default: m.PartyOfficialsPage })));
const SocialMediaPage         = lazy(() => import('./pages/SocialMediaPage').then(m => ({ default: m.SocialMediaPage })));
const PartyCandidatesPage     = lazy(() => import('./pages/PartyCandidatesPage').then(m => ({ default: m.PartyCandidatesPage })));
const NominationDisputesPage  = lazy(() => import('./pages/NominationDisputesPage').then(m => ({ default: m.NominationDisputesPage })));

// ── Campaign Manager pages ──────────────────────────────────
const CampaignDashboardPage   = lazy(() => import('./pages/CampaignDashboardPage').then(m => ({ default: m.CampaignDashboardPage })));
const CampaignCalendarPage    = lazy(() => import('./pages/CampaignCalendarPage').then(m => ({ default: m.CampaignCalendarPage })));
const CampaignTasksPage       = lazy(() => import('./pages/CampaignTasksPage').then(m => ({ default: m.CampaignTasksPage })));
const CampaignTeamsPage       = lazy(() => import('./pages/CampaignTeamsPage').then(m => ({ default: m.CampaignTeamsPage })));
const CampaignSMSPage         = lazy(() => import('./pages/CampaignSMSPage').then(m => ({ default: m.CampaignSMSPage })));
const CampaignBudgetPage      = lazy(() => import('./pages/CampaignBudgetPage').then(m => ({ default: m.CampaignBudgetPage })));
const CreateCampaignPage      = lazy(() => import('./pages/CreateCampaignPage').then(m => ({ default: m.CreateCampaignPage })));
const SupplierCataloguePage   = lazy(() => import('./pages/SupplierCataloguePage').then(m => ({ default: m.SupplierCataloguePage })));
// MaterialsCataloguePage removed — merged into SupplierCataloguePage
const CampaignMediaLibraryPage  = lazy(() => import('./pages/CampaignMediaLibraryPage').then(m => ({ default: m.CampaignMediaLibraryPage })));
const AIImageGeneratorPage      = lazy(() => import('./pages/AIImageGeneratorPage').then(m => ({ default: m.AIImageGeneratorPage })));
const CampaignCompliancePage   = lazy(() => import('./pages/CampaignCompliancePage').then(m => ({ default: m.CampaignCompliancePage })));

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

          {/* ── Nominations & Candidates ─────────────────────────── */}
          <Route path="/nominations" element={
            <Suspense fallback={<PageLoader />}><NominationsPage /></Suspense>
          } />
          <Route path="/party-candidates" element={
            <Suspense fallback={<PageLoader />}><PartyCandidatesPage /></Suspense>
          } />
          <Route path="/disputes" element={
            <Suspense fallback={<PageLoader />}><NominationDisputesPage /></Suspense>
          } />

          {/* ── Candidate & Agent Management ─────────────────────── */}
          <Route path="/candidates" element={
            <Suspense fallback={<PageLoader />}><CandidateManagementPage /></Suspense>
          } />
          <Route path="/coordinators" element={
            <Suspense fallback={<PageLoader />}><CoordinatorsPage /></Suspense>
          } />
          <Route path="/agents" element={
            <Suspense fallback={<PageLoader />}><AgentAssignmentsPage /></Suspense>
          } />

          {/* ── Campaign Manager ─────────────────────────────────── */}
          <Route path="/campaign" element={
            <Suspense fallback={<PageLoader />}><CampaignDashboardPage /></Suspense>
          } />
          <Route path="/campaign/create" element={
            <Suspense fallback={<PageLoader />}><CreateCampaignPage /></Suspense>
          } />
          <Route path="/campaign/calendar" element={
            <Suspense fallback={<PageLoader />}><CampaignCalendarPage /></Suspense>
          } />
          <Route path="/campaign/tasks" element={
            <Suspense fallback={<PageLoader />}><CampaignTasksPage /></Suspense>
          } />
          <Route path="/campaign/teams" element={
            <Suspense fallback={<PageLoader />}><CampaignTeamsPage /></Suspense>
          } />
          <Route path="/campaign/sms" element={
            <Suspense fallback={<PageLoader />}><CampaignSMSPage /></Suspense>
          } />
          {/* Supplier Catalogue — supplier products with real pricing */}
          <Route path="/campaign/suppliers" element={
            <Suspense fallback={<PageLoader />}><SupplierCataloguePage /></Suspense>
          } />
          {/* Legacy redirect — materials merged into Supplier Catalogue */}
          <Route path="/campaign/materials" element={<Navigate to="/campaign/suppliers" replace />} />
          <Route path="/campaign/ai-images" element={
            <Suspense fallback={<PageLoader />}><AIImageGeneratorPage /></Suspense>
          } />
          <Route path="/campaign/media" element={
            <Suspense fallback={<PageLoader />}><CampaignMediaLibraryPage /></Suspense>
          } />
          <Route path="/campaign/budget" element={
            <Suspense fallback={<PageLoader />}><CampaignBudgetPage /></Suspense>
          } />
          <Route path="/campaign/compliance" element={
            <Suspense fallback={<PageLoader />}><CampaignCompliancePage /></Suspense>
          } />

          {/* ── Results & Analytics ──────────────────────────────── */}
          <Route path="/live-results" element={
            <Suspense fallback={<PageLoader />}><LiveResultsPage /></Suspense>
          } />
          <Route path="/analytics" element={
            <Suspense fallback={<PageLoader />}><AnalyticsPage /></Suspense>
          } />

          {/* ── Administration ───────────────────────────────────── */}
          <Route path="/invitations" element={
            <Suspense fallback={<PageLoader />}><InvitationsPage /></Suspense>
          } />
          <Route path="/reports" element={
            <Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>
          } />
          <Route path="/subscription" element={
            <Suspense fallback={<PageLoader />}><SubscriptionPage /></Suspense>
          } />
          <Route path="/billing" element={
            <Suspense fallback={<PageLoader />}><BillingPage /></Suspense>
          } />

          {/* ── Party Settings ───────────────────────────────────── */}
          <Route path="/profile" element={
            <Suspense fallback={<PageLoader />}><PartyProfilePage /></Suspense>
          } />
          <Route path="/officials" element={
            <Suspense fallback={<PageLoader />}><PartyOfficialsPage /></Suspense>
          } />
          <Route path="/social-media" element={
            <Suspense fallback={<PageLoader />}><SocialMediaPage /></Suspense>
          } />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
