import React, { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { DepartmentUsageStats } from '@/types/domain/ExecutiveAnalytics';

export interface DepartmentUsageAnalyticsProps {
  departments: DepartmentUsageStats[];
  loading?: boolean;
  comparisonMode?: 'absolute' | 'relative';
  onComparisonModeChange?: (mode: 'absolute' | 'relative') => void;
  onDepartmentSelect?: (departmentId: string) => void;
  selectedDepartment?: string | null;
  className?: string;
}

const DepartmentUsageAnalytics: React.FC<DepartmentUsageAnalyticsProps> = ({
  departments,
  loading = false,
  comparisonMode = 'absolute',
  onComparisonModeChange,
  onDepartmentSelect,
  selectedDepartment,
  className = '',
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'users' | 'efficiency'>('overview');

  const formatStorage = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 10) / 10 + ' ' + sizes[i];
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 0.9) return 'text-green-600 bg-green-100';
    if (efficiency >= 0.8) return 'text-blue-600 bg-blue-100';
    if (efficiency >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getBenchmarkColor = (benchmark: number) => {
    if (benchmark >= 1.1) return 'text-green-600';
    if (benchmark >= 0.9) return 'text-blue-600';
    if (benchmark >= 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBenchmarkIcon = (benchmark: number) => {
    if (benchmark >= 1.1) return '⬆️';
    if (benchmark >= 0.9) return '➡️';
    return '⬇️';
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

  const pieChartData = departments.map((dept, index) => ({
    name: dept.departmentName,
    value: dept.documentCount,
    color: COLORS[index % COLORS.length],
  }));

  const barChartData = departments.map(dept => ({
    name: dept.departmentName.substring(0, 8) + (dept.departmentName.length > 8 ? '...' : ''),
    fullName: dept.departmentName,
    documents: dept.documentCount,
    users: dept.activeUsers,
    efficiency: dept.efficiency * 100,
    storage: dept.storageUsed / (1024 * 1024 * 1024), // Convert to GB
  }));

  const renderTooltip = (props: any) => {
    const { active, payload, label } = props;

    if (!active || !payload || !payload.length) {
      return null;
    }

    const data = payload[0].payload;

    return (
      <div className="glass-card p-3 border border-white/10 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900 mb-2">{data.fullName}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 capitalize">{entry.dataKey}:</span>
            <span className="font-medium text-gray-900">
              {entry.dataKey === 'storage'
                ? `${entry.value.toFixed(1)} GB`
                : entry.dataKey === 'efficiency'
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 glass-panel rounded"></div>
            ))}
          </div>
          <div className="h-64 glass-panel rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Department Usage Analytics</h3>
        <div className="flex items-center space-x-4">
          <div className="flex glass-panel rounded-lg p-1">
            <button
              onClick={() => onComparisonModeChange?.('absolute')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                comparisonMode === 'absolute'
                  ? 'glass-card text-blue-400 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Absolute
            </button>
            <button
              onClick={() => onComparisonModeChange?.('relative')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                comparisonMode === 'relative'
                  ? 'glass-card text-blue-400 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Relative
            </button>
          </div>
        </div>
      </div>

      {/* Department Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {departments.map((dept) => (
          <div
            key={dept.departmentId}
            className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
              selectedDepartment === dept.departmentId
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onDepartmentSelect?.(dept.departmentId)}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 truncate">{dept.departmentName}</h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEfficiencyColor(dept.efficiency)}`}>
                {formatPercentage(dept.efficiency)}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Documents:</span>
                <span className="font-medium">{dept.documentCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Users:</span>
                <span className="font-medium">{dept.activeUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Storage:</span>
                <span className="font-medium">{formatStorage(dept.storageUsed)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">vs Benchmark:</span>
                <div className="flex items-center space-x-1">
                  <span className="text-xs">{getBenchmarkIcon(dept.benchmarkComparison)}</span>
                  <span className={`font-medium ${getBenchmarkColor(dept.benchmarkComparison)}`}>
                    {(dept.benchmarkComparison * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'documents', label: 'Documents', icon: '📄' },
            { id: 'users', label: 'Users', icon: '👥' },
            { id: 'efficiency', label: 'Efficiency', icon: '⚡' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Document Distribution</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Efficiency Comparison */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Efficiency Comparison</h4>
              <div className="space-y-3">
                {departments
                  .sort((a, b) => b.efficiency - a.efficiency)
                  .map((dept) => (
                    <div key={dept.departmentId} className="flex items-center justify-between p-3 glass-panel rounded-lg">
                      <span className="font-medium text-gray-900">{dept.departmentName}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 glass-panel rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${dept.efficiency * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-12 text-right">
                          {formatPercentage(dept.efficiency)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Document Count by Department</h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={renderTooltip} />
                <Bar dataKey="documents" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Active Users by Department</h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={renderTooltip} />
                <Bar dataKey="users" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'efficiency' && (
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-4">Department Efficiency Scores</h4>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip content={renderTooltip} />
                <Bar dataKey="efficiency" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentUsageAnalytics;