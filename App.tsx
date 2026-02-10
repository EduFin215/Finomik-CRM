import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { isSupabaseConfigured } from './services/supabase';
import Login from './components/Login';
import { useAuth } from './hooks/useAuth';
import PlatformHub from './components/PlatformHub';
import CRMLayout from './components/CRMLayout';
import BillingView from './components/BillingView';
import Dashboard from './components/Dashboard';
import PipelineView from './components/PipelineView';
import TableView from './components/TableView';
import CalendarView from './components/CalendarView';
import Importer from './components/Importer';
import SettingsView from './components/SettingsView';
import DocumentsView from './components/DocumentsView';

/** Redirects to platform hub when the app first loads with a logged-in user, unless already on hub or CRM. */
function RedirectToHubOnEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const onHub = location.pathname === '/';
    const onCrm = location.pathname.startsWith('/crm');
    const onDocuments = location.pathname.startsWith('/documents');
    if (!onHub && !onCrm && !onDocuments) {
      navigate('/', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only on first entry
  return null;
}

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  if (isSupabaseConfigured() && authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <p className="text-brand-500 font-body">Cargando...</p>
      </div>
    );
  }
  if (isSupabaseConfigured() && !user) {
    return <Login onSuccess={() => {}} />;
  }

  return (
    <BrowserRouter>
      <RedirectToHubOnEntry />
      <Routes>
        <Route path="/" element={<PlatformHub />} />
        <Route path="crm" element={<CRMLayout />}>
          <Route index element={<Navigate to="/crm/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="pipeline" element={<PipelineView />} />
          <Route path="schools" element={<TableView />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="import" element={<Importer />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
        <Route path="billing" element={<BillingView />} />
        <Route path="documents" element={<DocumentsView />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
