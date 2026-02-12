import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import type { Tool } from '../../config/tools';

interface ToolSwitcherDropdownProps {
  currentTool: Tool;
  tools: Tool[];
}

export function ToolSwitcherDropdown({
  currentTool,
  tools,
}: ToolSwitcherDropdownProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSelect = (path: string, available: boolean) => {
    if (!available) return;
    navigate(path);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl font-bold text-brand-600 hover:bg-brand-100/50 hover:text-primary transition-colors"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Cambiar de herramienta"
      >
        <span>{currentTool.name}</span>
        <ChevronDown
          size={18}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-[55]"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute left-0 top-full mt-2 w-56 bg-white/95 backdrop-blur-sm rounded-xl border border-brand-200/60 shadow-dropdown z-[60] py-1"
            role="listbox"
          >
            {tools.map((tool) => (
              <button
                key={tool.id}
                type="button"
                role="option"
                onClick={() => handleSelect(tool.path, tool.available)}
                disabled={!tool.available}
                className={`w-full px-4 py-3 text-left text-sm font-bold transition-colors flex items-center justify-between ${
                  tool.id === currentTool.id
                    ? 'bg-brand-100/50 text-primary'
                    : tool.available
                      ? 'text-brand-600 hover:bg-brand-100/50'
                      : 'text-brand-400 cursor-not-allowed'
                }`}
              >
                <span>{tool.name}</span>
                {!tool.available && (
                  <span className="text-xs text-brand-400">Próximamente</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
