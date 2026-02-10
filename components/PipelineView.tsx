import React from 'react';
import { Phase, CommercialStatus, School } from '../types';
import { STATUS_COLORS } from '../constants';
import { MoreHorizontal, User, MapPin } from 'lucide-react';
import { useCRM } from '../context/CRMContext';

const PipelineView: React.FC = () => {
  const { filteredSchools: schools, updateSchool, setSelectedSchoolId, phaseFilter, statusFilter, togglePhaseFilter, toggleStatusFilter } = useCRM();
  const phases = Object.values(Phase);
  const [draggedSchool, setDraggedSchool] = React.useState<School | null>(null);
  const [dragOverPhase, setDragOverPhase] = React.useState<Phase | null>(null);
  const draggedSchoolRef = React.useRef<School | null>(null);

  const handleDragStart = (e: React.DragEvent, school: School) => {
    draggedSchoolRef.current = school;
    setDraggedSchool(school);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', school.id);
  };
  const handleDragEnd = () => {
    draggedSchoolRef.current = null;
    setDraggedSchool(null);
    setDragOverPhase(null);
  };
  const handleDragOver = (e: React.DragEvent, phase: Phase) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPhase(phase);
  };
  const handleDragEnter = (e: React.DragEvent, phase: Phase) => {
    e.preventDefault();
    setDragOverPhase(phase);
  };
  const handleDragLeave = () => setDragOverPhase(null);
  const handleDrop = (e: React.DragEvent, newPhase: Phase) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPhase(null);
    const school = draggedSchoolRef.current;
    draggedSchoolRef.current = null;
    setDraggedSchool(null);
    if (!school || school.phase === newPhase) return;
    updateSchool({ ...school, phase: newPhase });
  };

  return (
    <div className="h-full flex flex-col space-y-4 sm:space-y-6 min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-primary">Pipeline de Escuelas</h2>
          <p className="text-brand-500 font-body text-sm">Arrastra y suelta para avanzar en el proceso.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex gap-1 bg-white p-1 rounded-lg border border-brand-200">
            {Object.values(CommercialStatus).filter(s => s !== CommercialStatus.NONE).map(status => (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  statusFilter.includes(status) ? 'bg-primary text-white shadow-sm' : 'text-brand-500 hover:bg-brand-100/50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-3 sm:gap-4 overflow-x-auto pb-4 sm:pb-6 min-h-0">
        {phases.map(phase => {
          const columnSchools = schools.filter(s => s.phase === phase);
          const isDropTarget = dragOverPhase === phase;
          return (
            <div
              key={phase}
              className={`min-w-[260px] w-72 sm:w-80 shrink-0 flex flex-col rounded-xl border-2 transition-colors bg-gradient-to-b from-primary/[0.06] to-brand-100/30 ${
                isDropTarget ? 'border-primary' : 'border-brand-200'
              }`}
              onDragEnter={(e) => handleDragEnter(e, phase)}
              onDragOver={(e) => handleDragOver(e, phase)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, phase)}
            >
              <div className="p-4 flex items-center justify-between border-b border-brand-200">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${phase === Phase.SIGNED ? 'bg-emerald-500' : 'bg-brand-500'}`}></span>
                  <h3 className="font-bold text-primary text-sm uppercase tracking-wider">{phase}</h3>
                  <span className="bg-brand-200 text-brand-600 text-[10px] px-1.5 py-0.5 rounded-md font-bold">{columnSchools.length}</span>
                </div>
                <button className="text-brand-400 hover:text-brand-600"><MoreHorizontal size={16} /></button>
              </div>

              <div className="p-2 sm:p-3 flex-1 overflow-y-auto space-y-2 sm:space-y-3 min-h-[200px] sm:min-h-[320px] lg:min-h-[400px] relative">
                {/* Invisible drop overlay only in other columns (not the source), so cards stay clickable to start drag */}
                {draggedSchool && draggedSchool.phase !== phase && (
                  <div
                    className="absolute inset-0 z-10"
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverPhase(phase);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverPhase(phase);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDrop(e, phase);
                    }}
                  />
                )}
                {columnSchools.map(school => (
                  <div
                    key={school.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, school)}
                    onDragEnd={handleDragEnd}
                    onClick={() => setSelectedSchoolId(school.id)}
                    className={`bg-white p-4 rounded-lg shadow-sm border border-brand-200 hover:border-brand-400 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group ${draggedSchool?.id === school.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-primary text-sm group-hover:text-brand-600 leading-tight">{school.name}</h4>
                    </div>

                    <div className="space-y-2 mt-3">
                      <div className="flex items-center gap-2 text-brand-500 text-[11px] font-body">
                        <MapPin size={12} />
                        <span>{school.city}, {school.region}</span>
                      </div>
                      <div className="flex items-center gap-2 text-brand-500 text-[11px] font-body">
                        <User size={12} />
                        <span>{school.contactPerson}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-brand-100 flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[school.status]}`}>
                        {school.status === CommercialStatus.NONE ? 'Sin estado' : school.status}
                      </span>
                      {school.tasks.filter(t => !t.completed).length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-orange-600 font-bold bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                          {school.tasks.filter(t => !t.completed).length} Pendiente
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {columnSchools.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 text-brand-400 border-2 border-dashed border-brand-200 rounded-lg font-body">
                    <p className="text-xs">Sin escuelas</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineView;
