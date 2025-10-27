/**
 * WorkflowsTool - Document Workflows
 */

import React from 'react';
import { ToolPageLayout } from './ToolPageLayout';
import type { DocumentToolProps } from './types';

export const WorkflowsTool: React.FC<DocumentToolProps & { onBack: () => void }> = ({
  document,
  onBack,
  className = '',
}) => {
  const workflowSteps = [
    { id: 1, name: 'Initial Review', status: 'completed', icon: '✓' },
    { id: 2, name: 'Legal Approval', status: 'current', icon: '→' },
    { id: 3, name: 'Final Approval', status: 'pending', icon: '○' },
  ];

  return (
    <ToolPageLayout title="Document Workflows" icon="⚙️" onBack={onBack} className={className}>
      <div className="glass-panel p-6 rounded-lg space-y-4">
        <div>
          <label className="text-sm text-white/80 mb-2 block">Active Workflow</label>
          <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
            <div className="text-white font-medium mb-2">Legal Review Process</div>
            <div className="space-y-2">
              {workflowSteps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 text-sm ${
                    step.status === 'completed'
                      ? 'text-white/70'
                      : step.status === 'current'
                      ? 'text-white'
                      : 'text-white/50'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      step.status === 'completed'
                        ? 'bg-green-500/30 text-green-300'
                        : step.status === 'current'
                        ? 'bg-blue-500/30 text-blue-300'
                        : 'bg-white/10'
                    }`}
                  >
                    {step.icon}
                  </span>
                  {step.name}
                  {step.status === 'current' && <span className="text-xs">(Current)</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-white/10">
          <h4 className="text-sm font-medium text-white/80 mb-3">Available Workflows</h4>
          <select className="w-full bg-white/5 border border-white/20 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-400">
            <option value="">Select a workflow...</option>
            <option>Legal Review Process</option>
            <option>Financial Approval</option>
            <option>Quick Review</option>
            <option>Standard Approval</option>
          </select>
        </div>

        <button className="btn-glass px-4 py-2 w-full mt-4 hover:bg-indigo-500/20">
          Assign to Different Workflow
        </button>
      </div>
    </ToolPageLayout>
  );
};

export default WorkflowsTool;
