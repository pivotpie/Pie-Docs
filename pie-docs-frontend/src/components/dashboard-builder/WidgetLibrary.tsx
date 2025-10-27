import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { WidgetTemplate, WidgetLibraryProps } from '@/types/domain/DashboardBuilder';

const DEFAULT_WIDGET_TEMPLATES: WidgetTemplate[] = [
  {
    id: 'document-statistics',
    name: 'Document Statistics',
    description: 'Overview of document counts, processing status, and completion metrics',
    type: 'statistics',
    category: 'analytics',
    icon: '📊',
    defaultSize: 'medium',
    defaultConfig: {
      showTrends: true,
      refreshInterval: 300000,
      metrics: ['total', 'processing', 'completed']
    },
    configSchema: {
      type: 'object',
      properties: {
        showTrends: {
          type: 'boolean',
          title: 'Show Trends',
          description: 'Display trend indicators for metrics',
          default: true
        },
        refreshInterval: {
          type: 'number',
          title: 'Refresh Interval (ms)',
          description: 'How often to refresh data',
          default: 300000,
          minimum: 30000,
          maximum: 3600000
        },
        metrics: {
          type: 'multiselect',
          title: 'Metrics to Display',
          description: 'Select which metrics to show',
          options: [
            { value: 'total', label: 'Total Documents' },
            { value: 'processing', label: 'Processing' },
            { value: 'completed', label: 'Completed' },
            { value: 'pending', label: 'Pending' },
            { value: 'error', label: 'Errors' }
          ],
          default: ['total', 'processing', 'completed']
        }
      },
      required: ['metrics']
    },
    isCustom: false
  },
  {
    id: 'recent-activity',
    name: 'Recent Activity',
    description: 'Timeline of recent document uploads, processing, and system events',
    type: 'activity-feed',
    category: 'monitoring',
    icon: '🔄',
    defaultSize: 'large',
    defaultConfig: {
      maxItems: 10,
      showTimestamps: true,
      filterTypes: ['upload', 'ocr', 'workflow', 'search']
    },
    configSchema: {
      type: 'object',
      properties: {
        maxItems: {
          type: 'number',
          title: 'Maximum Items',
          description: 'Number of activities to display',
          default: 10,
          minimum: 5,
          maximum: 50
        },
        showTimestamps: {
          type: 'boolean',
          title: 'Show Timestamps',
          description: 'Display when activities occurred',
          default: true
        },
        filterTypes: {
          type: 'multiselect',
          title: 'Activity Types',
          description: 'Types of activities to show',
          options: [
            { value: 'upload', label: 'Document Uploads' },
            { value: 'ocr', label: 'OCR Processing' },
            { value: 'workflow', label: 'Workflow Events' },
            { value: 'search', label: 'Search Updates' },
            { value: 'user', label: 'User Actions' }
          ],
          default: ['upload', 'ocr', 'workflow', 'search']
        }
      }
    },
    isCustom: false
  },
  {
    id: 'personal-documents',
    name: 'My Documents',
    description: 'Quick access to your recent, bookmarked, and shared documents',
    type: 'document-list',
    category: 'personal',
    icon: '📁',
    defaultSize: 'large',
    defaultConfig: {
      view: 'recent',
      showThumbnails: true,
      maxItems: 8,
      sortBy: 'lastModified'
    },
    configSchema: {
      type: 'object',
      properties: {
        view: {
          type: 'select',
          title: 'Default View',
          description: 'Which document view to show by default',
          options: [
            { value: 'recent', label: 'Recent Documents' },
            { value: 'bookmarked', label: 'Bookmarked' },
            { value: 'shared', label: 'Shared with Me' }
          ],
          default: 'recent'
        },
        showThumbnails: {
          type: 'boolean',
          title: 'Show Thumbnails',
          description: 'Display document preview thumbnails',
          default: true
        },
        maxItems: {
          type: 'number',
          title: 'Maximum Items',
          description: 'Number of documents to display',
          default: 8,
          minimum: 4,
          maximum: 20
        },
        sortBy: {
          type: 'select',
          title: 'Sort By',
          description: 'How to sort documents',
          options: [
            { value: 'lastModified', label: 'Last Modified' },
            { value: 'name', label: 'Name' },
            { value: 'size', label: 'Size' },
            { value: 'type', label: 'Type' }
          ],
          default: 'lastModified'
        }
      }
    },
    isCustom: false
  },
  {
    id: 'personal-tasks',
    name: 'My Tasks',
    description: 'Track your pending tasks, assignments, and workflow approvals',
    type: 'task-list',
    category: 'personal',
    icon: '✅',
    defaultSize: 'medium',
    defaultConfig: {
      showPriority: true,
      filterStatus: 'all',
      maxItems: 10,
      groupBy: 'status'
    },
    configSchema: {
      type: 'object',
      properties: {
        showPriority: {
          type: 'boolean',
          title: 'Show Priority',
          description: 'Display task priority indicators',
          default: true
        },
        filterStatus: {
          type: 'select',
          title: 'Filter by Status',
          description: 'Which tasks to show',
          options: [
            { value: 'all', label: 'All Tasks' },
            { value: 'pending', label: 'Pending Only' },
            { value: 'in-progress', label: 'In Progress' },
            { value: 'overdue', label: 'Overdue' }
          ],
          default: 'all'
        },
        maxItems: {
          type: 'number',
          title: 'Maximum Items',
          description: 'Number of tasks to display',
          default: 10,
          minimum: 5,
          maximum: 25
        },
        groupBy: {
          type: 'select',
          title: 'Group By',
          description: 'How to group tasks',
          options: [
            { value: 'status', label: 'Status' },
            { value: 'priority', label: 'Priority' },
            { value: 'dueDate', label: 'Due Date' },
            { value: 'project', label: 'Project' }
          ],
          default: 'status'
        }
      }
    },
    isCustom: false
  },
  {
    id: 'folder-tree',
    name: 'Folder Navigation',
    description: 'Hierarchical folder browser with search and quick access features',
    type: 'folder-tree',
    category: 'navigation',
    icon: '🗂️',
    defaultSize: 'medium',
    defaultConfig: {
      maxDepth: 3,
      showDocumentCount: true,
      showSize: false,
      expandedByDefault: true
    },
    configSchema: {
      type: 'object',
      properties: {
        maxDepth: {
          type: 'number',
          title: 'Maximum Depth',
          description: 'How many folder levels to show',
          default: 3,
          minimum: 1,
          maximum: 10
        },
        showDocumentCount: {
          type: 'boolean',
          title: 'Show Document Count',
          description: 'Display number of documents in each folder',
          default: true
        },
        showSize: {
          type: 'boolean',
          title: 'Show Folder Size',
          description: 'Display total size of folders',
          default: false
        },
        expandedByDefault: {
          type: 'boolean',
          title: 'Expanded by Default',
          description: 'Show folders expanded when widget loads',
          default: true
        }
      }
    },
    isCustom: false
  },
  {
    id: 'system-overview',
    name: 'System Overview',
    description: 'High-level system metrics including uptime, storage, and performance',
    type: 'system-metrics',
    category: 'monitoring',
    icon: '⚡',
    defaultSize: 'wide',
    defaultConfig: {
      metrics: ['uptime', 'storage', 'users', 'performance'],
      showAlerts: true,
      refreshInterval: 30000
    },
    configSchema: {
      type: 'object',
      properties: {
        metrics: {
          type: 'multiselect',
          title: 'Metrics to Display',
          description: 'Select which system metrics to show',
          options: [
            { value: 'uptime', label: 'System Uptime' },
            { value: 'storage', label: 'Storage Usage' },
            { value: 'users', label: 'Active Users' },
            { value: 'performance', label: 'Response Time' },
            { value: 'memory', label: 'Memory Usage' },
            { value: 'cpu', label: 'CPU Usage' }
          ],
          default: ['uptime', 'storage', 'users', 'performance']
        },
        showAlerts: {
          type: 'boolean',
          title: 'Show Alerts',
          description: 'Display system alert indicators',
          default: true
        },
        refreshInterval: {
          type: 'number',
          title: 'Refresh Interval (ms)',
          description: 'How often to refresh system data',
          default: 30000,
          minimum: 10000,
          maximum: 300000
        }
      }
    },
    isCustom: false
  },
  {
    id: 'quick-actions',
    name: 'Quick Actions',
    description: 'Fast access buttons for common operations like upload, search, and settings',
    type: 'action-buttons',
    category: 'utilities',
    icon: '⚡',
    defaultSize: 'small',
    defaultConfig: {
      actions: ['upload', 'search', 'reports', 'settings'],
      layout: 'grid',
      showLabels: true
    },
    configSchema: {
      type: 'object',
      properties: {
        actions: {
          type: 'multiselect',
          title: 'Available Actions',
          description: 'Select which actions to include',
          options: [
            { value: 'upload', label: 'Upload Document' },
            { value: 'search', label: 'Search' },
            { value: 'reports', label: 'Reports' },
            { value: 'settings', label: 'Settings' },
            { value: 'export', label: 'Export' },
            { value: 'import', label: 'Import' },
            { value: 'backup', label: 'Backup' }
          ],
          default: ['upload', 'search', 'reports', 'settings']
        },
        layout: {
          type: 'select',
          title: 'Layout',
          description: 'How to arrange the action buttons',
          options: [
            { value: 'grid', label: 'Grid Layout' },
            { value: 'list', label: 'List Layout' },
            { value: 'horizontal', label: 'Horizontal Row' }
          ],
          default: 'grid'
        },
        showLabels: {
          type: 'boolean',
          title: 'Show Labels',
          description: 'Display text labels on buttons',
          default: true
        }
      }
    },
    isCustom: false
  },
  {
    id: 'kpi-metrics',
    name: 'KPI Metrics',
    description: 'Key performance indicators with trend analysis and targets',
    type: 'kpi-cards',
    category: 'analytics',
    icon: '📈',
    defaultSize: 'wide',
    defaultConfig: {
      kpis: ['documents-processed', 'user-adoption', 'system-efficiency'],
      showTrends: true,
      showTargets: true,
      timeRange: '30d'
    },
    configSchema: {
      type: 'object',
      properties: {
        kpis: {
          type: 'multiselect',
          title: 'KPIs to Display',
          description: 'Select which KPIs to show',
          options: [
            { value: 'documents-processed', label: 'Documents Processed' },
            { value: 'user-adoption', label: 'User Adoption' },
            { value: 'system-efficiency', label: 'System Efficiency' },
            { value: 'storage-optimization', label: 'Storage Optimization' },
            { value: 'workflow-completion', label: 'Workflow Completion' }
          ],
          default: ['documents-processed', 'user-adoption', 'system-efficiency']
        },
        showTrends: {
          type: 'boolean',
          title: 'Show Trends',
          description: 'Display trend indicators',
          default: true
        },
        showTargets: {
          type: 'boolean',
          title: 'Show Targets',
          description: 'Display target values and progress',
          default: true
        },
        timeRange: {
          type: 'select',
          title: 'Time Range',
          description: 'Period for KPI calculation',
          options: [
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
            { value: '90d', label: 'Last 3 Months' },
            { value: '1y', label: 'Last Year' }
          ],
          default: '30d'
        }
      }
    },
    isCustom: false
  }
];

