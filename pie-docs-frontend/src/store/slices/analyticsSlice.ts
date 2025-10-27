import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  ExecutiveAnalyticsData,
  KPIMetrics,
  TrendData,
  DepartmentUsageStats,
  ROICalculation,
  PerformanceMetrics,
  AnalyticsFilters,
  TimeRange,
  ScheduledReport,
  DrillDownPath,
  CustomDashboard
} from '@/types/domain/ExecutiveAnalytics';

interface AnalyticsState {
  // Main analytics data
  analyticsData: ExecutiveAnalyticsData | null;

  // Dashboard state
  dashboard: {
    kpiCards: KPIMetrics | null;
    selectedTimeRange: TimeRange;
    refreshInterval: number;
    autoRefresh: boolean;
    isLoading: boolean;
    lastUpdated: string | null; // ISO string for Redux serialization
  };

  // Trends and forecasting
  trends: {
    historicalData: TrendData[];
    forecastData: any[];
    selectedMetrics: string[];
    comparisonPeriods: string[];
    isLoading: boolean;
  };

  // Department analytics
  departmentUsage: {
    departments: DepartmentUsageStats[];
    selectedDepartment: string | null;
    comparisonMode: 'absolute' | 'relative';
    isLoading: boolean;
  };

  // ROI calculations
  roi: {
    calculation: ROICalculation | null;
    parameters: Record<string, any>;
    projections: any[];
    isLoading: boolean;
  };

  // Performance monitoring
  performance: {
    metrics: PerformanceMetrics[];
    alerts: any[];
    thresholds: Record<string, number>;
    isLoading: boolean;
  };

  // Reporting
  reporting: {
    scheduledReports: ScheduledReport[];
    exportQueue: any[];
    templates: any[];
    isExporting: boolean;
  };

  // Drill-down navigation
  drillDown: {
    currentPath: DrillDownPath | null;
    availableFilters: AnalyticsFilters;
    activeFilters: AnalyticsFilters;
    savedViews: any[];
  };

  // Custom dashboards
  customDashboards: {
    dashboards: CustomDashboard[];
    currentDashboard: string | null;
    isEditing: boolean;
  };

  // Global state
  isLoading: boolean;
  error: string | null;
}

const initialTimeRange: TimeRange = {
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  end: new Date().toISOString(),
  period: 'week'
};

const initialState: AnalyticsState = {
  analyticsData: null,

  dashboard: {
    kpiCards: null,
    selectedTimeRange: initialTimeRange,
    refreshInterval: 30000, // 30 seconds
    autoRefresh: true,
    isLoading: false,
    lastUpdated: null,
  },

  trends: {
    historicalData: [],
    forecastData: [],
    selectedMetrics: ['documents', 'users', 'workflows'],
    comparisonPeriods: ['previous_period'],
    isLoading: false,
  },

  departmentUsage: {
    departments: [],
    selectedDepartment: null,
    comparisonMode: 'absolute',
    isLoading: false,
  },

  roi: {
    calculation: null,
    parameters: {},
    projections: [],
    isLoading: false,
  },

  performance: {
    metrics: [],
    alerts: [],
    thresholds: {
      responseTime: 1000, // 1 second
      errorRate: 0.05, // 5%
      cpuUsage: 0.8, // 80%
      memoryUsage: 0.9, // 90%
    },
    isLoading: false,
  },

  reporting: {
    scheduledReports: [],
    exportQueue: [],
    templates: [],
    isExporting: false,
  },

  drillDown: {
    currentPath: null,
    availableFilters: {
      timeRange: initialTimeRange,
    },
    activeFilters: {
      timeRange: initialTimeRange,
    },
    savedViews: [],
  },

  customDashboards: {
    dashboards: [],
    currentDashboard: null,
    isEditing: false,
  },

  isLoading: false,
  error: null,
};

