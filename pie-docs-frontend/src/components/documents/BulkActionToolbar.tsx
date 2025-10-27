import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface BulkActionToolbarProps {
  selectedCount: number;
  totalCount: number;
  onClearSelection: () => void;
  disabled?: boolean;
}

const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedCount,
  totalCount,
  onClearSelection,
  disabled = false
}) => {
  const { theme } = useTheme();
  const actions = [
    {
      id: 'download',
      label: 'Download',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      onClick: () => console.log('Download selected documents'),
    },
    {
      id: 'move',
      label: 'Move',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      onClick: () => console.log('Move selected documents'),
    },
    {
      id: 'tag',
      label: 'Tag',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      onClick: () => console.log('Tag selected documents'),
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: () => console.log('Delete selected documents'),
      variant: 'danger' as const,
    },
  ];

  return (
    <div className="px-6 py-3 glass-card border-b border-white/10">
      <div className="flex items-center justify-between">
        {/* Selection Info */}
        <div className="flex items-center space-x-4">
          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white/90' : 'text-white/90'}`}>
            {selectedCount} of {totalCount} selected
          </span>
          <button
            onClick={onClearSelection}
            disabled={disabled}
            className={`text-sm ${theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-white/80 hover:text-white'} disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105`}
          >
            Clear selection
          </button>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center space-x-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={action.onClick}
              disabled={disabled}
              className={`
                inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md
                transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/40
                disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105
                ${
                  action.variant === 'danger'
                    ? 'text-red-300 glass hover:bg-red-500/20'
                    : `${theme === 'dark' ? 'text-white/90' : 'text-white/90'} glass hover:bg-white/20`
                }
              `}
              title={action.label}
            >
              {action.icon}
              <span className="ml-1.5">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BulkActionToolbar;