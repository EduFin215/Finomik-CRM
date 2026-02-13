/**
 * Formato legible de fecha/hora para tareas (es-ES).
 * Ej: "15 ene 2025, 14:30" · "Hoy, 14:30" · "Ayer, 14:30"
 */
export function formatTaskDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const today = now.toDateString() === d.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === d.toDateString();

  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (today) return `Hoy, ${time}`;
  if (isYesterday) return `Ayer, ${time}`;
  const date = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${date}, ${time}`;
}

/** Solo fecha: "15 ene 2025" */
export function formatTaskDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}
