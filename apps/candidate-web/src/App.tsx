/**
 * Vote Capsule™ Candidate Portal — App Root
 * Role: CANDIDATE — V9 Chapter 7
 * Access restricted by: position + geography + license + tenant policies
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CandidateLayout } from './layouts/CandidateLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AssignedRegionPage } from './pages/AssignedRegionPage';
import { LiveResultsPage } from './pages/LiveResultsPage';
import { StationProgressPage } from './pages/StationProgressPage';
import { EvidenceCapsulesPage } from './pages/EvidenceCapsulesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { TeamManagementPage } from './pages/TeamManagementPage';
import { BillingPage } from './pages/BillingPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAppSelector } from './store/hooks';

export default function App(): React.JSX.Element {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<CandidateLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/region" element={<AssignedRegionPage />} />
          <Route path="/live-results" element={<LiveResultsPage />} />
          <Route path="/stations" element={<StationProgressPage />} />
          <Route path="/evidence" element={<EvidenceCapsulesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/team" element={<TeamManagementPage />} />
          <Route path="/billing" element={<BillingPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
