import React, { useState, useEffect } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { TOOLS } from '../../config/tools';
import { useReportingDateRange } from './hooks/useReportingDateRange';
import { DateRangeSelector } from './components/DateRangeSelector';
import { OverviewTab } from './components/OverviewTab';
import { ComercialTab } from './components/ComercialTab';
import { OperativoTab } from './components/OperativoTab';
import { FinancieroTab } from './components/FinancieroTab';

const currentTool = TOOLS.find((t) => t.id === 'reporting')!;

type TabId = 'overview' | 'comercial' | 'operativo' | 'financiero';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'operativo', label: 'Operativo' },
  { id: 'financiero', label: 'Financiero' },
];

function tabToSearch(tab: TabId) {
  const p = new URLSearchParams();
  p.set('tab', tab);
  return p.toString();
}

export default function ReportingView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : 'overview');

  const { range, setRangeKey, setCustomRange, drillDownQuery, customFrom, customTo } = useReportingDateRange('last30');

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      n.set('tab', id);
      return n;
    });
  };

  const navLinkBase = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 font-bold';
  const navActive = 'bg-brand-600 text-white';
  const navInactive = 'text-brand-200 hover:bg-white/10';

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
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto pt-4">
            {TABS.map((tab) => (
              <NavLink
                key={tab.id}
                to={`/reporting?${tabToSearch(tab.id)}`}
                onClick={() => setSidebarOpen(false)}
                className={() => `${navLinkBase} ${activeTab === tab.id ? navActive : navInactive}`}
              >
                {tab.label}
              </NavLink>
            ))}
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
          <div className="shrink-0 border-b border-brand-200/60 bg-white px-4 py-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-title text-primary">Reporting</h1>
                <p className="text-brand-500 font-body text-sm mt-0.5">Vista ejecutiva. Solo lectura. Clic en métricas para ir al detalle.</p>
              </div>
              <DateRangeSelector
                value={range.key}
                customFrom={customFrom}
                customTo={customTo}
                onChangeKey={setRangeKey}
                onCustomRange={setCustomRange}
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-brand-100/30 min-h-0">
            <div className="p-4 sm:p-6 max-w-7xl mx-auto">
              {activeTab === 'overview' && <OverviewTab range={{ from: range.from, to: range.to }} drillDownQuery={drillDownQuery} />}
              {activeTab === 'comercial' && <ComercialTab range={{ from: range.from, to: range.to }} drillDownQuery={drillDownQuery} />}
              {activeTab === 'operativo' && <OperativoTab range={{ from: range.from, to: range.to }} />}
              {activeTab === 'financiero' && <FinancieroTab range={{ from: range.from, to: range.to }} drillDownQuery={drillDownQuery} />}
            </div>
          </div>
        </main>
      </div>
    </ToolLayout>
  );
}
