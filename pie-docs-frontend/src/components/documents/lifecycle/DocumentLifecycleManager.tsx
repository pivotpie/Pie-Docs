import React, { useState, useEffect, useCallback } from 'react';
import {
  DocumentTextIcon,
  EyeIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  TrashIcon,
  ClockIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowPathIcon,
  PlusIcon,
  Cog6ToothIcon,
  CalendarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';

interface LifecycleStage {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  bgColor: string;
  borderColor: string;
  isTerminal?: boolean;
  allowedTransitions: string[];
  requirements?: {
    approvals?: number;
    roles?: string[];
    documents?: string[];
    timeConstraints?: {
      minDays?: number;
      maxDays?: number;
    };
  };
}

interface LifecycleDocument {
  id: string;
  name: string;
  currentStage: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  assignees: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }[];
  stageHistory: {
    stage: string;
    enteredAt: Date;
    actor: {
      id: string;
      name: string;
    };
    notes?: string;
    automated?: boolean;
  }[];
  metadata: {
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
    tags: string[];
    retentionDate?: Date;
    disposalDate?: Date;
    legalHold?: boolean;
  };
  progress: {
    completedStages: string[];
    currentProgress: number;
    estimatedCompletion?: Date;
    blockers?: {
      type: string;
      description: string;
      reportedAt: Date;
    }[];
  };
}

interface LifecycleRule {
  id: string;
  name: string;
  description: string;
  conditions: {
    documentTypes?: string[];
    metadata?: Record<string, any>;
    timeConstraints?: {
      afterDays?: number;
      beforeDate?: Date;
    };
  };
  actions: {
    transitionTo?: string;
    notify?: string[];
    require?: {
      approvals?: number;
      roles?: string[];
    };
    automate?: boolean;
  };
  isActive: boolean;
}

interface DocumentLifecycleManagerProps {
  onDocumentSelect: (document: LifecycleDocument) => void;
  onStageTransition: (documentId: string, fromStage: string, toStage: string, notes?: string) => void;
  onRetentionUpdate: (documentId: string, retentionDate: Date) => void;
  onDisposalApprove: (documentId: string) => void;
  onRuleCreate: (rule: Omit<LifecycleRule, 'id'>) => void;
  onRuleUpdate: (ruleId: string, updates: Partial<LifecycleRule>) => void;
  className?: string;
}

// Default lifecycle stages
const defaultStages: LifecycleStage[] = [
  {
    id: 'draft',
    name: 'Draft',
    description: 'Document is being created or edited',
    icon: DocumentTextIcon,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    allowedTransitions: ['review', 'approved', 'archived']
  },
  {
    id: 'review',
    name: 'Under Review',
    description: 'Document is being reviewed by stakeholders',
    icon: EyeIcon,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    allowedTransitions: ['draft', 'approved', 'rejected'],
    requirements: {
      approvals: 2,
      roles: ['reviewer', 'manager']
    }
  },
  {
    id: 'approved',
    name: 'Approved',
    description: 'Document has been approved and is active',
    icon: CheckCircleIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    allowedTransitions: ['review', 'archived', 'superseded'],
    requirements: {
      approvals: 1,
      roles: ['approver', 'manager']
    }
  },
  {
    id: 'superseded',
    name: 'Superseded',
    description: 'Document has been replaced by a newer version',
    icon: ArrowPathIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    allowedTransitions: ['archived'],
    isTerminal: true
  },
  {
    id: 'archived',
    name: 'Archived',
    description: 'Document is archived but retained for reference',
    icon: ArchiveBoxIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    allowedTransitions: ['disposed'],
    requirements: {
      timeConstraints: {
        minDays: 1095 // 3 years minimum retention
      }
    }
  },
  {
    id: 'disposed',
    name: 'Disposed',
    description: 'Document has been securely disposed of',
    icon: TrashIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    allowedTransitions: [],
    isTerminal: true,
    requirements: {
      approvals: 2,
      roles: ['compliance-officer', 'legal']
    }
  },
  {
    id: 'rejected',
    name: 'Rejected',
    description: 'Document has been rejected and needs revision',
    icon: ExclamationTriangleIcon,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    allowedTransitions: ['draft', 'archived']
  }
];

// Mock data
const mockDocuments: LifecycleDocument[] = [
  {
    id: 'doc1',
    name: 'Employee Handbook v2.1',
    currentStage: 'review',
    createdAt: new Date('2024-03-01T10:00:00Z'),
    updatedAt: new Date('2024-03-15T14:30:00Z'),
    author: {
      id: 'user1',
      name: 'John Doe',
      email: 'john@company.com'
    },
    assignees: [
      {
        id: 'reviewer1',
        name: 'Alice Johnson',
        role: 'HR Manager',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b5c7?w=32&h=32&fit=crop&crop=face'
      },
      {
        id: 'reviewer2',
        name: 'Bob Wilson',
        role: 'Legal Counsel',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face'
      }
    ],
    stageHistory: [
      {
        stage: 'draft',
        enteredAt: new Date('2024-03-01T10:00:00Z'),
        actor: { id: 'user1', name: 'John Doe' },
        notes: 'Initial creation'
      },
      {
        stage: 'review',
        enteredAt: new Date('2024-03-10T09:00:00Z'),
        actor: { id: 'user1', name: 'John Doe' },
        notes: 'Submitted for stakeholder review'
      }
    ],
    metadata: {
      priority: 'high',
      category: 'HR Policy',
      tags: ['handbook', 'policy', 'hr'],
      legalHold: false
    },
    progress: {
      completedStages: ['draft'],
      currentProgress: 25,
      estimatedCompletion: new Date('2024-03-25T17:00:00Z')
    }
  },
  {
    id: 'doc2',
    name: 'Q4 Financial Report',
    currentStage: 'approved',
    createdAt: new Date('2024-01-15T08:00:00Z'),
    updatedAt: new Date('2024-02-01T16:45:00Z'),
    author: {
      id: 'user2',
      name: 'Sarah Chen',
      email: 'sarah@company.com'
    },
    assignees: [],
    stageHistory: [
      {
        stage: 'draft',
        enteredAt: new Date('2024-01-15T08:00:00Z'),
        actor: { id: 'user2', name: 'Sarah Chen' }
      },
      {
        stage: 'review',
        enteredAt: new Date('2024-01-25T14:00:00Z'),
        actor: { id: 'user2', name: 'Sarah Chen' }
      },
      {
        stage: 'approved',
        enteredAt: new Date('2024-02-01T16:45:00Z'),
        actor: { id: 'cfo', name: 'CFO Office' },
        automated: true
      }
    ],
    metadata: {
      priority: 'medium',
      category: 'Financial',
      tags: ['quarterly', 'financial', 'report'],
      retentionDate: new Date('2031-02-01T00:00:00Z'), // 7 years
      legalHold: false
    },
    progress: {
      completedStages: ['draft', 'review', 'approved'],
      currentProgress: 75,
      estimatedCompletion: new Date('2024-02-15T17:00:00Z')
    }
  }
];

