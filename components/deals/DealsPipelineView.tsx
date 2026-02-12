import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateDeal } from '../../services/crm/deals';
import type { Deal, DealStage } from '../../types';

const DEAL_STAGES: DealStage[] = ['new', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost'];

interface DealsPipelineViewProps {
  deals: Deal[];
  refetch: () => void;
}

export const DealsPipelineView: React.FC<DealsPipelineViewProps> = ({ deals, refetch }) => {
  const navigate = useNavigate();
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const draggedRef = useRef<Deal | null>(null);

  const openDeals = deals.filter((d) => d.stage !== 'won' && d.stage !== 'lost');

  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    draggedRef.current = deal;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', deal.id);
  };

  const handleDragEnd = () => {
    draggedRef.current = null;
    setDragOverStage(null);
  };

  const handleDrop = async (e: React.DragEvent, newStage: DealStage) => {
    e.preventDefault();
    setDragOverStage(null);
    const deal = draggedRef.current;
    draggedRef.current = null;
    if (!deal || deal.stage === newStage) return;
    await updateDeal(deal.id, { stage: newStage });
    refetch();
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
      {DEAL_STAGES.map((stage) => {
        const columnDeals = openDeals.filter((d) => d.stage === stage);
        const isDropTarget = dragOverStage === stage;
        return (
          <div
            key={stage}
            className={`min-w-[240px] w-60 shrink-0 flex flex-col rounded-xl border-2 transition-colors bg-brand-100/30 ${
              isDropTarget ? 'border-primary bg-brand-100/50' : 'border-brand-200/60'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage); }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={(e) => handleDrop(e, stage)}
          >
            <div className="p-3 border-b border-brand-200/60">
              <h3 className="font-subtitle text-primary capitalize">{stage.replace('_', ' ')}</h3>
              <p className="text-xs text-brand-500">{columnDeals.length} deals</p>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {columnDeals.map((deal) => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, deal)}
                  onDragEnd={handleDragEnd}
                  onClick={() => navigate(`/crm/clients/${deal.clientId}`)}
                  className="p-3 bg-white rounded-xl border border-brand-200/60 shadow-card cursor-grab active:cursor-grabbing hover:border-brand-300 hover:shadow-md transition-all"
                >
                  <p className="font-medium text-primary truncate">{deal.title}</p>
                  <p className="text-xs text-brand-500 truncate">{deal.clientName ?? deal.clientId}</p>
                  {deal.valueEstimated != null && (
                    <p className="text-xs font-bold text-brand-600 mt-1">{formatCurrency(deal.valueEstimated)}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
