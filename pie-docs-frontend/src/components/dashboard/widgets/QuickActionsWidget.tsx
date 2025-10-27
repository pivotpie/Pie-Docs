import React from 'react';
import { useNavigate } from 'react-router-dom';
import Widget from '../Widget';
import type { WidgetProps } from '../Widget';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color: string;
  disabled?: boolean;
  tooltip?: string;
}

interface QuickActionsWidgetProps extends WidgetProps {
  actions?: QuickAction[];
  columns?: number;
}

const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({
  actions,
  columns = 2,
  ...widgetProps
}) => {
  const navigate = useNavigate();

  const defaultActions = [
    {
      id: 'upload',
      label: 'Upload',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      onClick: () => console.log('Upload clicked'),
      color: 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/30',
      tooltip: 'Upload a new document'
    },
    {
      id: 'search',
      label: 'Search',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      onClick: () => navigate('/search'),
      color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30',
      tooltip: 'Search documents'
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      onClick: () => console.log('Reports clicked'),
      color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30',
      tooltip: 'View reports and analytics'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      onClick: () => console.log('Settings clicked'),
      color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30',
      tooltip: 'System settings'
    }
  ];

  const gridCols = columns === 1 ? 'grid-cols-1' : columns === 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <Widget {...widgetProps}>
      <div className={`grid ${gridCols} gap-3`}>
        {(actions || defaultActions).map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.tooltip}
            className={`
              p-3 rounded-lg transition-colors
              ${action.color}
              ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              disabled:hover:bg-current
            `}
            aria-label={action.tooltip || action.label}
          >
            <div className="text-center">
              <div className="mx-auto mb-1 flex justify-center">
                {action.icon}
              </div>
              <span className="text-xs font-medium">
                {action.label}
              </span>
            </div>
          </button>
        ))}
      </div>

      {(actions || defaultActions).length === 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <p className="text-sm">No quick actions available</p>
        </div>
      )}
    </Widget>
  );
};

export default QuickActionsWidget;