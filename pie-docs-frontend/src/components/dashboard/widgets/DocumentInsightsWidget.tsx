import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Widget from '../Widget';
import type { WidgetProps } from '../Widget';

interface DocumentInsight {
  id: string;
  type: 'trend' | 'anomaly' | 'recommendation' | 'achievement';
  title: string;
  description: string;
  value?: string | number;
  change?: number;
  severity?: 'low' | 'medium' | 'high';
  action?: string;
  timestamp: Date;
  category: 'processing' | 'storage' | 'security' | 'usage' | 'performance';
}

interface DocumentStats {
  totalDocuments: number;
  processingQueue: number;
  failedProcessing: number;
  storageUsed: string;
  avgProcessingTime: string;
  popularFormats: Array<{ name: string; count: number; percentage: number }>;
  recentTrends: Array<{ metric: string; change: number; timeframe: string }>;
}

interface DocumentInsightsWidgetProps extends WidgetProps {
  refreshInterval?: number;
}

const DocumentInsightsWidget: React.FC<DocumentInsightsWidgetProps> = ({
  refreshInterval = 30000,
  ...widgetProps
}) => {
  const { t } = useTranslation('dashboard');
  const [insights, setInsights] = useState<DocumentInsight[]>([]);
  const [stats, setStats] = useState<DocumentStats | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data generation
  useEffect(() => {
    const generateInsights = (): DocumentInsight[] => [
      {
        id: '1',
        type: 'trend',
        title: 'PDF Processing Spike',
        description: 'PDF document processing increased by 34% this week',
        value: '+34%',
        change: 34,
        severity: 'medium',
        timestamp: new Date(),
        category: 'processing',
        action: 'Monitor processing capacity'
      },
      {
        id: '2',
        type: 'anomaly',
        title: 'High Failure Rate Detected',
        description: 'OCR failure rate for scanned documents is above normal',
        value: '8.5%',
        change: 12,
        severity: 'high',
        timestamp: new Date(Date.now() - 3600000),
        category: 'processing',
        action: 'Review OCR configuration'
      },
      {
        id: '3',
        type: 'recommendation',
        title: 'Storage Optimization',
        description: 'Consider archiving documents older than 2 years',
        value: '2.3GB',
        severity: 'low',
        timestamp: new Date(Date.now() - 7200000),
        category: 'storage',
        action: 'Set up archival policy'
      },
      {
        id: '4',
        type: 'achievement',
        title: 'Processing Milestone',
        description: 'Successfully processed 10,000 documents this month',
        value: '10,000',
        timestamp: new Date(Date.now() - 1800000),
        category: 'performance',
        action: 'View detailed report'
      },
      {
        id: '5',
        type: 'trend',
        title: 'User Adoption Growth',
        description: 'Active users increased by 15% in the last 30 days',
        value: '+15%',
        change: 15,
        severity: 'low',
        timestamp: new Date(Date.now() - 10800000),
        category: 'usage'
      }
    ];

    const generateStats = (): DocumentStats => ({
      totalDocuments: 45672,
      processingQueue: 23,
      failedProcessing: 7,
      storageUsed: '2.8TB',
      avgProcessingTime: '1.4s',
      popularFormats: [
        { name: 'PDF', count: 18234, percentage: 40 },
        { name: 'DOCX', count: 13701, percentage: 30 },
        { name: 'JPEG', count: 9134, percentage: 20 },
        { name: 'PNG', count: 4603, percentage: 10 }
      ],
      recentTrends: [
        { metric: 'Upload Volume', change: 12, timeframe: '7 days' },
        { metric: 'Processing Speed', change: -5, timeframe: '24 hours' },
        { metric: 'Storage Growth', change: 8, timeframe: '30 days' }
      ]
    });

    setIsLoading(true);
    setTimeout(() => {
      setInsights(generateInsights());
      setStats(generateStats());
      setIsLoading(false);
    }, 1000);
  }, []);

  const getInsightIcon = (type: DocumentInsight['type']) => {
    switch (type) {
      case 'trend':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'anomaly':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'recommendation':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'achievement':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
    }
  };

  const getSeverityColor = (severity?: DocumentInsight['severity']) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-500/10';
      case 'medium': return 'text-yellow-400 bg-yellow-500/10';
      case 'low': return 'text-green-400 bg-green-500/10';
      default: return 'text-blue-400 bg-blue-500/10';
    }
  };

  const getTypeColor = (type: DocumentInsight['type']) => {
    switch (type) {
      case 'trend': return 'text-purple-400';
      case 'anomaly': return 'text-red-400';
      case 'recommendation': return 'text-blue-400';
      case 'achievement': return 'text-green-400';
    }
  };

  const filteredInsights = selectedCategory === 'all'
    ? insights
    : insights.filter(insight => insight.category === selectedCategory);

  const categories = [
    { id: 'all', label: t('enhanced.insights.categories.all'), color: 'text-white' },
    { id: 'processing', label: t('enhanced.insights.categories.processing'), color: 'text-blue-400' },
    { id: 'storage', label: t('enhanced.insights.categories.storage'), color: 'text-green-400' },
    { id: 'security', label: t('enhanced.insights.categories.security'), color: 'text-red-400' },
    { id: 'usage', label: t('enhanced.insights.categories.usage'), color: 'text-purple-400' },
    { id: 'performance', label: t('enhanced.insights.categories.performance'), color: 'text-yellow-400' }
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
        {/* Key Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-panel p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-white">{stats?.totalDocuments.toLocaleString()}</div>
            <div className="text-xs text-white/60">{t('modern.widgets.documentInsightsWidget.totalDocs')}</div>
          </div>
          <div className="glass-panel p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-yellow-400">{stats?.processingQueue}</div>
            <div className="text-xs text-white/60">{t('modern.widgets.documentInsightsWidget.inQueue')}</div>
          </div>
          <div className="glass-panel p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-green-400">{stats?.avgProcessingTime}</div>
            <div className="text-xs text-white/60">{t('modern.widgets.documentInsightsWidget.avgTime')}</div>
          </div>
          <div className="glass-panel p-3 rounded-lg text-center">
            <div className="text-lg font-bold text-blue-400">{stats?.storageUsed}</div>
            <div className="text-xs text-white/60">{t('modern.widgets.documentInsightsWidget.storage')}</div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                selectedCategory === category.id
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Insights List */}
        <div className="space-y-3 max-h-80 overflow-y-auto">
          <AnimatePresence>
            {filteredInsights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`glass-panel p-4 rounded-lg cursor-pointer hover:bg-white/10 transition-all duration-200 ${getSeverityColor(insight.severity)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${getSeverityColor(insight.severity)}`}>
                    <div className={getTypeColor(insight.type)}>
                      {getInsightIcon(insight.type)}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-white truncate">
                        {insight.title}
                      </h4>
                      {insight.value && (
                        <span className={`text-sm font-bold ${getTypeColor(insight.type)}`}>
                          {insight.value}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-white/70 mt-1 line-clamp-2">
                      {insight.description}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-white/50">
                        {insight.timestamp.toLocaleTimeString()}
                      </span>
                      {insight.action && (
                        <button className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
                          {insight.action}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Format Distribution */}
        <div className="glass-panel p-4 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-3">{t('modern.widgets.documentInsightsWidget.popularFormats')}</h4>
          <div className="space-y-2">
            {stats?.popularFormats.map((format, index) => (
              <div key={format.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: `hsl(${index * 90}, 70%, 60%)` }}
                  />
                  <span className="text-xs text-white/70">{format.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-white">{format.count.toLocaleString()}</span>
                  <span className="text-xs text-white/50">({format.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Widget>
  );
};

export default DocumentInsightsWidget;