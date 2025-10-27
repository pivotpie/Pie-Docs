import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import {
  SparklesIcon,
  CpuChipIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  EyeIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  BoltIcon,
  ClockIcon,
  TagIcon,
  FolderIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';

interface ClassificationRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  confidence: number;
  priority: number;
  conditions: {
    fileType?: string[];
    fileName?: {
      contains?: string[];
      regex?: string;
    };
    content?: {
      keywords?: string[];
      phrases?: string[];
      language?: string;
    };
    metadata?: Record<string, any>;
    size?: {
      min?: number;
      max?: number;
    };
  };
  actions: {
    category?: string;
    tags?: string[];
    folder?: string;
    metadata?: Record<string, any>;
    notify?: string[];
  };
  performance: {
    accuracy: number;
    totalProcessed: number;
    correctPredictions: number;
    lastRun: Date;
    averageConfidence: number;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
}

interface MLModel {
  id: string;
  name: string;
  type: 'text_classification' | 'content_extraction' | 'language_detection' | 'document_type';
  version: string;
  isActive: boolean;
  status: 'training' | 'ready' | 'error' | 'deploying';
  accuracy: number;
  trainingData: {
    totalSamples: number;
    categories: string[];
    lastTraining: Date;
  };
  performance: {
    precision: number;
    recall: number;
    f1Score: number;
    processingTime: number; // ms per document
  };
  deployment: {
    environment: 'development' | 'staging' | 'production';
    lastDeployed: Date;
    instances: number;
  };
}

interface ClassificationJob {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  documentsToProcess: number;
  documentsProcessed: number;
  documentsSuccessful: number;
  documentsFailed: number;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
  rules: string[];
  models: string[];
  results?: {
    categorized: number;
    tagged: number;
    moved: number;
    errors: {
      document: string;
      error: string;
    }[];
  };
}

interface AutoClassificationCenterProps {
  onRuleCreate: (rule: Omit<ClassificationRule, 'id' | 'createdAt' | 'updatedAt' | 'performance'>) => void;
  onRuleUpdate: (ruleId: string, updates: Partial<ClassificationRule>) => void;
  onRuleDelete: (ruleId: string) => void;
  onModelTrain: (modelId: string, trainingData: any) => void;
  onModelDeploy: (modelId: string, environment: 'development' | 'staging' | 'production') => void;
  onJobStart: (jobConfig: any) => void;
  onJobCancel: (jobId: string) => void;
  className?: string;
}

// Mock data
const mockRules: ClassificationRule[] = [
  {
    id: 'rule1',
    name: 'Financial Document Classifier',
    description: 'Automatically classify financial documents based on content',
    isActive: true,
    confidence: 0.85,
    priority: 1,
    conditions: {
      fileType: ['pdf', 'xlsx', 'csv'],
      content: {
        keywords: ['invoice', 'receipt', 'financial', 'expense', 'budget', 'revenue'],
        language: 'en'
      },
      fileName: {
        contains: ['finance', 'accounting', 'budget']
      }
    },
    actions: {
      category: 'Financial',
      tags: ['financial', 'accounting'],
      folder: '/Documents/Financial',
      metadata: {
        department: 'Finance',
        requiresApproval: true
      }
    },
    performance: {
      accuracy: 0.89,
      totalProcessed: 1250,
      correctPredictions: 1113,
      lastRun: new Date('2024-03-15T14:30:00Z'),
      averageConfidence: 0.87
    },
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-03-10T16:20:00Z'),
    createdBy: {
      id: 'user1',
      name: 'John Doe'
    }
  },
  {
    id: 'rule2',
    name: 'Legal Document Classifier',
    description: 'Identify and classify legal documents and contracts',
    isActive: true,
    confidence: 0.92,
    priority: 2,
    conditions: {
      fileType: ['pdf', 'docx'],
      content: {
        keywords: ['contract', 'agreement', 'legal', 'terms', 'conditions', 'jurisdiction'],
        phrases: ['hereby agree', 'in consideration of', 'subject to the terms']
      },
      fileName: {
        regex: '.*(contract|agreement|legal).*'
      }
    },
    actions: {
      category: 'Legal',
      tags: ['legal', 'contract'],
      folder: '/Documents/Legal',
      metadata: {
        confidential: true,
        retentionPeriod: '7 years'
      },
      notify: ['legal-team@company.com']
    },
    performance: {
      accuracy: 0.94,
      totalProcessed: 567,
      correctPredictions: 533,
      lastRun: new Date('2024-03-14T09:15:00Z'),
      averageConfidence: 0.91
    },
    createdAt: new Date('2024-02-01T12:00:00Z'),
    updatedAt: new Date('2024-03-08T11:45:00Z'),
    createdBy: {
      id: 'user2',
      name: 'Sarah Chen'
    }
  }
];

const mockModels: MLModel[] = [
  {
    id: 'model1',
    name: 'Document Type Classifier',
    type: 'document_type',
    version: '2.1.0',
    isActive: true,
    status: 'ready',
    accuracy: 0.91,
    trainingData: {
      totalSamples: 50000,
      categories: ['Financial', 'Legal', 'HR', 'Technical', 'Marketing'],
      lastTraining: new Date('2024-03-01T08:00:00Z')
    },
    performance: {
      precision: 0.89,
      recall: 0.87,
      f1Score: 0.88,
      processingTime: 150
    },
    deployment: {
      environment: 'production',
      lastDeployed: new Date('2024-03-05T14:30:00Z'),
      instances: 3
    }
  },
  {
    id: 'model2',
    name: 'Content Extractor',
    type: 'content_extraction',
    version: '1.3.0',
    isActive: true,
    status: 'ready',
    accuracy: 0.86,
    trainingData: {
      totalSamples: 25000,
      categories: ['Entities', 'Dates', 'Amounts', 'References'],
      lastTraining: new Date('2024-02-20T16:45:00Z')
    },
    performance: {
      precision: 0.84,
      recall: 0.82,
      f1Score: 0.83,
      processingTime: 200
    },
    deployment: {
      environment: 'production',
      lastDeployed: new Date('2024-02-25T10:15:00Z'),
      instances: 2
    }
  }
];

const mockJobs: ClassificationJob[] = [
  {
    id: 'job1',
    name: 'Weekly Document Classification',
    status: 'running',
    progress: 65,
    documentsToProcess: 450,
    documentsProcessed: 293,
    documentsSuccessful: 284,
    documentsFailed: 9,
    startedAt: new Date('2024-03-15T09:00:00Z'),
    estimatedCompletion: new Date('2024-03-15T11:30:00Z'),
    rules: ['rule1', 'rule2'],
    models: ['model1', 'model2']
  },
  {
    id: 'job2',
    name: 'Historical Archive Classification',
    status: 'completed',
    progress: 100,
    documentsToProcess: 1200,
    documentsProcessed: 1200,
    documentsSuccessful: 1156,
    documentsFailed: 44,
    startedAt: new Date('2024-03-14T14:00:00Z'),
    completedAt: new Date('2024-03-14T18:45:00Z'),
    rules: ['rule1'],
    models: ['model1'],
    results: {
      categorized: 1156,
      tagged: 1156,
      moved: 1098,
      errors: [
        { document: 'doc1.pdf', error: 'Insufficient confidence level' },
        { document: 'doc2.docx', error: 'Content parsing failed' }
      ]
    }
  }
];

export const AutoClassificationCenter: React.FC<AutoClassificationCenterProps> = ({
  onRuleCreate,
  onRuleUpdate,
  onRuleDelete,
  onModelTrain,
  onModelDeploy,
  onJobStart,
  onJobCancel,
  className = ''
}) => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'rules' | 'models' | 'jobs' | 'analytics'>('rules');
  const [rules, setRules] = useState<ClassificationRule[]>(mockRules);
  const [models, setModels] = useState<MLModel[]>(mockModels);
  const [jobs, setJobs] = useState<ClassificationJob[]>(mockJobs);
  const [loading, setLoading] = useState(false);
  const [selectedRule, setSelectedRule] = useState<ClassificationRule | null>(null);
  const [showRuleModal, setShowRuleModal] = useState(false);

  // Toggle rule active status
  const handleToggleRule = useCallback((ruleId: string) => {
    setRules(prev => prev.map(rule =>
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ));
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      onRuleUpdate(ruleId, { isActive: !rule.isActive });
    }
  }, [rules, onRuleUpdate]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': case 'completed': case 'active': return 'text-green-600 bg-green-100 border-green-300';
      case 'training': case 'running': case 'pending': return 'text-blue-600 bg-blue-100 border-blue-300';
      case 'error': case 'failed': return 'text-red-600 bg-red-100 border-red-300';
      case 'deploying': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  // Format accuracy percentage
  const formatAccuracy = (accuracy: number) => `${(accuracy * 100).toFixed(1)}%`;

  // Format processing time
  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Render rules tab
  const renderRulesTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Classification Rules
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Define rules for automatic document classification
          </p>
        </div>
        <button
          onClick={() => setShowRuleModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <SparklesIcon className="w-4 h-4 mr-2" />
          Create Rule
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {rules.map(rule => (
          <div
            key={rule.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {rule.name}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                    rule.isActive ? 'text-green-600 bg-green-100 border-green-300' : 'text-gray-600 bg-gray-100 border-gray-300'
                  }`}>
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                  {rule.description}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Accuracy</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatAccuracy(rule.performance.accuracy)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Confidence</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatAccuracy(rule.confidence)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Documents Processed</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {rule.performance.totalProcessed.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Last Run</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {rule.performance.lastRun.toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <button
                  onClick={() => handleToggleRule(rule.id)}
                  className={`p-2 rounded-md transition-colors ${
                    rule.isActive
                      ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                      : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  title={rule.isActive ? 'Disable rule' : 'Enable rule'}
                >
                  {rule.isActive ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setSelectedRule(rule)}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                  title="View details"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onRuleDelete(rule.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                  title="Delete rule"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Performance visualization */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                <span>Performance</span>
                <span>{formatAccuracy(rule.performance.accuracy)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${rule.performance.accuracy * 100}%` }}
                />
              </div>
            </div>

            {/* Actions preview */}
            <div className="mt-4 flex flex-wrap gap-2">
              {rule.actions.category && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                  <FolderIcon className="w-3 h-3 mr-1" />
                  {rule.actions.category}
                </span>
              )}
              {rule.actions.tags?.slice(0, 2).map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                >
                  <TagIcon className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
              {rule.actions.tags && rule.actions.tags.length > 2 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{rule.actions.tags.length - 2} more
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render models tab
  const renderModelsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Machine Learning Models
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Manage and monitor AI models for document classification
          </p>
        </div>
        <button className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
          <CpuChipIcon className="w-4 h-4 mr-2" />
          Train New Model
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {models.map(model => (
          <div
            key={model.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {model.name}
                  </h4>
                  <span className="text-sm text-gray-500">v{model.version}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(model.status)}`}>
                    {model.status}
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
                  <span className="capitalize">{model.type.replace('_', ' ')}</span>
                  <span>{model.deployment.environment}</span>
                  <span>{model.deployment.instances} instances</span>
                </div>
              </div>
            </div>

            {/* Performance metrics */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatAccuracy(model.accuracy)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Accuracy</div>
              </div>

              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatAccuracy(model.performance.f1Score)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">F1 Score</div>
              </div>

              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {model.trainingData.totalSamples.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Training Samples</div>
              </div>

              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {formatProcessingTime(model.performance.processingTime)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Avg. Processing</div>
              </div>
            </div>

            {/* Categories */}
            <div className="mb-4">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Categories</div>
              <div className="flex flex-wrap gap-1">
                {model.trainingData.categories.slice(0, 3).map(category => (
                  <span
                    key={category}
                    className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                  >
                    {category}
                  </span>
                ))}
                {model.trainingData.categories.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{model.trainingData.categories.length - 3} more
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Last trained: {model.trainingData.lastTraining.toLocaleDateString()}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onModelTrain(model.id, {})}
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                  title="Retrain model"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onModelDeploy(model.id, 'production')}
                  className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
                  title="Deploy model"
                >
                  <BoltIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render jobs tab
  const renderJobsTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Classification Jobs
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Monitor batch classification jobs and their progress
          </p>
        </div>
        <button
          onClick={() => onJobStart({})}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          <PlayIcon className="w-4 h-4 mr-2" />
          Start New Job
        </button>
      </div>

      <div className="space-y-4">
        {jobs.map(job => (
          <div
            key={job.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {job.name}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Progress</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {job.progress}%
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Processed</span>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {job.documentsProcessed} / {job.documentsToProcess}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Successful</span>
                    <div className="font-medium text-green-600">
                      {job.documentsSuccessful}
                    </div>
                  </div>

                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Failed</span>
                    <div className="font-medium text-red-600">
                      {job.documentsFailed}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {job.status === 'running' && (
                  <button
                    onClick={() => onJobCancel(job.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    title="Cancel job"
                  >
                    <XCircleIcon className="w-4 h-4" />
                  </button>
                )}

                <button
                  className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                  title="View details"
                >
                  <EyeIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                <span>Progress</span>
                <span>{job.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    job.status === 'completed' ? 'bg-green-500' :
                    job.status === 'failed' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>

            {/* Job details */}
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-4">
                {job.startedAt && (
                  <span className="flex items-center space-x-1">
                    <ClockIcon className="w-4 h-4" />
                    <span>Started {job.startedAt.toLocaleString()}</span>
                  </span>
                )}

                {job.estimatedCompletion && job.status === 'running' && (
                  <span>
                    ETA: {job.estimatedCompletion.toLocaleTimeString()}
                  </span>
                )}

                {job.completedAt && (
                  <span>
                    Completed {job.completedAt.toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span>{job.rules.length} rules</span>
                <span>{job.models.length} models</span>
              </div>
            </div>

            {/* Results summary for completed jobs */}
            {job.status === 'completed' && job.results && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {job.results.categorized}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Categorized</div>
                  </div>

                  <div className="text-center">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {job.results.tagged}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Tagged</div>
                  </div>

                  <div className="text-center">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {job.results.moved}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Moved</div>
                  </div>

                  <div className="text-center">
                    <div className="font-medium text-red-600">
                      {job.results.errors.length}
                    </div>
                    <div className="text-gray-500 dark:text-gray-400">Errors</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton height={40} width={300} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <LoadingSkeleton height={24} width="60%" className="mb-2" />
              <LoadingSkeleton height={16} width="80%" className="mb-4" />
              <div className="space-y-2">
                <LoadingSkeleton height={12} width="100%" />
                <LoadingSkeleton height={12} width="80%" />
                <LoadingSkeleton height={12} width="60%" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`auto-classification-center ${className}`} dir="ltr">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Auto-Classification Center
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            AI-powered document classification with machine learning models
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{rules.filter(r => r.isActive).length} active rules</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>{models.filter(m => m.status === 'ready').length} ready models</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'rules', label: 'Classification Rules', icon: SparklesIcon },
            { id: 'models', label: 'ML Models', icon: CpuChipIcon },
            { id: 'jobs', label: 'Processing Jobs', icon: Cog6ToothIcon },
            { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-5 h-5 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'rules' && renderRulesTab()}
        {activeTab === 'models' && renderModelsTab()}
        {activeTab === 'jobs' && renderJobsTab()}
        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <ChartBarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Classification Analytics
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              View detailed analytics on classification performance and accuracy
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutoClassificationCenter;