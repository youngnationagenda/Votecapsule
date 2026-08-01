/**
 * Vote Capsule™ Observer Portal — App Root
 * Role: OBSERVER — V9 Chapter 8
 * Access: Read-only — only officially published information displayed
 */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ObserverLayout } from './layouts/ObserverLayout';
import { LoginPage } from './pages/LoginPage';
import { NationalDashboardPage } from './pages/NationalDashboardPage';
import { RegionalMonitoringPage } from './pages/RegionalMonitoringPage';
import { LiveReportingPage } from './pages/LiveReportingPage';
import { RiskAnalysisPage } from './pages/RiskAnalysisPage';
import { AIAlertsPage } from './pages/AIAlertsPage';
import { EvidenceViewerPage } from './pages/EvidenceViewerPage';
import { IncidentTrackingPage } from './pages/IncidentTrackingPage';
import { DownloadsPage } from './pages/DownloadsPage';
import { APIAccessPage } from './pages/APIAccessPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAppSelector } from './store/hooks';

export default function App(): React.JSX.Element {
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);
  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<ObserverLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<NationalDashboardPage />} />
          <Route path="/regional" element={<RegionalMonitoringPage />} />
          <Route path="/live-reporting" element={<LiveReportingPage />} />
          <Route path="/risk-analysis" element={<RiskAnalysisPage />} />
          <Route path="/ai-alerts" element={<AIAlertsPage />} />
          <Route path="/evidence" element={<EvidenceViewerPage />} />
          <Route path="/incidents" element={<IncidentTrackingPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/api-access" element={<APIAccessPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
