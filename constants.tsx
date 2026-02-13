import { Phase, CommercialStatus, TaskPriority } from './types';

/** Brand palette: Deep Navy primary, white, secondary blues */
export const COLORS = {
  primary: '#0B3064',
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
  [Phase.LEAD]: 'bg-brand-100 text-brand-500 border-brand-200',
  [Phase.CONTACTED]: 'bg-brand-100 text-brand-600 border-brand-300',
  [Phase.INTERESTED]: 'bg-brand-200/50 text-brand-600 border-brand-400',
  [Phase.NEGOTIATION]: 'bg-amber-50 text-amber-800 border-amber-200',
  [Phase.CLOSED]: 'bg-brand-100 text-brand-500 border-brand-200',
  [Phase.SIGNED]: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

/** Gráfico por fases: de claro a oscuro en azules grisáceos → azul oscuro de marca */
export const PHASE_CHART_COLORS: Record<Phase, string> = {
  [Phase.LEAD]: COLORS.brand[100],       // más claro
  [Phase.CONTACTED]: COLORS.brand[200],
  [Phase.INTERESTED]: COLORS.brand[300],
  [Phase.NEGOTIATION]: COLORS.brand[400],
  [Phase.CLOSED]: COLORS.brand[500],
  [Phase.SIGNED]: COLORS.primary,        // más oscuro (navy)
};

export const STATUS_COLORS: Record<CommercialStatus, string> = {
  [CommercialStatus.FREE]: 'bg-brand-100 text-brand-600',
  [CommercialStatus.PAYING]: 'bg-green-100 text-green-800',
  [CommercialStatus.NONE]: 'bg-brand-100 text-brand-400',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.LOW]: 'text-brand-400',
  [TaskPriority.MEDIUM]: 'text-amber-600',
  [TaskPriority.HIGH]: 'text-red-500',
};
