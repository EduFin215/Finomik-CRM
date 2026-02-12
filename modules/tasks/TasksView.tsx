import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { TOOLS } from '../../config/tools';

const currentTool = TOOLS.find((t) => t.id === 'tasks')!;

export default function TasksView() {
  return (
    <ToolLayout currentTool={currentTool}>
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0 flex items-center gap-1 border-b border-brand-200/60 bg-white px-4 py-2">
          <NavLink
            to="/tasks"
            end
            className={({ isActive }) =>
              `rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                isActive ? 'bg-primary text-white' : 'text-brand-600 hover:bg-brand-100/50'
              }`
            }
          >
            My Tasks
          </NavLink>
          <NavLink
            to="/tasks/all"
            className={({ isActive }) =>
              `rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
                isActive ? 'bg-primary text-white' : 'text-brand-600 hover:bg-brand-100/50'
              }`
            }
          >
            All Tasks
          </NavLink>
        </div>
        <div className="flex-1 overflow-hidden min-h-0">
          <Outlet />
        </div>
      </div>
    </ToolLayout>
  );
}
