import React, { useMemo, useState, useEffect } from 'react';
import { CalendarEvent } from '../types';
import { Clock, ChevronLeft, ChevronRight, CheckCircle, Plus, X, Calendar, Bell } from 'lucide-react';
import { isGoogleCalendarConfigured, getStoredToken, requestGoogleCalendarAuth, fetchCalendarEvents } from '../services/googleCalendar';
import { getUpcomingReminderItems } from '../hooks/useUpcomingReminders';
import { useCRM } from '../context/CRMContext';
import { isSupabaseConfigured } from '../services/supabase';

const defaultMeetingDate = () => new Date().toISOString().split('T')[0];
const defaultMeetingTime = '10:00';

const CalendarView: React.FC = () => {
  const { schools, setSelectedSchoolId, reminderSettings, scheduleMeeting } = useCRM();
  const onScheduleMeeting = isSupabaseConfigured() ? scheduleMeeting : undefined;
  const [viewDate, setViewDate] = useState(() => new Date());
  const [isSyncing, setIsSyncing] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(!!getStoredToken());
  const [syncError, setSyncError] = useState<string | null>(null);
  const [googleEventsList, setGoogleEventsList] = useState<CalendarEvent[]>([]);
  const [showScheduleMeetingModal, setShowScheduleMeetingModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    selectedSchoolId: '',
    title: '',
    dueDate: defaultMeetingDate(),
    dueTime: defaultMeetingTime,
    addToGoogleCalendar: false,
  });

  useEffect(() => {
    setGoogleConnected(!!getStoredToken());
  }, []);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  useEffect(() => {
    if (!googleConnected) {
      setGoogleEventsList([]);
      return;
    }
    const token = getStoredToken();
    if (!token) {
      setGoogleEventsList([]);
      return;
    }
    const timeMin = new Date(viewYear, viewMonth, 1).toISOString();
    const timeMax = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59).toISOString();
    fetchCalendarEvents(token, timeMin, timeMax)
      .then(setGoogleEventsList)
      .catch(() => setGoogleEventsList([]));
  }, [googleConnected, viewYear, viewMonth]);

  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length < 42) calendarCells.push(null);

  const crmEvents: CalendarEvent[] = useMemo(() => {
    return schools.flatMap(s => s.tasks.map(t => ({
      id: t.id,
      title: t.title,
      start: new Date(`${t.dueDate}T${t.dueTime || '09:00'}`),
      end: new Date(`${t.dueDate}T${t.dueTime ? parseInt(t.dueTime.split(':')[0]) + 1 + ':' + t.dueTime.split(':')[1] : '10:00'}`),
      type: (t.isMeeting ? 'crm_meeting' : 'crm_task') as 'crm_meeting' | 'crm_task',
      schoolId: s.id,
      schoolName: s.name,
      isAllDay: !t.dueTime
    })));
  }, [schools]);

  const allEvents = [...crmEvents, ...googleEventsList].sort((a, b) => a.start.getTime() - b.start.getTime());

  const upcomingReminders = useMemo(
    () => getUpcomingReminderItems(schools, reminderSettings),
    [schools, reminderSettings]
  );

  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const today = new Date();

  const getEventsForDay = (dayNum: number) =>
    allEvents.filter(
      e =>
        e.start.getFullYear() === viewYear &&
        e.start.getMonth() === viewMonth &&
        e.start.getDate() === dayNum
    );
  const isTodayCell = (dayNum: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === dayNum;

  const handleGoogleSync = async () => {
    if (!isGoogleCalendarConfigured()) {
      setSyncError('Añade VITE_GOOGLE_CLIENT_ID en .env y activa Google Calendar API en Cloud Console.');
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      await requestGoogleCalendarAuth();
      setGoogleConnected(true);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Error al conectar con Google');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col min-h-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-primary">Agenda Comercial</h2>
          <p className="text-brand-500 font-body text-sm">Gestión centralizada de tiempo y tareas.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {!googleConnected ? (
            <div className="flex flex-col gap-1">
              <button
                onClick={handleGoogleSync}
                disabled={isSyncing}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-brand-200 text-brand-600 rounded-xl font-bold text-sm hover:bg-brand-100/50 transition-all shadow-sm disabled:opacity-70"
              >
                {isSyncing ? <span className="animate-spin">⟳</span> : <img src="https://www.gstatic.com/images/branding/product/1x/calendar_2020q4_48dp.png" className="w-4 h-4" alt="GCal" />}
                {isSyncing ? 'Conectando...' : 'Sincronizar Google Calendar'}
              </button>
              {syncError && <span className="text-xs text-red-600">{syncError}</span>}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 border border-green-100 text-green-700 rounded-xl font-bold text-sm">
              <CheckCircle size={16} /> Google Calendar Conectado
            </div>
          )}
          <div className="flex items-center justify-between sm:justify-center gap-2 bg-white p-1 rounded-xl border border-brand-200">
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewYear, viewMonth - 1, 1))}
              className="p-2 hover:bg-brand-100/50 rounded-lg text-brand-500"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-primary px-2 sm:px-4 text-sm capitalize">
              {viewDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(viewYear, viewMonth + 1, 1))}
              className="p-2 hover:bg-brand-100/50 rounded-lg text-brand-500"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 flex-1 min-h-0 overflow-hidden">
        <div className="lg:col-span-3 bg-white rounded-2xl sm:rounded-3xl border border-brand-200 overflow-hidden flex flex-col shadow-sm min-w-0">
          <div className="grid grid-cols-7 border-b border-brand-100 bg-brand-100/30">
            {days.map(d => (
              <div key={d} className="py-2 sm:py-4 text-center text-[10px] sm:text-[11px] font-extrabold text-brand-400 uppercase tracking-widest">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 flex-1 auto-rows-fr min-h-[280px]">
            {calendarCells.map((dayNum, i) => {
              const dayEvents = dayNum === null ? [] : getEventsForDay(dayNum);
              const isToday = dayNum !== null && isTodayCell(dayNum);

              return (
                <div key={i} className={`min-h-[60px] sm:min-h-[80px] lg:min-h-[120px] border-r border-b border-brand-100 p-1 sm:p-2 relative transition-colors hover:bg-brand-100/30 ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                  {dayNum !== null && (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white shadow-lg' : 'text-brand-400'}`}>
                          {dayNum}
                        </span>
                        {dayEvents.length > 0 && <span className="text-[9px] font-bold text-brand-400">{dayEvents.length} eventos</span>}
                      </div>

                      <div className="space-y-1.5">
                        {dayEvents.map(event => (
                          <div
                            key={event.id}
                            className={`
                              px-2 py-1.5 rounded-lg text-[10px] font-bold truncate cursor-pointer transition-transform hover:scale-105 shadow-sm border
                              ${event.type === 'google_event' ? 'bg-brand-100 text-brand-500 border-brand-200' : ''}
                              ${event.type === 'crm_meeting' ? 'bg-purple-100 text-purple-700 border-purple-200' : ''}
                              ${event.type === 'crm_task' ? 'bg-white text-brand-600 border-brand-200' : ''}
                            `}
                            onClick={() => event.schoolId && setSelectedSchoolId(event.schoolId)}
                          >
                            <div className="flex items-center gap-1">
                              <Clock size={10} className="opacity-50" />
                              {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {event.title}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6 flex flex-col h-full overflow-hidden">
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm shrink-0">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-primary text-sm">Próximos recordatorios</h3>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {upcomingReminders.length === 0 ? (
                <p className="text-xs text-brand-400 font-body py-2">
                  No hay tareas ni reuniones en la ventana de aviso. Configura el tiempo en Configuración.
                </p>
              ) : (
                upcomingReminders.map((r, i) => (
                  <button
                    key={`${r.at.getTime()}-${r.title}-${i}`}
                    type="button"
                    onClick={() => setSelectedSchoolId(r.schoolId)}
                    className="w-full text-left p-3 rounded-xl border border-amber-200 bg-white hover:bg-amber-50 hover:border-amber-300 transition-all"
                  >
                    <p className="text-xs font-bold text-primary leading-tight">{r.title}</p>
                    <p className="text-[10px] text-brand-400 mt-0.5 font-body">{r.schoolName}</p>
                    <p className="text-[10px] text-amber-600 font-body mt-1">
                      {r.isMeeting ? 'Reunión' : 'Tarea'} · {r.at.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </button>
                ))
              )}
            </div>
            <p className="text-[10px] text-brand-400 font-body mt-2">Incluye tareas y follow-ups. Las notificaciones del navegador se configuran en Configuración.</p>
          </div>

          <div className="bg-gradient-to-br from-primary to-brand-600 rounded-3xl p-6 text-white shadow-xl shrink-0">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg">Próximas Reuniones</h3>
            </div>

            <div className="space-y-4">
              {allEvents.filter(e => e.type !== 'crm_task' && e.start >= today).slice(0, 3).map(event => (
                <div key={event.id} className="flex gap-3 items-start relative">
                  <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                    <span className="text-xs font-medium opacity-60">{event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="w-0.5 h-full bg-white/10 absolute left-[1.4rem] top-5 -z-0"></div>
                  </div>
                  <div className={`p-3 rounded-xl w-full border border-white/10 ${event.type === 'google_event' ? 'bg-white/5' : 'bg-purple-500/20 border-purple-400/30'}`}>
                    <p className="font-bold text-sm leading-tight">{event.title}</p>
                    {event.schoolName && <p className="text-[10px] text-white/60 mt-1">{event.schoolName}</p>}
                  </div>
                </div>
              ))}

              {allEvents.filter(e => e.type !== 'crm_task' && e.start >= today).length === 0 && (
                <p className="text-sm text-white/40 italic">No hay reuniones próximas.</p>
              )}
            </div>

            {onScheduleMeeting && (
              <button
                type="button"
                onClick={() => {
                  setScheduleForm({
                    selectedSchoolId: '',
                    title: '',
                    dueDate: defaultMeetingDate(),
                    dueTime: defaultMeetingTime,
                    addToGoogleCalendar: false,
                  });
                  setShowScheduleMeetingModal(true);
                }}
                className="w-full mt-6 py-3 bg-white text-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-100/50 transition-colors"
              >
                <Plus size={16} /> Agendar Reunión
              </button>
            )}
          </div>

          <div className="flex-1 bg-white rounded-3xl border border-brand-200 flex flex-col overflow-hidden shadow-sm">
            <div className="p-5 border-b border-brand-100">
              <h3 className="font-bold text-primary text-sm">Tareas Pendientes</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {crmEvents.filter(e => e.type === 'crm_task').map(task => (
                <div
                  key={task.id}
                  className="group p-3 bg-brand-100/30 rounded-xl border border-transparent hover:border-brand-300 hover:bg-white transition-all cursor-pointer flex items-center gap-3"
                  onClick={() => task.schoolId && setSelectedSchoolId(task.schoolId)}
                >
                  <div className="w-5 h-5 rounded-full border-2 border-brand-300 group-hover:border-brand-600 transition-colors"></div>
                  <div>
                    <p className="text-xs font-bold text-primary leading-tight group-hover:text-brand-600">{task.title}</p>
                    <p className="text-[10px] text-brand-400 mt-0.5 font-body">{task.schoolName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showScheduleMeetingModal && (
        <div className="fixed inset-0 z-50 bg-primary/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-brand-200 overflow-hidden">
            <div className="bg-primary text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500 p-2 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Agendar Reunión</h3>
                  <p className="text-brand-200 text-xs font-body">Vincula la reunión a un centro</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleMeetingModal(false)}
                className="text-brand-200 hover:text-white p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-brand-500 uppercase block mb-1">Centro</label>
                <select
                  value={scheduleForm.selectedSchoolId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const school = schools.find(s => s.id === id);
                    setScheduleForm(prev => ({
                      ...prev,
                      selectedSchoolId: id,
                      title: prev.title || (school ? `Reunión con ${school.name}` : ''),
                    }));
                  }}
                  className="w-full p-3 bg-brand-100/50 border border-brand-200 rounded-xl text-sm font-body text-primary focus:ring-2 focus:ring-brand-100 outline-none"
                >
                  <option value="">Selecciona un centro</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-brand-500 uppercase block mb-1">Título</label>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ej. Reunión de presentación"
                  className="w-full p-3 bg-brand-100/50 border border-brand-200 rounded-xl text-sm font-body text-primary focus:ring-2 focus:ring-brand-100 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-brand-500 uppercase block mb-1">Fecha</label>
                  <input
                    type="date"
                    value={scheduleForm.dueDate}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full p-3 bg-brand-100/50 border border-brand-200 rounded-xl text-sm font-body text-primary focus:ring-2 focus:ring-brand-100 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-brand-500 uppercase block mb-1">Hora</label>
                  <input
                    type="time"
                    value={scheduleForm.dueTime}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, dueTime: e.target.value }))}
                    className="w-full p-3 bg-brand-100/50 border border-brand-200 rounded-xl text-sm font-body text-primary focus:ring-2 focus:ring-brand-100 outline-none"
                  />
                </div>
              </div>
              {isGoogleCalendarConfigured() && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="schedule-add-google"
                    checked={scheduleForm.addToGoogleCalendar}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, addToGoogleCalendar: e.target.checked }))}
                    className="w-4 h-4 rounded border-brand-300 text-brand-600 focus:ring-primary"
                  />
                  <label htmlFor="schedule-add-google" className="text-sm text-brand-500 font-body">Añadir a Google Calendar</label>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-brand-100 flex gap-3">
              <button
                type="button"
                onClick={() => setShowScheduleMeetingModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-brand-200 text-brand-600 font-bold text-sm hover:bg-brand-100/50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!onScheduleMeeting || !scheduleForm.selectedSchoolId || !scheduleForm.title.trim()) return;
                  onScheduleMeeting(
                    scheduleForm.selectedSchoolId,
                    {
                      title: scheduleForm.title.trim(),
                      dueDate: scheduleForm.dueDate,
                      dueTime: scheduleForm.dueTime || undefined,
                    },
                    { addToGoogleCalendar: scheduleForm.addToGoogleCalendar }
                  );
                  setShowScheduleMeetingModal(false);
                }}
                disabled={!scheduleForm.selectedSchoolId || !scheduleForm.title.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agendar Reunión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
