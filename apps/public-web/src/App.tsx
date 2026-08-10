/**
 * Vote Capsule™ Public Transparency Portal — App Root
 * Unauthenticated — election results & evidence verification for all citizens.
 * Code-split: all pages lazy-loaded except HomePage (landing, always first paint).
 */
import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';

// Eagerly loaded — first paint landing page
import { HomePage } from './pages/HomePage';

// Lazy-loaded page chunks
const ResultsPage         = lazy(() => import('./pages/ResultsPage').then(m => ({ default: m.ResultsPage })));
const ElectionResultsPage = lazy(() => import('./pages/ElectionResultsPage').then(m => ({ default: m.ElectionResultsPage })));
const CandidatesPage      = lazy(() => import('./pages/CandidatesPage').then(m => ({ default: m.CandidatesPage })));
const CandidateDetailPage = lazy(() => import('./pages/CandidateDetailPage').then(m => ({ default: m.CandidateDetailPage })));
const StationsPage        = lazy(() => import('./pages/StationsPage').then(m => ({ default: m.StationsPage })));
const StationDetailPage   = lazy(() => import('./pages/StationDetailPage').then(m => ({ default: m.StationDetailPage })));
const VerifyPage          = lazy(() => import('./pages/VerifyPage').then(m => ({ default: m.VerifyPage })));
const ProgressPage        = lazy(() => import('./pages/ProgressPage').then(m => ({ default: m.ProgressPage })));

function PageLoader(): React.JSX.Element {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route path="/results" element={
          <Suspense fallback={<PageLoader />}><ResultsPage /></Suspense>
        } />
        <Route path="/results/:electionId" element={
          <Suspense fallback={<PageLoader />}><ElectionResultsPage /></Suspense>
        } />
        <Route path="/candidates" element={
          <Suspense fallback={<PageLoader />}><CandidatesPage /></Suspense>
        } />
        <Route path="/candidates/:id" element={
          <Suspense fallback={<PageLoader />}><CandidateDetailPage /></Suspense>
        } />
        <Route path="/stations" element={
          <Suspense fallback={<PageLoader />}><StationsPage /></Suspense>
        } />
        <Route path="/stations/:code" element={
          <Suspense fallback={<PageLoader />}><StationDetailPage /></Suspense>
        } />
        <Route path="/verify" element={
          <Suspense fallback={<PageLoader />}><VerifyPage /></Suspense>
        } />
        <Route path="/verify/:capsuleId" element={
          <Suspense fallback={<PageLoader />}><VerifyPage /></Suspense>
        } />
        <Route path="/progress" element={
          <Suspense fallback={<PageLoader />}><ProgressPage /></Suspense>
        } />
      </Routes>
    </Layout>
  );
}
