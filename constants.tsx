import { Phase, CommercialStatus, TaskPriority } from './types';

/** Brand palette: Deep Navy primary, white, secondary blues */
export const COLORS = {
  primary: '#0B3064',
  secondary: '#114076',
  accent: '#5574A7',
  white: '#FFFFFF',
  brand: {
    100: '#C8D0DD',
    200: '#8F9EB7',
    300: '#5574A7',
    400: '#3E5374',
    500: '#3C4C67',
    600: '#0B3064',
  },
};

export const PHASE_COLORS: Record<Phase, string> = {
  // Prospección
  [Phase.LEAD]: 'bg-brand-100/50 text-brand-500 border-brand-200',
  [Phase.CONTACTED]: 'bg-brand-100 text-brand-600 border-brand-300',
  [Phase.INTERESTED]: 'bg-blue-50 text-blue-600 border-blue-200',

  // Ventas
  [Phase.MEETING]: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  [Phase.PROPOSAL]: 'bg-violet-50 text-violet-600 border-violet-200',
  [Phase.NEGOTIATION]: 'bg-amber-50 text-amber-600 border-amber-200',

  // Cierre
  [Phase.CLOSED_WON]: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  [Phase.CLOSED_LOST]: 'bg-red-50 text-red-600 border-red-200',

  // Onboarding
  [Phase.ONBOARDING_SETUP]: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  [Phase.ONBOARDING_TRAINING]: 'bg-sky-50 text-sky-700 border-sky-200',
  [Phase.ONBOARDING_DONE]: 'bg-teal-50 text-teal-700 border-teal-200',

  // Cliente
  [Phase.ACTIVE]: 'bg-green-50 text-green-700 border-green-200',
  [Phase.CHURNED]: 'bg-gray-100 text-gray-500 border-gray-200',
};

/** Gráfico por fases: de claro a oscuro */
export const PHASE_CHART_COLORS: Record<Phase, string> = {
  [Phase.LEAD]: COLORS.brand[100],
  [Phase.CONTACTED]: COLORS.brand[200],
  [Phase.INTERESTED]: COLORS.brand[300],
  [Phase.MEETING]: COLORS.accent,
  [Phase.PROPOSAL]: COLORS.secondary,
  [Phase.NEGOTIATION]: '#f59e0b',
  [Phase.CLOSED_WON]: '#22c55e',
  [Phase.CLOSED_LOST]: '#ef4444',
  [Phase.ONBOARDING_SETUP]: '#06b6d4',
  [Phase.ONBOARDING_TRAINING]: '#0ea5e9',
  [Phase.ONBOARDING_DONE]: '#14b8a6',
  [Phase.ACTIVE]: '#15803d',
  [Phase.CHURNED]: '#6b7280',
};

export const STATUS_COLORS: Record<CommercialStatus, string> = {
  [CommercialStatus.FREE]: 'bg-brand-100 text-brand-600',
  [CommercialStatus.PAYING]: 'bg-green-100 text-green-800',
  [CommercialStatus.INTERESTED]: 'bg-amber-100 text-amber-800',
  [CommercialStatus.NONE]: 'bg-gray-100 text-gray-500',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'text-brand-400',
  [TaskPriority.MEDIUM]: 'text-amber-600',
  [TaskPriority.HIGH]: 'text-red-500',
};
