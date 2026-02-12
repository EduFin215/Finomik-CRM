import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getForecastProjection } from '../../services/finance';
import { formatCurrency } from './formatCurrency';
import { COLORS } from '../../constants';

export default function FinanceForecastPage() {
  const { data: forecastData = [], isLoading } = useQuery({
    queryKey: ['finance-forecast-projection'],
    queryFn: () => getForecastProjection(90),
  });

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto bg-slate-50/50 min-h-full">
      <section className="mb-8">
        <h1 className="text-2xl font-title text-primary mb-1">Forecast</h1>
        <p className="text-slate-600 text-sm">Projected cash position based on your data.</p>
      </section>

      <div className="bg-white rounded-xl border border-brand-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-bold text-primary mb-4">Cashflow projection (next 90 days)</h2>
        {isLoading ? (
          <div className="h-[320px] flex items-center justify-center text-slate-500">Loading…</div>
        ) : forecastData.length === 0 ? (
          <div className="h-[320px] flex flex-col items-center justify-center text-slate-500 text-center">
            <p className="mb-2">No forecast data yet.</p>
            <p className="text-sm">Add contracts, invoices, and recurring expenses to see a projection.</p>
          </div>
        ) : (
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" fontSize={11} tickFormatter={(v) => v.slice(5)} />
                <YAxis fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), 'Projected cash']}
                  labelFormatter={(l) => (l as string)}
                />
                <Line
                  type="monotone"
                  dataKey="projectedCash"
                  name="Projected cash"
                  stroke={COLORS.brand[500]}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-brand-200 shadow-sm p-6">
        <h2 className="text-base font-bold text-primary mb-2">How the forecast is calculated</h2>
        <p className="text-slate-600 text-sm leading-relaxed">
          The projection is based on: unpaid invoices (expected income when due), recurring expenses
          (scheduled outflows), and active contracts (monthly recurring revenue where applicable).
          Cash position starts from your configured starting cash plus cumulative paid income minus
          paid expenses to date. No tax or accounting logic is applied—this is a simple operational
          view for planning.
        </p>
      </div>
    </div>
  );
}
