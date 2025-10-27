import { registerWidget } from '../WidgetRegistry';
import { WidgetConfig } from '../Widget';

// Import all widget components
import StatisticsWidget from './StatisticsWidget';
import RecentActivityWidget from './RecentActivityWidget';
import QuickActionsWidget from './QuickActionsWidget';
import AdvancedAnalyticsWidget from './AdvancedAnalyticsWidget';
import DocumentInsightsWidget from './DocumentInsightsWidget';
import PerformanceMonitorWidget from './PerformanceMonitorWidget';
import WorkflowStatusWidget from './WorkflowStatusWidget';
import UserActivityHeatmapWidget from './UserActivityHeatmapWidget';
import NotificationCenterWidget from './NotificationCenterWidget';

// Export all widgets
export {
  StatisticsWidget,
  RecentActivityWidget,
  QuickActionsWidget,
  AdvancedAnalyticsWidget,
  DocumentInsightsWidget,
  PerformanceMonitorWidget,
  WorkflowStatusWidget,
  UserActivityHeatmapWidget,
  NotificationCenterWidget
};

// Widget configurations for registration
export const statisticsWidgetConfig: WidgetConfig = {
  id: 'statistics',
  title: 'Document Statistics',
  component: StatisticsWidget,
  defaultSize: 'medium',
  category: 'analytics',
  description: 'Display key document processing statistics and metrics',
  permissions: ['dashboard.view', 'analytics.view']
};

export const recentActivityWidgetConfig: WidgetConfig = {
  id: 'recent-activity',
  title: 'Recent Activity',
  component: RecentActivityWidget,
  defaultSize: 'medium',
  category: 'activity',
  description: 'Show recent system activity and user actions',
  permissions: ['dashboard.view', 'activity.view']
};

export const quickActionsWidgetConfig: WidgetConfig = {
  id: 'quick-actions',
  title: 'Quick Actions',
  component: QuickActionsWidget,
  defaultSize: 'small',
  category: 'actions',
  description: 'Frequently used actions and shortcuts',
  permissions: ['dashboard.view']
};

// Enhanced widget configurations
export const advancedAnalyticsWidgetConfig: WidgetConfig = {
  id: 'advanced-analytics',
  title: 'Advanced Analytics',
  component: AdvancedAnalyticsWidget,
  defaultSize: 'large',
  category: 'analytics',
  description: 'Interactive charts and metrics with time-based analysis',
  permissions: ['dashboard.view', 'analytics.advanced']
};

export const documentInsightsWidgetConfig: WidgetConfig = {
  id: 'document-insights',
  title: 'Document Insights',
  component: DocumentInsightsWidget,
  defaultSize: 'large',
  category: 'analytics',
  description: 'AI-powered document processing insights and recommendations',
  permissions: ['dashboard.view', 'documents.insights']
};

export const performanceMonitorWidgetConfig: WidgetConfig = {
  id: 'performance-monitor',
  title: 'Performance Monitor',
  component: PerformanceMonitorWidget,
  defaultSize: 'medium',
  category: 'system',
  description: 'Real-time system performance metrics and health monitoring',
  permissions: ['dashboard.view', 'system.monitor']
};

export const workflowStatusWidgetConfig: WidgetConfig = {
  id: 'workflow-status',
  title: 'Workflow Status',
  component: WorkflowStatusWidget,
  defaultSize: 'medium',
  category: 'workflow',
  description: 'Interactive workflow progress tracking and management',
  permissions: ['dashboard.view', 'workflows.view']
};

export const userActivityHeatmapWidgetConfig: WidgetConfig = {
  id: 'user-activity-heatmap',
  title: 'User Activity Heatmap',
  component: UserActivityHeatmapWidget,
  defaultSize: 'large',
  category: 'analytics',
  description: 'Visual representation of user activity patterns and trends',
  permissions: ['dashboard.view', 'analytics.users']
};

export const notificationCenterWidgetConfig: WidgetConfig = {
  id: 'notification-center',
  title: 'Notification Center',
  component: NotificationCenterWidget,
  defaultSize: 'medium',
  category: 'communication',
  description: 'Real-time notifications and alerts management',
  permissions: ['dashboard.view']
};

// Auto-register all widgets
export const registerDefaultWidgets = (): void => {
  registerWidget(statisticsWidgetConfig);
  registerWidget(recentActivityWidgetConfig);
  registerWidget(quickActionsWidgetConfig);
  registerWidget(advancedAnalyticsWidgetConfig);
  registerWidget(documentInsightsWidgetConfig);
  registerWidget(performanceMonitorWidgetConfig);
  registerWidget(workflowStatusWidgetConfig);
  registerWidget(userActivityHeatmapWidgetConfig);
  registerWidget(notificationCenterWidgetConfig);
};

// Default widget configurations
export const defaultWidgetConfigs = [
  statisticsWidgetConfig,
  recentActivityWidgetConfig,
  quickActionsWidgetConfig,
  advancedAnalyticsWidgetConfig,
  documentInsightsWidgetConfig,
  performanceMonitorWidgetConfig,
  workflowStatusWidgetConfig,
  userActivityHeatmapWidgetConfig,
  notificationCenterWidgetConfig
];

// Widget categories
export const WIDGET_CATEGORIES = {
  ANALYTICS: 'analytics',
  ACTIVITY: 'activity',
  ACTIONS: 'actions',
  SYSTEM: 'system',
  WORKFLOW: 'workflow',
  COMMUNICATION: 'communication',
  CUSTOM: 'custom'
} as const;