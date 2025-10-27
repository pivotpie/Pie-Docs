import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import Widget from '../Widget';
import type { WidgetProps } from '../Widget';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'review' | 'completed';
  dueDate?: Date;
  assignedBy?: string;
  documentId?: string;
  workflowId?: string;
  type: 'approval' | 'review' | 'upload' | 'workflow' | 'other';
}

interface PersonalTasksWidgetProps extends WidgetProps {
  tasks?: Task[];
  maxItems?: number;
  onTaskClick?: (task: Task) => void;
  onTaskStatusChange?: (taskId: string, status: Task['status']) => void;
}

const PersonalTasksWidget: React.FC<PersonalTasksWidgetProps> = ({
  tasks = generateMockTasks(),
  maxItems = 5,
  onTaskClick,
  onTaskStatusChange,
  ...widgetProps
}) => {
  const { t } = useTranslation('dashboard');
  const { theme } = useTheme();
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'overdue'>('all');

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'review':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
    }
  };

  const getTaskIcon = (type: Task['type']) => {
    const iconClasses = "w-5 h-5";

    switch (type) {
      case 'approval':
        return (
          <svg className={`${iconClasses} text-orange-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'review':
        return (
          <svg className={`${iconClasses} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        );
      case 'upload':
        return (
          <svg className={`${iconClasses} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
      case 'workflow':
        return (
          <svg className={`${iconClasses} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      default:
        return (
          <svg className={`${iconClasses} text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
    }
  };

  const isOverdue = (task: Task) => {
    return task.dueDate && task.dueDate < new Date() && task.status !== 'completed';
  };

  const formatDueDate = (date: Date) => {
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
    if (diffDays <= 7) return `${diffDays} days`;
    return date.toLocaleDateString();
  };

  const filteredTasks = tasks
    .filter(task => {
      switch (filter) {
        case 'pending':
          return task.status === 'pending';
        case 'in_progress':
          return task.status === 'in_progress';
        case 'overdue':
          return isOverdue(task);
        default:
          return task.status !== 'completed';
      }
    })
    .slice(0, maxItems);

  const taskCounts = {
    all: tasks.filter(t => t.status !== 'completed').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => isOverdue(t)).length,
  };

  return (
    <Widget {...widgetProps}>
      <div className="space-y-4">
        {/* Filter Tabs */}
        <div className="flex space-x-1 glass-panel p-1 rounded-lg">
          {[
            { key: 'all', label: 'All', count: taskCounts.all },
            { key: 'pending', label: 'Pending', count: taskCounts.pending },
            { key: 'in_progress', label: 'Active', count: taskCounts.in_progress },
            { key: 'overdue', label: 'Overdue', count: taskCounts.overdue },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-300 ${
                filter === tab.key
                  ? 'glass-strong text-white shadow-sm scale-105'
                  : 'text-white/70 hover:text-white hover:scale-105'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`inline-flex items-center justify-center px-1.5 py-0.5 text-xs rounded-full ${
                    tab.key === 'overdue' ? 'bg-red-500 text-white' : 'bg-gray-500 text-white'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-white/60' : 'text-white/70'}`}>
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">No tasks to show</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`group p-3 rounded-lg glass-panel cursor-pointer transition-all duration-300 ${
                  isOverdue(task)
                    ? 'border-red-400/50 bg-red-500/20'
                    : 'hover:scale-105'
                }`}
                onClick={() => onTaskClick?.(task)}
              >
                <div className="flex items-start space-x-3">
                  {/* Task Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getTaskIcon(task.type)}
                  </div>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={`text-sm font-medium truncate ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                        {task.title}
                      </h4>
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>

                    {task.description && (
                      <p className={`text-sm line-clamp-2 mb-2 ${theme === 'dark' ? 'text-white/70' : 'text-white/80'}`}>
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className={`flex items-center space-x-4 text-xs ${theme === 'dark' ? 'text-white/60' : 'text-white/70'}`}>
                        {task.assignedBy && (
                          <span>From: {task.assignedBy}</span>
                        )}
                        {task.dueDate && (
                          <span className={isOverdue(task) ? 'text-red-600 font-medium' : ''}>
                            Due: {formatDueDate(task.dueDate)}
                          </span>
                        )}
                      </div>

                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {task.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskStatusChange?.(task.id, 'in_progress');
                        }}
                        className="p-1 text-green-400 hover:text-green-300 hover:scale-110 transition-all duration-300"
                        title="Start task"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                    )}
                    {(task.status === 'in_progress' || task.status === 'review') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTaskStatusChange?.(task.id, 'completed');
                        }}
                        className="p-1 text-green-400 hover:text-green-300 hover:scale-110 transition-all duration-300"
                        title="Complete task"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* View All Link */}
        <div className="text-center pt-2 border-t border-white/20">
          <button className="text-sm text-primary-300 hover:text-primary-200 hover:scale-105 font-medium transition-all duration-300">
            View All Tasks
          </button>
        </div>
      </div>
    </Widget>
  );
};

// Mock data generator
function generateMockTasks(): Task[] {
  return [
    {
      id: '1',
      title: 'Review Q4 Financial Report',
      description: 'Review and approve the quarterly financial report before submission to board.',
      priority: 'high',
      status: 'pending',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24), // Tomorrow
      assignedBy: 'Sarah Chen',
      type: 'approval',
      documentId: 'doc-123',
    },
    {
      id: '2',
      title: 'Upload Employee Contracts',
      description: 'Upload and categorize new employee contracts for HR processing.',
      priority: 'medium',
      status: 'in_progress',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days
      assignedBy: 'Mike Johnson',
      type: 'upload',
    },
    {
      id: '3',
      title: 'Approve Marketing Campaign',
      priority: 'high',
      status: 'pending',
      dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24), // Yesterday (overdue)
      assignedBy: 'Emily Rodriguez',
      type: 'approval',
      workflowId: 'wf-456',
    },
    {
      id: '4',
      title: 'Review Technical Documentation',
      description: 'Technical review of API documentation updates.',
      priority: 'low',
      status: 'review',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 1 week
      assignedBy: 'David Park',
      type: 'review',
    },
    {
      id: '5',
      title: 'Process Invoice Workflow',
      priority: 'medium',
      status: 'in_progress',
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2), // 2 days
      assignedBy: 'Lisa Wang',
      type: 'workflow',
    },
  ];
}

export default PersonalTasksWidget;