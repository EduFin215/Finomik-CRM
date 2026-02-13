import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export interface SidebarNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Optional custom isActive (e.g. for search params). Receives current pathname + search. */
  isActive?: (pathname: string, search: string) => boolean;
}

export interface SidebarNavGroup {
  label: string;
  items: SidebarNavItem[];
}

interface SidebarNavProps {
  variant: 'light' | 'dark';
  items: SidebarNavItem[];
  groups?: SidebarNavGroup[];
  footerItems?: SidebarNavItem[];
  topSlot?: React.ReactNode;
  logoSlot?: React.ReactNode;
  open?: boolean;
  onClose?: () => void;
  onNavigate?: () => void;
  className?: string;
}

function NavItemLink({
  item,
  variant,
  onClick,
}: {
  item: SidebarNavItem;
  variant: 'light' | 'dark';
  onClick?: () => void;
}) {
  const Icon = item.icon;
  const { pathname, search } = useLocation();
  const base =
    'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 font-bold';
  const lightActive = 'bg-primary text-white';
  const lightInactive = 'text-brand-600 hover:bg-brand-100/50';
  const darkActive = 'bg-brand-600 text-white';
  const darkInactive = 'text-brand-200 hover:bg-white/10';

  const resolvedActive =
    item.isActive ? item.isActive(pathname, search) : undefined;

  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      end={item.to.split('?')[0] === pathname && !item.to.includes('?')}
      className={({ isActive }) => {
        const active = resolvedActive !== undefined ? resolvedActive : isActive;
        return `${base} ${variant === 'light' ? (active ? lightActive : lightInactive) : active ? darkActive : darkInactive}`;
      }}
    >
      <Icon size={20} />
      <span>{item.label}</span>
    </NavLink>
  );
}

export function SidebarNav({
  variant,
  items,
  groups = [],
  footerItems = [],
  topSlot,
  logoSlot,
  open = true,
  onClose,
  onNavigate,
  className = '',
}: SidebarNavProps) {
  const isDark = variant === 'dark';
  const asideClass = `
    fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col shrink-0
    transform transition-transform duration-200 ease-out
    ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    ${isDark ? 'bg-primary/95 backdrop-blur-xl text-white border-r-0' : 'bg-white border-r border-brand-200/60 text-primary'}
    ${className}
  `;

  const sectionLabelClass = isDark
    ? 'text-[10px] font-bold uppercase tracking-wider text-brand-200/80 pt-4 pb-2 px-4'
    : 'text-[10px] font-bold uppercase tracking-wider text-brand-400 pt-4 pb-2 px-4';

  const footerBorderClass = isDark ? 'border-t border-brand-600/50' : 'border-t border-brand-200/40';

  const handleNavigate = () => {
    onNavigate?.();
    onClose?.();
  };

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
        />
      )}
      <aside className={asideClass.trim()}>
        {logoSlot && <div className="flex items-center justify-center p-4 lg:justify-center shrink-0">{logoSlot}</div>}
        {topSlot && <div className="px-4 pt-4 mb-4 shrink-0">{topSlot}</div>}
        <nav className={`flex-1 px-4 space-y-1 overflow-y-auto ${!logoSlot && !topSlot ? 'pt-4' : ''}`}>
          {items.map((item) => (
            <NavItemLink key={item.to} item={item} variant={variant} onClick={handleNavigate} />
          ))}
          {groups.map((group) => (
            <div key={group.label}>
              <div className={sectionLabelClass}>{group.label}</div>
              {group.items.map((item) => (
                <NavItemLink key={item.to} item={item} variant={variant} onClick={handleNavigate} />
              ))}
            </div>
          ))}
        </nav>
        {footerItems.length > 0 && (
          <div className={`p-4 shrink-0 ${footerBorderClass}`}>
            {footerItems.map((item) => (
              <NavItemLink key={item.to} item={item} variant={variant} onClick={handleNavigate} />
            ))}
          </div>
        )}
      </aside>
    </>
  );
}
