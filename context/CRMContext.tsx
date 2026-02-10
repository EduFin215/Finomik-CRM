import React, { createContext, useContext } from 'react';
import type { School, Phase, CommercialStatus } from '../types';
import type { ReminderSettings } from '../types';

export interface CRMContextValue {
  schools: School[];
  filteredSchools: School[];
  isLoading: boolean;
  error: Error | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  phaseFilter: Phase[];
  statusFilter: CommercialStatus[];
  togglePhaseFilter: (phase: Phase) => void;
  toggleStatusFilter: (status: CommercialStatus) => void;
  selectedSchoolId: string | null;
  setSelectedSchoolId: (id: string | null) => void;
  refetchSchools: () => void;
  updateSchool: (updated: School) => Promise<void>;
  createSchool: (school: School) => Promise<void>;
  deleteSchool: (schoolId: string) => Promise<void>;
  navigateToView: (tab: 'table' | 'pipeline', filters?: { phase?: Phase[]; status?: CommercialStatus[] }) => void;
  reminderSettings: ReminderSettings;
  updateReminderSettings: (partial: Partial<ReminderSettings>) => void;
  scheduleMeeting: (schoolId: string, taskData: { title: string; dueDate: string; dueTime?: string }, options?: { addToGoogleCalendar?: boolean }) => Promise<void>;
  handleImportedSchools: (schools: School[]) => Promise<void>;
  openNewSchoolModal: () => void;
}

const CRMContext = createContext<CRMContextValue | null>(null);

export function useCRM(): CRMContextValue {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error('useCRM must be used within CRMProvider');
  return ctx;
}

export function CRMProvider({ value, children }: { value: CRMContextValue; children: React.ReactNode }) {
  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}
