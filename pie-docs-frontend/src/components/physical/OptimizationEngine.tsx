import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
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
  ScatterChart,
  Scatter,
  Legend
} from 'recharts';
import { RootState } from '@/store';
import { generateOptimizationRecommendations, scheduleOptimization } from '@/store/slices/locationSlice';

interface DocumentAccessPattern {
  documentId: string;
  documentName: string;
  currentLocation: {
    id: string;
    name: string;
    fullPath: string;
    distanceFromEntrance: number; // meters
  };
  accessFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
    totalAccesses: number;
  };
  accessTimes: Date[];
  averageAccessDuration: number; // minutes
  lastAccessed: Date;
  accessingUsers: string[];
  accessPatternType: 'frequent' | 'regular' | 'occasional' | 'rare' | 'archived';
  seasonalTrends: {
    quarter: number;
    accessCount: number;
  }[];
}

interface PlacementRecommendation {
  id: string;
  documentId: string;
  documentName: string;
  currentLocation: {
    id: string;
    name: string;
    fullPath: string;
  };
  recommendedLocation: {
    id: string;
    name: string;
    fullPath: string;
  };
  optimizationType: 'frequency' | 'distance' | 'capacity' | 'environmental' | 'security' | 'cost';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
  expectedBenefits: {
    accessTimeReduction: number; // percentage
    retrievalEfficiency: number; // percentage
    costSavings: number; // dollars per year
    capacityImprovement: number; // percentage
  };
  implementationCost: {
    movementCost: number;
    downtime: number; // minutes
    laborHours: number;
  };
  riskFactors: string[];
  confidence: number; // 0-100 percentage
  generatedAt: Date;
  validUntil: Date;
  status: 'pending' | 'approved' | 'rejected' | 'implemented' | 'scheduled';
  impactScore: number; // 0-100
}

interface OptimizationAnalysis {
  id: string;
  name: string;
  type: 'full_analysis' | 'targeted_analysis' | 'capacity_optimization' | 'access_optimization';
  scope: {
    locationIds: string[];
    documentTypes: string[];
    accessLevelFilter: string[];
  };
  parameters: {
    analysisDepth: 'surface' | 'standard' | 'deep';
    timeFrame: number; // days
    minAccessThreshold: number;
    weightingFactors: {
      frequency: number;
      distance: number;
      capacity: number;
      cost: number;
    };
  };
  results: {
    totalDocumentsAnalyzed: number;
    recommendationsGenerated: number;
    potentialSavings: number; // dollars per year
    efficiencyGain: number; // percentage
    implementationEffort: 'low' | 'medium' | 'high';
  };
  createdAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  createdBy: string;
}

interface LocationEfficiencyMetrics {
  locationId: string;
  locationName: string;
  locationPath: string;
  metrics: {
    utilizationRate: number; // percentage
    accessEfficiency: number; // average time to retrieve
    documentTurnover: number; // documents moved per month
    costPerSquareFoot: number;
    environmentalScore: number; // 0-100
    securityScore: number; // 0-100
  };
  recommendations: string[];
  overallScore: number; // 0-100
  rank: number;
}

