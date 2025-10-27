import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DashboardTemplate,
  DashboardTemplateGridProps
} from '@/types/domain/DashboardBuilder';

const DEFAULT_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'executive-overview',
    name: 'Executive Overview',
    description: 'High-level metrics and KPIs for executives and managers',
    category: 'business',
    thumbnail: '📊',
    layout: {
      name: 'Executive Overview',
      description: 'Executive dashboard template with key metrics',
      isTemplate: true,
      isPublic: true,
      widgets: [
        {
          id: 'kpi-metrics',
          type: 'kpi-cards',
          title: 'Key Performance Indicators',
          position: { x: 0, y: 0, w: 12, h: 3 },
          config: {
            kpis: ['documents-processed', 'user-adoption', 'system-efficiency'],
            showTrends: true,
            showTargets: true,
            timeRange: '30d'
          },
          isVisible: true
        },
        {
          id: 'document-stats',
          type: 'statistics',
          title: 'Document Statistics',
          position: { x: 0, y: 3, w: 6, h: 4 },
          config: {
            showTrends: true,
            refreshInterval: 300000,
            metrics: ['total', 'processing', 'completed']
          },
          isVisible: true
        },
        {
          id: 'system-overview',
          type: 'system-metrics',
          title: 'System Overview',
          position: { x: 6, y: 3, w: 6, h: 4 },
          config: {
            metrics: ['uptime', 'storage', 'users', 'performance'],
            showAlerts: true,
            refreshInterval: 30000
          },
          isVisible: true
        }
      ],
      gridProps: {
        cols: 12,
        rowHeight: 60,
        margin: [16, 16],
        containerPadding: [16, 16]
      },
      tags: ['executive', 'kpi', 'overview'],
      version: 1
    },
    tags: ['executive', 'kpi', 'management', 'overview'],
    popularity: 95,
    isOfficial: true,
    author: 'PIE DOCS Team'
  },
  {
    id: 'personal-workspace',
    name: 'Personal Workspace',
    description: 'Personalized dashboard for individual users with documents and tasks',
    category: 'personal',
    thumbnail: '👤',
    layout: {
      name: 'Personal Workspace',
      description: 'Personal dashboard template for individual productivity',
      isTemplate: true,
      isPublic: true,
      widgets: [
        {
          id: 'personal-documents',
          type: 'document-list',
          title: 'My Documents',
          position: { x: 0, y: 0, w: 6, h: 5 },
          config: {
            view: 'recent',
            showThumbnails: true,
            maxItems: 8,
            sortBy: 'lastModified'
          },
          isVisible: true
        },
        {
          id: 'personal-tasks',
          type: 'task-list',
          title: 'My Tasks',
          position: { x: 6, y: 0, w: 6, h: 5 },
          config: {
            showPriority: true,
            filterStatus: 'all',
            maxItems: 10,
            groupBy: 'status'
          },
          isVisible: true
        },
        {
          id: 'folder-tree',
          type: 'folder-tree',
          title: 'Folder Navigation',
          position: { x: 0, y: 5, w: 4, h: 4 },
          config: {
            maxDepth: 3,
            showDocumentCount: true,
            showSize: false,
            expandedByDefault: true
          },
          isVisible: true
        },
        {
          id: 'quick-actions',
          type: 'action-buttons',
          title: 'Quick Actions',
          position: { x: 4, y: 5, w: 4, h: 2 },
          config: {
            actions: ['upload', 'search', 'reports', 'settings'],
            layout: 'grid',
            showLabels: true
          },
          isVisible: true
        },
        {
          id: 'recent-activity',
          type: 'activity-feed',
          title: 'Recent Activity',
          position: { x: 8, y: 5, w: 4, h: 4 },
          config: {
            maxItems: 8,
            showTimestamps: true,
            filterTypes: ['upload', 'ocr', 'workflow']
          },
          isVisible: true
        }
      ],
      gridProps: {
        cols: 12,
        rowHeight: 60,
        margin: [16, 16],
        containerPadding: [16, 16]
      },
      tags: ['personal', 'productivity', 'workspace'],
      version: 1
    },
    tags: ['personal', 'productivity', 'documents', 'tasks'],
    popularity: 88,
    isOfficial: true,
    author: 'PIE DOCS Team'
  },
  {
    id: 'analytics-center',
    name: 'Analytics Center',
    description: 'Comprehensive analytics and reporting dashboard for data insights',
    category: 'analytics',
    thumbnail: '📈',
    layout: {
      name: 'Analytics Center',
      description: 'Analytics-focused dashboard with charts and metrics',
      isTemplate: true,
      isPublic: true,
      widgets: [
        {
          id: 'kpi-overview',
          type: 'kpi-cards',
          title: 'Performance Overview',
          position: { x: 0, y: 0, w: 12, h: 3 },
          config: {
            kpis: ['documents-processed', 'user-adoption', 'system-efficiency', 'workflow-completion'],
            showTrends: true,
            showTargets: true,
            timeRange: '30d'
          },
          isVisible: true
        },
        {
          id: 'document-trends',
          type: 'trend-chart',
          title: 'Document Processing Trends',
          position: { x: 0, y: 3, w: 8, h: 4 },
          config: {
            chartType: 'line',
            metrics: ['processed', 'uploaded', 'completed'],
            timeRange: '30d',
            aggregation: 'daily'
          },
          isVisible: true
        },
        {
          id: 'user-stats',
          type: 'statistics',
          title: 'User Statistics',
          position: { x: 8, y: 3, w: 4, h: 4 },
          config: {
            showTrends: true,
            metrics: ['active', 'new', 'returning'],
            refreshInterval: 300000
          },
          isVisible: true
        },
        {
          id: 'system-performance',
          type: 'system-metrics',
          title: 'System Performance',
          position: { x: 0, y: 7, w: 6, h: 3 },
          config: {
            metrics: ['uptime', 'memory', 'cpu', 'performance'],
            showAlerts: true,
            refreshInterval: 30000
          },
          isVisible: true
        },
        {
          id: 'activity-feed',
          type: 'activity-feed',
          title: 'System Activity',
          position: { x: 6, y: 7, w: 6, h: 3 },
          config: {
            maxItems: 10,
            showTimestamps: true,
            filterTypes: ['upload', 'ocr', 'workflow', 'search', 'user']
          },
          isVisible: true
        }
      ],
      gridProps: {
        cols: 12,
        rowHeight: 60,
        margin: [16, 16],
        containerPadding: [16, 16]
      },
      tags: ['analytics', 'metrics', 'performance'],
      version: 1
    },
    tags: ['analytics', 'metrics', 'charts', 'performance'],
    popularity: 79,
    isOfficial: true,
    author: 'PIE DOCS Team'
  },
  {
    id: 'monitoring-hub',
    name: 'System Monitoring',
    description: 'Real-time system monitoring and health dashboard',
    category: 'monitoring',
    thumbnail: '📡',
    layout: {
      name: 'System Monitoring',
      description: 'Real-time monitoring dashboard for system health',
      isTemplate: true,
      isPublic: true,
      widgets: [
        {
          id: 'system-health',
          type: 'system-metrics',
          title: 'System Health Overview',
          position: { x: 0, y: 0, w: 12, h: 3 },
          config: {
            metrics: ['uptime', 'cpu', 'memory', 'storage', 'performance'],
            showAlerts: true,
            refreshInterval: 10000
          },
          isVisible: true
        },
        {
          id: 'performance-charts',
          type: 'trend-chart',
          title: 'Performance Metrics',
          position: { x: 0, y: 3, w: 8, h: 4 },
          config: {
            chartType: 'area',
            metrics: ['cpu', 'memory', 'response-time'],
            timeRange: '1h',
            aggregation: 'minute'
          },
          isVisible: true
        },
        {
          id: 'active-users',
          type: 'statistics',
          title: 'Active Sessions',
          position: { x: 8, y: 3, w: 4, h: 2 },
          config: {
            showTrends: true,
            metrics: ['concurrent', 'peak', 'average'],
            refreshInterval: 30000
          },
          isVisible: true
        },
        {
          id: 'alerts',
          type: 'alert-list',
          title: 'System Alerts',
          position: { x: 8, y: 5, w: 4, h: 2 },
          config: {
            maxItems: 5,
            severityFilter: 'all',
            autoRefresh: true
          },
          isVisible: true
        },
        {
          id: 'recent-events',
          type: 'activity-feed',
          title: 'System Events',
          position: { x: 0, y: 7, w: 12, h: 3 },
          config: {
            maxItems: 15,
            showTimestamps: true,
            filterTypes: ['error', 'warning', 'info', 'system']
          },
          isVisible: true
        }
      ],
      gridProps: {
        cols: 12,
        rowHeight: 60,
        margin: [16, 16],
        containerPadding: [16, 16]
      },
      tags: ['monitoring', 'system', 'health', 'alerts'],
      version: 1
    },
    tags: ['monitoring', 'system', 'alerts', 'performance'],
    popularity: 72,
    isOfficial: true,
    author: 'PIE DOCS Team'
  },
  {
    id: 'minimal-starter',
    name: 'Minimal Starter',
    description: 'Simple starter template with basic widgets',
    category: 'custom',
    thumbnail: '✨',
    layout: {
      name: 'Minimal Starter',
      description: 'Clean starter template for custom dashboards',
      isTemplate: true,
      isPublic: true,
      widgets: [
        {
          id: 'welcome-stats',
          type: 'statistics',
          title: 'Quick Stats',
          position: { x: 0, y: 0, w: 6, h: 3 },
          config: {
            showTrends: false,
            metrics: ['total', 'recent'],
            refreshInterval: 300000
          },
          isVisible: true
        },
        {
          id: 'quick-actions',
          type: 'action-buttons',
          title: 'Actions',
          position: { x: 6, y: 0, w: 6, h: 3 },
          config: {
            actions: ['upload', 'search'],
            layout: 'grid',
            showLabels: true
          },
          isVisible: true
        }
      ],
      gridProps: {
        cols: 12,
        rowHeight: 60,
        margin: [16, 16],
        containerPadding: [16, 16]
      },
      tags: ['minimal', 'starter', 'simple'],
      version: 1
    },
    tags: ['minimal', 'starter', 'simple', 'custom'],
    popularity: 45,
    isOfficial: true,
    author: 'PIE DOCS Team'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All Templates', icon: '📋' },
  { id: 'business', label: 'Business', icon: '💼' },
  { id: 'personal', label: 'Personal', icon: '👤' },
  { id: 'analytics', label: 'Analytics', icon: '📊' },
  { id: 'monitoring', label: 'Monitoring', icon: '📡' },
  { id: 'custom', label: 'Custom', icon: '🎨' }
];

