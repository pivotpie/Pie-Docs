import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  QueryPerformanceMetrics,
  AnalyticsFilters,
  RealTimeMetrics
} from '@/types/domain/Analytics';
import { analyticsService } from '@/services/analytics/analyticsService';

interface PerformanceMonitorProps {
  className?: string;
  showRealTime?: boolean;
  alertThresholds?: {
    responseTime: number; // ms
    errorRate: number; // percentage (0-1)
    throughput: number; // requests per minute
  };
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  className = '',
  showRealTime = true,
  alertThresholds = {
    responseTime: 2000,
    errorRate: 0.05,
    throughput: 5,
  },
}) => {
  const { theme } = useTheme();
  const [performanceMetrics, setPerformanceMetrics] = useState<QueryPerformanceMetrics[]>([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'hour' | 'day' | 'week'>('hour');
  const [selectedComplexity, setSelectedComplexity] = useState<'all' | 'simple' | 'medium' | 'complex'>('all');
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  /**
   * Calculate date range based on selection
   */
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();

    switch (selectedTimeRange) {
      case 'hour':
        start.setHours(now.getHours() - 1);
        break;
      case 'day':
        start.setDate(now.getDate() - 1);
        break;
      case 'week':
        start.setDate(now.getDate() - 7);
        break;
    }

    return { start, end: now };
  }, [selectedTimeRange]);

  /**
   * Create analytics filters
   */
  const analyticsFilters: AnalyticsFilters = useMemo(() => ({
    dateRange,
    queryComplexity: selectedComplexity === 'all' ? undefined : selectedComplexity,
    userSegment: 'all',
  }), [dateRange, selectedComplexity]);

  /**
   * Calculate performance statistics
   */
  const performanceStats = useMemo(() => {
    if (performanceMetrics.length === 0) {
      return {
        avgResponseTime: 0,
        avgP95: 0,
        avgP99: 0,
        avgThroughput: 0,
        avgErrorRate: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        totalRequests: 0,
      };
    }

    const totalRequests = performanceMetrics.reduce((sum, metric) => sum + metric.throughput, 0);
    const avgResponseTime = performanceMetrics.reduce((sum, metric) => sum + metric.averageResponseTime, 0) / performanceMetrics.length;
    const avgP95 = performanceMetrics.reduce((sum, metric) => sum + metric.p95ResponseTime, 0) / performanceMetrics.length;
    const avgP99 = performanceMetrics.reduce((sum, metric) => sum + metric.p99ResponseTime, 0) / performanceMetrics.length;
    const avgThroughput = performanceMetrics.reduce((sum, metric) => sum + metric.throughput, 0) / performanceMetrics.length;
    const avgErrorRate = performanceMetrics.reduce((sum, metric) => sum + metric.errorRate, 0) / performanceMetrics.length;
    const minResponseTime = Math.min(...performanceMetrics.map(m => m.averageResponseTime));
    const maxResponseTime = Math.max(...performanceMetrics.map(m => m.averageResponseTime));

    return {
      avgResponseTime,
      avgP95,
      avgP99,
      avgThroughput,
      avgErrorRate,
      minResponseTime,
      maxResponseTime,
      totalRequests,
    };
  }, [performanceMetrics]);

  /**
   * Detect performance alerts
   */
  const alerts = useMemo(() => {
    const activeAlerts = [];

    if (alertsEnabled && realTimeMetrics) {
      if (realTimeMetrics.averageResponseTime > alertThresholds.responseTime) {
        activeAlerts.push({
          type: 'warning',
          title: 'High Response Time',
          message: `Current average response time (${realTimeMetrics.averageResponseTime}ms) exceeds threshold (${alertThresholds.responseTime}ms)`,
          value: realTimeMetrics.averageResponseTime,
          threshold: alertThresholds.responseTime,
        });
      }

      if (realTimeMetrics.errorRate > alertThresholds.errorRate) {
        activeAlerts.push({
          type: 'error',
          title: 'High Error Rate',
          message: `Current error rate (${(realTimeMetrics.errorRate * 100).toFixed(1)}%) exceeds threshold (${(alertThresholds.errorRate * 100).toFixed(1)}%)`,
          value: realTimeMetrics.errorRate,
          threshold: alertThresholds.errorRate,
        });
      }

      const currentThroughput = realTimeMetrics.searchesInLastHour / 60; // Convert to per minute
      if (currentThroughput < alertThresholds.throughput) {
        activeAlerts.push({
          type: 'info',
          title: 'Low Throughput',
          message: `Current throughput (${currentThroughput.toFixed(1)}/min) is below expected threshold (${alertThresholds.throughput}/min)`,
          value: currentThroughput,
          threshold: alertThresholds.throughput,
        });
      }
    }

    return activeAlerts;
  }, [realTimeMetrics, alertThresholds, alertsEnabled]);

  /**
   * Load performance metrics
   */
  const loadPerformanceMetrics = async () => {
    try {
      setIsLoading(true);
      const data = await analyticsService.getQueryPerformanceMetrics(analyticsFilters);
      setPerformanceMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance metrics');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load real-time metrics
   */
  const loadRealTimeMetrics = async () => {
    if (!showRealTime) return;

    try {
      const metrics = await analyticsService.getRealTimeMetrics();
      setRealTimeMetrics(metrics);
    } catch (err) {
      console.warn('Failed to load real-time metrics:', err);
    }
  };

  /**
   * Format response time
   */
  const formatResponseTime = (ms: number): string => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.round(ms)}ms`;
  };

  /**
   * Format percentage
   */
  const formatPercentage = (rate: number): string => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  /**
   * Get alert color classes
   */
  const getAlertColor = (type: string): string => {
    switch (type) {
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  /**
   * Get performance indicator color
   */
  const getPerformanceColor = (value: number, threshold: number, invert = false): string => {
    const isGood = invert ? value < threshold : value > threshold;
    return isGood ? 'text-green-600' : 'text-red-600';
  };

  useEffect(() => {
    loadPerformanceMetrics();
  }, [analyticsFilters]);

  useEffect(() => {
    loadRealTimeMetrics();

    if (showRealTime) {
      const interval = setInterval(loadRealTimeMetrics, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [showRealTime]);

  if (isLoading && performanceMetrics.length === 0) {
    return (
      <div className={`performance-monitor ${className}`}>
        <div className="glass-card flex items-center justify-center h-64">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme === 'dark' ? 'border-white/60' : 'border-white/60'}`}></div>
          <span className={`ml-2 ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>Loading performance data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`performance-monitor ${className}`}>
        <div className="glass-card text-center p-8">
          <div className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-red-400' : 'text-red-400'}`}>Failed to Load Performance Data</div>
          <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>{error}</p>
          <button
            onClick={loadPerformanceMetrics}
            className="mt-4 px-4 py-2 btn-glass hover:scale-105 transition-all duration-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`performance-monitor ${className}`}>
      {/* Header */}
      <div className="glass-panel border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>Performance Monitor</h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'} mt-1`}>
              Real-time search performance metrics and system health
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>
              <input
                type="checkbox"
                checked={alertsEnabled}
                onChange={(e) => setAlertsEnabled(e.target.checked)}
                className="rounded"
              />
              Enable alerts
            </label>
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className={`px-3 py-2 border border-white/20 rounded-md text-sm glass ${theme === 'dark' ? 'text-white' : 'text-white/90'} hover:bg-white/20 transition-all duration-300`}
            >
              <option value="hour">Last Hour</option>
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
            </select>
            <select
              value={selectedComplexity}
              onChange={(e) => setSelectedComplexity(e.target.value as any)}
              className={`px-3 py-2 border border-white/20 rounded-md text-sm glass ${theme === 'dark' ? 'text-white' : 'text-white/90'} hover:bg-white/20 transition-all duration-300`}
            >
              <option value="all">All Queries</option>
              <option value="simple">Simple</option>
              <option value="medium">Medium</option>
              <option value="complex">Complex</option>
            </select>
          </div>
        </div>
      </div>

      {/* Real-time Status */}
      {showRealTime && realTimeMetrics && (
        <div className="glass-panel border-b border-white/10 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white/90' : 'text-white/90'}`}>System Status: Healthy</span>
              </div>
              <div className={`text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>
                <span className="font-medium">Current Response Time:</span>{' '}
                <span className={getPerformanceColor(realTimeMetrics.averageResponseTime, alertThresholds.responseTime, true)}>
                  {formatResponseTime(realTimeMetrics.averageResponseTime)}
                </span>
              </div>
              <div className={`text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>
                <span className="font-medium">Error Rate:</span>{' '}
                <span className={getPerformanceColor(realTimeMetrics.errorRate, alertThresholds.errorRate, true)}>
                  {formatPercentage(realTimeMetrics.errorRate)}
                </span>
              </div>
              <div className={`text-sm ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>
                <span className="font-medium">System Load:</span>{' '}
                <span className={getPerformanceColor(realTimeMetrics.systemLoad, 0.8, true)}>
                  {Math.round(realTimeMetrics.systemLoad * 100)}%
                </span>
              </div>
            </div>
            <button
              onClick={loadRealTimeMetrics}
              className="px-3 py-1 text-xs btn-glass hover:scale-105 transition-all duration-300"
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="glass-panel border-b border-white/10 px-6 py-4">
          <div className="space-y-2">
            <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-white/90' : 'text-white/90'}`}>Performance Alerts</h3>
            {alerts.map((alert, index) => (
              <div key={index} className={`border rounded-lg p-3 ${getAlertColor(alert.type)}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm">{alert.message}</p>
                  </div>
                  <div className="text-xs font-mono">
                    {typeof alert.value === 'number' && alert.value < 1
                      ? formatPercentage(alert.value)
                      : typeof alert.value === 'number'
                      ? formatResponseTime(alert.value)
                      : alert.value
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Statistics */}
      <div className="glass-panel border-b border-white/10 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {formatResponseTime(performanceStats.avgResponseTime)}
            </div>
            <div className="text-xs text-gray-600">Avg Response</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {formatResponseTime(performanceStats.avgP95)}
            </div>
            <div className="text-xs text-gray-600">P95</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {formatResponseTime(performanceStats.avgP99)}
            </div>
            <div className="text-xs text-gray-600">P99</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {performanceStats.avgThroughput.toFixed(1)}/min
            </div>
            <div className="text-xs text-gray-600">Throughput</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {formatPercentage(performanceStats.avgErrorRate)}
            </div>
            <div className="text-xs text-gray-600">Error Rate</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {formatResponseTime(performanceStats.minResponseTime)}
            </div>
            <div className="text-xs text-gray-600">Best</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">
              {formatResponseTime(performanceStats.maxResponseTime)}
            </div>
            <div className="text-xs text-gray-600">Worst</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">
              {Math.round(performanceStats.totalRequests)}
            </div>
            <div className="text-xs text-gray-600">Total Requests</div>
          </div>
        </div>
      </div>

      {/* Performance Chart Placeholder */}
      <div className="p-6">
        <div className="glass-card rounded-lg border border-white/20 mb-6 hover:scale-[1.02] transition-all duration-300">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Response Time Trends</h3>
          </div>
          <div className="p-6">
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-2">📊</div>
                <p>Performance trend chart will be rendered here</p>
                <p className="text-sm">Integration with charting library needed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className="glass-card rounded-lg border border-white/20 hover:scale-[1.02] transition-all duration-300">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Detailed Performance Metrics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Complexity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Response
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P95
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    P99
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Throughput
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Error Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {performanceMetrics.slice(0, 20).map((metric, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metric.timestamp.toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        metric.queryComplexity === 'complex' ? 'bg-red-100 text-red-800' :
                        metric.queryComplexity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {metric.queryComplexity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatResponseTime(metric.averageResponseTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatResponseTime(metric.p95ResponseTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatResponseTime(metric.p99ResponseTime)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metric.throughput.toFixed(1)}/min
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        metric.errorRate < 0.01 ? 'bg-green-100 text-green-800' :
                        metric.errorRate < 0.05 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {formatPercentage(metric.errorRate)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;