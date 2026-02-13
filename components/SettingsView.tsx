import React from 'react';
import { Bell } from 'lucide-react';
import type { ReminderSettings } from '../types';
import { useCRM } from '../context/CRMContext';
import { Select } from '../modules/tasks/Select';

const CHECK_INTERVAL_OPTIONS = [1, 5, 15, 30, 60] as const;
const REMIND_BEFORE_OPTIONS = [5, 15, 30, 60] as const;

const SettingsView: React.FC = () => {
  const { reminderSettings: settings, updateReminderSettings: onUpdateSettings } = useCRM();
  return (
    <div className="max-w-2xl w-full space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-primary">Configuración</h2>
        <p className="text-brand-500 font-body mt-1 text-sm">Ajusta notificaciones y recordatorios a tu gusto.</p>
      </div>

      <section className="bg-white rounded-xl sm:rounded-2xl border border-brand-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-brand-200 flex items-center gap-3">
          <Bell className="text-primary w-5 h-5 sm:w-6 sm:h-6" />
          <h3 className="font-bold text-base sm:text-lg text-primary">Notificaciones y recordatorios</h3>
        </div>
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="notifications-enabled" className="text-sm font-body text-primary flex-1">
              Activar notificaciones del navegador
            </label>
            <button
              id="notifications-enabled"
              type="button"
              role="switch"
              aria-checked={settings.notificationsEnabled}
              onClick={() => onUpdateSettings({ notificationsEnabled: !settings.notificationsEnabled })}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                settings.notificationsEnabled ? 'bg-primary border-primary' : 'bg-brand-100 border-brand-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                  settings.notificationsEnabled ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div>
            <Select
              label="Comprobar cada (minutos)"
              value={String(settings.checkIntervalMinutes)}
              onChange={(v) => onUpdateSettings({ checkIntervalMinutes: Number(v) })}
              placeholder="Minutos"
              options={CHECK_INTERVAL_OPTIONS.map((m) => ({
                value: String(m),
                label: `${m} min${m !== 1 ? 's' : ''}`,
              }))}
              className="max-w-xs"
            />
            <p className="text-xs text-brand-400 font-body mt-1">
              Cada cuánto se revisa si hay tareas o reuniones próximas para avisar.
            </p>
          </div>

          <div>
            <Select
              label="Avisar … minutos antes (tareas)"
              value={String(settings.remindMinutesBefore)}
              onChange={(v) => onUpdateSettings({ remindMinutesBefore: Number(v) })}
              placeholder="Minutos"
              options={REMIND_BEFORE_OPTIONS.map((m) => ({
                value: String(m),
                label: `${m} min${m !== 1 ? 's' : ''}`,
              }))}
              className="max-w-xs"
            />
            <p className="text-xs text-brand-400 font-body mt-1">
              Recibirás el recordatorio cuando falte este tiempo para la hora de la tarea.
            </p>
          </div>

          <div>
            <Select
              label="Avisar … minutos antes (reuniones y follow-ups)"
              value={String(settings.remindMinutesBeforeFollowUp)}
              onChange={(v) => onUpdateSettings({ remindMinutesBeforeFollowUp: Number(v) })}
              placeholder="Minutos"
              options={REMIND_BEFORE_OPTIONS.map((m) => ({
                value: String(m),
                label: `${m} min${m !== 1 ? 's' : ''}`,
              }))}
              className="max-w-xs"
            />
            <p className="text-xs text-brand-400 font-body mt-1">
              Tiempo de antelación para las notificaciones de reuniones y follow-ups. También aparecen en Calendario.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-sm font-bold text-primary">Avisar por</p>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.remindForTasks}
                onChange={(e) => onUpdateSettings({ remindForTasks: e.target.checked })}
                className="w-4 h-4 rounded border-brand-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-body text-primary">Tareas</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.remindForMeetings}
                onChange={(e) => onUpdateSettings({ remindForMeetings: e.target.checked })}
                className="w-4 h-4 rounded border-brand-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-body text-primary">Reuniones y follow-ups</span>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsView;
