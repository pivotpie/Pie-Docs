/**
 * PlaceholderTool - Generic placeholder for tools under development
 */

import React from 'react';
import { ToolPageLayout } from './ToolPageLayout';
import type { DocumentToolProps } from './types';

export interface PlaceholderToolProps extends DocumentToolProps {
  toolId: string;
  toolLabel: string;
  toolIcon?: string;
  onBack: () => void;
}

export const PlaceholderTool: React.FC<PlaceholderToolProps> = ({
  document,
  toolId,
  toolLabel,
  toolIcon,
  onBack,
  className = '',
}) => {
  return (
    <ToolPageLayout title={toolLabel} icon={toolIcon} onBack={onBack} className={className}>
      <div className="glass-panel p-6 rounded-lg">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">{toolIcon || '🛠️'}</div>
          <h3 className="text-lg font-medium text-white mb-2">{toolLabel}</h3>
          <p className="text-white/70 mb-6">
            This tool page is under development. Content for {toolLabel} will be added here.
          </p>
          <div className="inline-block bg-indigo-500/10 border border-indigo-500/30 rounded-lg px-4 py-2 text-sm text-white/80">
            Tool ID: <code className="font-mono">{toolId}</code>
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default PlaceholderTool;
