import React from 'react';
import type { ViewMode } from '@/types/domain/Document';

interface ViewModeToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  disabled?: boolean;
}

const ViewModeToggle: React.FC<ViewModeToggleProps> = ({
  currentMode,
  onModeChange,
  disabled = false
}) => {
  const modes = [
    {
      id: 'grid' as ViewMode,
      label: 'Grid View',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      ),
    },
    {
      id: 'list' as ViewMode,
      label: 'List View',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
      ),
    },
    {
      id: 'tree' as ViewMode,
      label: 'Tree View',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 21l4-4 4 4"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 17V3"
          />
        </svg>
      ),
    },
  ];

  return (
    <div
      className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
      role="group"
      aria-label="View mode toggle"
    >
      {modes.map((mode, index) => (
        <button
          key={mode.id}
          type="button"
          onClick={() => onModeChange(mode.id)}
          disabled={disabled}
          className={`
            inline-flex items-center px-3 py-2 text-sm font-medium transition-colors
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            ${index === 0 ? 'rounded-l-lg' : ''}
            ${index === modes.length - 1 ? 'rounded-r-lg' : ''}
            ${!disabled ? 'hover:bg-gray-50 dark:hover:bg-gray-700' : 'cursor-not-allowed opacity-50'}
            ${
              currentMode === mode.id
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }
          `}
          aria-pressed={currentMode === mode.id}
          aria-label={mode.label}
          title={mode.label}
        >
          {mode.icon}
          <span className="sr-only">{mode.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ViewModeToggle;