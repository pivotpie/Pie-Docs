import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardDataProvider, useDashboardData } from '@/contexts/DashboardDataContext';

// Import widget containers and components
import WidgetContainer from '@/components/dashboard/WidgetContainer';

// Import all enhanced widgets
import AdvancedAnalyticsWidget from '@/components/dashboard/widgets/AdvancedAnalyticsWidget';
import DocumentInsightsWidget from '@/components/dashboard/widgets/DocumentInsightsWidget';
import PerformanceMonitorWidget from '@/components/dashboard/widgets/PerformanceMonitorWidget';
import WorkflowStatusWidget from '@/components/dashboard/widgets/WorkflowStatusWidget';
import UserActivityHeatmapWidget from '@/components/dashboard/widgets/UserActivityHeatmapWidget';
import NotificationCenterWidget from '@/components/dashboard/widgets/NotificationCenterWidget';

// Import existing widgets
import PersonalDocumentsWidget from '@/components/dashboard/widgets/PersonalDocumentsWidget';
import PersonalTasksWidget from '@/components/dashboard/widgets/PersonalTasksWidget';
import FolderTreeWidget from '@/components/dashboard/widgets/FolderTreeWidget';
import StatisticsWidget from '@/components/dashboard/widgets/StatisticsWidget';
import RecentActivityWidget from '@/components/dashboard/widgets/RecentActivityWidget';
import QuickActionsWidget from '@/components/dashboard/widgets/QuickActionsWidget';

interface DashboardLayout {
  widgets: Array<{
    id: string;
    component: string;
    position: { x: number; y: number };
    size: 'small' | 'medium' | 'large' | 'wide';
    isVisible: boolean;
  }>;
}


