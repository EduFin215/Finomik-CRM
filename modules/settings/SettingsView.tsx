import React from 'react';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { TOOLS } from '../../config/tools';

const currentTool = TOOLS.find((t) => t.id === 'settings')!;

export default function SettingsView() {
  return (
    <ToolLayout currentTool={currentTool}>
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-brand-600 font-body text-lg">
          Módulo Settings (admin). Próximamente.
        </p>
      </div>
    </ToolLayout>
  );
}