const DashboardTemplateGrid: React.FC<DashboardTemplateGridProps> = ({
  templates = DEFAULT_TEMPLATES,
  onTemplateSelect,
  selectedTemplate,
  showCategories = true
}) => {
  const { t } = useTranslation('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(term) ||
        template.description.toLowerCase().includes(term) ||
        template.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Sort by popularity
    return filtered.sort((a, b) => b.popularity - a.popularity);
  }, [templates, selectedCategory, searchTerm]);

  const handleTemplateClick = (template: DashboardTemplate) => {
    onTemplateSelect(template);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard Templates
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Choose a template to get started quickly
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <svg className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories */}
      {showCategories && (
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="mr-2">{category.icon}</span>
              {category.label}
            </button>
          ))}
        </div>
      )}

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No templates found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or category filter
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => handleTemplateClick(template)}
              className={`relative bg-white dark:bg-gray-800 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg group ${
                selectedTemplate === template.id
                  ? 'border-primary-300 dark:border-primary-600 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {/* Template Preview */}
              <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-t-lg flex items-center justify-center relative overflow-hidden">
                <div className="text-6xl opacity-50">
                  {template.thumbnail}
                </div>

                {/* Popularity Badge */}
                <div className="absolute top-3 right-3">
                  <div className="flex items-center space-x-1 bg-white dark:bg-gray-800 rounded-full px-2 py-1 text-xs font-medium">
                    <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-gray-700 dark:text-gray-300">
                      {template.popularity}
                    </span>
                  </div>
                </div>

                {/* Official Badge */}
                {template.isOfficial && (
                  <div className="absolute top-3 left-3">
                    <div className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full px-2 py-1 text-xs font-medium">
                      Official
                    </div>
                  </div>
                )}
              </div>

              {/* Template Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="capitalize">{template.category}</span>
                    <span>•</span>
                    <span>{template.layout.widgets.length} widgets</span>
                  </div>
                  {template.author && (
                    <span>by {template.author}</span>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mb-4">
                  {template.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md"
                    >
                      {tag}
                    </span>
                  ))}
                  {template.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-md">
                      +{template.tags.length - 3}
                    </span>
                  )}
                </div>

                {/* Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTemplateClick(template);
                  }}
                  className="w-full py-2 px-4 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Use This Template
                </button>
              </div>

              {/* Selection Indicator */}
              {selectedTemplate === template.id && (
                <div className="absolute inset-0 bg-primary-500/10 dark:bg-primary-400/10 rounded-lg pointer-events-none">
                  <div className="absolute top-4 right-4">
                    <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardTemplateGrid;