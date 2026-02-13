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
  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white">
      <header className="icons-filled-blue relative z-[60] h-14 sm:h-16 shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 bg-white border-b border-brand-200/50">
        <div className="flex items-center gap-4 sm:gap-6 flex-1 min-w-0">
          <Link
            to="/"
            className="shrink-0 flex items-center py-1"
            aria-label="Finomik"
          >
            <img
              src="/finomik-logo-white.png"
              alt="Finomik"
              className="h-10 sm:h-11 w-auto object-contain"
            />
          </Link>
          <div className="hidden sm:block w-px h-8 bg-brand-200/60" />
          <ToolSwitcherDropdown currentTool={currentTool} tools={TOOLS} />
          <div className="relative flex-1 min-w-0 max-w-md">
            {searchSlot ?? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400 w-4 h-4 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  className="w-full pl-10 pr-4 py-2 bg-brand-100/50 border border-brand-200/60 rounded-lg text-sm text-primary placeholder:text-brand-400 font-body focus:bg-white focus:border-primary focus:outline-none transition-colors"
                  readOnly
                  aria-label="Búsqueda global (próximamente)"
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          {notificationsSlot ?? (
            <Link
              to="/tasks"
              className="relative p-2.5 rounded-lg text-brand-600 hover:bg-brand-100/50 transition-colors"
              aria-label="Notificaciones"
            >
              <Bell size={20} />
              {notificationCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </Link>
          )}
          <div className="hidden sm:block w-px h-6 bg-brand-200/60" />
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0"
              title={user?.email ?? 'Usuario'}
            >
              {initials}
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="p-2.5 rounded-lg text-brand-600 hover:bg-brand-100/50 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <div className="icons-filled-blue flex-1 overflow-hidden min-w-0">{children}</div>
    </div>
  );
}
