import React, { useState } from 'react';
import { useLocation, useSearchParams, NavLink } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { TOOLS } from '../../config/tools';
import TasksDashboardView from './TasksDashboardView';
import TasksListView from './TasksListView';
import TasksBoardView from './TasksBoardView';
import TasksCalendarView from './TasksCalendarView';
import { LayoutDashboard, List, LayoutGrid, Calendar } from 'lucide-react';

const currentTool = TOOLS.find((t) => t.id === 'tasks')!;

const VIEWS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'list', label: 'Lista', icon: List },
  { id: 'board', label: 'Board', icon: LayoutGrid },
  { id: 'calendar', label: 'Calendario', icon: Calendar },
] as const;

type ViewId = (typeof VIEWS)[number]['id'];

function getViewFromSearchParam(searchParams: URLSearchParams): ViewId {
  const v = searchParams.get('view');
  if (v === 'dashboard' || v === 'list' || v === 'board' || v === 'calendar') return v;
  return 'dashboard';
}

function setViewSearchParam(searchParams: URLSearchParams, view: ViewId): string {
  const next = new URLSearchParams(searchParams);
  next.set('view', view);
  return next.toString();
}

export default function TasksView() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const filter: 'my' | 'all' = location.pathname.endsWith('/all') ? 'all' : 'my';
  const view = getViewFromSearchParam(searchParams);
  const basePath = filter === 'all' ? '/tasks/all' : '/tasks';

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return <TasksDashboardView filter={filter} />;
      case 'list':
        return <TasksListView filter={filter} />;
      case 'board':
        return <TasksBoardView filter={filter} />;
      case 'calendar':
        return <TasksCalendarView filter={filter} />;
      default:
        return <TasksDashboardView filter={filter} />;
    }
  };

  const navLinkBase = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 font-bold';
  const navActive = 'bg-white/10 text-white shadow-glow border border-white/20 backdrop-blur-glass';
  const navInactive = 'text-brand-very-soft/70 hover:bg-white/5 hover:text-white';

  return (
    <ToolLayout currentTool={currentTool}>
      <div className="flex h-full w-full overflow-hidden bg-white">
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
        <aside
          className={`
            sidebar-dark fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col shrink-0
            transform transition-transform duration-200 ease-out
            bg-gradient-sidebar text-white shadow-2xl border-r-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-very-soft/60 pt-2 pb-2 px-4">
              Filtro
            </div>
            <NavLink
              to="/tasks"
              end
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `${navLinkBase} ${isActive ? navActive : navInactive}`}
            >
              Mis tareas
            </NavLink>
            <NavLink
              to="/tasks/all"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `${navLinkBase} ${isActive ? navActive : navInactive}`}
            >
              Todas
            </NavLink>
            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-very-soft/60 pt-4 pb-2 px-4">
              Vistas
            </div>
            {VIEWS.map((v) => {
              const Icon = v.icon;
              const isActiveView = view === v.id;
              const to = `${basePath}?${setViewSearchParam(searchParams, v.id)}`;
              return (
                <NavLink
                  key={v.id}
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={() => `${navLinkBase} ${isActiveView ? navActive : navInactive}`}
                >
                  <Icon size={20} />
                  {v.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-brand-100 lg:hidden shrink-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="p-2 text-brand-600 hover:bg-brand-100/50 rounded-xl shrink-0"
              aria-label="Abrir menú"
            >
              <Menu size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            {renderContent()}
          </div>
        </main>
      </div>
    </ToolLayout>
  );
}
