import React, { useMemo, useState, useEffect } from 'react';
import { CalendarEvent } from '../types';
import { Clock, ChevronLeft, ChevronRight, CheckCircle, Plus, Calendar as CalendarIcon, Bell } from 'lucide-react';
import { isGoogleCalendarConfigured, getStoredToken, requestGoogleCalendarAuth, fetchCalendarEvents } from '../services/googleCalendar';
import { getUpcomingReminderItems } from '../hooks/useUpcomingReminders';
import { useCRM } from '../context/CRMContext';
import { isSupabaseConfigured } from '../services/supabase';
import { DateTimePicker } from '../modules/tasks/DateTimePicker';
import { Select } from '../modules/tasks/Select';
import { Modal } from './ui/Modal';

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
        <div className="lg:col-span-3 bg-white rounded-card border border-brand-very-soft/50 overflow-hidden flex flex-col shadow-card min-w-0">
          <div className="grid grid-cols-7 border-b border-brand-very-soft/50 bg-brand-very-soft/20">
            {days.map(d => (
              <div key={d} className="py-3 sm:py-4 text-center text-[10px] sm:text-[11px] font-extrabold text-brand-mid uppercase tracking-widest">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 flex-1 auto-rows-fr min-h-[280px]">
            {calendarCells.map((dayNum, i) => {
              const dayEvents = dayNum === null ? [] : getEventsForDay(dayNum);
              const isToday = dayNum !== null && isTodayCell(dayNum);

              return (
                <div key={i} className={`min-h-[60px] sm:min-h-[80px] lg:min-h-[120px] border-r border-b border-brand-very-soft/30 p-1 sm:p-2 relative transition-colors hover:bg-brand-very-soft/10 ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                  {dayNum !== null && (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all ${isToday ? 'bg-primary text-white shadow-glow scale-110' : 'text-brand-muted'}`}>
                          {dayNum}
                        </span>
                        {dayEvents.length > 0 && <span className="text-[9px] font-bold text-brand-soft">{dayEvents.length} eventos</span>}
                      </div>

                      <div className="space-y-1.5">
                        {dayEvents.map(event => (
                          <div
                            key={event.id}
                            className={`
                              px-2 py-1.5 rounded-lg text-[10px] font-bold truncate cursor-pointer transition-all hover:scale-[1.02] shadow-sm border
                              ${event.type === 'google_event' ? 'bg-brand-very-soft/30 text-brand-mid border-brand-very-soft/50' : ''}
                              ${event.type === 'crm_meeting' ? 'bg-purple-50 text-purple-700 border-purple-100' : ''}
                              ${event.type === 'crm_task' ? 'bg-white text-primary border-brand-very-soft/60 shadow-[0_2px_4px_rgba(0,0,0,0.02)]' : ''}
                            `}
                            onClick={() => event.schoolId && setSelectedSchoolId(event.schoolId)}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${event.type === 'google_event' ? 'bg-brand-mid' :
                                event.type === 'crm_meeting' ? 'bg-purple-500' : 'bg-primary'
                                }`} />
                              <span className="opacity-75 font-medium">{event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
          <div className="bg-amber-50/80 border border-amber-100 rounded-card p-5 shadow-sm shrink-0 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-primary text-sm">Próximos recordatorios</h3>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-200">
              {upcomingReminders.length === 0 ? (
                <p className="text-xs text-brand-muted font-body py-2">
                  No hay tareas ni reuniones en la ventana de aviso.
                </p>
              ) : (
                upcomingReminders.map((r, i) => (
                  <button
                    key={`${r.at.getTime()}-${r.title}-${i}`}
                    type="button"
                    onClick={() => setSelectedSchoolId(r.schoolId)}
                    className="w-full text-left p-3 rounded-xl border border-amber-200/60 bg-white hover:bg-amber-50 hover:border-amber-300 transition-all shadow-sm group"
                  >
                    <p className="text-xs font-bold text-primary leading-tight group-hover:text-amber-700 transition-colors">{r.title}</p>
                    <p className="text-[10px] text-brand-muted mt-0.5 font-body">{r.schoolName}</p>
                    <p className="text-[10px] text-amber-600 font-body mt-1 flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                      {r.isMeeting ? 'Reunión' : 'Tarea'} · {r.at.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="bg-gradient-sidebar rounded-card p-6 text-white shadow-card-hover shrink-0 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-transform group-hover:scale-150 duration-700"></div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <h3 className="font-bold text-lg">Próximas Reuniones</h3>
            </div>

            <div className="space-y-4 relative z-10">
              {allEvents.filter(e => e.type !== 'crm_task' && e.start >= today).slice(0, 3).map(event => (
                <div key={event.id} className="flex gap-3 items-start relative">
                  <div className="flex flex-col items-center gap-1 min-w-[3rem]">
                    <span className="text-xs font-medium opacity-80">{event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="w-0.5 h-full bg-white/10 absolute left-[1.4rem] top-5 -z-0"></div>
                  </div>
                  <div className={`p-3 rounded-xl w-full border backdrop-blur-sm transition-transform hover:translate-x-1 ${event.type === 'google_event' ? 'bg-white/10 border-white/10' : 'bg-accent/20 border-white/20 shadow-glow'}`}>
                    <p className="font-bold text-sm leading-tight">{event.title}</p>
                    {event.schoolName && <p className="text-[10px] text-white/70 mt-1 flex items-center gap-1"><span className="w-1 h-1 bg-white/50 rounded-full" /> {event.schoolName}</p>}
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
                className="w-full mt-6 py-3 bg-white text-primary rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand-very-soft transition-colors shadow-lg relative z-10"
              >
                <Plus size={16} /> Agendar Reunión
              </button>
            )}
          </div>

          <div className="flex-1 bg-white rounded-card border border-brand-very-soft/50 flex flex-col overflow-hidden shadow-card">
            <div className="p-5 border-b border-brand-very-soft/30 bg-brand-very-soft/5">
              <h3 className="font-bold text-primary text-sm flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                Tareas Pendientes
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-brand-very-soft/50">
              {crmEvents.filter(e => e.type === 'crm_task').map(task => (
                <div
                  key={task.id}
                  className="group p-3 bg-white rounded-xl border border-brand-very-soft/50 hover:border-brand-mid/50 hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
                  onClick={() => task.schoolId && setSelectedSchoolId(task.schoolId)}
                >
                  <div className="w-5 h-5 rounded-full border-2 border-brand-very-soft group-hover:border-primary transition-colors flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary leading-tight group-hover:text-brand-secondary transition-colors">{task.title}</p>
                    <p className="text-[10px] text-brand-muted mt-0.5 font-body">{task.schoolName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showScheduleMeetingModal && (
        <Modal
          isOpen={showScheduleMeetingModal}
          onClose={() => setShowScheduleMeetingModal(false)}
          title={
            <div className="flex items-center gap-3">
              <div className="bg-purple-500/10 p-2 rounded-xl">
                <CalendarIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-primary">Agendar Reunión</h3>
                <p className="text-brand-500 text-xs font-body">Vincula la reunión a un centro</p>
              </div>
            </div>
          }
          maxWidth="md"
          footer={
            <>
              <button
                type="button"
                onClick={() => setShowScheduleMeetingModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-brand-200/60 text-brand-600 font-bold text-sm hover:bg-brand-100/50 transition-colors"
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
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
              >
                Agendar Reunión
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <Select
                label="Centro"
                value={scheduleForm.selectedSchoolId}
                onChange={(id) => {
                  const school = schools.find(s => s.id === id);
                  setScheduleForm(prev => ({
                    ...prev,
                    selectedSchoolId: id,
                    title: prev.title || (school ? `Reunión con ${school.name}` : ''),
                  }));
                }}
                placeholder="Selecciona un centro"
                options={schools.map((s) => ({ value: s.id, label: s.name }))}
                className="min-w-0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-brand-600 uppercase block mb-1.5">Título</label>
              <input
                type="text"
                value={scheduleForm.title}
                onChange={(e) => setScheduleForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Ej. Reunión de presentación"
                className="w-full p-3 bg-white border border-brand-200/60 rounded-xl text-sm font-body text-primary focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-brand-soft shadow-sm transition-shadow"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <DateTimePicker
                  label="Fecha"
                  dateValue={scheduleForm.dueDate}
                  onChangeDate={(dueDate) => setScheduleForm(prev => ({ ...prev, dueDate }))}
                  showTime={false}
                  placeholder="Elegir fecha"
                  className="min-w-0"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-brand-600 uppercase block mb-1.5">Hora</label>
                <input
                  type="time"
                  value={scheduleForm.dueTime}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, dueTime: e.target.value }))}
                  className="w-full p-3 bg-white border border-brand-200/60 rounded-xl text-sm font-body text-primary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm transition-shadow"
                />
              </div>
            </div>
            {isGoogleCalendarConfigured() && (
              <div className="flex items-center gap-2 p-3 bg-brand-50/50 rounded-xl border border-brand-100/50">
                <input
                  type="checkbox"
                  id="schedule-add-google"
                  checked={scheduleForm.addToGoogleCalendar}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, addToGoogleCalendar: e.target.checked }))}
                  className="w-4 h-4 rounded border-brand-300 text-primary focus:ring-primary"
                />
                <label htmlFor="schedule-add-google" className="text-sm text-brand-600 font-body font-medium cursor-pointer">Añadir a Google Calendar</label>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CalendarView;