// Async thunks for API calls
export const fetchAnalyticsData = createAsyncThunk(
  'analytics/fetchAnalyticsData',
  async (filters: AnalyticsFilters) => {
    // Mock API call - replace with actual API
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockData: ExecutiveAnalyticsData = {
      kpiMetrics: {
        documentProcessing: {
          totalDocuments: 15847,
          documentsCreated: 234,
          documentsAccessed: 1456,
          processingTime: 2.3,
          growthRate: 0.15,
          documentsProcessedToday: 89,
          averageProcessingTime: 1.8,
        },
        userAdoption: {
          activeUsers: 342,
          newUsers: 23,
          userEngagement: 0.78,
          adoptionRate: 0.85,
          departmentPenetration: {
            'HR': 0.92,
            'Finance': 0.88,
            'Legal': 0.95,
            'Operations': 0.76
          },
          loginFrequency: 4.2,
        },
        systemPerformance: {
          uptime: 0.998,
          averageResponseTime: 145,
          errorRate: 0.002,
          throughput: 1250,
          availability: 0.999,
          storageUtilization: 0.67,
        },
        workflowEfficiency: {
          completedWorkflows: 167,
          averageCompletionTime: 4.5,
          bottleneckIdentification: ['Document Review', 'Final Approval'],
          automationRate: 0.73,
          pendingTasks: 45,
          slaCompliance: 0.94,
        },
      },
      trendData: generateMockTrendData(),
      forecastData: [],
      departmentUsage: generateMockDepartmentData(),
      roiCalculation: {
        totalCostSavings: 285000,
        productivityImprovement: 0.32,
        storageCostReduction: 45000,
        workflowAutomationSavings: 120000,
        complianceEfficiency: 0.28,
        timeSavings: 1200, // hours per month
        roi: 3.45,
        paybackPeriod: 8.5, // months
        projectedAnnualSavings: 650000,
      },
      performanceMetrics: generateMockPerformanceData(),
      lastUpdated: new Date().toISOString(),
    };

    return mockData;
  }
);

export const exportAnalyticsData = createAsyncThunk(
  'analytics/exportData',
  async (params: { format: 'pdf' | 'excel'; filters: AnalyticsFilters }) => {
    // Mock export process
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { url: `mock-export.${params.format}`, filename: `analytics-${Date.now()}.${params.format}` };
  }
);

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setTimeRange: (state, action: PayloadAction<TimeRange>) => {
      state.dashboard.selectedTimeRange = action.payload;
      state.drillDown.activeFilters.timeRange = action.payload;
    },

    setRefreshInterval: (state, action: PayloadAction<number>) => {
      state.dashboard.refreshInterval = action.payload;
    },

    toggleAutoRefresh: (state) => {
      state.dashboard.autoRefresh = !state.dashboard.autoRefresh;
    },

    setSelectedMetrics: (state, action: PayloadAction<string[]>) => {
      state.trends.selectedMetrics = action.payload;
    },

    setSelectedDepartment: (state, action: PayloadAction<string | null>) => {
      state.departmentUsage.selectedDepartment = action.payload;
    },

    setComparisonMode: (state, action: PayloadAction<'absolute' | 'relative'>) => {
      state.departmentUsage.comparisonMode = action.payload;
    },

    updateDrillDownPath: (state, action: PayloadAction<DrillDownPath>) => {
      state.drillDown.currentPath = action.payload;
    },

    clearDrillDownPath: (state) => {
      state.drillDown.currentPath = null;
    },

    setActiveFilters: (state, action: PayloadAction<Partial<AnalyticsFilters>>) => {
      state.drillDown.activeFilters = { ...state.drillDown.activeFilters, ...action.payload };
    },

    clearError: (state) => {
      state.error = null;
    },

    setCurrentDashboard: (state, action: PayloadAction<string>) => {
      state.customDashboards.currentDashboard = action.payload;
    },

    toggleDashboardEditing: (state) => {
      state.customDashboards.isEditing = !state.customDashboards.isEditing;
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalyticsData.pending, (state) => {
        state.isLoading = true;
        state.dashboard.isLoading = true;
        state.error = null;
      })
      .addCase(fetchAnalyticsData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.dashboard.isLoading = false;
        state.analyticsData = action.payload;
        state.dashboard.kpiCards = action.payload.kpiMetrics;
        state.trends.historicalData = action.payload.trendData;
        state.departmentUsage.departments = action.payload.departmentUsage;
        state.roi.calculation = action.payload.roiCalculation;
        state.performance.metrics = action.payload.performanceMetrics;
        state.dashboard.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchAnalyticsData.rejected, (state, action) => {
        state.isLoading = false;
        state.dashboard.isLoading = false;
        state.error = action.error.message || 'Failed to fetch analytics data';
      })
      .addCase(exportAnalyticsData.pending, (state) => {
        state.reporting.isExporting = true;
      })
      .addCase(exportAnalyticsData.fulfilled, (state, action) => {
        state.reporting.isExporting = false;
        state.reporting.exportQueue.push(action.payload);
      })
      .addCase(exportAnalyticsData.rejected, (state) => {
        state.reporting.isExporting = false;
      });
  },
});

// Mock data generators
function generateMockTrendData(): TrendData[] {
  const data: TrendData[] = [];
  const now = new Date();

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);

    data.push(
      {
        timestamp: date.toISOString(),
        value: Math.floor(Math.random() * 100) + 50 + i * 2,
        metric: 'documents',
        category: 'creation'
      },
      {
        timestamp: date.toISOString(),
        value: Math.floor(Math.random() * 50) + 20 + i,
        metric: 'users',
        category: 'active'
      },
      {
        timestamp: date.toISOString(),
        value: Math.floor(Math.random() * 30) + 10 + i * 0.5,
        metric: 'workflows',
        category: 'completed'
      }
    );
  }

  return data;
}

function generateMockDepartmentData(): DepartmentUsageStats[] {
  return [
    {
      departmentId: 'hr',
      departmentName: 'Human Resources',
      documentCount: 2847,
      activeUsers: 45,
      storageUsed: 125000000, // bytes
      workflowsCompleted: 89,
      efficiency: 0.92,
      lastActivity: new Date().toISOString(),
      growthRate: 0.15,
      benchmarkComparison: 1.08
    },
    {
      departmentId: 'finance',
      departmentName: 'Finance',
      documentCount: 5234,
      activeUsers: 67,
      storageUsed: 245000000,
      workflowsCompleted: 156,
      efficiency: 0.88,
      lastActivity: new Date().toISOString(),
      growthRate: 0.22,
      benchmarkComparison: 1.12
    },
    {
      departmentId: 'legal',
      departmentName: 'Legal',
      documentCount: 3421,
      activeUsers: 23,
      storageUsed: 189000000,
      workflowsCompleted: 67,
      efficiency: 0.95,
      lastActivity: new Date().toISOString(),
      growthRate: 0.08,
      benchmarkComparison: 1.25
    },
    {
      departmentId: 'operations',
      departmentName: 'Operations',
      documentCount: 4345,
      activeUsers: 78,
      storageUsed: 167000000,
      workflowsCompleted: 234,
      efficiency: 0.76,
      lastActivity: new Date().toISOString(),
      growthRate: 0.35,
      benchmarkComparison: 0.95
    }
  ];
}

function generateMockPerformanceData(): PerformanceMetrics[] {
  const data: PerformanceMetrics[] = [];
  const now = new Date();

  for (let i = 24; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);

    data.push({
      timestamp: timestamp.toISOString(),
      cpuUsage: Math.random() * 0.4 + 0.3, // 30-70%
      memoryUsage: Math.random() * 0.3 + 0.5, // 50-80%
      diskUsage: Math.random() * 0.1 + 0.6, // 60-70%
      networkThroughput: Math.random() * 1000 + 500,
      activeConnections: Math.floor(Math.random() * 200) + 100,
      responseTime: Math.random() * 200 + 100,
      errorCount: Math.floor(Math.random() * 5),
      requestsPerSecond: Math.random() * 50 + 25
    });
  }

  return data;
}

export const {
  setTimeRange,
  setRefreshInterval,
  toggleAutoRefresh,
  setSelectedMetrics,
  setSelectedDepartment,
  setComparisonMode,
  updateDrillDownPath,
  clearDrillDownPath,
  setActiveFilters,
  clearError,
  setCurrentDashboard,
  toggleDashboardEditing,
} = analyticsSlice.actions;

export default analyticsSlice.reducer;