const EnhancedDashboardContent: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const { theme } = useTheme();
  const { data: dashboardData, isLoading: dataLoading, refreshData } = useDashboardData();

  const [layout, setLayout] = useState<DashboardLayout | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize dashboard data
  useEffect(() => {
    const initializeDashboard = async () => {
      // Mock API calls to load dashboard configuration and stats
      await new Promise(resolve => setTimeout(resolve, 1500));

      const defaultLayout: DashboardLayout = {
        widgets: [
          { id: 'stats-overview', component: 'StatisticsOverview', position: { x: 0, y: 0 }, size: 'wide', isVisible: true },
          // Quick Actions - Row 2 (full width under stats)
          { id: 'quick-actions', component: 'QuickActions', position: { x: 0, y: 1 }, size: 'wide', isVisible: true },
          // Priority widgets - Row 3
          { id: 'document-insights', component: 'DocumentInsights', position: { x: 0, y: 2 }, size: 'large', isVisible: true },
          { id: 'workflow-status', component: 'WorkflowStatus', position: { x: 2, y: 2 }, size: 'medium', isVisible: true },
          { id: 'notifications', component: 'NotificationCenter', position: { x: 3, y: 2 }, size: 'medium', isVisible: true },
          // Middle widgets - Rows 4 & 5
          { id: 'activity-heatmap', component: 'ActivityHeatmap', position: { x: 0, y: 3 }, size: 'medium', isVisible: true },
          { id: 'personal-documents', component: 'PersonalDocuments', position: { x: 1, y: 3 }, size: 'medium', isVisible: true },
          { id: 'personal-tasks', component: 'PersonalTasks', position: { x: 2, y: 3 }, size: 'medium', isVisible: true },
          { id: 'folder-tree', component: 'FolderTree', position: { x: 0, y: 4 }, size: 'medium', isVisible: true },
          { id: 'recent-activity', component: 'RecentActivity', position: { x: 1, y: 4 }, size: 'small', isVisible: true },
          // Analytics widgets moved to end - Row 6
          { id: 'advanced-analytics', component: 'AdvancedAnalytics', position: { x: 0, y: 5 }, size: 'large', isVisible: true },
          { id: 'performance-monitor', component: 'PerformanceMonitor', position: { x: 2, y: 5 }, size: 'medium', isVisible: true }
        ]
      };

      setLayout(defaultLayout);
      setIsLoading(false);
    };

    initializeDashboard();
  }, []);

  const handleUploadDocumentClick = () => {
    navigate('/documents?upload=true');
  };

  const handleWidgetResize = (widgetId: string, newSize: 'small' | 'medium' | 'large' | 'wide') => {
    if (!layout) return;

    setLayout(prev => ({
      ...prev!,
      widgets: prev!.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, size: newSize } : widget
      )
    }));
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    if (!layout) return;

    setLayout(prev => ({
      ...prev!,
      widgets: prev!.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, isVisible: !widget.isVisible } : widget
      )
    }));
  };

  const renderWidget = (widgetConfig: DashboardLayout['widgets'][0]) => {
    const baseProps = {
      id: widgetConfig.id,
      size: widgetConfig.size,
      onResize: (newSize: any) => handleWidgetResize(widgetConfig.id, newSize)
    };

    switch (widgetConfig.component) {
      case 'StatisticsOverview':
        return (
          <WidgetContainer
            {...baseProps}
            title={t('widgets.statistics.title')}
            className="col-span-full"
          >
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="glass-panel text-center p-4 hover:scale-105 transition-all duration-300">
                <div className="text-2xl font-bold text-blue-400">{dashboardData?.totalDocuments.toLocaleString()}</div>
                <div className="text-sm text-blue-300">{t('enhanced.statistics.totalDocuments')}</div>
              </div>
              <div className="glass-panel text-center p-4 hover:scale-105 transition-all duration-300">
                <div className="text-2xl font-bold text-yellow-400">{dashboardData?.processingQueue}</div>
                <div className="text-sm text-yellow-300">{t('enhanced.statistics.processingQueue')}</div>
              </div>
              <div className="glass-panel text-center p-4 hover:scale-105 transition-all duration-300">
                <div className="text-2xl font-bold text-green-400">{dashboardData?.activeWorkflows}</div>
                <div className="text-sm text-green-300">{t('enhanced.statistics.activeWorkflows')}</div>
              </div>
              <div className="glass-panel text-center p-4 hover:scale-105 transition-all duration-300">
                <div className="text-2xl font-bold text-purple-400">{dashboardData?.systemHealth}%</div>
                <div className="text-sm text-purple-300">{t('enhanced.statistics.systemHealth')}</div>
              </div>
              <div className="glass-panel text-center p-4 hover:scale-105 transition-all duration-300">
                <div className="text-2xl font-bold text-cyan-400">{dashboardData?.storageUsed}</div>
                <div className="text-sm text-cyan-300">{t('enhanced.statistics.storageUsed')}</div>
              </div>
              <div className="glass-panel text-center p-4 hover:scale-105 transition-all duration-300">
                <div className="text-2xl font-bold text-pink-400">{dashboardData?.activeUsers}</div>
                <div className="text-sm text-pink-300">{t('enhanced.statistics.activeUsers')}</div>
              </div>
            </div>
          </WidgetContainer>
        );

      case 'AdvancedAnalytics':
        return (
          <WidgetContainer
            {...baseProps}
            title={t('enhanced.widgets.advancedAnalytics')}
          >
            <AdvancedAnalyticsWidget
              {...baseProps}
              timeRange={selectedTimeRange}
              chartType="line"
              data={dashboardData?.timeSeriesData || []}
            />
          </WidgetContainer>
        );

      case 'DocumentInsights':
        return (
          <WidgetContainer
            {...baseProps}
            title={t('enhanced.widgets.documentInsights')}
          >
            <DocumentInsightsWidget
              {...baseProps}
              refreshInterval={30000}
              data={dashboardData}
            />
          </WidgetContainer>
        );

      case 'PerformanceMonitor':
        return (
          <WidgetContainer
            {...baseProps}
            title={t('enhanced.widgets.systemPerformance')}
          >
            <PerformanceMonitorWidget
              {...baseProps}
              refreshInterval={5000}
              showAlerts={true}
              data={dashboardData}
            />
          </WidgetContainer>
        );

      case 'WorkflowStatus':
        return (
          <WidgetContainer
            {...baseProps}
            title={t('enhanced.widgets.workflowStatus')}
          >
            <WorkflowStatusWidget
              {...baseProps}
              maxWorkflows={5}
              autoRefresh={true}
              refreshInterval={10000}
              data={dashboardData}
            />
          </WidgetContainer>
        );

      case 'ActivityHeatmap':
        return (
          <WidgetContainer
            {...baseProps}
            title={t('enhanced.widgets.userActivityHeatmap')}
          >
            <UserActivityHeatmapWidget
              {...baseProps}
              timeRange={selectedTimeRange}
              showTooltips={true}
              data={dashboardData}
            />
          </WidgetContainer>
        );

      case 'NotificationCenter':
        return (
          <WidgetContainer
            {...baseProps}
            title={t('enhanced.widgets.notificationCenter')}
          >
            <NotificationCenterWidget
              {...baseProps}
              maxNotifications={10}
              autoMarkAsRead={false}
              showCategories={true}
              realTimeUpdates={true}
              data={dashboardData}
            />
          </WidgetContainer>
        );

      case 'PersonalDocuments':
        return (
          <PersonalDocumentsWidget
            {...baseProps}
            title={t('widgets.personalDocuments.title')}
            showThumbnails={true}
            maxItems={6}
            onDocumentClick={(doc) => console.log('Document clicked:', doc)}
            onBookmarkToggle={(id) => console.log('Bookmark toggled:', id)}
          />
        );

      case 'PersonalTasks':
        return (
          <PersonalTasksWidget
            {...baseProps}
            title={t('widgets.personalTasks.title')}
            maxItems={5}
            onTaskClick={(task) => console.log('Task clicked:', task)}
            onTaskStatusChange={(id, status) => console.log('Task status changed:', id, status)}
          />
        );

      case 'FolderTree':
        return (
          <FolderTreeWidget
            {...baseProps}
            title={t('widgets.folderTree.title')}
            showDocumentCount={true}
            showSize={false}
            onNodeClick={(node) => console.log('Node clicked:', node)}
            onNodeExpand={(id, expanded) => console.log('Node expanded:', id, expanded)}
          />
        );

      case 'QuickActions':
        return (
          <WidgetContainer
            {...baseProps}
            title={t('widgets.quickActions.title')}
          >
            <QuickActionsWidget {...baseProps} />
          </WidgetContainer>
        );

      case 'RecentActivity':
        return (
          <WidgetContainer
            {...baseProps}
            title={t('widgets.recentActivity.title')}
          >
            <RecentActivityWidget {...baseProps} />
          </WidgetContainer>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-white/70">{t('enhanced.loading')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent"
          >
            {t('enhanced.title')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-1 text-white/60"
          >
            {t('enhanced.subtitle')}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4 sm:mt-0 flex items-center space-x-3"
        >
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-white/70">{t('enhanced.timeRange')}:</span>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="7d">{t('enhanced.timeRanges.7d')}</option>
              <option value="30d">{t('enhanced.timeRanges.30d')}</option>
              <option value="90d">{t('enhanced.timeRanges.90d')}</option>
            </select>
          </div>

          {/* Dashboard Controls */}
          <button
            onClick={() => setIsCustomizing(!isCustomizing)}
            className={`btn-glass inline-flex items-center px-4 py-2 text-white rounded-lg hover:scale-105 transition-all duration-300 ${
              isCustomizing ? 'ring-2 ring-primary-500/50' : ''
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {isCustomizing ? t('enhanced.done') : t('enhanced.customize')}
          </button>

          <button
            onClick={handleUploadDocumentClick}
            className="btn-glass inline-flex items-center px-4 py-2 text-white rounded-lg hover:scale-105 transition-all duration-300"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('enhanced.uploadDocument')}
          </button>
        </motion.div>
      </div>

      {/* Customization Panel */}
      <AnimatePresence>
        {isCustomizing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 rounded-lg"
          >
            <h3 className="text-lg font-semibold text-white mb-3">{t('enhanced.customizeTitle')}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {layout?.widgets.map(widget => (
                <div key={widget.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                  <span className="text-sm text-white/80">{widget.component}</span>
                  <button
                    onClick={() => toggleWidgetVisibility(widget.id)}
                    className={`w-6 h-3 rounded-full transition-colors ${
                      widget.isVisible ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  >
                    <div className={`w-2 h-2 bg-white rounded-full transition-transform ${
                      widget.isVisible ? 'translate-x-3' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dashboard Layout */}
      <div className="space-y-6">
        <AnimatePresence>
          {/* Row 1: Statistics Overview - Full Width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            {renderWidget({ id: 'stats-overview', component: 'StatisticsOverview', size: 'wide' })}
          </motion.div>

          {/* Row 2: Quick Actions - Full Width */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="w-full"
          >
            {renderWidget({ id: 'quick-actions', component: 'QuickActions', size: 'wide' })}
          </motion.div>

          {/* Row 3: Document Insights + Workflow Status + Notifications (Priority Widgets) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6"
          >
            <div className="md:col-span-2">
              {renderWidget({ id: 'document-insights', component: 'DocumentInsights', size: 'large' })}
            </div>
            <div className="md:col-span-1">
              {renderWidget({ id: 'workflow-status', component: 'WorkflowStatus', size: 'medium' })}
            </div>
            <div className="md:col-span-1">
              {renderWidget({ id: 'notifications', component: 'NotificationCenter', size: 'medium' })}
            </div>
          </motion.div>

          {/* Row 4: Activity Heatmap + Personal Documents + Personal Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="md:col-span-1">
              {renderWidget({ id: 'activity-heatmap', component: 'ActivityHeatmap', size: 'medium' })}
            </div>
            <div className="md:col-span-1">
              {renderWidget({ id: 'personal-documents', component: 'PersonalDocuments', size: 'medium' })}
            </div>
            <div className="md:col-span-1">
              {renderWidget({ id: 'personal-tasks', component: 'PersonalTasks', size: 'medium' })}
            </div>
          </motion.div>

          {/* Row 5: Folder Tree + Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div className="md:col-span-1">
              {renderWidget({ id: 'folder-tree', component: 'FolderTree', size: 'medium' })}
            </div>
            <div className="md:col-span-1">
              {renderWidget({ id: 'recent-activity', component: 'RecentActivity', size: 'small' })}
            </div>
          </motion.div>

          {/* Row 6: Advanced Analytics + Performance Monitor (Moved to End) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <div className="md:col-span-2">
              {renderWidget({ id: 'advanced-analytics', component: 'AdvancedAnalytics', size: 'large' })}
            </div>
            <div className="md:col-span-1">
              {renderWidget({ id: 'performance-monitor', component: 'PerformanceMonitor', size: 'medium' })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Main dashboard component wrapped with data provider
const EnhancedDashboard: React.FC = () => {
  return (
    <DashboardDataProvider>
      <EnhancedDashboardContent />
    </DashboardDataProvider>
  );
};

export default EnhancedDashboard;