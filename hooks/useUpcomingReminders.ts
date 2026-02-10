import { useEffect, useRef } from 'react';
import type { School, ReminderSettings } from '../types';

export interface UpcomingReminderItem {
  title: string;
  at: Date;
  schoolName: string;
  schoolId: string;
  isMeeting: boolean;
}

export function getUpcomingReminderItems(
  schools: School[],
  settings: ReminderSettings
): UpcomingReminderItem[] {
  if (!settings.remindForTasks && !settings.remindForMeetings) return [];

  const now = new Date();
  const result: UpcomingReminderItem[] = [];

  for (const school of schools) {
    for (const task of school.tasks) {
      if (task.completed) continue;
      const isMeeting = task.isMeeting === true;
      if (isMeeting && !settings.remindForMeetings) continue;
      if (!isMeeting && !settings.remindForTasks) continue;

      const minutesBefore = isMeeting ? settings.remindMinutesBeforeFollowUp : settings.remindMinutesBefore;
      const limit = new Date(now.getTime() + minutesBefore * 60 * 1000);

      const time = task.dueTime ?? '09:00';
      const [h, m] = time.split(':').map(Number);
      const at = new Date(task.dueDate);
      at.setHours(h, m, 0, 0);
      if (at >= now && at <= limit) {
        result.push({
          title: task.title,
          at,
          schoolName: school.name,
          schoolId: school.id,
          isMeeting,
        });
      }
    }
  }
  return result.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function useUpcomingReminders(schools: School[], settings: ReminderSettings) {
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (!settings.notificationsEnabled) return;
    if (Notification.permission === 'denied') return;

    const intervalMs = settings.checkIntervalMinutes * 60 * 1000;

    const check = () => {
      const upcoming = getUpcomingReminderItems(schools, settings);
      for (const u of upcoming) {
        const key = `${u.at.getTime()}-${u.title}`;
        if (notifiedRef.current.has(key)) continue;
        notifiedRef.current.add(key);
        if (Notification.permission === 'granted') {
          const typeLabel = u.isMeeting ? 'Próxima reunión' : 'Próxima tarea';
          new Notification(`Finomik CRM – ${typeLabel}`, {
            body: `${u.title} – ${u.schoolName} a las ${u.at.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
            icon: '/favicon.ico',
          });
        }
      }
    };

    if (Notification.permission === 'default') {
      Notification.requestPermission().then(() => check());
    } else {
      check();
    }
    const id = setInterval(check, intervalMs);
    return () => clearInterval(id);
  }, [schools, settings]);
}
