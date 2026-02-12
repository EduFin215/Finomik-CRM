import React from 'react';
import { ToolLayout } from '../../components/layout/ToolLayout';
import { TOOLS } from '../../config/tools';

const currentTool = TOOLS.find((t) => t.id === 'integrations')!;

export default function IntegrationsView() {
  return (
    <ToolLayout currentTool={currentTool}>
      <div className="flex items-center justify-center h-full p-8">
        <p className="text-brand-600 font-body text-lg">
          Módulo Integrations. Próximamente.
        </p>
      </div>
    </ToolLayout>
  );
}
