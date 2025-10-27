import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import {
  fetchAnalyticsData,
  exportAnalyticsData,
  setTimeRange,
  setSelectedDepartment,
  setComparisonMode,
} from '@/store/slices/analyticsSlice';
import KPICard from '@/components/analytics/KPICard';
import TrendChart from '@/components/analytics/TrendChart';
import ROICalculator from '@/components/analytics/ROICalculator';
import DepartmentUsageAnalytics from '@/components/analytics/DepartmentUsageAnalytics';
import SystemPerformanceDashboard from '@/components/analytics/SystemPerformanceDashboard';
import { AnalyticsExporter } from '@/utils/exportUtils';
import type { TimeRange, ExportOptions } from '@/types/domain/ExecutiveAnalytics';

const ExecutiveDashboard: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();

  const {
    analyticsData,
    dashboard,
    departmentUsage,
    roi,
    performance,
    isLoading,
    error,
  } = useSelector((state: RootState) => state.analytics);

  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'departments' | 'roi' | 'performance'>('overview');
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  // Mock real-time data (in production, this would come from WebSocket or polling)
  const [realTimeData, setRealTimeData] = useState({
    cpu: 45.2,
    memory: 68.7,
    disk: 72.1,
    network: 1250000, // bytes/s
    responseTime: 145,
    activeUsers: 342,
  });

  useEffect(() => {
    // Fetch initial analytics data
    const filters = {
      timeRange: dashboard.selectedTimeRange,
    };
    dispatch(fetchAnalyticsData(filters));
  }, [dispatch, dashboard.selectedTimeRange]);

  useEffect(() => {
    // Set up real-time data updates
    if (realTimeEnabled) {
      const interval = setInterval(() => {
        // Simulate real-time data updates
        setRealTimeData(prev => ({
          cpu: Math.max(20, Math.min(90, prev.cpu + (Math.random() - 0.5) * 5)),
          memory: Math.max(30, Math.min(95, prev.memory + (Math.random() - 0.5) * 3)),
          disk: Math.max(50, Math.min(90, prev.disk + (Math.random() - 0.5) * 1)),
          network: Math.max(500000, Math.min(2000000, prev.network + (Math.random() - 0.5) * 100000)),
          responseTime: Math.max(50, Math.min(500, prev.responseTime + (Math.random() - 0.5) * 20)),
          activeUsers: Math.max(100, Math.min(500, prev.activeUsers + Math.floor((Math.random() - 0.5) * 10))),
        }));
      }, 5000); // Update every 5 seconds

      return () => clearInterval(interval);
    }
  }, [realTimeEnabled]);

  const handleTimeRangeChange = (period: TimeRange['period']) => {
    const now = new Date();
    const start = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
      case 'month':
        start.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        break;
    }

    const timeRange: TimeRange = { start, end: now, period };
    dispatch(setTimeRange(timeRange));
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    if (!analyticsData) return;

    setExportLoading(true);
    try {
      const options: ExportOptions = {
        format,
        includeCharts: true,
        timeRange: dashboard.selectedTimeRange,
        sections: ['kpi', 'trends', 'departments', 'roi', 'performance'],
        branding: true,
      };

      let blob: Blob;
      let filename: string;

      switch (format) {
        case 'pdf':
          blob = await AnalyticsExporter.exportToPDF(analyticsData, options);
          filename = AnalyticsExporter.generateFilename('executive-analytics', 'pdf');
          break;
        case 'excel':
          blob = await AnalyticsExporter.exportToExcel(analyticsData, options);
          filename = AnalyticsExporter.generateFilename('executive-analytics', 'xlsx');
          break;
        case 'csv':
          blob = await AnalyticsExporter.exportToCSV(analyticsData, options);
          filename = AnalyticsExporter.generateFilename('executive-analytics', 'csv');
          break;
        default:
          throw new Error('Unsupported export format');
      }

      AnalyticsExporter.downloadFile(blob, filename);
    } catch (error) {
      console.error('Export failed:', error);
      // In production, show toast notification
    } finally {
      setExportLoading(false);
    }
  };

  const handleRefreshData = () => {
    const filters = {
      timeRange: dashboard.selectedTimeRange,
    };
    dispatch(fetchAnalyticsData(filters));
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">
            Failed to Load Analytics Data
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Analytics Dashboard</h1>
          <p className="mt-1 text-gray-600">
            Comprehensive insights into system performance and business impact
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          {/* Real-time toggle */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="realtime"
              checked={realTimeEnabled}
              onChange={(e) => setRealTimeEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600"
            />
            <label htmlFor="realtime" className="text-sm text-gray-600">
              Real-time updates
            </label>
          </div>

          {/* Time range selector */}
          <select
            value={dashboard.selectedTimeRange.period}
            onChange={(e) => handleTimeRangeChange(e.target.value as TimeRange['period'])}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="quarter">Last 90 days</option>
            <option value="year">Last year</option>
          </select>

          {/* Export dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleExport(e.target.value as 'pdf' | 'excel' | 'csv');
                  e.target.value = '';
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              disabled={exportLoading}
            >
              <option value="">Export</option>
              <option value="pdf">PDF Report</option>
              <option value="excel">Excel Workbook</option>
              <option value="csv">CSV Data</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefreshData}
            disabled={isLoading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'trends', label: 'Trends', icon: '📈' },
            { id: 'departments', label: 'Departments', icon: '🏢' },
            { id: 'roi', label: 'ROI Analysis', icon: '💰' },
            { id: 'performance', label: 'Performance', icon: '⚡' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            {analyticsData?.kpiMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                  title="Total Documents"
                  value={analyticsData.kpiMetrics.documentProcessing.totalDocuments}
                  subtitle="documents in system"
                  trend={{
                    value: analyticsData.kpiMetrics.documentProcessing.growthRate * 100,
                    direction: analyticsData.kpiMetrics.documentProcessing.growthRate > 0 ? 'up' : 'down',
                    period: 'last month'
                  }}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  }
                  color="blue"
                />

                <KPICard
                  title="Active Users"
                  value={analyticsData.kpiMetrics.userAdoption.activeUsers}
                  subtitle="monthly active users"
                  trend={{
                    value: analyticsData.kpiMetrics.userAdoption.adoptionRate * 100,
                    direction: 'up',
                    period: 'last month'
                  }}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  }
                  color="green"
                />

                <KPICard
                  title="System Uptime"
                  value={`${(analyticsData.kpiMetrics.systemPerformance.uptime * 100).toFixed(1)}%`}
                  subtitle="availability"
                  trend={{
                    value: 99.8,
                    direction: 'up',
                    period: 'last month'
                  }}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  }
                  color="green"
                />

                <KPICard
                  title="Response Time"
                  value={`${analyticsData.kpiMetrics.systemPerformance.averageResponseTime}ms`}
                  subtitle="average response"
                  trend={{
                    value: -12,
                    direction: 'up',
                    period: 'last month'
                  }}
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  }
                  color="yellow"
                />
              </div>
            )}

            {/* Trend Overview */}
            {analyticsData?.trendData && (
              <TrendChart
                data={analyticsData.trendData}
                title="Document Activity Trends"
                type="area"
                height={300}
                metrics={['documents', 'users', 'workflows']}
                className="col-span-2"
              />
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Workflow Efficiency */}
              {analyticsData?.kpiMetrics && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Efficiency</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Completed Workflows</span>
                      <span className="font-semibold">{analyticsData.kpiMetrics.workflowEfficiency.completedWorkflows}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Avg Completion Time</span>
                      <span className="font-semibold">{analyticsData.kpiMetrics.workflowEfficiency.averageCompletionTime}h</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Automation Rate</span>
                      <span className="font-semibold">{(analyticsData.kpiMetrics.workflowEfficiency.automationRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">SLA Compliance</span>
                      <span className="font-semibold text-green-600">{(analyticsData.kpiMetrics.workflowEfficiency.slaCompliance * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* System Health */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">CPU Usage</span>
                    <span className="font-semibold">{realTimeData.cpu.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Memory Usage</span>
                    <span className="font-semibold">{realTimeData.memory.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Storage Usage</span>
                    <span className="font-semibold">{realTimeData.disk.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Active Connections</span>
                    <span className="font-semibold">{realTimeData.activeUsers}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trends' && analyticsData?.trendData && (
          <div className="space-y-6">
            <TrendChart
              data={analyticsData.trendData}
              title="Document Creation Trends"
              type="line"
              height={400}
              metrics={['documents']}
            />
            <TrendChart
              data={analyticsData.trendData}
              title="User Activity Trends"
              type="area"
              height={400}
              metrics={['users']}
            />
            <TrendChart
              data={analyticsData.trendData}
              title="Workflow Completion Trends"
              type="bar"
              height={400}
              metrics={['workflows']}
            />
          </div>
        )}

        {activeTab === 'departments' && analyticsData?.departmentUsage && (
          <DepartmentUsageAnalytics
            departments={analyticsData.departmentUsage}
            loading={departmentUsage.isLoading}
            comparisonMode={departmentUsage.comparisonMode}
            onComparisonModeChange={(mode) => dispatch(setComparisonMode(mode))}
            selectedDepartment={departmentUsage.selectedDepartment}
            onDepartmentSelect={(id) => dispatch(setSelectedDepartment(id))}
          />
        )}

        {activeTab === 'roi' && (
          <ROICalculator
            calculation={analyticsData?.roiCalculation}
            loading={roi.isLoading}
          />
        )}

        {activeTab === 'performance' && analyticsData?.performanceMetrics && (
          <SystemPerformanceDashboard
            metrics={analyticsData.performanceMetrics}
            realTimeData={realTimeData}
            loading={performance.isLoading}
            onRefresh={handleRefreshData}
          />
        )}
      </div>
    </div>
  );
};

export default ExecutiveDashboard;