const WIDGET_CATEGORIES = [
  { id: 'all', label: 'All Widgets', icon: '🔧' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'personal', label: 'Personal', icon: '👤' },
  { id: 'monitoring', label: 'Monitoring', icon: '📡' },
  { id: 'navigation', label: 'Navigation', icon: '🧭' },
  { id: 'utilities', label: 'Utilities', icon: '⚙️' },
  { id: 'custom', label: 'Custom', icon: '🎨' }
];

const WidgetLibrary: React.FC<WidgetLibraryProps> = ({
  widgets = DEFAULT_WIDGET_TEMPLATES,
  onWidgetDrag,
  onWidgetSelect,
  selectedCategory = 'all',
  onCategoryChange
}) => {
  const { t } = useTranslation('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);

  const filteredWidgets = useMemo(() => {
    let filtered = widgets;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(widget => widget.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(widget =>
        widget.name.toLowerCase().includes(term) ||
        widget.description.toLowerCase().includes(term) ||
        widget.type.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [widgets, selectedCategory, searchTerm]);

  const handleWidgetDragStart = (widget: WidgetTemplate) => {
    onWidgetDrag?.(widget);
  };

  const handleWidgetClick = (widget: WidgetTemplate) => {
    setSelectedWidget(widget.id);
    onWidgetSelect?.(widget);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Widget Library
        </h3>

        {/* Search */}
        <div className="relative mb-4">
          <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search widgets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Categories */}
        <div className="grid grid-cols-2 gap-1">
          {WIDGET_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => onCategoryChange?.(category.id)}
              className={`px-3 py-2 text-xs rounded-md transition-colors text-left ${
                selectedCategory === category.id
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="mr-1">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Widget List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredWidgets.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-sm">No widgets found</p>
          </div>
        ) : (
          filteredWidgets.map((widget) => (
            <div
              key={widget.id}
              draggable
              onDragStart={() => handleWidgetDragStart(widget)}
              onClick={() => handleWidgetClick(widget)}
              className={`p-3 border rounded-lg cursor-move transition-all hover:shadow-md ${
                selectedWidget === widget.id
                  ? 'border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              {/* Widget Header */}
              <div className="flex items-start space-x-3 mb-2">
                <div className="text-2xl flex-shrink-0">
                  {widget.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {widget.name}
                    </h4>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      widget.isCustom
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    }`}>
                      {widget.isCustom ? 'Custom' : 'Built-in'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {widget.description}
                  </p>
                </div>
              </div>

              {/* Widget Details */}
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-3">
                  <span className="capitalize">{widget.defaultSize}</span>
                  <span className="capitalize">{widget.category}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span>Drag to add</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <button className="w-full px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          Create Custom Widget
        </button>
      </div>
    </div>
  );
};

export default WidgetLibrary;