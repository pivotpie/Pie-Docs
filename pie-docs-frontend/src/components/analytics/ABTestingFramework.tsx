import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type {
  ABTestVariant,
  ABTestResults
} from '@/types/domain/Analytics';

interface ABTestingFrameworkProps {
  className?: string;
  allowManualVariants?: boolean;
  enableStatisticalAnalysis?: boolean;
  minimumSampleSize?: number;
}

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  targetMetric: 'searchSuccessRate' | 'averageResponseTime' | 'userSatisfaction' | 'conversionRate';
  hypothesis: string;
  variants: ABTestVariant[];
  results: ABTestResults[];
  sampleSize: number;
  significance: number;
  confidenceLevel: number;
  winningVariant?: string;
}

interface TestConfiguration {
  name: string;
  description: string;
  hypothesis: string;
  targetMetric: 'searchSuccessRate' | 'averageResponseTime' | 'userSatisfaction' | 'conversionRate';
  duration: number; // days
  trafficSplit: number[]; // percentage allocation for each variant
  variants: {
    name: string;
    description: string;
    config: Record<string, any>;
  }[];
}

export const ABTestingFramework: React.FC<ABTestingFrameworkProps> = ({
  className = '',
  allowManualVariants = true,
  enableStatisticalAnalysis = true,
  minimumSampleSize = 1000,
}) => {
  const { theme } = useTheme();
  const [tests, setTests] = useState<ABTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [testConfig, setTestConfig] = useState<TestConfiguration>({
    name: '',
    description: '',
    hypothesis: '',
    targetMetric: 'searchSuccessRate',
    duration: 14,
    trafficSplit: [50, 50],
    variants: [
      { name: 'Control', description: 'Current search interface', config: {} },
      { name: 'Variant A', description: 'New search interface', config: {} },
    ],
  });
  const [selectedView, setSelectedView] = useState<'overview' | 'running' | 'results' | 'create'>('overview');

  /**
   * Generate mock test data for demonstration
   */
  const generateMockTests = (): ABTest[] => {
    return [
      {
        id: 'test-1',
        name: 'Search Interface Redesign',
        description: 'Testing new search interface with improved filtering',
        status: 'running',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        targetMetric: 'searchSuccessRate',
        hypothesis: 'New interface with enhanced filters will increase search success rate by 15%',
        variants: [
          {
            id: 'control',
            name: 'Control',
            description: 'Current search interface',
            config: { interface: 'current' },
            isActive: true,
            trafficAllocation: 50,
          },
          {
            id: 'variant-a',
            name: 'Enhanced Filters',
            description: 'New interface with enhanced filtering options',
            config: { interface: 'enhanced', filters: true },
            isActive: true,
            trafficAllocation: 50,
          },
        ],
        results: [
          {
            variantId: 'control',
            metrics: {
              searchSuccessRate: 0.78,
              averageResponseTime: 340,
              userSatisfaction: 0.72,
              conversionRate: 0.65,
            },
            sampleSize: 2450,
            confidenceLevel: 95,
            statisticalSignificance: false,
          },
          {
            variantId: 'variant-a',
            metrics: {
              searchSuccessRate: 0.85,
              averageResponseTime: 320,
              userSatisfaction: 0.78,
              conversionRate: 0.71,
            },
            sampleSize: 2380,
            confidenceLevel: 95,
            statisticalSignificance: true,
          },
        ],
        sampleSize: 4830,
        significance: 0.92,
        confidenceLevel: 95,
        winningVariant: 'variant-a',
      },
      {
        id: 'test-2',
        name: 'Query Auto-completion',
        description: 'Testing impact of query auto-completion on user experience',
        status: 'completed',
        startDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        targetMetric: 'userSatisfaction',
        hypothesis: 'Auto-completion will improve user satisfaction and reduce query refinement',
        variants: [
          {
            id: 'control-2',
            name: 'No Auto-completion',
            description: 'Standard search input without auto-completion',
            config: { autocompletion: false },
            isActive: false,
            trafficAllocation: 50,
          },
          {
            id: 'variant-b',
            name: 'Smart Auto-completion',
            description: 'AI-powered query auto-completion',
            config: { autocompletion: true, ai: true },
            isActive: false,
            trafficAllocation: 50,
          },
        ],
        results: [
          {
            variantId: 'control-2',
            metrics: {
              searchSuccessRate: 0.82,
              averageResponseTime: 380,
              userSatisfaction: 0.71,
              conversionRate: 0.68,
            },
            sampleSize: 3240,
            confidenceLevel: 95,
            statisticalSignificance: false,
          },
          {
            variantId: 'variant-b',
            metrics: {
              searchSuccessRate: 0.89,
              averageResponseTime: 310,
              userSatisfaction: 0.84,
              conversionRate: 0.76,
            },
            sampleSize: 3180,
            confidenceLevel: 95,
            statisticalSignificance: true,
          },
        ],
        sampleSize: 6420,
        significance: 0.98,
        confidenceLevel: 95,
        winningVariant: 'variant-b',
      },
    ];
  };

  /**
   * Calculate test statistics
   */
  const calculateTestStatistics = useMemo(() => {
    const totalTests = tests.length;
    const runningTests = tests.filter(t => t.status === 'running').length;
    const completedTests = tests.filter(t => t.status === 'completed').length;
    const significantResults = tests.filter(t => t.significance > 0.95).length;

    const avgSampleSize = tests.reduce((sum, test) => sum + test.sampleSize, 0) / (tests.length || 1);
    const avgSignificance = tests.reduce((sum, test) => sum + test.significance, 0) / (tests.length || 1);

    return {
      totalTests,
      runningTests,
      completedTests,
      significantResults,
      avgSampleSize,
      avgSignificance,
      successRate: totalTests > 0 ? significantResults / totalTests : 0,
    };
  }, [tests]);

  /**
   * Create new A/B test
   */
  const createTest = () => {
    const newTest: ABTest = {
      id: `test-${Date.now()}`,
      name: testConfig.name,
      description: testConfig.description,
      status: 'draft',
      startDate: new Date(),
      targetMetric: testConfig.targetMetric,
      hypothesis: testConfig.hypothesis,
      variants: testConfig.variants.map((variant, index) => ({
        id: `variant-${index}`,
        name: variant.name,
        description: variant.description,
        config: variant.config,
        isActive: false,
        trafficAllocation: testConfig.trafficSplit[index] || 0,
      })),
      results: [],
      sampleSize: 0,
      significance: 0,
      confidenceLevel: 95,
    };

    setTests(prev => [...prev, newTest]);
    setIsCreatingTest(false);
    setTestConfig({
      name: '',
      description: '',
      hypothesis: '',
      targetMetric: 'searchSuccessRate',
      duration: 14,
      trafficSplit: [50, 50],
      variants: [
        { name: 'Control', description: 'Current search interface', config: {} },
        { name: 'Variant A', description: 'New search interface', config: {} },
      ],
    });
  };

  /**
   * Start test
   */
  const startTest = (testId: string) => {
    setTests(prev =>
      prev.map(test =>
        test.id === testId
          ? {
              ...test,
              status: 'running',
              startDate: new Date(),
              variants: test.variants.map(variant => ({ ...variant, isActive: true })),
            }
          : test
      )
    );
  };

  /**
   * Stop test
   */
  const stopTest = (testId: string) => {
    setTests(prev =>
      prev.map(test =>
        test.id === testId
          ? {
              ...test,
              status: 'completed',
              endDate: new Date(),
              variants: test.variants.map(variant => ({ ...variant, isActive: false })),
            }
          : test
      )
    );
  };

  /**
   * Get status color
   */
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'glass-panel text-white/80';
    }
  };

  /**
   * Format percentage
   */
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  /**
   * Format metric value
   */
  const formatMetricValue = (metric: string, value: number): string => {
    switch (metric) {
      case 'averageResponseTime':
        return `${Math.round(value)}ms`;
      case 'searchSuccessRate':
      case 'userSatisfaction':
      case 'conversionRate':
        return formatPercentage(value);
      default:
        return value.toString();
    }
  };

  /**
   * Get metric improvement
   */
  const getMetricImprovement = (control: number, variant: number, metric: string): { value: number; isImprovement: boolean } => {
    const improvement = ((variant - control) / control) * 100;
    const isImprovement = metric === 'averageResponseTime' ? improvement < 0 : improvement > 0;
    return { value: Math.abs(improvement), isImprovement };
  };

  useEffect(() => {
    // Load mock data for demonstration
    setTests(generateMockTests());
  }, []);

  return (
    <div className={`ab-testing-framework ${className}`}>
      {/* Header */}
      <div className="glass-card border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">A/B Testing Framework</h2>
            <p className="text-sm text-gray-600 mt-1">
              Experiment with search interfaces and measure performance improvements
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsCreatingTest(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Test
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className="glass-panel border-b border-white/10 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{calculateTestStatistics.totalTests}</div>
            <div className="text-xs text-gray-600">Total Tests</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{calculateTestStatistics.runningTests}</div>
            <div className="text-xs text-gray-600">Running</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{calculateTestStatistics.completedTests}</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">{calculateTestStatistics.significantResults}</div>
            <div className="text-xs text-gray-600">Significant</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{Math.round(calculateTestStatistics.avgSampleSize)}</div>
            <div className="text-xs text-gray-600">Avg Sample Size</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{formatPercentage(calculateTestStatistics.successRate)}</div>
            <div className="text-xs text-gray-600">Success Rate</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="glass-card border-b border-white/10">
        <nav className="px-6 -mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'running', label: 'Running Tests', icon: '▶️' },
            { id: 'results', label: 'Results', icon: '📈' },
            { id: 'create', label: 'Create Test', icon: '➕' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedView(tab.id as any)}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedView === tab.id
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

      {/* Content */}
      <div className="p-6">
        {selectedView === 'overview' && (
          <div className="space-y-6">
            {/* Recent Tests */}
            <div className="glass-card rounded-lg border border-white/10">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Tests</h3>
              </div>
              <div className="p-6">
                {tests.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-4">🧪</div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Tests Yet</h4>
                    <p className="text-gray-600">Create your first A/B test to start optimizing search performance</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tests.slice(0, 3).map((test) => (
                      <div key={test.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">{test.name}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                                {test.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{test.description}</p>
                            <div className="text-xs text-gray-500">
                              Started: {test.startDate.toLocaleDateString()} • Sample: {test.sampleSize} users
                            </div>
                          </div>
                          <div className="text-right">
                            {test.significance > 0 && (
                              <div className="text-sm font-medium">
                                {formatPercentage(test.significance)} confidence
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedView === 'running' && (
          <div className="space-y-6">
            {tests.filter(t => t.status === 'running').length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">⏸️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Running Tests</h3>
                <p className="text-gray-600">Start an A/B test to begin collecting performance data</p>
              </div>
            ) : (
              <div className="space-y-6">
                {tests.filter(t => t.status === 'running').map((test) => (
                  <div key={test.id} className="glass-card border border-white/10 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-2">{test.name}</h3>
                        <p className="text-gray-600 mb-2">{test.description}</p>
                        <div className="text-sm text-gray-500">
                          Running since: {test.startDate.toLocaleDateString()} • Target: {test.targetMetric}
                        </div>
                      </div>
                      <button
                        onClick={() => stopTest(test.id)}
                        className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Stop Test
                      </button>
                    </div>

                    {/* Variants Performance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {test.results.map((result) => {
                        const variant = test.variants.find(v => v.id === result.variantId);
                        return (
                          <div key={result.variantId} className="border border-gray-200 rounded-lg p-4">
                            <h4 className="font-medium text-gray-900 mb-2">{variant?.name}</h4>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Sample Size:</span>
                                <span className="font-medium">{result.sampleSize}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Success Rate:</span>
                                <span className="font-medium">{formatPercentage(result.metrics.searchSuccessRate)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Response Time:</span>
                                <span className="font-medium">{Math.round(result.metrics.averageResponseTime)}ms</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>User Satisfaction:</span>
                                <span className="font-medium">{formatPercentage(result.metrics.userSatisfaction)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedView === 'results' && (
          <div className="space-y-6">
            {tests.filter(t => t.status === 'completed').length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Completed Tests</h3>
                <p className="text-gray-600">Complete your first A/B test to see detailed results and insights</p>
              </div>
            ) : (
              <div className="space-y-6">
                {tests.filter(t => t.status === 'completed').map((test) => {
                  const controlResult = test.results.find(r => r.variantId.includes('control'));
                  const variantResult = test.results.find(r => !r.variantId.includes('control'));

                  return (
                    <div key={test.id} className="glass-card border border-white/10 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg text-gray-900">{test.name}</h3>
                            {test.winningVariant && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                Winner: {test.variants.find(v => v.id === test.winningVariant)?.name}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-2">{test.hypothesis}</p>
                          <div className="text-sm text-gray-500">
                            Completed: {test.endDate?.toLocaleDateString()} •
                            Confidence: {formatPercentage(test.significance)}
                          </div>
                        </div>
                      </div>

                      {/* Results Comparison */}
                      {controlResult && variantResult && (
                        <div className="space-y-4">
                          <h4 className="font-medium text-gray-900">Results Comparison</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {['searchSuccessRate', 'averageResponseTime', 'userSatisfaction', 'conversionRate'].map((metric) => {
                              const controlValue = controlResult.metrics[metric as keyof typeof controlResult.metrics];
                              const variantValue = variantResult.metrics[metric as keyof typeof variantResult.metrics];
                              const improvement = getMetricImprovement(controlValue, variantValue, metric);

                              return (
                                <div key={metric} className="border border-gray-200 rounded-lg p-3">
                                  <div className="text-xs text-gray-600 mb-1">
                                    {metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-sm text-gray-600">
                                        {formatMetricValue(metric, controlValue)}
                                      </div>
                                      <div className="text-sm font-medium">
                                        {formatMetricValue(metric, variantValue)}
                                      </div>
                                    </div>
                                    <div className={`text-xs font-medium ${
                                      improvement.isImprovement ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                      {improvement.isImprovement ? '+' : '-'}{improvement.value.toFixed(1)}%
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedView === 'create' && (
          <div className="max-w-2xl">
            <div className="glass-card border border-white/10 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New A/B Test</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
                  <input
                    type="text"
                    value={testConfig.name}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Enter test name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={testConfig.description}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Describe what you're testing"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hypothesis</label>
                  <textarea
                    value={testConfig.hypothesis}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, hypothesis: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={2}
                    placeholder="What do you expect to happen?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Metric</label>
                  <select
                    value={testConfig.targetMetric}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, targetMetric: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="searchSuccessRate">Search Success Rate</option>
                    <option value="averageResponseTime">Average Response Time</option>
                    <option value="userSatisfaction">User Satisfaction</option>
                    <option value="conversionRate">Conversion Rate</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                    <input
                      type="number"
                      value={testConfig.duration}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      min="1"
                      max="90"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Traffic Split (%)</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={testConfig.trafficSplit[0]}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setTestConfig(prev => ({
                            ...prev,
                            trafficSplit: [value, 100 - value]
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        min="1"
                        max="99"
                      />
                      <input
                        type="number"
                        value={testConfig.trafficSplit[1]}
                        readOnly
                        className={`w-full px-3 py-2 border border-white/20 rounded-md glass-panel ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <button
                    onClick={createTest}
                    disabled={!testConfig.name || !testConfig.description}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Test
                  </button>
                  <button
                    onClick={() => setIsCreatingTest(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ABTestingFramework;