import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Centralized dashboard data interface
export interface DashboardData {
  // Core metrics
  totalDocuments: number;
  processingQueue: number;
  completedToday: number;
  failedProcessing: number;
  activeUsers: number;
  activeWorkflows: number;

  // System metrics
  systemHealth: number;
  storageUsed: string;
  storageUsedGB: number;
  avgProcessingTime: string;
  avgResponseTime: number;
  uptime: number;

  // Activity metrics
  totalSessions: number;
  averageSessionDuration: string;
  documentInteractions: number;
  peakDay: string;
  peakHour: string;

  // Document format breakdown
  documentFormats: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;

  // Time-based data for charts
  timeSeriesData: Array<{
    name: string;
    documents: number;
    processed: number;
    failed: number;
    storage: number;
    users: number;
    workflows: number;
    responseTime: number;
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    throughput: number;
  }>;

  // Activity heatmap data
  activityHeatmap: Array<{
    hour: number;
    day: number;
    value: number;
    count: number;
  }>;

  // Recent activities
  recentActivities: Array<{
    id: string;
    type: 'document' | 'workflow' | 'user' | 'system';
    message: string;
    timestamp: Date;
    status: 'success' | 'warning' | 'error' | 'info';
  }>;

  // Notifications
  notifications: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'system';
    title: string;
    message: string;
    timestamp: Date;
    isRead: boolean;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    category: 'document' | 'workflow' | 'system' | 'security' | 'user' | 'approval';
  }>;

  lastUpdated: Date;
}

interface DashboardDataContextType {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

export const useDashboardData = () => {
  const context = useContext(DashboardDataContext);
  if (context === undefined) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider');
  }
  return context;
};

interface DashboardDataProviderProps {
  children: ReactNode;
}

export const DashboardDataProvider: React.FC<DashboardDataProviderProps> = ({ children }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateMockData = (): DashboardData => {
    const totalDocuments = 45672;
    const processingQueue = 23;
    const completedToday = 189;
    const failedProcessing = 7;
    const activeUsers = 127;
    const activeWorkflows = 12;
    const storageUsedGB = 2847; // GB
    const systemHealth = 98.5;
    const avgResponseTime = 145; // ms

    // Generate consistent time series data
    const timeSeriesData = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      timeSeriesData.push({
        name: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        documents: Math.floor(Math.random() * 50) + (totalDocuments / 30) - 25,
        processed: Math.floor(Math.random() * 45) + (completedToday - 20),
        failed: Math.floor(Math.random() * 5) + 1,
        storage: storageUsedGB + Math.floor(Math.random() * 100) - 50,
        users: Math.floor(Math.random() * 25) + (activeUsers - 15),
        workflows: Math.floor(Math.random() * 15) + 5,
        responseTime: avgResponseTime + Math.floor(Math.random() * 100) - 50,
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: Math.random() * 1000,
        throughput: Math.random() * 1000 + 200
      });
    }

    // Generate activity heatmap data
    const activityHeatmap = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        let baseActivity = 0;
        // Weekend vs weekday patterns
        if (day === 0 || day === 6) { // Weekend
          if (hour >= 10 && hour <= 22) {
            baseActivity = Math.random() * 40 + 20;
          } else {
            baseActivity = Math.random() * 15;
          }
        } else { // Weekday
          if (hour >= 8 && hour <= 18) {
            baseActivity = Math.random() * 80 + 40;
          } else if (hour >= 19 && hour <= 23) {
            baseActivity = Math.random() * 30 + 10;
          } else {
            baseActivity = Math.random() * 10;
          }
        }

        const variance = (Math.random() - 0.5) * 20;
        const value = Math.max(0, Math.min(100, baseActivity + variance));
        const count = Math.floor(value * 2.5);

        activityHeatmap.push({ hour, day, value, count });
      }
    }

    const documentFormats = [
      { name: 'PDF', count: Math.floor(totalDocuments * 0.4), percentage: 40 },
      { name: 'DOCX', count: Math.floor(totalDocuments * 0.3), percentage: 30 },
      { name: 'JPEG', count: Math.floor(totalDocuments * 0.2), percentage: 20 },
      { name: 'PNG', count: Math.floor(totalDocuments * 0.1), percentage: 10 }
    ];

    const recentActivities = [
      {
        id: '1',
        type: 'document' as const,
        message: `Invoice #INV-2024-001 processed successfully`,
        timestamp: new Date(Date.now() - 300000), // 5 min ago
        status: 'success' as const
      },
      {
        id: '2',
        type: 'workflow' as const,
        message: `Contract workflow completed`,
        timestamp: new Date(Date.now() - 600000), // 10 min ago
        status: 'success' as const
      },
      {
        id: '3',
        type: 'system' as const,
        message: `OCR processing failed for document #${Math.floor(Math.random() * 1000)}`,
        timestamp: new Date(Date.now() - 900000), // 15 min ago
        status: 'error' as const
      },
      {
        id: '4',
        type: 'user' as const,
        message: `${Math.floor(Math.random() * 50) + 10} documents uploaded`,
        timestamp: new Date(Date.now() - 1200000), // 20 min ago
        status: 'info' as const
      }
    ];

    const notifications = [
      {
        id: '1',
        type: 'info' as const,
        title: 'Document Processing Complete',
        message: 'Invoice #INV-2024-001 has been successfully processed and indexed.',
        timestamp: new Date(Date.now() - 300000),
        isRead: false,
        priority: 'normal' as const,
        category: 'document' as const
      },
      {
        id: '2',
        type: 'warning' as const,
        title: 'Storage Space Warning',
        message: `System storage is 85% full. Consider archiving older documents.`,
        timestamp: new Date(Date.now() - 3600000),
        isRead: false,
        priority: 'high' as const,
        category: 'system' as const
      },
      {
        id: '3',
        type: 'success' as const,
        title: 'Workflow Completed',
        message: 'Contract approval workflow has been completed successfully.',
        timestamp: new Date(Date.now() - 7200000),
        isRead: true,
        priority: 'normal' as const,
        category: 'workflow' as const
      }
    ];

    // Calculate peak activity
    const dayTotals = Array(7).fill(0);
    const hourTotals = Array(24).fill(0);

    activityHeatmap.forEach(cell => {
      dayTotals[cell.day] += cell.value;
      hourTotals[cell.hour] += cell.value;
    });

    const peakDayIndex = dayTotals.indexOf(Math.max(...dayTotals));
    const peakHourIndex = hourTotals.indexOf(Math.max(...hourTotals));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return {
      totalDocuments,
      processingQueue,
      completedToday,
      failedProcessing,
      activeUsers,
      activeWorkflows,
      systemHealth,
      storageUsed: `${(storageUsedGB / 1000).toFixed(1)}TB`,
      storageUsedGB,
      avgProcessingTime: `${Math.floor(avgResponseTime / 100)}.${avgResponseTime % 100}s`,
      avgResponseTime,
      uptime: systemHealth,
      totalSessions: Math.floor(activeUsers * 8.5), // ~8.5 sessions per user
      averageSessionDuration: `${Math.floor(Math.random() * 30) + 15}m`,
      documentInteractions: Math.floor(totalDocuments * 0.15), // 15% interaction rate
      peakDay: days[peakDayIndex],
      peakHour: `${peakHourIndex}:00`,
      documentFormats,
      timeSeriesData,
      activityHeatmap,
      recentActivities,
      notifications,
      lastUpdated: new Date()
    };
  };

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newData = generateMockData();
      setData(newData);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const contextValue: DashboardDataContextType = {
    data,
    isLoading,
    error,
    refreshData
  };

  return (
    <DashboardDataContext.Provider value={contextValue}>
      {children}
    </DashboardDataContext.Provider>
  );
};