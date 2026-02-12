import { useState, useCallback, useMemo } from 'react';
import type { DateRangeKey } from '../../../services/crm/dashboard';
import { getDateRange } from '../../../services/crm/dashboard';

export interface ReportingDateRange {
  key: DateRangeKey;
  from: string;
  to: string;
}

export function useReportingDateRange(initialKey: DateRangeKey = 'last30') {
  const [key, setKey] = useState<DateRangeKey>(initialKey);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const range = useMemo<ReportingDateRange>(() => {
    return getDateRange(key, customFrom || undefined, customTo || undefined);
  }, [key, customFrom, customTo]);

  const setRangeKey = useCallback((newKey: DateRangeKey) => {
    setKey(newKey);
  }, []);

  const setCustomRange = useCallback((from: string, to: string) => {
    setKey('custom');
    setCustomFrom(from);
    setCustomTo(to);
  }, []);

  /** Build query string for drill-down (e.g. "30d", "90d", "ytd" or from/to params). */
  const drillDownQuery = useMemo(() => {
    if (key === 'last30') return { range: '30d' as const };
    if (key === 'last90') return { range: '90d' as const };
    if (key === 'ytd') return { range: 'ytd' as const };
    return { from: range.from, to: range.to };
  }, [key, range.from, range.to]);

  return { range, setRangeKey, setCustomRange, drillDownQuery, customFrom, customTo };
}
