import React, { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Widget from '../Widget';
import type { WidgetProps } from '../Widget';

interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: number; // percentage change
  threshold: {
    warning: number;
    critical: number;
  };
}

interface PerformanceData {
  timestamp: string;
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  responseTime: number;
  throughput: number;
}

interface PerformanceMonitorWidgetProps extends WidgetProps {
  refreshInterval?: number;
  showAlerts?: boolean;
}

const PerformanceMonitorWidget: React.FC<PerformanceMonitorWidgetProps> = ({
  refreshInterval = 5000,
  showAlerts = true,
  ...widgetProps
}) => {
  const { t } = useTranslation('dashboard');
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string>('cpu');
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<Array<{ id: string; message: string; severity: 'warning' | 'critical'; timestamp: Date }>>([]);

  // Generate mock data
  useEffect(() => {
    const generateMetrics = (): SystemMetric[] => [
      {
        name: t('enhanced.performance.cpuUsage'),
        value: Math.random() * 100,
        unit: '%',
        status: Math.random() > 0.8 ? 'warning' : 'good',
        trend: (Math.random() - 0.5) * 20,
        threshold: { warning: 70, critical: 85 }
      },
      {
        name: t('enhanced.performance.memoryUsage'),
        value: Math.random() * 100,
        unit: '%',
        status: Math.random() > 0.9 ? 'critical' : 'good',
        trend: (Math.random() - 0.5) * 15,
        threshold: { warning: 80, critical: 90 }
      },
      {
        name: t('enhanced.performance.diskIO'),
        value: Math.random() * 100,
        unit: 'MB/s',
        status: 'good',
        trend: (Math.random() - 0.5) * 10,
        threshold: { warning: 500, critical: 800 }
      },
      {
        name: t('enhanced.performance.network'),
        value: Math.random() * 1000,
        unit: 'Mbps',
        status: 'good',
        trend: (Math.random() - 0.5) * 25,
        threshold: { warning: 800, critical: 950 }
      },
      {
        name: t('enhanced.performance.responseTime'),
        value: Math.random() * 1000 + 100,
        unit: 'ms',
        status: Math.random() > 0.7 ? 'warning' : 'good',
        trend: (Math.random() - 0.5) * 30,
        threshold: { warning: 500, critical: 1000 }
      },
      {
        name: t('enhanced.performance.activeUsers'),
        value: Math.floor(Math.random() * 500) + 100,
        unit: '',
        status: 'good',
        trend: (Math.random() - 0.3) * 20,
        threshold: { warning: 400, critical: 480 }
      }
    ];

    const generateHistory = (): PerformanceData[] => {
      const history: PerformanceData[] = [];
      const now = new Date();

      for (let i = 29; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60000); // Last 30 minutes
        history.push({
          timestamp: timestamp.toLocaleTimeString(),
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          disk: Math.random() * 100,
          network: Math.random() * 1000,
          responseTime: Math.random() * 800 + 100,
          throughput: Math.random() * 1000 + 200
        });
      }

      return history;
    };

    const updateData = () => {
      const newMetrics = generateMetrics();
      setMetrics(newMetrics);
      setPerformanceHistory(generateHistory());

      // Check for alerts
      const newAlerts = newMetrics
        .filter(metric => metric.status !== 'good')
        .map(metric => ({
          id: `${metric.name}-${Date.now()}`,
          message: `${metric.name} is at ${metric.value.toFixed(1)}${metric.unit}`,
          severity: metric.status as 'warning' | 'critical',
          timestamp: new Date()
        }));

      if (newAlerts.length > 0) {
        setAlerts(prev => [...newAlerts, ...prev.slice(0, 4)]);
      }

      setIsLoading(false);
    };

    updateData();
    const interval = setInterval(updateData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const getStatusColor = (status: SystemMetric['status']) => {
    switch (status) {
      case 'good': return 'text-green-400 bg-green-500/10';
      case 'warning': return 'text-yellow-400 bg-yellow-500/10';
      case 'critical': return 'text-red-400 bg-red-500/10';
    }
  };

  const getStatusIcon = (status: SystemMetric['status']) => {
    switch (status) {
      case 'good':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'critical':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 5) {
      return (
        <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      );
    } else if (trend < -5) {
      return (
        <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V3a1 1 0 112 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    );
  };

  const systemHealthData = [
    { name: t('enhanced.performance.healthy'), value: metrics.filter(m => m.status === 'good').length, color: '#10B981' },
    { name: t('enhanced.performance.warning'), value: metrics.filter(m => m.status === 'warning').length, color: '#F59E0B' },
    { name: t('enhanced.performance.critical'), value: metrics.filter(m => m.status === 'critical').length, color: '#EF4444' }
  ];

  if (isLoading) {
    return (
      <Widget {...widgetProps}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Widget>
    );
  }

  return (
    <Widget {...widgetProps}>
      <div className="space-y-4">
        {/* System Health Overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={systemHealthData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={30}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {systemHealthData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {Math.round((systemHealthData[0].value / metrics.length) * 100)}%
                </span>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-white">{t('enhanced.performance.systemHealth')}</div>
              <div className="text-xs text-white/60">
                {systemHealthData[0].value} {t('enhanced.performance.servicesHealthy')} {metrics.length}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-white/70">{t('enhanced.performance.live')}</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-panel p-3 rounded-lg cursor-pointer transition-all duration-200 hover:scale-105 ${
                selectedMetric === metric.name.toLowerCase().replace(' ', '')
                  ? 'ring-2 ring-primary-500/50'
                  : ''
              }`}
              onClick={() => setSelectedMetric(metric.name.toLowerCase().replace(' ', ''))}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-1 rounded ${getStatusColor(metric.status)}`}>
                  {getStatusIcon(metric.status)}
                </div>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(metric.trend)}
                  <span className="text-xs text-white/60">
                    {Math.abs(metric.trend).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="text-lg font-bold text-white">
                {metric.value.toFixed(metric.name === 'Active Users' ? 0 : 1)}
                <span className="text-xs text-white/60 ml-1">{metric.unit}</span>
              </div>

              <div className="text-xs text-white/70 mt-1">
                {metric.name}
              </div>

              {/* Threshold indicator */}
              <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    metric.status === 'critical' ? 'bg-red-400' :
                    metric.status === 'warning' ? 'bg-yellow-400' : 'bg-green-400'
                  }`}
                  style={{
                    width: `${Math.min(100, (metric.value / metric.threshold.critical) * 100)}%`
                  }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Performance Chart */}
        <div className="glass-panel p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">{t('enhanced.performance.performanceTrend')}</h4>
            <div className="flex items-center space-x-1">
              {[
                { key: 'cpu', label: t('enhanced.performance.cpu') },
                { key: 'memory', label: t('enhanced.performance.memory') },
                { key: 'responseTime', label: t('enhanced.performance.responseTime') }
              ].map(metric => (
                <button
                  key={metric.key}
                  onClick={() => setSelectedMetric(metric.key)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedMetric === metric.key
                      ? 'bg-white/20 text-white'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {metric.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceHistory}>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, stroke: '#8B5CF6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Alerts */}
        {showAlerts && alerts.length > 0 && (
          <div className="glass-panel p-4 rounded-lg">
            <h4 className="text-sm font-medium text-white mb-3">{t('enhanced.performance.recentAlerts')}</h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center space-x-3 p-2 rounded-lg ${
                    alert.severity === 'critical' ? 'bg-red-500/10' : 'bg-yellow-500/10'
                  }`}
                >
                  <div className={`p-1 rounded ${
                    alert.severity === 'critical' ? 'text-red-400' : 'text-yellow-400'
                  }`}>
                    {getStatusIcon(alert.severity)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/90 truncate">
                      {alert.message}
                    </div>
                    <div className="text-xs text-white/50">
                      {alert.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Widget>
  );
};

export default PerformanceMonitorWidget;