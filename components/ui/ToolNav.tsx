import React from 'react';
import { NavLink } from 'react-router-dom';

export interface ToolNavItem {
  to: string;
  label: string;
  end?: boolean;
}

interface ToolNavProps {
  items: ToolNavItem[];
  className?: string;
}

export function ToolNav({ items, className = '' }: ToolNavProps) {
  return (
    <nav
      className={`flex items-center gap-1 border-b border-brand-200 bg-white px-4 py-2 ${className}`}
      aria-label="Tool navigation"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end ?? false}
          className={({ isActive }) =>
            `rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
              isActive
                ? 'bg-primary text-white'
                : 'text-brand-600 hover:bg-brand-100/50'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