export const DocumentLifecycleManager: React.FC<DocumentLifecycleManagerProps> = ({
  onDocumentSelect,
  onStageTransition,
  onRetentionUpdate,
  onDisposalApprove,
  onRuleCreate,
  onRuleUpdate,
  className = ''
}) => {
  const [documents, setDocuments] = useState<LifecycleDocument[]>([]);
  const [stages] = useState<LifecycleStage[]>(defaultStages);
  const [selectedDocument, setSelectedDocument] = useState<LifecycleDocument | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'workflow' | 'rules' | 'analytics'>('overview');
  const [loading, setLoading] = useState(true);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [transitionData, setTransitionData] = useState<{
    documentId: string;
    fromStage: string;
    toStage: string;
  } | null>(null);
  const [transitionNotes, setTransitionNotes] = useState('');

  // Load documents
  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDocuments(mockDocuments);
      setLoading(false);
    };

    loadDocuments();
  }, []);

  // Handle stage transition
  const handleStageTransition = useCallback((documentId: string, fromStage: string, toStage: string) => {
    setTransitionData({ documentId, fromStage, toStage });
    setShowTransitionModal(true);
  }, []);

  const confirmTransition = useCallback(() => {
    if (transitionData) {
      onStageTransition(transitionData.documentId, transitionData.fromStage, transitionData.toStage, transitionNotes);
      setShowTransitionModal(false);
      setTransitionData(null);
      setTransitionNotes('');
    }
  }, [transitionData, transitionNotes, onStageTransition]);

  // Get stage by ID
  const getStage = useCallback((stageId: string) => {
    return stages.find(s => s.id === stageId);
  }, [stages]);

  // Calculate days in current stage
  const getDaysInStage = useCallback((document: LifecycleDocument) => {
    const currentStageHistory = document.stageHistory
      .filter(h => h.stage === document.currentStage)
      .sort((a, b) => b.enteredAt.getTime() - a.enteredAt.getTime())[0];

    if (!currentStageHistory) return 0;

    const diffTime = Date.now() - currentStageHistory.enteredAt.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  // Get priority color
  const getPriorityColor = (priority: LifecycleDocument['metadata']['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 border-red-300';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-300';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      case 'low': return 'text-green-600 bg-green-100 border-green-300';
      default: return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  // Render workflow visualization
  const renderWorkflowVisualization = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        Document Lifecycle Workflow
      </h3>

      <div className="relative">
        {/* Workflow stages */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {stages.map((stage, index) => {
            const Icon = stage.icon;
            const stageDocuments = documents.filter(d => d.currentStage === stage.id);

            return (
              <div key={stage.id} className="relative">
                <div className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${stage.bgColor} ${stage.borderColor}`}>
                  <div className="flex items-center space-x-2 mb-3">
                    <Icon className={`w-5 h-5 ${stage.color}`} />
                    <h4 className={`font-medium ${stage.color}`}>{stage.name}</h4>
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                    {stage.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className={`text-lg font-bold ${stage.color}`}>
                      {stageDocuments.length}
                    </span>
                    <span className="text-xs text-gray-500">
                      documents
                    </span>
                  </div>

                  {/* Requirements badge */}
                  {stage.requirements && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        <ShieldCheckIcon className="w-3 h-3 mr-1" />
                        Requirements
                      </span>
                    </div>
                  )}
                </div>

                {/* Arrow to next stage */}
                {index < stages.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2">
                    <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Render document list
  const renderDocumentList = () => (
    <div className="space-y-4">
      {documents.map((document) => {
        const currentStage = getStage(document.currentStage);
        const daysInStage = getDaysInStage(document);

        return (
          <div
            key={document.id}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              setSelectedDocument(document);
              onDocumentSelect(document);
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {document.name}
                </h4>

                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center space-x-1">
                    <UserGroupIcon className="w-4 h-4" />
                    <span>{document.author.name}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <CalendarIcon className="w-4 h-4" />
                    <span>Updated {new Date(document.updatedAt).toLocaleDateString()}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <ClockIcon className="w-4 h-4" />
                    <span>{daysInStage} days in stage</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Priority badge */}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(document.metadata.priority)}`}>
                  {document.metadata.priority}
                </span>

                {/* Current stage */}
                {currentStage && (
                  <div className={`flex items-center px-3 py-1.5 rounded-lg ${currentStage.bgColor} ${currentStage.borderColor} border`}>
                    <currentStage.icon className={`w-4 h-4 mr-2 ${currentStage.color}`} />
                    <span className={`text-sm font-medium ${currentStage.color}`}>
                      {currentStage.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                <span>Progress</span>
                <span>{document.progress.currentProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${document.progress.currentProgress}%` }}
                />
              </div>
            </div>

            {/* Assignees */}
            {document.assignees.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">Assigned to:</span>
                <div className="flex -space-x-2">
                  {document.assignees.slice(0, 3).map((assignee) => (
                    <div
                      key={assignee.id}
                      className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center"
                      title={`${assignee.name} (${assignee.role})`}
                    >
                      {assignee.avatar ? (
                        <img
                          src={assignee.avatar}
                          alt={assignee.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {assignee.name.charAt(0)}
                        </span>
                      )}
                    </div>
                  ))}
                  {document.assignees.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        +{document.assignees.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Available transitions */}
            {currentStage && currentStage.allowedTransitions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Available actions:</span>
                  <div className="flex space-x-2">
                    {currentStage.allowedTransitions.map((transitionId) => {
                      const targetStage = getStage(transitionId);
                      if (!targetStage) return null;

                      return (
                        <button
                          key={transitionId}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStageTransition(document.id, document.currentStage, transitionId);
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-colors hover:shadow-sm ${targetStage.bgColor} ${targetStage.color} ${targetStage.borderColor}`}
                        >
                          Move to {targetStage.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton height={40} width={300} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <LoadingSkeleton height={20} width="60%" className="mb-2" />
              <LoadingSkeleton height={16} width="80%" className="mb-3" />
              <LoadingSkeleton height={8} width="100%" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`document-lifecycle-manager ${className}`} dir="ltr">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Document Lifecycle Manager
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Manage document stages, workflows, and retention policies
          </p>
        </div>

        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Rule
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: DocumentTextIcon },
            { id: 'workflow', label: 'Workflow', icon: ArrowPathIcon },
            { id: 'rules', label: 'Automation Rules', icon: Cog6ToothIcon },
            { id: 'analytics', label: 'Analytics', icon: DocumentTextIcon },
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
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {renderWorkflowVisualization()}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Documents in Lifecycle
              </h3>
              {renderDocumentList()}
            </div>
          </div>
        )}

        {activeTab === 'workflow' && (
          <div className="space-y-6">
            {renderWorkflowVisualization()}
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="text-center py-12">
            <Cog6ToothIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Automation Rules
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Configure automated lifecycle transitions and notifications
            </p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="text-center py-12">
            <div className="w-12 h-12 text-gray-400 mx-auto mb-4">📊</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Lifecycle Analytics
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              View analytics on document lifecycle performance and bottlenecks
            </p>
          </div>
        )}
      </div>

      {/* Stage Transition Modal */}
      {showTransitionModal && transitionData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Stage Transition
            </h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-gray-600 dark:text-gray-300">Moving from</span>
                <span className="font-medium">{getStage(transitionData.fromStage)?.name}</span>
                <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                <span className="font-medium">{getStage(transitionData.toStage)?.name}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Transition Notes (Optional)
                </label>
                <textarea
                  value={transitionNotes}
                  onChange={(e) => setTransitionNotes(e.target.value)}
                  placeholder="Add notes about this transition..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowTransitionModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmTransition}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Confirm Transition
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentLifecycleManager;