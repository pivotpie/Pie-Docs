import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { fetchAnalyticsData } from '@/store/slices/analyticsSlice';

// Import the advanced widgets from existing dashboard
import DocumentInsightsWidget from '@/components/dashboard/widgets/DocumentInsightsWidget';
import WorkflowStatusWidget from '@/components/dashboard/widgets/WorkflowStatusWidget';
import NotificationCenterWidget from '@/components/dashboard/widgets/NotificationCenterWidget';

/**
 * Modern Analytics Dashboard
 *
 * A comprehensive, context-aware dashboard featuring:
 * - Real-time KPI metrics with trend indicators
 * - Interactive data visualizations
 * - Document Insights widget
 * - Workflow Status tracking
 * - Notification Center
 * - Quick actions with contextual shortcuts
 * - Department performance comparison
 */

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
  badge?: string;
}

const ModernDashboard: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Local state
  const [selectedTimeRange, setSelectedTimeRange] = useState<'today' | 'week' | 'month' | 'quarter'>('week');
  const [refreshing, setRefreshing] = useState(false);

  // Redux state
  const analyticsData = useSelector((state: any) => state.analytics?.analyticsData);
  const isLoading = useSelector((state: any) => state.analytics?.isLoading);

  // Fetch data on mount and time range change
  useEffect(() => {
    const timeRangeMap = {
      today: { period: 'day' },
      week: { period: 'week' },
      month: { period: 'month' },
      quarter: { period: 'quarter' },
    };

    dispatch(fetchAnalyticsData({
      timeRange: {
        start: new Date().toISOString(),
        end: new Date().toISOString(),
        period: timeRangeMap[selectedTimeRange].period
      }
    }) as any);
  }, [selectedTimeRange, dispatch]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshing(true);
      dispatch(fetchAnalyticsData({
        timeRange: {
          start: new Date().toISOString(),
          end: new Date().toISOString(),
          period: selectedTimeRange
        }
      }) as any);
      setTimeout(() => setRefreshing(false), 500);
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedTimeRange, dispatch]);

  // Quick Actions
  const quickActions: QuickAction[] = [
    {
      id: 'upload',
      title: t('modern.quickActions.upload.title'),
      description: t('modern.quickActions.upload.description'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 1 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      action: () => navigate('/documents?upload=true'),
      color: 'from-blue-500 to-blue-600',
      badge: t('modern.quickActions.upload.badge')
    },
    {
      id: 'search',
      title: t('modern.quickActions.search.title'),
      description: t('modern.quickActions.search.description'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      action: () => navigate('/search'),
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'workflow',
      title: t('modern.quickActions.workflow.title'),
      description: t('modern.quickActions.workflow.description'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      action: () => navigate('/workflows?tab=designer'),
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'barcode',
      title: t('modern.quickActions.barcode.title'),
      description: t('modern.quickActions.barcode.description'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4M4 8h4m4 0V4m-4 4h2m2 0h2" />
        </svg>
      ),
      action: () => navigate('/physical?tab=barcode-generator'),
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'reports',
      title: t('modern.quickActions.reports.title'),
      description: t('modern.quickActions.reports.description'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      action: () => navigate('/reports'),
      color: 'from-pink-500 to-pink-600'
    },
    {
      id: 'tasks',
      title: t('modern.quickActions.tasks.title'),
      description: t('modern.quickActions.tasks.description'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      action: () => navigate('/tasks'),
      color: 'from-cyan-500 to-cyan-600',
      badge: analyticsData?.kpiMetrics?.workflowEfficiency?.pendingTasks?.toString()
    }
  ];

  const kpiMetrics = analyticsData?.kpiMetrics;

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
            {t('modern.title')}
          </h1>
          <p className="mt-1 text-gray-400">
            {t('modern.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex gap-2 p-1 bg-white/5 backdrop-blur-md rounded-lg border border-white/10">
            {(['today', 'week', 'month', 'quarter'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  selectedTimeRange === range
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {t(`modern.timeRange.${range}`)}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              setRefreshing(true);
              dispatch(fetchAnalyticsData({
                timeRange: {
                  start: new Date().toISOString(),
                  end: new Date().toISOString(),
                  period: selectedTimeRange
                }
              }) as any);
              setTimeout(() => setRefreshing(false), 500);
            }}
            className={`px-4 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-white transition-all ${
              refreshing ? 'animate-spin' : ''
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Documents */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-md border border-blue-500/20 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                {kpiMetrics?.documentProcessing?.growthRate ?
                  `+${(kpiMetrics.documentProcessing.growthRate * 100).toFixed(1)}%` :
                  '+15%'
                }
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">{t('modern.kpi.totalDocuments')}</h3>
            <p className="text-3xl font-bold text-white">
              {kpiMetrics?.documentProcessing?.totalDocuments?.toLocaleString() || '15,847'}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              +{kpiMetrics?.documentProcessing?.documentsCreated || '234'} {t('modern.kpi.today')}
            </p>
          </div>
        </div>

        {/* Active Users */}
        <div className="relative overflow-hidden bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-md border border-purple-500/20 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                +{kpiMetrics?.userAdoption?.adoptionRate ?
                  `${(kpiMetrics.userAdoption.adoptionRate * 100).toFixed(0)}%` :
                  '85%'
                }
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">{t('modern.kpi.activeUsers')}</h3>
            <p className="text-3xl font-bold text-white">
              {kpiMetrics?.userAdoption?.activeUsers?.toLocaleString() || '342'}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {kpiMetrics?.userAdoption?.userEngagement ?
                `${(kpiMetrics.userAdoption.userEngagement * 100).toFixed(0)}% ${t('modern.kpi.engagement')}` :
                `78% ${t('modern.kpi.engagement')}`
              }
            </p>
          </div>
        </div>

        {/* System Uptime */}
        <div className="relative overflow-hidden bg-gradient-to-br from-green-500/10 to-green-600/10 backdrop-blur-md border border-green-500/20 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium px-2 py-1 bg-green-500/20 text-green-400 rounded-lg">
                {t('modern.kpi.excellent')}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">{t('modern.kpi.systemUptime')}</h3>
            <p className="text-3xl font-bold text-white">
              {kpiMetrics?.systemPerformance?.uptime ?
                `${(kpiMetrics.systemPerformance.uptime * 100).toFixed(2)}%` :
                '99.8%'
              }
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {kpiMetrics?.systemPerformance?.averageResponseTime || '145'}{t('modern.kpi.msAvgResponse')}
            </p>
          </div>
        </div>

        {/* Workflows Completed */}
        <div className="relative overflow-hidden bg-gradient-to-br from-orange-500/10 to-orange-600/10 backdrop-blur-md border border-orange-500/20 rounded-2xl p-6 hover:scale-105 transition-transform duration-300">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="flex items-center gap-1 text-sm font-medium text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                {kpiMetrics?.workflowEfficiency?.automationRate ?
                  `${(kpiMetrics.workflowEfficiency.automationRate * 100).toFixed(0)}%` :
                  '73%'
                }
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">{t('modern.kpi.workflowsThisWeek')}</h3>
            <p className="text-3xl font-bold text-white">
              {kpiMetrics?.workflowEfficiency?.completedWorkflows || '167'}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {kpiMetrics?.workflowEfficiency?.pendingTasks || '45'} {t('modern.kpi.pendingTasks')}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid - Widgets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions & Document Insights */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t('modern.quickActions.title')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  onClick={action.action}
                  className="relative group overflow-hidden bg-gradient-to-br from-white/5 to-white/0 hover:from-white/10 hover:to-white/5 border border-white/10 rounded-xl p-4 transition-all duration-300 hover:scale-105 hover:shadow-lg"
                >
                  {action.badge && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                      {action.badge}
                    </span>
                  )}
                  <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-3 text-white group-hover:scale-110 transition-transform`}>
                    {action.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{action.title}</h3>
                  <p className="text-xs text-gray-400">{action.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Document Insights Widget */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('modern.widgets.documentInsights')}
            </h2>
            <DocumentInsightsWidget
              id="document-insights"
              size="large"
              refreshInterval={30000}
            />
          </div>
        </div>

        {/* Right Column - Workflow Status & Notifications */}
        <div className="lg:col-span-1 space-y-6">
          {/* Workflow Status Widget */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t('modern.widgets.workflowStatus')}
            </h2>
            <WorkflowStatusWidget
              id="workflow-status"
              size="medium"
              maxWorkflows={5}
              autoRefresh={true}
              refreshInterval={10000}
            />
          </div>

          {/* Notifications Widget */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <NotificationCenterWidget
              id="notifications"
              size="medium"
              maxNotifications={10}
              autoMarkAsRead={false}
              showCategories={true}
              realTimeUpdates={true}
            />
          </div>
        </div>
      </div>

      {/* Department Performance */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          {t('modern.departments.title')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {analyticsData?.departmentUsage?.map((dept: any, idx: number) => {
            const colors = ['blue', 'purple', 'green', 'orange'];
            const color = colors[idx % colors.length];
            return (
              <div key={dept.departmentId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">{dept.departmentName}</span>
                  <span className="text-xs text-gray-400">
                    {dept.documentCount.toLocaleString()} {t('modern.departments.docs')}
                  </span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r from-${color}-500 to-${color}-600 rounded-full transition-all duration-1000`}
                    style={{ width: `${dept.efficiency * 100}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{dept.activeUsers} {t('modern.departments.activeUsers')}</span>
                  <span className={`font-semibold text-${color}-400`}>
                    {(dept.efficiency * 100).toFixed(0)}% {t('modern.departments.efficiency')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModernDashboard;
