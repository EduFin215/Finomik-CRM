import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Phase, CommercialStatus, Task } from '../types';
import { PHASE_COLORS, STATUS_COLORS, COLORS, PHASE_CHART_COLORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { TrendingUp, Users, CheckCircle, FileText, ChevronRight, Calendar, Clock, Download } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

const Dashboard: React.FC = () => {
  const { schools, setSelectedSchoolId, navigateToView } = useCRM();

  const exportPipeline = () => {
    const rows = schools.map((s) => ({
      Nombre: s.name,
      Ciudad: s.city,
      Región: s.region,
      Email: s.email,
      Contacto: s.contactPerson,
      Fase: s.phase,
      Estado: s.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pipeline');
    XLSX.writeFile(wb, `pipeline-finomik-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const total = schools.length;
  const signedCount = schools.filter(s => s.phase === Phase.SIGNED).length;
  const negotiationCount = schools.filter(s => s.phase === Phase.NEGOTIATION).length;
  const freeCount = schools.filter(s => s.status === CommercialStatus.FREE).length;
  const pctSigned = total > 0 ? Math.round((signedCount / total) * 100) : 0;
  const pctNegotiation = total > 0 ? Math.round((negotiationCount / total) * 100) : 0;
  const pctFree = total > 0 ? Math.round((freeCount / total) * 100) : 0;

  const phaseStats = Object.values(Phase).map(p => ({
    name: p,
    value: schools.filter(s => s.phase === p).length
  }));

  const statusStats = [
    { name: CommercialStatus.FREE, value: schools.filter(s => s.status === CommercialStatus.FREE).length, color: COLORS.brand[300] },
    { name: CommercialStatus.PAYING, value: schools.filter(s => s.status === CommercialStatus.PAYING).length, color: '#22c55e' }
  ];

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events: { task: Task; schoolName: string }[] = [];
    for (const school of schools) {
      for (const task of school.tasks) {
        if (task.completed) continue;
        const taskDate = new Date(`${task.dueDate}T${task.dueTime || '23:59:59'}`);
        if (taskDate >= today) {
          events.push({ task, schoolName: school.name });
        }
      }
    }
    events.sort((a, b) => {
      const dateA = new Date(`${a.task.dueDate}T${a.task.dueTime || '23:59:59'}`).getTime();
      const dateB = new Date(`${b.task.dueDate}T${b.task.dueTime || '23:59:59'}`).getTime();
      return dateA - dateB;
    });
    return events.slice(0, 8);
  }, [schools]);

  const formatEventDate = (dueDate: string, dueTime?: string) => {
    const d = new Date(`${dueDate}T${dueTime || '12:00'}`);
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };
    const dateStr = d.toLocaleDateString('es-ES', options);
    if (dueTime) {
      const [h, m] = dueTime.split(':');
      return { date: dateStr, time: `${h}:${m}` };
    }
    return { date: dateStr, time: null };
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-primary">Resumen General</h2>
          <p className="text-brand-500 font-body text-sm sm:text-base">Estado actual de tu pipeline de escuelas.</p>
        </div>
        <button
          type="button"
          onClick={exportPipeline}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold bg-primary text-white hover:bg-brand-600 transition-all shrink-0"
        >
          <Download size={18} />
          Exportar pipeline
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <button
          type="button"
          onClick={() => navigateToView('table')}
          className="bg-white p-6 rounded-xl border border-brand-200 shadow-sm text-left hover:border-brand-400 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-brand-100 p-2 rounded-lg text-brand-600"><Users size={20} /></div>
          </div>
          <p className="text-brand-500 text-sm font-bold">Total Escuelas</p>
          <p className="text-2xl font-extrabold text-primary">{total}</p>
        </button>

        <button
          type="button"
          onClick={() => navigateToView('table', { phase: [Phase.SIGNED] })}
          className="bg-white p-6 rounded-xl border border-brand-200 shadow-sm text-left hover:border-brand-400 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600"><CheckCircle size={20} /></div>
            {total > 0 && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{pctSigned}% del total</span>}
          </div>
          <p className="text-brand-500 text-sm font-bold">Firmadas</p>
          <p className="text-2xl font-extrabold text-primary">{signedCount}</p>
        </button>

        <button
          type="button"
          onClick={() => navigateToView('table', { phase: [Phase.NEGOTIATION] })}
          className="bg-white p-6 rounded-xl border border-brand-200 shadow-sm text-left hover:border-brand-400 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-50 p-2 rounded-lg text-orange-600"><TrendingUp size={20} /></div>
            {total > 0 && <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{pctNegotiation}% del total</span>}
          </div>
          <p className="text-brand-500 text-sm font-bold">Negociación Activa</p>
          <p className="text-2xl font-extrabold text-primary">{negotiationCount}</p>
        </button>

        <button
          type="button"
          onClick={() => navigateToView('table', { status: [CommercialStatus.FREE] })}
          className="bg-white p-6 rounded-xl border border-brand-200 shadow-sm text-left hover:border-brand-400 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="bg-brand-100 p-2 rounded-lg text-brand-600"><FileText size={20} /></div>
            {total > 0 && <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">{pctFree}% del total</span>}
          </div>
          <p className="text-brand-500 text-sm font-bold">Periodo Gratuito</p>
          <p className="text-2xl font-extrabold text-primary">{freeCount}</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-xl border border-brand-200 shadow-sm min-w-0">
          <h3 className="font-bold text-primary mb-4 sm:mb-6 flex items-center gap-2 text-sm sm:text-base">Distribución por Fases</h3>
          <div className="h-[240px] sm:h-[300px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={phaseStats}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {phaseStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PHASE_CHART_COLORS[entry.name as Phase]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-brand-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-primary mb-6">Estado Comercial</h3>
          <div className="flex-1 min-h-[250px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusStats}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs font-bold">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-brand-400"></span> Gratuito</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500"></span> Pagando</div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-brand-200 shadow-sm">
        <h3 className="font-bold text-primary mb-4 flex items-center gap-2">
          <Calendar size={18} /> Siguientes eventos del calendario
        </h3>
        <div className="overflow-hidden">
          {upcomingEvents.length === 0 ? (
            <p className="py-8 text-center text-brand-500 font-body">No hay eventos próximos. Crea tareas o reuniones en los centros para verlas aquí.</p>
          ) : (
            <ul className="divide-y divide-brand-100">
              {upcomingEvents.map(({ task, schoolName }) => {
                const { date, time } = formatEventDate(task.dueDate, task.dueTime);
                return (
                  <li key={task.id} className="group py-4 flex items-center gap-4 hover:bg-brand-100/20 transition-colors -mx-2 px-2 rounded-lg">
                    <div className="shrink-0 w-14 text-center rounded-xl bg-primary text-white py-2 shadow-sm">
                      <span className="text-[9px] font-bold uppercase block opacity-90">
                        {date.split(' ')[0].replace(/\.$/, '')}
                      </span>
                      <span className="text-lg font-extrabold leading-none">
                        {new Date(task.dueDate + 'T12:00').getDate()}
                      </span>
                      <span className="text-[9px] font-body opacity-80 block">
                        {date.split(' ').slice(-1)[0]?.replace(/\.$/, '') || ''}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-primary truncate">{task.title}</p>
                      <p className="text-brand-500 text-sm font-body truncate flex items-center gap-1">
                        {time != null ? (
                          <><Clock size={12} /> {time} · </>
                        ) : null}
                        {schoolName}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedSchoolId(task.schoolId)}
                      className="shrink-0 p-2 text-brand-500 hover:text-primary hover:bg-brand-100/50 rounded-lg transition-colors"
                      title="Ver centro"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
