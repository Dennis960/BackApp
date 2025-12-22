import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/common';
import Dashboard from './pages/Dashboard.tsx';
import Servers from './pages/Servers.tsx';
import BackupProfiles from './pages/BackupProfiles.tsx';
import BackupRuns from './pages/BackupRuns.tsx';
import BackupRunDetail from './pages/BackupRunDetail.tsx';
import BackupProfileDetail from './pages/BackupProfileDetail.tsx';
import StorageLocations from './pages/StorageLocations.tsx';
import NamingRules from './pages/NamingRules.tsx';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/servers" element={<Servers />} />
          <Route path="/backup-profiles" element={<BackupProfiles />} />
          <Route path="/backup-profiles/:id" element={<BackupProfileDetail />} />
          <Route path="/backup-runs" element={<BackupRuns />} />
          <Route path="/backup-runs/:id" element={<BackupRunDetail />} />
          <Route path="/storage-locations" element={<StorageLocations />} />
          <Route path="/naming-rules" element={<NamingRules />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
