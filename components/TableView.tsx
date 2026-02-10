import React from 'react';
import { Phase, CommercialStatus } from '../types';
import { PHASE_COLORS, STATUS_COLORS } from '../constants';
import { ChevronRight, Filter, Download } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

const TableView: React.FC = () => {
  const { filteredSchools: schools, setSelectedSchoolId, phaseFilter, statusFilter, togglePhaseFilter, toggleStatusFilter } = useCRM();
  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-primary">Lista Completa de Escuelas</h2>
          <p className="text-brand-500 font-body text-sm">Visualiza y filtra toda tu base de datos educativa.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button className="bg-white text-brand-600 px-4 py-2 border border-brand-200 rounded-lg text-sm font-bold hover:bg-brand-100/50 transition-all flex items-center gap-2">
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      <div className="bg-white p-3 sm:p-4 rounded-xl border border-brand-200 flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 text-brand-500 text-xs font-bold uppercase tracking-wider border-r pr-3 border-brand-200">
          <Filter size={14} /> Filtros
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.values(Phase).map(phase => (
            <button
              key={phase}
              onClick={() => togglePhaseFilter(phase)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all border ${
                phaseFilter.includes(phase)
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-brand-500 border-brand-200 hover:border-brand-400'
              }`}
            >
              {phase}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-l border-brand-200 pl-3">
          {Object.values(CommercialStatus).filter(s => s !== CommercialStatus.NONE).map(status => (
            <button
              key={status}
              onClick={() => toggleStatusFilter(status)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all border ${
                statusFilter.includes(status)
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-brand-500 border-brand-200 hover:border-brand-400'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-brand-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[520px]">
            <thead className="sticky top-0 bg-brand-100/30 z-10 border-b border-brand-200">
              <tr className="text-brand-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-6">Escuela</th>
                <th className="py-3 px-3 sm:px-6">Ubicación</th>
                <th className="py-3 px-3 sm:px-6 hidden md:table-cell">Contacto Principal</th>
                <th className="py-3 px-3 sm:px-6">Fase</th>
                <th className="py-3 px-3 sm:px-6 hidden sm:table-cell">Estado</th>
                <th className="py-3 px-3 sm:px-6 text-right w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {schools.map(school => (
                <tr
                  key={school.id}
                  className="group hover:bg-brand-100/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedSchoolId(school.id)}
                >
                  <td className="py-3 px-3 sm:px-6">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-primary group-hover:text-brand-600 truncate">{school.name}</span>
                      <span className="text-[10px] text-brand-400 font-body truncate">ID: {school.id.slice(0, 8)}…</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-6">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-brand-500 font-bold">{school.city}</span>
                      <span className="text-xs text-brand-400 font-body">{school.region}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-6 hidden md:table-cell">
                    <div className="flex flex-col">
                      <span className="text-sm text-primary font-bold">{school.contactPerson}</span>
                      <span className="text-xs text-brand-400 italic font-body">{school.role}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-6">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${PHASE_COLORS[school.phase]}`}>
                      {school.phase}
                    </span>
                  </td>
                  <td className="py-3 px-3 sm:px-6 hidden sm:table-cell">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${STATUS_COLORS[school.status]}`}>
                      {school.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 sm:px-6 text-right">
                    <button className="p-2 bg-brand-100/50 text-brand-400 rounded-lg group-hover:bg-brand-600 group-hover:text-white transition-all">
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {schools.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-brand-400">
            <Filter size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-bold">No se encontraron escuelas</p>
            <p className="text-sm font-body">Ajusta los filtros para ver más resultados.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TableView;
