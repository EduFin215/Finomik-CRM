export interface Tool {
  id: string;
  name: string;
  path: string;
  available: boolean;
  description?: string;
}

export const TOOLS: Tool[] = [
  {
    id: 'crm',
    name: 'CRM',
    path: '/crm',
    available: true,
    description: 'Clientes, contactos, deals y proyectos.',
  },
  {
    id: 'tasks',
    name: 'Tasks',
    path: '/tasks',
    available: true,
    description: 'Gestión operativa de tareas.',
  },
  {
    id: 'resources',
    name: 'Resources',
    path: '/resources',
    available: true,
    description: 'Enlaces centralizados a documentos internos.',
  },
  {
    id: 'finance',
    name: 'Finance',
    path: '/finance',
    available: true,
    description: 'Ingresos, gastos, contratos y facturas.',
  },
  {
    id: 'reporting',
    name: 'Reporting',
    path: '/reporting',
    available: true,
    description: 'Dashboards y métricas.',
  },
  {
    id: 'integrations',
    name: 'Integrations',
    path: '/integrations',
    available: true,
    description: 'Conexiones externas.',
  },
  {
    id: 'settings',
    name: 'Settings',
    path: '/settings',
    available: true,
    description: 'Configuración del sistema.',
  },
];

/** Tools shown in the selector (excludes Integrations, which is a system layer). */
export const TOOLS_IN_SELECTOR = TOOLS.filter((t) => t.id !== 'integrations');
