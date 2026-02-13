import React, { useState, useEffect } from 'react';
import { useSearchParams, NavLink } from 'react-router-dom';
import { LayoutDashboard, TrendingUp, Activity, DollarSign } from 'lucide-react';
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

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'comercial', label: 'Comercial', icon: TrendingUp },
  { id: 'operativo', label: 'Operativo', icon: Activity },
  { id: 'financiero', label: 'Financiero', icon: DollarSign },
];

function tabToSearch(tab: TabId) {
  const p = new URLSearchParams();
  p.set('tab', tab);
  return p.toString();
}

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

  return (
    <ToolLayout currentTool={currentTool}>
      <div className="p-6 sm:p-8 max-w-[1600px] mx-auto min-h-full space-y-8">

        {/* Header Area */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-primary tracking-tight">Reportes y Analítica</h1>
            <p className="text-brand-muted mt-1">Visión ejecutiva del rendimiento del negocio.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Navigation Tabs (Top) */}
            <div className="p-1 bg-white border border-brand-very-soft/60 rounded-xl flex shadow-sm overflow-x-auto max-w-full">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <NavLink
                    key={tab.id}
                    to={`/reporting?${tabToSearch(tab.id)}`}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap
                      ${isActive
                        ? 'bg-primary text-white shadow-md'
                        : 'text-brand-muted hover:bg-slate-50 hover:text-primary'
                      }
                    `}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                    {tab.label}
                  </NavLink>
                );
              })}
            </div>

            {/* Date Selector */}
            <DateRangeSelector
              value={range.key}
              customFrom={customFrom}
              customTo={customTo}
              onChangeKey={setRangeKey}
              onCustomRange={setCustomRange}
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'overview' && <OverviewTab range={{ from: range.from, to: range.to }} drillDownQuery={drillDownQuery} />}
          {activeTab === 'comercial' && <ComercialTab range={{ from: range.from, to: range.to }} drillDownQuery={drillDownQuery} />}
          {activeTab === 'operativo' && <OperativoTab range={{ from: range.from, to: range.to }} />}
          {activeTab === 'financiero' && <FinancieroTab range={{ from: range.from, to: range.to }} drillDownQuery={drillDownQuery} />}
        </div>

      </div>
    </ToolLayout>
  );
}
