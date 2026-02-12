import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Bell, LogOut } from 'lucide-react';
import { ToolSwitcherDropdown } from './ToolSwitcherDropdown';
import { TOOLS } from '../../config/tools';
import type { Tool } from '../../config/tools';
import { useAuth } from '../../hooks/useAuth';
import { useWorkTaskNotificationCount } from '../../hooks/useWorkTaskNotificationCount';

interface ToolLayoutProps {
  children: React.ReactNode;
  currentTool: Tool;
  notificationsSlot?: React.ReactNode;
  searchSlot?: React.ReactNode;
}

export function ToolLayout({
  children,
  currentTool,
  notificationsSlot,
  searchSlot,
}: ToolLayoutProps) {
  const { user, signOut } = useAuth();
  const notificationCount = useWorkTaskNotificationCount(user?.id);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white">
      <header className="relative z-[60] h-14 sm:h-16 bg-white/90 backdrop-blur-xl border-b border-brand-200/60 flex items-center justify-between gap-2 px-3 sm:px-6 lg:px-8 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <ToolSwitcherDropdown currentTool={currentTool} tools={TOOLS} />
          <div className="relative flex-1 min-w-0 max-w-xl">
            {searchSlot ?? (
              <>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full pl-10 pr-3 sm:pr-4 py-2.5 bg-brand-100/50 border border-brand-200/60 focus:bg-white focus:border-primary rounded-xl text-sm transition-all outline-none font-body text-primary placeholder:text-brand-400"
                  readOnly
                  aria-label="Búsqueda global (próximamente)"
                />
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-4 shrink-0">
          {notificationsSlot ?? (
            <div className="relative flex items-center gap-2 pr-4 border-r border-brand-200">
              <Link
                to="/tasks"
                className="relative p-2 text-brand-500 hover:bg-brand-100/50 rounded-full transition-colors"
                aria-label="Notificaciones"
              >
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </Link>
            </div>
          )}
          <div className="flex items-center gap-3 pl-2">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-primary">{user?.email ?? 'Usuario'}</p>
              <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary text-white px-2 py-0.5 text-[10px] font-bold tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                {currentTool.name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="flex items-center gap-2 px-3 py-2 text-brand-600 hover:bg-brand-100/50 hover:text-primary rounded-xl text-sm font-body transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-hidden min-w-0">{children}</div>
    </div>
  );
}
