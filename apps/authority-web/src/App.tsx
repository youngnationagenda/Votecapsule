/**
 * Vote Capsule™ Election Authority Portal — App Root
 * Role: ELECTION_AUTHORITY — V9 Chapter 5
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthorityLayout } from './layouts/AuthorityLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ElectionSetupPage } from './pages/ElectionSetupPage';
import { CandidateApprovalPage } from './pages/CandidateApprovalPage';
import { GeographyPage } from './pages/GeographyPage';
import { LiveReportingPage } from './pages/LiveReportingPage';
import { ValidationMonitorPage } from './pages/ValidationMonitorPage';
import { AIReviewPage } from './pages/AIReviewPage';
import { PublicationControlPage } from './pages/PublicationControlPage';
import { ObserverCoordinationPage } from './pages/ObserverCoordinationPage';
import { OfficialReportsPage } from './pages/OfficialReportsPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAppSelector } from './store/hooks';

export default function App(): React.JSX.Element {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AuthorityLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/elections" element={<ElectionSetupPage />} />
          <Route path="/candidates" element={<CandidateApprovalPage />} />
          <Route path="/geography" element={<GeographyPage />} />
          <Route path="/live-reporting" element={<LiveReportingPage />} />
          <Route path="/validation" element={<ValidationMonitorPage />} />
          <Route path="/ai-review" element={<AIReviewPage />} />
          <Route path="/publication" element={<PublicationControlPage />} />
          <Route path="/observers" element={<ObserverCoordinationPage />} />
          <Route path="/reports" element={<OfficialReportsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
