import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import type { PerformanceMetrics } from '@/types/domain/ExecutiveAnalytics';

export interface SystemPerformanceDashboardProps {
  metrics: PerformanceMetrics[];
  realTimeData?: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    responseTime: number;
    activeUsers: number;
  };
  thresholds?: {
    responseTime: number;
    errorRate: number;
    cpuUsage: number;
    memoryUsage: number;
  };
  loading?: boolean;
  onRefresh?: () => void;
  className?: string;
}

const SystemPerformanceDashboard: React.FC<SystemPerformanceDashboardProps> = ({
  metrics,
  realTimeData,
  thresholds = {
    responseTime: 1000,
    errorRate: 0.05,
    cpuUsage: 0.8,
    memoryUsage: 0.9,
  },
  loading = false,
  onRefresh,
  className = '',
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [selectedMetric, setSelectedMetric] = useState<'cpu' | 'memory' | 'disk' | 'network' | 'response'>('cpu');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');

  // Filter metrics based on time range
  const filteredMetrics = React.useMemo(() => {
    const now = new Date();
    const hoursMap = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 };
    const hours = hoursMap[timeRange];
    const cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);

    return metrics
      .filter(metric => new Date(metric.timestamp) >= cutoff)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [metrics, timeRange]);

  const formatTime = (timestamp: Date) => {
    const date = new Date(timestamp);
    if (timeRange === '1h' || timeRange === '6h') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 10) / 10 + ' ' + sizes[i];
  };

  const getStatusColor = (value: number, threshold: number, invert = false) => {
    const isGood = invert ? value < threshold : value > threshold;
    if (isGood) return `${theme === 'dark' ? 'text-green-400' : 'text-green-600'} glass-panel`;
    if (value >= threshold * 0.8) return `${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'} glass-panel`;
    return `${theme === 'dark' ? 'text-red-400' : 'text-red-600'} glass-panel`;
  };

  const getMetricColor = (metricType: string) => {
    const colors = {
      cpu: '#3B82F6',
      memory: '#10B981',
      disk: '#F59E0B',
      network: '#8B5CF6',
      response: '#EF4444',
    };
    return colors[metricType as keyof typeof colors] || '#6B7280';
  };

  const chartData = filteredMetrics.map(metric => ({
    time: formatTime(metric.timestamp),
    timestamp: metric.timestamp,
    cpu: metric.cpuUsage * 100,
    memory: metric.memoryUsage * 100,
    disk: metric.diskUsage * 100,
    network: metric.networkThroughput / 1024, // Convert to MB/s
    response: metric.responseTime,
    errors: metric.errorCount,
    requests: metric.requestsPerSecond,
  }));

  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;

    if (!active || !payload || !payload.length) {
      return null;
    }

    return (
      <div className="glass-card p-3 border border-white/10 rounded-lg shadow-lg">
        <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-2`}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className={`${theme === 'dark' ? 'text-white/70' : 'text-white/70'} capitalize`}>{entry.dataKey}:</span>
            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
              {entry.dataKey === 'response'
                ? `${entry.value} ms`
                : entry.dataKey === 'network'
                ? `${entry.value.toFixed(1)} MB/s`
                : entry.dataKey.includes('cpu') || entry.dataKey.includes('memory') || entry.dataKey.includes('disk')
                ? `${entry.value.toFixed(1)}%`
                : entry.value.toLocaleString()
              }
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`glass-card rounded-lg border border-white/10 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 glass-panel rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 glass-panel rounded"></div>
            ))}
          </div>
          <div className="h-64 glass-panel rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card rounded-lg border border-white/10 p-6 ${className} hover:scale-[1.02] transition-all duration-300`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>System Performance</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Live</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex glass-panel rounded-lg p-1">
            {(['1h', '6h', '24h', '7d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md transition-all duration-300 hover:scale-105 ${
                  timeRange === range
                    ? 'glass-card text-blue-400 shadow-sm'
                    : `${theme === 'dark' ? 'text-white/70 hover:text-white' : 'text-white/70 hover:text-white/90'}`
                }`}
              >
                {range}
              </button>
            ))}
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={`p-2 ${theme === 'dark' ? 'text-white/60 hover:text-white/80' : 'text-white/60 hover:text-white/80'} transition-all duration-300 hover:scale-105`}
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Metrics */}
      {realTimeData && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="glass-panel p-4 rounded-lg border border-white/20 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>CPU Usage</p>
                <p className={`text-xl font-bold ${realTimeData.cpu > 80 ? (theme === 'dark' ? 'text-red-400' : 'text-red-500') : (theme === 'dark' ? 'text-blue-400' : 'text-blue-500')}`}>
                  {formatPercentage(realTimeData.cpu / 100)}
                </p>
              </div>
              <div className="w-8 h-8 glass-panel rounded-lg flex items-center justify-center">
                🖥️
              </div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-lg border border-white/20 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>Memory</p>
                <p className={`text-xl font-bold ${realTimeData.memory > 90 ? (theme === 'dark' ? 'text-red-400' : 'text-red-500') : (theme === 'dark' ? 'text-green-400' : 'text-green-500')}`}>
                  {formatPercentage(realTimeData.memory / 100)}
                </p>
              </div>
              <div className="w-8 h-8 glass-panel rounded-lg flex items-center justify-center">
                💾
              </div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-lg border border-white/20 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>Disk</p>
                <p className={`text-xl font-bold ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-500'}`}>
                  {formatPercentage(realTimeData.disk / 100)}
                </p>
              </div>
              <div className="w-8 h-8 glass-panel rounded-lg flex items-center justify-center">
                💿
              </div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-lg border border-white/20 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>Network</p>
                <p className={`text-xl font-bold ${theme === 'dark' ? 'text-purple-400' : 'text-purple-500'}`}>
                  {formatBytes(realTimeData.network)}/s
                </p>
              </div>
              <div className="w-8 h-8 glass-panel rounded-lg flex items-center justify-center">
                🌐
              </div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-lg border border-white/20 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>Response</p>
                <p className={`text-xl font-bold ${realTimeData.responseTime > thresholds.responseTime ? (theme === 'dark' ? 'text-red-400' : 'text-red-500') : (theme === 'dark' ? 'text-green-400' : 'text-green-500')}`}>
                  {realTimeData.responseTime}ms
                </p>
              </div>
              <div className="w-8 h-8 glass-panel rounded-lg flex items-center justify-center">
                ⚡
              </div>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-lg border border-white/20 hover:scale-105 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-white/80' : 'text-white/80'}`}>Users</p>
                <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white/90' : 'text-white/90'}`}>
                  {realTimeData.activeUsers}
                </p>
              </div>
              <div className="w-8 h-8 glass-panel rounded-lg flex items-center justify-center">
                👥
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metric Selection Tabs */}
      <div className="border-b border-white/10 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'cpu', label: 'CPU Usage', icon: '🖥️' },
            { id: 'memory', label: 'Memory', icon: '💾' },
            { id: 'disk', label: 'Disk I/O', icon: '💿' },
            { id: 'network', label: 'Network', icon: '🌐' },
            { id: 'response', label: 'Response Time', icon: '⚡' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedMetric(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-all duration-300 hover:scale-105 ${
                selectedMetric === tab.id
                  ? `border-blue-400 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-400'}`
                  : `border-transparent ${theme === 'dark' ? 'text-white/60 hover:text-white/80 hover:border-white/20' : 'text-white/60 hover:text-white/80 hover:border-white/20'}`
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Performance Charts */}
      <div className="space-y-6">
        {selectedMetric === 'cpu' && (
          <div>
            <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-4`}>CPU Usage Over Time</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip content={renderTooltip} />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke={getMetricColor('cpu')}
                  fill={getMetricColor('cpu')}
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {selectedMetric === 'memory' && (
          <div>
            <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-4`}>Memory Usage Over Time</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip content={renderTooltip} />
                <Area
                  type="monotone"
                  dataKey="memory"
                  stroke={getMetricColor('memory')}
                  fill={getMetricColor('memory')}
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {selectedMetric === 'disk' && (
          <div>
            <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-4`}>Disk Usage Over Time</h4>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip content={renderTooltip} />
                <Area
                  type="monotone"
                  dataKey="disk"
                  stroke={getMetricColor('disk')}
                  fill={getMetricColor('disk')}
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {selectedMetric === 'network' && (
          <div>
            <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-4`}>Network Throughput Over Time</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={renderTooltip} />
                <Line
                  type="monotone"
                  dataKey="network"
                  stroke={getMetricColor('network')}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {selectedMetric === 'response' && (
          <div>
            <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-4`}>Response Time Over Time</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={renderTooltip} />
                <Line
                  type="monotone"
                  dataKey="response"
                  stroke={getMetricColor('response')}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Performance Summary */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <h4 className={`text-md font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'} mb-4`}>Performance Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-lg hover:scale-105 transition-all duration-300">
            <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Avg Response Time</p>
            <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
              {chartData.length > 0
                ? Math.round(chartData.reduce((acc, d) => acc + d.response, 0) / chartData.length)
                : 0}ms
            </p>
          </div>
          <div className="glass-panel p-4 rounded-lg hover:scale-105 transition-all duration-300">
            <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Uptime</p>
            <p className={`text-xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`}>99.8%</p>
          </div>
          <div className="glass-panel p-4 rounded-lg hover:scale-105 transition-all duration-300">
            <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Error Rate</p>
            <p className={`text-xl font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`}>0.02%</p>
          </div>
          <div className="glass-panel p-4 rounded-lg hover:scale-105 transition-all duration-300">
            <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-white/70'}`}>Throughput</p>
            <p className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
              {chartData.length > 0
                ? Math.round(chartData.reduce((acc, d) => acc + d.requests, 0) / chartData.length)
                : 0} req/s
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemPerformanceDashboard;