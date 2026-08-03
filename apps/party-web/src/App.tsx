/**
 * Vote Capsule™ Political Party Portal — App Root
 * Role: PARTY_ADMIN / CAMPAIGN_COORDINATOR — V9 Chapter 6
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PartyLayout } from './layouts/PartyLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CandidateManagementPage } from './pages/CandidateManagementPage';
import { CoordinatorsPage } from './pages/CoordinatorsPage';
import { AgentAssignmentsPage } from './pages/AgentAssignmentsPage';
import { LiveResultsPage } from './pages/LiveResultsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { InvitationsPage } from './pages/InvitationsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { BillingPage } from './pages/BillingPage';
import { NominationsPage } from './pages/NominationsPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAppSelector } from './store/hooks';

export default function App(): React.JSX.Element {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<PartyLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/candidates" element={<CandidateManagementPage />} />
          <Route path="/coordinators" element={<CoordinatorsPage />} />
          <Route path="/agents" element={<AgentAssignmentsPage />} />
          <Route path="/live-results" element={<LiveResultsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/invitations" element={<InvitationsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/nominations" element={<NominationsPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/billing" element={<BillingPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
