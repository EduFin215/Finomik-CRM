import { useState, useEffect, useCallback } from 'react';
import type { ReminderSettings } from '../types';

const STORAGE_KEY = 'finomik_reminder_settings';

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  notificationsEnabled: true,
  checkIntervalMinutes: 1,
  remindMinutesBefore: 15,
  remindMinutesBeforeFollowUp: 15,
  remindForTasks: true,
  remindForMeetings: true,
};

function loadSettings(): ReminderSettings {
  if (typeof window === 'undefined') return DEFAULT_REMINDER_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REMINDER_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    return {
      notificationsEnabled: parsed.notificationsEnabled ?? DEFAULT_REMINDER_SETTINGS.notificationsEnabled,
      checkIntervalMinutes: parsed.checkIntervalMinutes ?? DEFAULT_REMINDER_SETTINGS.checkIntervalMinutes,
      remindMinutesBefore: parsed.remindMinutesBefore ?? DEFAULT_REMINDER_SETTINGS.remindMinutesBefore,
      remindMinutesBeforeFollowUp: parsed.remindMinutesBeforeFollowUp ?? DEFAULT_REMINDER_SETTINGS.remindMinutesBeforeFollowUp,
      remindForTasks: parsed.remindForTasks ?? DEFAULT_REMINDER_SETTINGS.remindForTasks,
      remindForMeetings: parsed.remindForMeetings ?? DEFAULT_REMINDER_SETTINGS.remindForMeetings,
    };
  } catch {
    return DEFAULT_REMINDER_SETTINGS;
  }
}

function saveSettings(settings: ReminderSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function useReminderSettings() {
  const [settings, setSettingsState] = useState<ReminderSettings>(loadSettings);

  useEffect(() => {
    setSettingsState(loadSettings());
  }, []);

  const updateSettings = useCallback((partial: Partial<ReminderSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
