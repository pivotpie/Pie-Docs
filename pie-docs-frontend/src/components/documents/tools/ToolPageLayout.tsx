/**
 * ToolPageLayout - Common layout for document tool pages
 */

import React from 'react';
import type { ToolPageLayoutProps } from './types';

export const ToolPageLayout: React.FC<ToolPageLayoutProps> = ({
  title,
  icon,
  children,
  onBack,
  className = '',
}) => {
  return (
    <div className={`max-w-4xl ${className}`}>
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="px-3 py-1.5 bg-white/5 rounded text-sm text-white/70 hover:bg-white/10 hover:text-white transition-all"
        >
          ← Back
        </button>
        <div className="flex items-center gap-2">
          {icon && <span className="text-2xl">{icon}</span>}
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
      </div>

      {/* Tool content */}
      {children}
    </div>
  );
};

export default ToolPageLayout;
