import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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

export default function ReportingView() {
  const [searchParams, setSearchParams] = useSearchParams();
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

  return (
    <ToolLayout currentTool={currentTool}>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 border-b border-brand-200 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 py-4 sm:px-6">
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
          <nav className="flex gap-1 px-4 sm:px-6 pb-0" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`rounded-t-xl px-4 py-3 text-sm font-bold transition-colors ${
                  activeTab === tab.id ? 'bg-white text-primary border border-b-0 border-brand-200/60 border-b-white -mb-px' : 'text-brand-600 hover:bg-brand-100/50 hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-auto bg-brand-100/30 min-h-0">
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            {activeTab === 'overview' && <OverviewTab range={{ from: range.from, to: range.to }} drillDownQuery={drillDownQuery} />}
            {activeTab === 'comercial' && <ComercialTab range={{ from: range.from, to: range.to }} drillDownQuery={drillDownQuery} />}
            {activeTab === 'operativo' && <OperativoTab range={{ from: range.from, to: range.to }} />}
            {activeTab === 'financiero' && <FinancieroTab range={{ from: range.from, to: range.to }} drillDownQuery={drillDownQuery} />}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
