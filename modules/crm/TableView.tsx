import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phase, CommercialStatus } from '../../types';
import { PHASE_COLORS, STATUS_COLORS } from '../../constants';
import { ChevronRight, Filter, Download, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';

// Helper to check if phase is in pipeline (Ventas)
const isSalesPhase = (p: Phase) => [Phase.MEETING, Phase.PROPOSAL, Phase.NEGOTIATION].includes(p);

const TableView: React.FC = () => {
  const { filteredSchools: schools, phaseFilter, statusFilter, togglePhaseFilter, toggleStatusFilter, updateSchool } = useCRM();
  const navigate = useNavigate();

  const toggleContacted = (e: React.MouseEvent, school: any) => {
    e.stopPropagation();
    if (school.phase === Phase.CONTACTED) {
      // Revert to Lead (deselect)
      updateSchool({ ...school, phase: Phase.LEAD });
    } else {
      // Mark as Contacted
      updateSchool({ ...school, phase: Phase.CONTACTED });
    }
  };

  const handlePromoteToSales = (e: React.MouseEvent, school: any) => {
    e.stopPropagation();
    updateSchool({ ...school, phase: Phase.INTERESTED });
  };

  return (
    <div className="space-y-4 sm:space-y-6 h-full flex flex-col min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-primary">Escuelas (Leads)</h2>
          <p className="text-brand-500 font-body text-sm">Gestiona tu base de datos de escuelas y leads.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button className="bg-white text-brand-600 px-4 py-2 border border-brand-200 rounded-lg text-sm font-bold hover:bg-brand-100/50 transition-all flex items-center gap-2">
            <Download size={16} /> Exportar
          </button>
        </div>
      </div>

      <div className="bg-white p-3 sm:p-4 rounded-card border border-brand-very-soft/50 shadow-card flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2 text-brand-soft text-xs font-bold uppercase tracking-wider border-r pr-3 border-brand-very-soft">
          <Filter size={14} /> Filtros
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.values(Phase).map(phase => (
            <button
              key={phase}
              onClick={() => togglePhaseFilter(phase)}
              className={`px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all border ${phaseFilter.includes(phase)
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-brand-muted border-brand-very-soft hover:border-brand-mid hover:bg-brand-very-soft/30'
                }`}
            >
              {phase}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 border-l border-brand-very-soft pl-3">
          {Object.values(CommercialStatus).filter(s => s !== CommercialStatus.NONE).map(status => (
            <button
              key={status}
              onClick={() => toggleStatusFilter(status)}
              className={`px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all border ${statusFilter.includes(status)
                ? 'bg-accent text-white border-accent shadow-md'
                : 'bg-white text-brand-muted border-brand-very-soft hover:border-brand-mid hover:bg-brand-very-soft/30'
                }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-card border border-brand-very-soft/50 shadow-card overflow-hidden flex-1 flex flex-col min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-brand-soft/20">
          <table className="w-full text-left border-collapse min-w-[520px]">
            <thead className="sticky top-0 bg-brand-very-soft/20 z-10 backdrop-blur-sm border-b border-brand-very-soft/50">
              <tr className="text-brand-mid text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                <th className="py-4 px-3 sm:px-6">Escuela</th>
                <th className="py-4 px-3 sm:px-6">Ubicación</th>
                <th className="py-4 px-3 sm:px-6 hidden md:table-cell">Contacto Principal</th>
                <th className="py-4 px-3 sm:px-6">Fase</th>
                <th className="py-4 px-3 sm:px-6 hidden sm:table-cell">Estado</th>
                <th className="py-4 px-3 sm:px-6 text-right w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-very-soft/30">
              {schools.map(school => (
                <tr
                  key={school.id}
                  className="group hover:bg-brand-very-soft/10 transition-colors cursor-pointer"
                  onClick={() => navigate(`/crm/schools/${school.id}`)}
                >
                  <td className="py-3 px-3 sm:px-6">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-primary group-hover:text-accent transition-colors truncate">{school.name}</span>
                      <span className="text-[10px] text-brand-soft font-body truncate">ID: {school.id.slice(0, 8)}…</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-6">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm text-brand-muted font-bold">{school.city}</span>
                      <span className="text-xs text-brand-soft font-body">{school.region}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-6 hidden md:table-cell">
                    <div className="flex flex-col">
                      <span className="text-sm text-primary font-bold">{school.contactPerson}</span>
                      <span className="text-xs text-brand-soft italic font-body">{school.role}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-6">
                    <div className="flex items-center gap-2">
                      {/* Phase Badge (Click to toggle CONTACTED if applicable, or cycle) */}
                      <div
                        onClick={(e) => isSalesPhase(school.phase) ? null : toggleContacted(e, school)}
                        className={`relative group/badge ${!isSalesPhase(school.phase) ? 'cursor-pointer hover:scale-105 active:scale-95' : ''} transition-all`}
                      >
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold border ${PHASE_COLORS[school.phase]}`}>
                          {school.phase}
                        </span>
                        {/* Hover hint for toggle */}
                        {!isSalesPhase(school.phase) && school.phase !== Phase.CLOSED_WON && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover/badge:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                            {school.phase === Phase.CONTACTED ? 'Desmarcar' : 'Marcar Contactado'}
                          </div>
                        )}
                      </div>

                      {/* Action: Promote to Interested (Sales Pipeline) - ALWAYS visible for Lead/Contacted */}
                      {(school.phase === Phase.LEAD || school.phase === Phase.CONTACTED) && (
                        <button
                          onClick={(e) => handlePromoteToSales(e, school)}
                          className="flex items-center gap-1 bg-white border border-brand-200 text-brand-500 px-2 py-0.5 rounded-full text-[10px] hover:text-primary hover:border-brand-400 shadow-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Mover a Ventas (Interesado)"
                        >
                          <ArrowRight size={10} />
                          <span>Ventas</span>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 sm:px-6 hidden sm:table-cell">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${STATUS_COLORS[school.status]}`}>
                      {school.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 sm:px-6 text-right">
                    <button className="p-2 text-brand-soft rounded-lg group-hover:bg-brand-very-soft/50 group-hover:text-primary transition-all">
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {schools.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-brand-soft">
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
