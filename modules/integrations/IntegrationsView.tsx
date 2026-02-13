import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { TOOLS } from '../../config/tools';

const currentTool = TOOLS.find((t) => t.id === 'integrations')!;

export default function IntegrationsView() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
            bg-primary/95 backdrop-blur-xl text-white border-r-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
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
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-brand-600 font-body text-lg">
              Módulo Integrations. Próximamente.
            </p>
          </div>
        </main>
      </div>
    </ToolLayout>
  );
}
