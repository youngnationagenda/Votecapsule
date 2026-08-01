import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ResultsPage } from './pages/ResultsPage';
import { ElectionResultsPage } from './pages/ElectionResultsPage';
import { CandidatesPage } from './pages/CandidatesPage';
import { CandidateDetailPage } from './pages/CandidateDetailPage';
import { StationsPage } from './pages/StationsPage';
import { StationDetailPage } from './pages/StationDetailPage';
import { VerifyPage } from './pages/VerifyPage';
import { ProgressPage } from './pages/ProgressPage';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/results/:electionId" element={<ElectionResultsPage />} />
        <Route path="/candidates" element={<CandidatesPage />} />
        <Route path="/candidates/:id" element={<CandidateDetailPage />} />
        <Route path="/stations" element={<StationsPage />} />
        <Route path="/stations/:code" element={<StationDetailPage />} />
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/verify/:capsuleId" element={<VerifyPage />} />
        <Route path="/progress" element={<ProgressPage />} />
      </Routes>
    </Layout>
  );
}
