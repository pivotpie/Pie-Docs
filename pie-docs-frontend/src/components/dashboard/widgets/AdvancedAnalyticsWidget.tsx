import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts';
import Widget from '../Widget';
import type { WidgetProps } from '../Widget';

interface ChartData {
  name: string;
  value: number;
  documents?: number;
  processed?: number;
  failed?: number;
  storage?: number;
  [key: string]: any;
}

interface AdvancedAnalyticsWidgetProps extends WidgetProps {
  timeRange?: '7d' | '30d' | '90d' | '1y';
  chartType?: 'line' | 'area' | 'bar' | 'pie';
}

const AdvancedAnalyticsWidget: React.FC<AdvancedAnalyticsWidgetProps> = ({
  timeRange = '30d',
  chartType = 'line',
  ...widgetProps
}) => {
  const [data, setData] = useState<ChartData[]>([]);
  const [selectedMetric, setSelectedMetric] = useState('documents');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data generation
  useEffect(() => {
    const generateData = () => {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const mockData: ChartData[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);

        mockData.push({
          name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          documents: Math.floor(Math.random() * 50) + 20,
          processed: Math.floor(Math.random() * 45) + 15,
          failed: Math.floor(Math.random() * 5) + 1,
          storage: Math.floor(Math.random() * 100) + 50,
          users: Math.floor(Math.random() * 25) + 10,
          workflows: Math.floor(Math.random() * 15) + 5
        });
      }

      setData(mockData);
      setIsLoading(false);
    };

    setIsLoading(true);
    setTimeout(generateData, 500); // Simulate API call
  }, [timeRange]);

  const pieData = [
    { name: 'PDF Documents', value: 45, color: '#8B5CF6' },
    { name: 'Images', value: 25, color: '#06B6D4' },
    { name: 'Word Docs', value: 20, color: '#10B981' },
    { name: 'Other', value: 10, color: '#F59E0B' }
  ];

  const metrics = [
    { key: 'documents', label: 'Documents', color: '#8B5CF6' },
    { key: 'processed', label: 'Processed', color: '#10B981' },
    { key: 'failed', label: 'Failed', color: '#EF4444' },
    { key: 'storage', label: 'Storage (GB)', color: '#06B6D4' }
  ];

  const renderChart = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    const chartProps = {
      width: '100%',
      height: 300,
      data: data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'area':
        return (
          <ResponsiveContainer {...chartProps}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
              />
              <Area
                type="monotone"
                dataKey={selectedMetric}
                stroke={metrics.find(m => m.key === selectedMetric)?.color}
                fill={`${metrics.find(m => m.key === selectedMetric)?.color}40`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer {...chartProps}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17, 24, 39, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#F3F4F6'
                }}
              />
              <Bar
                dataKey={selectedMetric}
                fill={metrics.find(m => m.key === selectedMetric)?.color}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      default: // line
        return (
          <ResponsiveContainer {...chartProps}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
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
                stroke={metrics.find(m => m.key === selectedMetric)?.color}
                strokeWidth={3}
                dot={{ fill: metrics.find(m => m.key === selectedMetric)?.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: metrics.find(m => m.key === selectedMetric)?.color, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  const getTotalValue = () => {
    return data.reduce((sum, item) => sum + (item[selectedMetric] || 0), 0);
  };

  const getGrowthRate = () => {
    if (data.length < 2) return 0;
    const latest = data[data.length - 1]?.[selectedMetric] || 0;
    const previous = data[data.length - 2]?.[selectedMetric] || 0;
    return previous > 0 ? ((latest - previous) / previous * 100) : 0;
  };

  return (
    <Widget {...widgetProps}>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            {metrics.map(metric => (
              <button
                key={metric.key}
                onClick={() => setSelectedMetric(metric.key)}
                className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                  selectedMetric === metric.key
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {metric.label}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1">
            {(['line', 'area', 'bar', 'pie'] as const).map(type => (
              <button
                key={type}
                onClick={() => {}}
                className={`p-1 rounded transition-colors ${
                  chartType === type ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
                title={`${type.charAt(0).toUpperCase() + type.slice(1)} Chart`}
              >
                <div className="w-4 h-4 text-white/70">
                  {type === 'line' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22,6 13,5 2,15"></polyline>
                    </svg>
                  )}
                  {type === 'area' && (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17l6-6 4 4 8-8v11H3z"/>
                    </svg>
                  )}
                  {type === 'bar' && (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <rect x="3" y="3" width="3" height="18"/>
                      <rect x="9" y="8" width="3" height="13"/>
                      <rect x="15" y="5" width="3" height="16"/>
                    </svg>
                  )}
                  {type === 'pie' && (
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2v10l8.66-5A10 10 0 0012 2z"/>
                      <path d="M12 2A10 10 0 002 12h10V2z" opacity="0.6"/>
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-panel p-3 rounded-lg">
            <div className="text-2xl font-bold text-white">
              {getTotalValue().toLocaleString()}
            </div>
            <div className="text-sm text-white/70">
              Total {metrics.find(m => m.key === selectedMetric)?.label}
            </div>
          </div>
          <div className="glass-panel p-3 rounded-lg">
            <div className={`text-2xl font-bold ${getGrowthRate() >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {getGrowthRate() >= 0 ? '+' : ''}{getGrowthRate().toFixed(1)}%
            </div>
            <div className="text-sm text-white/70">Growth Rate</div>
          </div>
        </div>

        {/* Chart */}
        <div className="glass-panel p-4 rounded-lg">
          {renderChart()}
        </div>
      </div>
    </Widget>
  );
};

export default AdvancedAnalyticsWidget;