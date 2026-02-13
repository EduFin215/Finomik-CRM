import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Phase, CommercialStatus, School } from '../../types';
import { STATUS_COLORS } from '../../constants';
import { MoreHorizontal, User, MapPin, Building2, GripVertical } from 'lucide-react';
import { useCRM } from '../../context/CRMContext';

const PipelineView: React.FC = () => {
  const { filteredSchools: schools, updateSchool, phaseFilter, statusFilter, togglePhaseFilter, toggleStatusFilter } = useCRM();
  const navigate = useNavigate();

  // SALES PIPELINE PHASES
  const phases = [
    Phase.INTERESTED,
    Phase.MEETING,
    Phase.PROPOSAL,
    Phase.NEGOTIATION,
    Phase.CLOSED_WON
  ];
  const [draggedSchool, setDraggedSchool] = React.useState<School | null>(null);
  const [dragOverPhase, setDragOverPhase] = React.useState<Phase | null>(null);
  const draggedSchoolRef = React.useRef<School | null>(null);

  const handleDragStart = (e: React.DragEvent, school: School) => {
    draggedSchoolRef.current = school;
    setDraggedSchool(school);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', school.id);
    // Create custom drag image if needed, or let browser handle it
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

  // Status mapping to colors/labels for pills
  const getStatusPill = (status: CommercialStatus) => {
    const isPaying = status === CommercialStatus.PAYING;
    const isFree = status === CommercialStatus.FREE;
    const isInterested = status === CommercialStatus.INTERESTED;

    let colorClass = 'bg-brand-100 text-brand-600 border-brand-200';
    if (isPaying) colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
    if (isFree) colorClass = 'bg-blue-50 text-blue-700 border-blue-100';
    if (isInterested) colorClass = 'bg-amber-50 text-amber-700 border-amber-100';

    if (status === CommercialStatus.NONE) return null;

    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide border ${colorClass}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4 sm:space-y-6 min-h-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">Flujo de Ventas</h2>
          <p className="text-brand-500 text-sm mt-1">Gestión de oportunidades comerciales.</p>
        </div>

        {/* Filters Pill */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 bg-white p-1 rounded-xl border border-brand-very-soft/60 shadow-sm">
            {Object.values(CommercialStatus).filter(s => s !== CommercialStatus.NONE).map(status => (
              <button
                key={status}
                onClick={() => toggleStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusFilter.includes(status)
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-brand-500 hover:bg-brand-50 hover:text-primary'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 px-1 min-h-0 snap-x">
        {phases.map(phase => {
          const columnSchools = schools.filter(s => s.phase === phase);
          const isDropTarget = dragOverPhase === phase;

          return (
            <div
              key={phase}
              className={`
                min-w-[300px] w-[320px] shrink-0 flex flex-col rounded-2xl border transition-all duration-300 snap-center
                ${isDropTarget ? 'border-primary/40 bg-primary/5 shadow-inner' : 'border-brand-very-soft/60 bg-brand-50/30'}
              `}
              onDragEnter={(e) => handleDragEnter(e, phase)}
              onDragOver={(e) => handleDragOver(e, phase)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, phase)}
            >
              {/* Column Header */}
              <div className="p-4 flex items-center justify-between sticky top-0 bg-inherit z-10 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full shadow-sm ring-2 ring-white ${phase === Phase.CLOSED_WON ? 'bg-emerald-500' : 'bg-primary'}`} />
                  <h3 className="font-extrabold text-primary text-sm uppercase tracking-wide">{phase}</h3>
                  <span className="bg-white text-brand-500 font-bold text-[10px] px-2 py-0.5 rounded-full shadow-sm border border-brand-100">
                    {columnSchools.length}
                  </span>
                </div>
                {/* <button className="text-brand-400 hover:text-primary transition-colors p-1 rounded-md hover:bg-black/5">
                  <MoreHorizontal size={16} />
                </button> */}
              </div>

              {/* Cards Container */}
              <div className="p-3 pt-0 flex-1 overflow-y-auto space-y-3 min-h-[150px] relative scrollbar-thin scrollbar-thumb-brand-200/50">
                {/* Invisible Drop Zone Overlay when dragging over other columns */}
                {draggedSchool && draggedSchool.phase !== phase && (
                  <div
                    className="absolute inset-0 z-20"
                    onDragEnter={(e) => { e.preventDefault(); setDragOverPhase(phase); }}
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverPhase(phase); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDrop(e, phase); }}
                  />
                )}

                {columnSchools.map(school => (
                  <div
                    key={school.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, school)}
                    onDragEnd={handleDragEnd}
                    onClick={() => navigate(`/crm/schools/${school.id}`)}
                    className={`
                      group relative bg-white p-4 rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing
                      ${draggedSchool?.id === school.id
                        ? 'opacity-40 scale-[0.98] shadow-none border-dashed border-brand-300'
                        : 'border-brand-very-soft/60 shadow-sm hover:shadow-md hover:border-brand-200 hover:-translate-y-0.5'
                      }
                    `}
                  >
                    {/* Drag Handle (Visual only) */}
                    <div className="absolute top-4 right-4 text-brand-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      <GripVertical size={14} />
                    </div>

                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-500 shrink-0">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <h4 className="font-bold text-primary text-sm leading-tight pr-4">{school.name}</h4>
                        <p className="text-[10px] text-brand-400 font-medium mt-0.5 truncate max-w-[160px]">ID: {school.id.slice(0, 8)}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-brand-500 text-xs">
                        <MapPin size={12} className="text-brand-300 shrink-0" />
                        <span className="truncate">{school.city}, {school.region}</span>
                      </div>
                      <div className="flex items-center gap-2 text-brand-500 text-xs">
                        <User size={12} className="text-brand-300 shrink-0" />
                        <span className="truncate">{school.contactPerson}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-brand-very-soft/40 flex items-center justify-between">
                      {getStatusPill(school.status) || <span></span>}

                      {school.tasks.filter(t => !t.completed).length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100/50">
                          {school.tasks.filter(t => !t.completed).length} tareas
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineView;
