import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface ActionableListItem {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

interface ActionableListProps {
  title: string;
  items: ActionableListItem[];
  emptyMessage?: string;
}

export function ActionableList({ title, items, emptyMessage = 'Ninguno' }: ActionableListProps) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-brand-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-wide text-brand-600 mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-brand-400">{emptyMessage}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => navigate(item.href)}
                className="flex w-full items-center justify-between gap-2 rounded-lg py-2 px-2 -mx-2 text-left text-sm text-primary hover:bg-brand-50 transition-colors group"
              >
                <span className="font-medium truncate">{item.title}</span>
                {item.subtitle && <span className="text-brand-500 text-xs truncate">{item.subtitle}</span>}
                <ChevronRight size={16} className="text-brand-400 shrink-0 group-hover:text-primary" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
