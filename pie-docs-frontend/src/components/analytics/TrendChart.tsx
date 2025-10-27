import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import type { TrendData } from '@/types/domain/ExecutiveAnalytics';

export interface TrendChartProps {
  data: TrendData[];
  type?: 'line' | 'area' | 'bar';
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  metrics?: string[];
  colors?: Record<string, string>;
  timeFormat?: string;
  valueFormatter?: (value: number) => string;
  title?: string;
  className?: string;
}

const TrendChart: React.FC<TrendChartProps> = ({
  data,
  type = 'line',
  height = 300,
  showLegend = true,
  showGrid = true,
  metrics = [],
  colors = {
    documents: '#3B82F6',
    users: '#10B981',
    workflows: '#8B5CF6',
    storage: '#F59E0B',
    performance: '#EF4444',
  },
  timeFormat = 'MMM dd',
  valueFormatter = (value: number) => value.toLocaleString(),
  title,
  className = '',
}) => {
  const { theme } = useTheme();
  // Process and group data by timestamp
  const chartData = useMemo(() => {
    const groupedData = data.reduce((acc, item) => {
      const timeKey = format(new Date(item.timestamp), timeFormat);

      if (!acc[timeKey]) {
        acc[timeKey] = { time: timeKey, timestamp: item.timestamp };
      }

      acc[timeKey][item.metric] = item.value;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(groupedData).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [data, timeFormat]);

  // Get unique metrics from data if not provided
  const uniqueMetrics = useMemo(() => {
    if (metrics.length > 0) return metrics;

    const metricSet = new Set<string>();
    data.forEach(item => metricSet.add(item.metric));
    return Array.from(metricSet);
  }, [data, metrics]);

  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;

    if (!active || !payload || !payload.length) {
      return null;
    }

    return (
      <div className="glass-card border-white/10">
        <p className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white/90' : 'text-white/90'}`}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className={`capitalize ${theme === 'dark' ? 'text-white/70' : 'text-white/80'}`}>{entry.dataKey}:</span>
            <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
              {valueFormatter(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    const chartComponents = uniqueMetrics.map((metric, index) => {
      const color = colors[metric] || `hsl(${index * 60}, 70%, 50%)`;

      switch (type) {
        case 'area':
          return (
            <Area
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={color}
              fill={color}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          );
        case 'bar':
          return (
            <Bar
              key={metric}
              dataKey={metric}
              fill={color}
              radius={[2, 2, 0, 0]}
            />
          );
        default:
          return (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={color}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          );
      }
    });

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={valueFormatter}
            />
            <Tooltip content={renderTooltip} />
            {showLegend && <Legend />}
            {chartComponents}
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={valueFormatter}
            />
            <Tooltip content={renderTooltip} />
            {showLegend && <Legend />}
            {chartComponents}
          </BarChart>
        );
      default:
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" className="opacity-30" />}
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={valueFormatter}
            />
            <Tooltip content={renderTooltip} />
            {showLegend && <Legend />}
            {chartComponents}
          </LineChart>
        );
    }
  };

  if (chartData.length === 0) {
    return (
      <div className={`glass-card hover:scale-105 transition-all duration-300 ${className}`}>
        {title && <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>{title}</h3>}
        <div
          className={`flex items-center justify-center ${theme === 'dark' ? 'text-white/60' : 'text-white/70'}`}
          style={{ height }}
        >
          <div className="text-center">
            <svg className={`w-12 h-12 mx-auto mb-2 ${theme === 'dark' ? 'text-white/30' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            <p className="text-sm">No trend data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card hover:scale-105 transition-all duration-300 ${className}`}>
      {title && <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;