import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { isSupabaseConfigured } from './services/supabase';
import Login from './components/Login';
import { useAuth } from './hooks/useAuth';
import PlatformHub from './components/PlatformHub';
import CRMLayout from './components/CRMLayout';
import FinanceLayout from './modules/finance/FinanceLayout';
import FinanceDashboard from './modules/finance/FinanceDashboard';
import FinanceIncomePage from './modules/finance/FinanceIncomePage';
import FinanceExpensesPage from './modules/finance/FinanceExpensesPage';
import FinanceForecastPage from './modules/finance/FinanceForecastPage';
import Dashboard from './components/Dashboard';
import PipelineView from './components/PipelineView';
import CalendarView from './components/CalendarView';
import Importer from './components/Importer';
import SettingsView from './components/SettingsView';
import ClientsListPage from './components/clients/ClientsListPage';
import ClientDetailPage from './components/clients/ClientDetailPage';
import DealsListPage from './components/deals/DealsListPage';
import ProjectsListPage from './components/projects/ProjectsListPage';
import ResourcesView from './modules/resources/ResourcesView';
import TasksView from './modules/tasks/TasksView';
import ReportingView from './modules/reporting/ReportingView';
import IntegrationsView from './modules/integrations/IntegrationsView';
import GlobalSettingsView from './modules/settings/SettingsView';
import FinnyFloatingChat from './modules/agent/FinnyFloatingChat';

const TOOL_PATHS = ['/crm', '/tasks', '/resources', '/finance', '/reporting', '/integrations', '/settings'];

/** Redirects to platform hub when the app first loads with a logged-in user, unless already on hub or a tool. */
function RedirectToHubOnEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    const onHub = location.pathname === '/';
    const onTool = TOOL_PATHS.some((p) => location.pathname === p || location.pathname.startsWith(p + '/'));
    if (!onHub && !onTool) {
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
          <Route path="leads" element={<ClientsListPage />} />
          <Route path="leads/:id" element={<ClientDetailPage />} />
          <Route path="deals" element={<DealsListPage />} />
          <Route path="projects" element={<ProjectsListPage />} />
          <Route path="pipeline" element={<PipelineView />} />
          <Route path="schools" element={<Navigate to="/crm/leads" replace />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="import" element={<Importer />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>
        <Route path="tasks" element={<TasksView />} />
        <Route path="tasks/all" element={<TasksView />} />
        <Route path="resources" element={<ResourcesView />} />
        <Route path="finance" element={<FinanceLayout />}>
          <Route index element={<Navigate to="/finance/dashboard" replace />} />
          <Route path="dashboard" element={<FinanceDashboard />} />
          <Route path="income" element={<FinanceIncomePage />} />
          <Route path="expenses" element={<FinanceExpensesPage />} />
          <Route path="forecast" element={<FinanceForecastPage />} />
        </Route>
        <Route path="reporting" element={<ReportingView />} />
        <Route path="integrations" element={<IntegrationsView />} />
        <Route path="chat" element={<Navigate to="/" replace />} />
        <Route path="settings" element={<GlobalSettingsView />} />
        <Route path="billing" element={<Navigate to="/finance" replace />} />
        <Route path="documents" element={<Navigate to="/resources" replace />} />
      </Routes>
      <FinnyFloatingChat />
    </BrowserRouter>
  );
};

export default App;
