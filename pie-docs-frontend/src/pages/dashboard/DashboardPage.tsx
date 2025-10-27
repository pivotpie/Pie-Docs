import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import WidgetContainer from '@/components/dashboard/WidgetContainer';
import PersonalDocumentsWidget from '@/components/dashboard/widgets/PersonalDocumentsWidget';
import PersonalTasksWidget from '@/components/dashboard/widgets/PersonalTasksWidget';
import FolderTreeWidget from '@/components/dashboard/widgets/FolderTreeWidget';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
  const { theme } = useTheme();

  const handleUploadDocumentClick = () => {
    navigate('/documents?upload=true');
  };

  // Placeholder content for widgets
  const StatisticsWidget = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">{t('widgets.statistics.totalDocuments')}</span>
        <span className="text-2xl font-bold text-primary-600">1,234</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">{t('widgets.statistics.processing')}</span>
        <span className="text-2xl font-bold text-yellow-600">56</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">{t('widgets.statistics.completedToday')}</span>
        <span className="text-2xl font-bold text-green-600">89</span>
      </div>
    </div>
  );

  const RecentActivityWidget = () => (
    <div className="space-y-3">
      <div className="flex items-center space-x-3">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-sm text-gray-700 dark:text-gray-300">{t('widgets.recentActivity.documentUploaded', { filename: 'contract.pdf' })}</span>
      </div>
      <div className="flex items-center space-x-3">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span className="text-sm text-gray-700 dark:text-gray-300">{t('widgets.recentActivity.ocrCompleted')}</span>
      </div>
      <div className="flex items-center space-x-3">
        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
        <span className="text-sm text-gray-700 dark:text-gray-300">{t('widgets.recentActivity.workflowPending')}</span>
      </div>
      <div className="flex items-center space-x-3">
        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
        <span className="text-sm text-gray-700 dark:text-gray-300">{t('widgets.recentActivity.searchIndexUpdated')}</span>
      </div>
    </div>
  );

  const QuickActionsWidget = () => (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={handleUploadDocumentClick}
        className="btn-glass p-3 rounded-lg text-primary-300 hover:text-primary-200 hover:scale-105 transition-all duration-300"
      >
        <div className="text-center">
          <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-xs font-medium">{t('widgets.quickActions.upload')}</span>
        </div>
      </button>
      <button className="btn-glass p-3 rounded-lg text-green-300 hover:text-green-200 hover:scale-105 transition-all duration-300">
        <div className="text-center">
          <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-xs font-medium">{t('widgets.quickActions.search')}</span>
        </div>
      </button>
      <button className="btn-glass p-3 rounded-lg text-blue-300 hover:text-blue-200 hover:scale-105 transition-all duration-300">
        <div className="text-center">
          <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-xs font-medium">{t('widgets.quickActions.reports')}</span>
        </div>
      </button>
      <button className="btn-glass p-3 rounded-lg text-purple-300 hover:text-purple-200 hover:scale-105 transition-all duration-300">
        <div className="text-center">
          <svg className="w-6 h-6 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs font-medium">{t('widgets.quickActions.settings')}</span>
        </div>
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            {t('welcome')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleUploadDocumentClick}
            className="btn-glass inline-flex items-center px-4 py-2 text-white rounded-lg hover:scale-105 transition-all duration-300"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t('uploadDocument')}
          </button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Personal Documents Widget */}
        <PersonalDocumentsWidget
          id="personal-documents"
          title={t('widgets.personalDocuments.title')}
          size="large"
          showThumbnails={true}
          maxItems={6}
          onDocumentClick={(doc) => console.log('Document clicked:', doc)}
          onBookmarkToggle={(id) => console.log('Bookmark toggled:', id)}
        />

        {/* Personal Tasks Widget */}
        <PersonalTasksWidget
          id="personal-tasks"
          title={t('widgets.personalTasks.title')}
          size="large"
          maxItems={5}
          onTaskClick={(task) => console.log('Task clicked:', task)}
          onTaskStatusChange={(id, status) => console.log('Task status changed:', id, status)}
        />

        {/* Folder Tree Widget */}
        <FolderTreeWidget
          id="folder-tree"
          title={t('widgets.folderTree.title')}
          size="medium"
          showDocumentCount={true}
          showSize={false}
          onNodeClick={(node) => console.log('Node clicked:', node)}
          onNodeExpand={(id, expanded) => console.log('Node expanded:', id, expanded)}
        />

        {/* Enhanced Statistics Widget */}
        <WidgetContainer
          id="statistics"
          title={t('widgets.statistics.title')}
          size="medium"
        >
          <StatisticsWidget />
        </WidgetContainer>

        {/* Enhanced Recent Activity Widget */}
        <WidgetContainer
          id="recent-activity"
          title={t('widgets.recentActivity.title')}
          size="medium"
        >
          <RecentActivityWidget />
        </WidgetContainer>

        {/* Quick Actions Widget */}
        <WidgetContainer
          id="quick-actions"
          title={t('widgets.quickActions.title')}
          size="small"
        >
          <QuickActionsWidget />
        </WidgetContainer>

        {/* Enhanced System Overview */}
        <WidgetContainer
          id="system-overview"
          title={t('widgets.systemOverview.title')}
          size="wide"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-panel text-center p-4 hover:scale-105 transition-all duration-300">
              <div className="text-2xl font-bold text-blue-400">98.5%</div>
              <div className="text-sm text-blue-300">{t('widgets.systemOverview.uptime')}</div>
            </div>
            <div className="glass-panel text-center p-4 hover:scale-105 transition-all duration-300">
              <div className="text-2xl font-bold text-green-400">1.2TB</div>
              <div className="text-sm text-green-300">{t('widgets.systemOverview.storageUsed')}</div>
            </div>
            <div className="glass-panel text-center p-4 hover:scale-105 transition-all duration-300">
              <div className="text-2xl font-bold text-purple-400">456</div>
              <div className="text-sm text-purple-300">{t('widgets.systemOverview.activeUsers')}</div>
            </div>
            <div className="glass-panel text-center p-4 hover:scale-105 transition-all duration-300">
              <div className="text-2xl font-bold text-orange-400">12ms</div>
              <div className="text-sm text-orange-300">{t('widgets.systemOverview.avgResponse')}</div>
            </div>
          </div>
        </WidgetContainer>
      </div>
    </div>
  );
};

export default DashboardPage;