export const OptimizationEngine: React.FC = () => {
  const dispatch = useDispatch();
  const {
    capacity: { optimizations }
  } = useSelector((state: RootState) => state.location);

  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'recommendations' | 'scheduler' | 'metrics'>('overview');
  const [selectedAnalysis, setSelectedAnalysis] = useState<OptimizationAnalysis | null>(null);
  const [showNewAnalysisModal, setShowNewAnalysisModal] = useState(false);
  const [analysisParams, setAnalysisParams] = useState({
    name: '',
    type: 'full_analysis' as 'full_analysis' | 'targeted_analysis' | 'capacity_optimization' | 'access_optimization',
    timeFrame: 30,
    analysisDepth: 'standard' as 'surface' | 'standard' | 'deep',
    minAccessThreshold: 5,
    weightingFactors: {
      frequency: 30,
      distance: 25,
      capacity: 25,
      cost: 20
    }
  });

  // Mock data for development
  const mockAccessPatterns: DocumentAccessPattern[] = [
    {
      documentId: 'doc-001',
      documentName: 'Contract_ABC_2024.pdf',
      currentLocation: {
        id: 'shelf-001-a-1',
        name: 'Shelf A1',
        fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A1',
        distanceFromEntrance: 15
      },
      accessFrequency: {
        daily: 3,
        weekly: 21,
        monthly: 90,
        totalAccesses: 450
      },
      accessTimes: [
        new Date(Date.now() - 2 * 60 * 60 * 1000),
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      ],
      averageAccessDuration: 8,
      lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000),
      accessingUsers: ['John Smith', 'Sarah Johnson', 'Mike Davis'],
      accessPatternType: 'frequent',
      seasonalTrends: [
        { quarter: 1, accessCount: 120 },
        { quarter: 2, accessCount: 95 },
        { quarter: 3, accessCount: 110 },
        { quarter: 4, accessCount: 125 }
      ]
    },
    {
      documentId: 'doc-002',
      documentName: 'Archive_Report_2020.pdf',
      currentLocation: {
        id: 'shelf-001-a-3',
        name: 'Shelf A3',
        fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A3',
        distanceFromEntrance: 15
      },
      accessFrequency: {
        daily: 0,
        weekly: 1,
        monthly: 4,
        totalAccesses: 25
      },
      accessTimes: [
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
      ],
      averageAccessDuration: 15,
      lastAccessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      accessingUsers: ['Admin User'],
      accessPatternType: 'rare',
      seasonalTrends: [
        { quarter: 1, accessCount: 8 },
        { quarter: 2, accessCount: 6 },
        { quarter: 3, accessCount: 5 },
        { quarter: 4, accessCount: 6 }
      ]
    }
  ];

  const mockRecommendations: PlacementRecommendation[] = [
    {
      id: 'rec-001',
      documentId: 'doc-002',
      documentName: 'Archive_Report_2020.pdf',
      currentLocation: {
        id: 'shelf-001-a-3',
        name: 'Shelf A3',
        fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A3'
      },
      recommendedLocation: {
        id: 'shelf-archive-01',
        name: 'Archive Shelf 01',
        fullPath: 'Archive Building > Floor 1 > Archive Room > Archive Cabinet > Shelf 01'
      },
      optimizationType: 'frequency',
      priority: 'medium',
      reasoning: 'Document is rarely accessed (4 times/month) and could be moved to lower-cost archive storage, freeing up prime space for frequently accessed documents.',
      expectedBenefits: {
        accessTimeReduction: 0,
        retrievalEfficiency: 5,
        costSavings: 240,
        capacityImprovement: 15
      },
      implementationCost: {
        movementCost: 25,
        downtime: 10,
        laborHours: 0.5
      },
      riskFactors: ['Slightly increased retrieval time for rare access'],
      confidence: 85,
      generatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'pending',
      impactScore: 72
    },
    {
      id: 'rec-002',
      documentId: 'doc-001',
      documentName: 'Contract_ABC_2024.pdf',
      currentLocation: {
        id: 'shelf-001-a-1',
        name: 'Shelf A1',
        fullPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A1'
      },
      recommendedLocation: {
        id: 'shelf-prime-01',
        name: 'Prime Access Shelf 01',
        fullPath: 'Main Building > Ground Floor > Reception > Quick Access Cabinet > Shelf 01'
      },
      optimizationType: 'distance',
      priority: 'high',
      reasoning: 'High-frequency document (90 accesses/month) should be moved closer to entrance to reduce retrieval time and improve efficiency.',
      expectedBenefits: {
        accessTimeReduction: 35,
        retrievalEfficiency: 25,
        costSavings: 450,
        capacityImprovement: 0
      },
      implementationCost: {
        movementCost: 15,
        downtime: 5,
        laborHours: 0.25
      },
      riskFactors: ['May require additional security for high-value document'],
      confidence: 92,
      generatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'pending',
      impactScore: 88
    }
  ];

  const mockAnalyses: OptimizationAnalysis[] = [
    {
      id: 'analysis-001',
      name: 'Q4 2024 Full Optimization',
      type: 'full_analysis',
      scope: {
        locationIds: ['building-001'],
        documentTypes: ['all'],
        accessLevelFilter: ['public', 'restricted']
      },
      parameters: {
        analysisDepth: 'deep',
        timeFrame: 90,
        minAccessThreshold: 5,
        weightingFactors: {
          frequency: 35,
          distance: 30,
          capacity: 20,
          cost: 15
        }
      },
      results: {
        totalDocumentsAnalyzed: 2847,
        recommendationsGenerated: 47,
        potentialSavings: 12450,
        efficiencyGain: 23,
        implementationEffort: 'medium'
      },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000),
      status: 'completed',
      createdBy: 'System Scheduler'
    },
    {
      id: 'analysis-002',
      name: 'High-Traffic Document Optimization',
      type: 'access_optimization',
      scope: {
        locationIds: ['floor-001', 'floor-002'],
        documentTypes: ['contract', 'report'],
        accessLevelFilter: ['all']
      },
      parameters: {
        analysisDepth: 'standard',
        timeFrame: 30,
        minAccessThreshold: 10,
        weightingFactors: {
          frequency: 50,
          distance: 30,
          capacity: 10,
          cost: 10
        }
      },
      results: {
        totalDocumentsAnalyzed: 456,
        recommendationsGenerated: 23,
        potentialSavings: 3240,
        efficiencyGain: 31,
        implementationEffort: 'low'
      },
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      status: 'running',
      createdBy: 'John Smith'
    }
  ];

  const mockLocationMetrics: LocationEfficiencyMetrics[] = [
    {
      locationId: 'shelf-prime-01',
      locationName: 'Prime Access Shelf 01',
      locationPath: 'Main Building > Ground Floor > Reception > Quick Access Cabinet > Shelf 01',
      metrics: {
        utilizationRate: 95,
        accessEfficiency: 2.3,
        documentTurnover: 45,
        costPerSquareFoot: 12.50,
        environmentalScore: 88,
        securityScore: 92
      },
      recommendations: [
        'Consider expanding quick access area',
        'Implement automated retrieval system'
      ],
      overallScore: 91,
      rank: 1
    },
    {
      locationId: 'shelf-001-a-1',
      locationName: 'Shelf A1',
      locationPath: 'Main Building > Floor 1 > Room A > Cabinet 1 > Shelf A1',
      metrics: {
        utilizationRate: 78,
        accessEfficiency: 5.2,
        documentTurnover: 28,
        costPerSquareFoot: 8.75,
        environmentalScore: 85,
        securityScore: 78
      },
      recommendations: [
        'Move rarely accessed documents to archive',
        'Improve access pathway'
      ],
      overallScore: 76,
      rank: 2
    },
    {
      locationId: 'shelf-archive-01',
      locationName: 'Archive Shelf 01',
      locationPath: 'Archive Building > Floor 1 > Archive Room > Archive Cabinet > Shelf 01',
      metrics: {
        utilizationRate: 65,
        accessEfficiency: 8.7,
        documentTurnover: 8,
        costPerSquareFoot: 4.25,
        environmentalScore: 82,
        securityScore: 95
      },
      recommendations: [
        'Optimize for long-term storage',
        'Implement climate monitoring'
      ],
      overallScore: 68,
      rank: 3
    }
  ];

  useEffect(() => {
    // Simulate fetching optimization data
    dispatch(generateOptimizationRecommendations());
  }, [dispatch]);

  const handleRunAnalysis = () => {
    if (!analysisParams.name.trim()) {
      alert('Please enter an analysis name');
      return;
    }

    const newAnalysis: OptimizationAnalysis = {
      id: `analysis-${Date.now()}`,
      name: analysisParams.name,
      type: analysisParams.type,
      scope: {
        locationIds: ['all'],
        documentTypes: ['all'],
        accessLevelFilter: ['all']
      },
      parameters: {
        analysisDepth: analysisParams.analysisDepth,
        timeFrame: analysisParams.timeFrame,
        minAccessThreshold: analysisParams.minAccessThreshold,
        weightingFactors: analysisParams.weightingFactors
      },
      results: {
        totalDocumentsAnalyzed: 0,
        recommendationsGenerated: 0,
        potentialSavings: 0,
        efficiencyGain: 0,
        implementationEffort: 'low'
      },
      createdAt: new Date(),
      status: 'running',
      createdBy: 'Current User'
    };

    console.log('Starting analysis:', newAnalysis);
    setShowNewAnalysisModal(false);
    setActiveTab('analysis');
  };

  const handleImplementRecommendation = (recommendationId: string) => {
    console.log('Implementing recommendation:', recommendationId);
    // Implementation for executing recommendation
  };

  const handleRejectRecommendation = (recommendationId: string) => {
    console.log('Rejecting recommendation:', recommendationId);
    // Implementation for rejecting recommendation
  };

  const handleScheduleOptimization = () => {
    console.log('Scheduling optimization');
    dispatch(scheduleOptimization({
      frequency: 'weekly',
      dayOfWeek: 1,
      time: '02:00',
      parameters: analysisParams
    }));
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'implemented': return 'bg-gray-100 text-gray-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const accessPatternColors = {
    frequent: '#ef4444',
    regular: '#f59e0b',
    occasional: '#eab308',
    rare: '#06b6d4',
    archived: '#6b7280'
  };

  // Prepare chart data
  const accessFrequencyData = mockAccessPatterns.map(pattern => ({
    name: pattern.documentName.substring(0, 20) + '...',
    daily: pattern.accessFrequency.daily,
    weekly: pattern.accessFrequency.weekly,
    monthly: pattern.accessFrequency.monthly,
    type: pattern.accessPatternType
  }));

  const efficiencyScatterData = mockLocationMetrics.map(metric => ({
    x: metric.metrics.accessEfficiency,
    y: metric.metrics.utilizationRate,
    z: metric.overallScore,
    name: metric.locationName
  }));

  return (
    <div className="optimization-engine p-6 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Optimization Engine</h1>
        <p className="text-gray-600">Intelligent document placement recommendations based on access patterns and efficiency metrics</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8 border-b border-gray-200">
          {[
            { key: 'overview', label: 'Overview', count: 0 },
            { key: 'analysis', label: 'Analysis', count: mockAnalyses.filter(a => a.status === 'running').length },
            { key: 'recommendations', label: 'Recommendations', count: mockRecommendations.filter(r => r.status === 'pending').length },
            { key: 'metrics', label: 'Location Metrics', count: 0 },
            { key: 'scheduler', label: 'Scheduler', count: 0 }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'overview' | 'analysis' | 'recommendations' | 'scheduler' | 'metrics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-800 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Potential Savings</p>
                  <p className="text-2xl font-semibold text-gray-900">{formatCurrency(15690)}</p>
                  <p className="text-xs text-green-600">per year</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  💰
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Efficiency Gain</p>
                  <p className="text-2xl font-semibold text-gray-900">28%</p>
                  <p className="text-xs text-blue-600">average improvement</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  📈
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Recommendations</p>
                  <p className="text-2xl font-semibold text-gray-900">{mockRecommendations.filter(r => r.status === 'pending').length}</p>
                  <p className="text-xs text-orange-600">awaiting approval</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  🎯
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Documents Analyzed</p>
                  <p className="text-2xl font-semibold text-gray-900">2,847</p>
                  <p className="text-xs text-purple-600">last analysis</p>
                </div>
                <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  📊
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Access Frequency Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Access Patterns</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={accessFrequencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="daily" fill="#3b82f6" name="Daily" />
                  <Bar dataKey="weekly" fill="#06b6d4" name="Weekly" />
                  <Bar dataKey="monthly" fill="#8b5cf6" name="Monthly" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Location Efficiency Scatter */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Efficiency Matrix</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart data={efficiencyScatterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    name="Access Time"
                    unit="min"
                    type="number"
                  />
                  <YAxis
                    dataKey="y"
                    name="Utilization"
                    unit="%"
                    type="number"
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `${value}${name === 'Access Time' ? ' min' : '%'}`,
                      name
                    ]}
                  />
                  <Scatter
                    name="Locations"
                    dataKey="z"
                    fill="#8884d8"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Recommendations */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Recent Recommendations</h3>
              <button
                onClick={() => setShowNewAnalysisModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Run New Analysis
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {mockRecommendations.slice(0, 3).map((recommendation) => (
                  <div key={recommendation.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">{recommendation.documentName}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(recommendation.priority)}`}>
                            {recommendation.priority.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">
                            Impact Score: {recommendation.impactScore}/100
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{recommendation.reasoning}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                          <div>
                            <span className="text-gray-500">Time Reduction:</span>
                            <span className="ml-1 font-medium text-green-600">
                              {recommendation.expectedBenefits.accessTimeReduction}%
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Cost Savings:</span>
                            <span className="ml-1 font-medium text-green-600">
                              {formatCurrency(recommendation.expectedBenefits.costSavings)}/yr
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Implementation:</span>
                            <span className="ml-1 font-medium">
                              {formatCurrency(recommendation.implementationCost.movementCost)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Confidence:</span>
                            <span className="ml-1 font-medium">{recommendation.confidence}%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleImplementRecommendation(recommendation.id)}
                          className="px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectRecommendation(recommendation.id)}
                          className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <div>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Optimization Analyses</h2>
            <button
              onClick={() => setShowNewAnalysisModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              New Analysis
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Analysis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Results
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {mockAnalyses.map((analysis) => (
                  <tr key={analysis.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-900">{analysis.name}</span>
                        <span className="text-xs text-gray-500">by {analysis.createdBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">
                        {analysis.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(analysis.status)}`}>
                        {analysis.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {analysis.status === 'completed' ? (
                        <div className="text-sm">
                          <div>Documents: {analysis.results.totalDocumentsAnalyzed.toLocaleString()}</div>
                          <div>Recommendations: {analysis.results.recommendationsGenerated}</div>
                          <div className="text-green-600">Savings: {formatCurrency(analysis.results.potentialSavings)}/yr</div>
                          <div className="text-blue-600">Efficiency: +{analysis.results.efficiencyGain}%</div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">In progress...</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDateTime(analysis.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedAnalysis(analysis)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Other tabs content would go here... */}

      {/* New Analysis Modal */}
      {showNewAnalysisModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Run New Analysis</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Analysis Name</label>
                <input
                  type="text"
                  value={analysisParams.name}
                  onChange={(e) => setAnalysisParams(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Monthly Access Optimization"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Analysis Type</label>
                <select
                  value={analysisParams.type}
                  onChange={(e) => setAnalysisParams(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full_analysis">Full Analysis</option>
                  <option value="access_optimization">Access Optimization</option>
                  <option value="capacity_optimization">Capacity Optimization</option>
                  <option value="targeted_analysis">Targeted Analysis</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time Frame (days)</label>
                  <input
                    type="number"
                    min="7"
                    max="365"
                    value={analysisParams.timeFrame}
                    onChange={(e) => setAnalysisParams(prev => ({ ...prev, timeFrame: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Analysis Depth</label>
                  <select
                    value={analysisParams.analysisDepth}
                    onChange={(e) => setAnalysisParams(prev => ({ ...prev, analysisDepth: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="surface">Surface (Fast)</option>
                    <option value="standard">Standard</option>
                    <option value="deep">Deep (Comprehensive)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Weighting Factors (%)</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Access Frequency</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={analysisParams.weightingFactors.frequency}
                      onChange={(e) => setAnalysisParams(prev => ({
                        ...prev,
                        weightingFactors: { ...prev.weightingFactors, frequency: parseInt(e.target.value) }
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Distance/Access Time</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={analysisParams.weightingFactors.distance}
                      onChange={(e) => setAnalysisParams(prev => ({
                        ...prev,
                        weightingFactors: { ...prev.weightingFactors, distance: parseInt(e.target.value) }
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Capacity Optimization</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={analysisParams.weightingFactors.capacity}
                      onChange={(e) => setAnalysisParams(prev => ({
                        ...prev,
                        weightingFactors: { ...prev.weightingFactors, capacity: parseInt(e.target.value) }
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Cost Efficiency</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={analysisParams.weightingFactors.cost}
                      onChange={(e) => setAnalysisParams(prev => ({
                        ...prev,
                        weightingFactors: { ...prev.weightingFactors, cost: parseInt(e.target.value) }
                      }))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Total: {Object.values(analysisParams.weightingFactors).reduce((a, b) => a + b, 0)}%
                  {Object.values(analysisParams.weightingFactors).reduce((a, b) => a + b, 0) !== 100 && (
                    <span className="text-red-600 ml-2">Should equal 100%</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowNewAnalysisModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRunAnalysis}
                disabled={Object.values(analysisParams.weightingFactors).reduce((a, b) => a + b, 0) !== 100}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                Run Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizationEngine;