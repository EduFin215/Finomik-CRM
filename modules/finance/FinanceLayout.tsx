import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  LineChart,
  Menu,
} from 'lucide-react';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { SidebarNav } from '../../components/layout/SidebarNav';
import { TOOLS } from '../../config/tools';

const currentTool = TOOLS.find((t) => t.id === 'finance')!;

export default function FinanceLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToolLayout currentTool={currentTool}>
      <div className="flex h-full w-full overflow-hidden bg-white">
        <SidebarNav
          variant="dark"
          items={[
            { to: '/finance/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/finance/income', label: 'Income', icon: TrendingUp },
            { to: '/finance/expenses', label: 'Expenses', icon: TrendingDown },
            { to: '/finance/forecast', label: 'Forecast', icon: LineChart },
          ]}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onNavigate={() => setSidebarOpen(false)}
        />
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
          <div className="flex-1 overflow-auto min-h-0 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </ToolLayout>
  );
}
