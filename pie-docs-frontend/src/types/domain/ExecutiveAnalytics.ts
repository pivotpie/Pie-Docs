/**
 * Executive Analytics Types
 * Based on Story 6.1 requirements
 */

export interface KPIMetrics {
  documentProcessing: {
    totalDocuments: number;
    documentsCreated: number;
    documentsAccessed: number;
    processingTime: number;
    growthRate: number;
    documentsProcessedToday: number;
    averageProcessingTime: number;
  };
  userAdoption: {
    activeUsers: number;
    newUsers: number;
    userEngagement: number;
    adoptionRate: number;
    departmentPenetration: Record<string, number>;
    loginFrequency: number;
  };
  systemPerformance: {
    uptime: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
    availability: number;
    storageUtilization: number;
  };
  workflowEfficiency: {
    completedWorkflows: number;
    averageCompletionTime: number;
    bottleneckIdentification: string[];
    automationRate: number;
    pendingTasks: number;
    slaCompliance: number;
  };
}

export interface TrendData {
  timestamp: string; // ISO string for Redux serialization
  value: number;
  metric: string;
  category: string;
}

export interface ForecastData {
  timestamp: string; // ISO string for Redux serialization
  predicted: number;
  confidence: number;
  metric: string;
}

export interface DepartmentUsageStats {
  departmentId: string;
  departmentName: string;
  documentCount: number;
  activeUsers: number;
  storageUsed: number;
  workflowsCompleted: number;
  efficiency: number;
  lastActivity: string; // ISO string for Redux serialization
  growthRate: number;
  benchmarkComparison: number;
}

export interface ROICalculation {
  totalCostSavings: number;
  productivityImprovement: number;
  storageCostReduction: number;
  workflowAutomationSavings: number;
  complianceEfficiency: number;
  timeSavings: number;
  roi: number;
  paybackPeriod: number;
  projectedAnnualSavings: number;
}

export interface PerformanceMetrics {
  timestamp: string; // ISO string for Redux serialization
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkThroughput: number;
  activeConnections: number;
  responseTime: number;
  errorCount: number;
  requestsPerSecond: number;
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
  timeRange: TimeRange;
  sections: string[];
  branding: boolean;
}

export interface ScheduledReport {
  id: string;
  name: string;
  description: string;
  schedule: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  template: string;
  lastRun: Date;
  nextRun: Date;
  enabled: boolean;
  format: 'pdf' | 'excel';
}

export interface DrillDownPath {
  level: number;
  metric: string;
  filters: Record<string, any>;
  breadcrumb: string[];
}

export interface TimeRange {
  start: string; // ISO string for Redux serialization
  end: string; // ISO string for Redux serialization
  period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
}

export interface AnalyticsFilters {
  timeRange: TimeRange;
  departments?: string[];
  userGroups?: string[];
  documentTypes?: string[];
  workflowTypes?: string[];
}

export interface ExecutiveAnalyticsData {
  kpiMetrics: KPIMetrics;
  trendData: TrendData[];
  forecastData: ForecastData[];
  departmentUsage: DepartmentUsageStats[];
  roiCalculation: ROICalculation;
  performanceMetrics: PerformanceMetrics[];
  lastUpdated: string; // ISO string for Redux serialization
}

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'metric';
  title: string;
  size: 'small' | 'medium' | 'large' | 'wide';
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
  data?: any;
  refreshInterval?: number;
}

export interface CustomDashboard {
  id: string;
  name: string;
  description: string;
  widgets: DashboardWidget[];
  layout: 'grid' | 'flex';
  isPublic: boolean;
  owner: string;
  lastModified: Date;
  tags: string[];
}