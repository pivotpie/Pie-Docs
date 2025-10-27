import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Widget from '../Widget';
import type { WidgetProps } from '../Widget';
import type { DashboardData } from '@/contexts/DashboardDataContext';

interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
  duration?: number; // in seconds
  startTime?: Date;
  endTime?: Date;
  errorMessage?: string;
  progress?: number; // 0-100
}

interface WorkflowInstance {
  id: string;
  name: string;
  type: 'document-processing' | 'ocr' | 'approval' | 'archive' | 'custom';
  status: 'running' | 'completed' | 'failed' | 'paused' | 'queued';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  steps: WorkflowStep[];
  startTime: Date;
  estimatedCompletion?: Date;
  documentCount?: number;
  assignedUser?: string;
}

interface WorkflowStatusWidgetProps extends WidgetProps {
  maxWorkflows?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  data?: DashboardData | null;
}

const WorkflowStatusWidget: React.FC<WorkflowStatusWidgetProps> = ({
  maxWorkflows = 5,
  autoRefresh = true,
  refreshInterval = 10000,
  data,
  ...widgetProps
}) => {
  const { t } = useTranslation('dashboard');
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'running' | 'failed' | 'completed'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data generation
  useEffect(() => {
    const generateWorkflows = (): WorkflowInstance[] => {
      const workflowTypes: Array<WorkflowInstance['type']> = ['document-processing', 'ocr', 'approval', 'archive', 'custom'];
      const statuses: Array<WorkflowInstance['status']> = ['running', 'completed', 'failed', 'paused', 'queued'];
      const priorities: Array<WorkflowInstance['priority']> = ['low', 'medium', 'high', 'critical'];

      return Array.from({ length: Math.floor(Math.random() * 8) + 3 }, (_, i) => {
        const type = workflowTypes[Math.floor(Math.random() * workflowTypes.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const priority = priorities[Math.floor(Math.random() * priorities.length)];
        const startTime = new Date(Date.now() - Math.random() * 86400000); // Last 24 hours

        const steps: WorkflowStep[] = [
          {
            id: '1',
            name: t('enhanced.workflow.steps.documentValidation'),
            status: status === 'completed' ? 'completed' : status === 'running' ? 'completed' : 'pending',
            duration: 5,
            startTime,
            endTime: status === 'completed' ? new Date(startTime.getTime() + 5000) : undefined
          },
          {
            id: '2',
            name: t('enhanced.workflow.steps.ocrProcessing'),
            status: status === 'completed' ? 'completed' : status === 'running' ? 'active' : 'pending',
            duration: 30,
            startTime: status === 'completed' || status === 'running' ? new Date(startTime.getTime() + 5000) : undefined,
            endTime: status === 'completed' ? new Date(startTime.getTime() + 35000) : undefined,
            progress: status === 'running' ? Math.floor(Math.random() * 100) : undefined
          },
          {
            id: '3',
            name: t('enhanced.workflow.steps.contentAnalysis'),
            status: status === 'completed' ? 'completed' : 'pending',
            duration: 15,
            startTime: status === 'completed' ? new Date(startTime.getTime() + 35000) : undefined,
            endTime: status === 'completed' ? new Date(startTime.getTime() + 50000) : undefined
          },
          {
            id: '4',
            name: t('enhanced.workflow.steps.indexUpdate'),
            status: status === 'completed' ? 'completed' : 'pending',
            duration: 10,
            startTime: status === 'completed' ? new Date(startTime.getTime() + 50000) : undefined,
            endTime: status === 'completed' ? new Date(startTime.getTime() + 60000) : undefined
          }
        ];

        if (status === 'failed') {
          const failedStepIndex = Math.floor(Math.random() * steps.length);
          steps[failedStepIndex].status = 'failed';
          steps[failedStepIndex].errorMessage = t('enhanced.workflow.errors.processingTimeout');
        }

        const completedSteps = steps.filter(s => s.status === 'completed').length;
        const progress = Math.floor((completedSteps / steps.length) * 100);

        const getTypeName = (type: string) => {
          switch (type) {
            case 'document-processing': return t('enhanced.workflow.types.documentProcessing');
            case 'ocr': return t('enhanced.workflow.types.ocr');
            case 'approval': return t('enhanced.workflow.types.approval');
            case 'archive': return t('enhanced.workflow.types.archive');
            case 'custom': return t('enhanced.workflow.types.custom');
            default: return type;
          }
        };

        return {
          id: `workflow-${i}`,
          name: `${getTypeName(type)} #${1000 + i}`,
          type,
          status,
          priority,
          progress,
          steps,
          startTime,
          estimatedCompletion: status === 'running' ? new Date(Date.now() + Math.random() * 1800000) : undefined,
          documentCount: Math.floor(Math.random() * 50) + 1,
          assignedUser: ['Alice Johnson', 'Bob Smith', 'Carol Wilson', 'David Chen'][Math.floor(Math.random() * 4)]
        };
      });
    };

    setIsLoading(true);
    setTimeout(() => {
      setWorkflows(generateWorkflows());
      setIsLoading(false);
    }, 800);

    if (autoRefresh) {
      const interval = setInterval(() => {
        setWorkflows(generateWorkflows());
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (status: WorkflowInstance['status']) => {
    switch (status) {
      case 'running': return 'text-blue-400 bg-blue-500/10';
      case 'completed': return 'text-green-400 bg-green-500/10';
      case 'failed': return 'text-red-400 bg-red-500/10';
      case 'paused': return 'text-yellow-400 bg-yellow-500/10';
      case 'queued': return 'text-gray-400 bg-gray-500/10';
    }
  };

  const getPriorityColor = (priority: WorkflowInstance['priority']) => {
    switch (priority) {
      case 'low': return 'text-gray-400';
      case 'medium': return 'text-blue-400';
      case 'high': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
    }
  };

  const getStepStatusIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'active':
        return (
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        );
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'skipped':
        return (
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default: // pending
        return (
          <div className="w-4 h-4 border-2 border-gray-600 rounded-full" />
        );
    }
  };

  const filteredWorkflows = filter === 'all'
    ? workflows
    : workflows.filter(w => w.status === filter);

  const displayWorkflows = filteredWorkflows.slice(0, maxWorkflows);

  // Use centralized data if available, otherwise use local workflow stats
  const stats = data ? {
    running: Math.floor(data.activeWorkflows * 0.6), // 60% running
    completed: Math.floor(data.activeWorkflows * 0.3), // 30% completed
    failed: Math.floor(data.failedProcessing * 0.1), // 10% of failed processing
    queued: Math.floor(data.processingQueue * 0.1) // 10% of processing queue
  } : {
    running: workflows.filter(w => w.status === 'running').length,
    completed: workflows.filter(w => w.status === 'completed').length,
    failed: workflows.filter(w => w.status === 'failed').length,
    queued: workflows.filter(w => w.status === 'queued').length
  };

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
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="glass-panel p-2 rounded-lg text-center">
            <div className="text-lg font-bold text-blue-400">{stats.running}</div>
            <div className="text-xs text-white/60">{t('enhanced.workflow.running')}</div>
          </div>
          <div className="glass-panel p-2 rounded-lg text-center">
            <div className="text-lg font-bold text-gray-400">{stats.queued}</div>
            <div className="text-xs text-white/60">{t('enhanced.workflow.queued')}</div>
          </div>
          <div className="glass-panel p-2 rounded-lg text-center">
            <div className="text-lg font-bold text-green-400">{stats.completed}</div>
            <div className="text-xs text-white/60">{t('enhanced.workflow.done')}</div>
          </div>
          <div className="glass-panel p-2 rounded-lg text-center">
            <div className="text-lg font-bold text-red-400">{stats.failed}</div>
            <div className="text-xs text-white/60">{t('enhanced.workflow.failed')}</div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-2">
          {([
            { key: 'all', label: t('enhanced.workflow.all') },
            { key: 'running', label: t('enhanced.workflow.running') },
            { key: 'failed', label: t('enhanced.workflow.failed') }
          ] as const).map(filterOption => (
            <button
              key={filterOption.key}
              onClick={() => setFilter(filterOption.key as any)}
              className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                filter === filterOption.key
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>

        {/* Workflows List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          <AnimatePresence>
            {displayWorkflows.map((workflow, index) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`glass-panel p-4 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/10 ${
                  selectedWorkflow === workflow.id ? 'ring-2 ring-primary-500/50' : ''
                }`}
                onClick={() => setSelectedWorkflow(
                  selectedWorkflow === workflow.id ? null : workflow.id
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getStatusColor(workflow.status)}`}>
                      <div className="w-4 h-4">
                        {workflow.status === 'running' && (
                          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        )}
                        {workflow.status === 'completed' && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        {workflow.status === 'failed' && (
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-white truncate">
                          {workflow.name}
                        </h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(workflow.priority)}`}>
                          {workflow.priority}
                        </span>
                      </div>
                      <div className="text-xs text-white/60 mt-1">
                        {t('modern.widgets.workflow.documentsCount', { count: workflow.documentCount })} • {workflow.assignedUser}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {workflow.progress}%
                    </div>
                    <div className="text-xs text-white/60">
                      {workflow.startTime.toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-700 rounded-full h-2 mb-3">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      workflow.status === 'completed' ? 'bg-green-400' :
                      workflow.status === 'failed' ? 'bg-red-400' :
                      workflow.status === 'running' ? 'bg-blue-400' :
                      'bg-gray-500'
                    }`}
                    style={{ width: `${workflow.progress}%` }}
                  />
                </div>

                {/* Expanded Steps View */}
                <AnimatePresence>
                  {selectedWorkflow === workflow.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-white/10 pt-3 mt-3"
                    >
                      <div className="space-y-2">
                        {workflow.steps.map((step, stepIndex) => (
                          <div key={step.id} className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {getStepStatusIcon(step.status)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-white/90">{step.name}</span>
                                {step.duration && (
                                  <span className="text-xs text-white/60">
                                    {step.duration}s
                                  </span>
                                )}
                              </div>
                              {step.status === 'active' && step.progress !== undefined && (
                                <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                                  <div
                                    className="h-1 bg-blue-400 rounded-full transition-all duration-300"
                                    style={{ width: `${step.progress}%` }}
                                  />
                                </div>
                              )}
                              {step.errorMessage && (
                                <div className="text-xs text-red-400 mt-1">
                                  {step.errorMessage}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {workflows.length > maxWorkflows && (
          <div className="text-center">
            <button className="text-xs text-primary-400 hover:text-primary-300 transition-colors">
              {t('enhanced.workflow.all')} {workflows.length} workflows
            </button>
          </div>
        )}
      </div>
    </Widget>
  );
};

export default WorkflowStatusWidget;