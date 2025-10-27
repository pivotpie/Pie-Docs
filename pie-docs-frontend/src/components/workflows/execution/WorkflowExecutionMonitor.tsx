/**
 * Workflow Execution Monitor
 * Displays real-time monitoring of workflow executions
 */

import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { workflowService } from '@/services/workflowApi'
import type { WorkflowExecution } from '@/services/workflowApi'

interface WorkflowExecutionMonitorProps {
  workflowId?: string
  autoRefresh?: boolean
  refreshInterval?: number // in milliseconds
}

const WorkflowExecutionMonitor = ({
  workflowId,
  autoRefresh = false,
  refreshInterval = 5000
}: WorkflowExecutionMonitorProps) => {
  const { theme } = useTheme()
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null)

  const fetchExecutions = async () => {
    if (!workflowId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await workflowService.listExecutions(workflowId, { limit: 50 })
      setExecutions(data)
    } catch (err) {
      setError('Failed to load executions')
      console.error('Error fetching executions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchExecutions()

    // Set up auto-refresh if enabled
    if (autoRefresh && workflowId) {
      const interval = setInterval(fetchExecutions, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [workflowId, autoRefresh, refreshInterval])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-500/20 text-blue-300'
      case 'completed':
        return 'bg-green-500/20 text-green-300'
      case 'failed':
        return 'bg-red-500/20 text-red-300'
      case 'paused':
        return 'bg-yellow-500/20 text-yellow-300'
      default:
        return 'bg-gray-500/20 text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return '⏳'
      case 'completed':
        return '✅'
      case 'failed':
        return '❌'
      case 'paused':
        return '⏸️'
      default:
        return '❓'
    }
  }

  const formatDuration = (startedAt: string, completedAt?: string) => {
    const start = new Date(startedAt)
    const end = completedAt ? new Date(completedAt) : new Date()
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000)

    if (duration < 60) return `${duration}s`
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
  }

  if (!workflowId) {
    return (
      <div className="glass-panel rounded-lg p-8 text-center">
        <p className="text-white/60">Select a workflow to view executions</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
          Execution Monitor
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchExecutions}
            disabled={isLoading}
            className="btn-glass px-3 py-1.5 text-sm rounded-md hover:scale-105 transition-all duration-300 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </span>
            ) : (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </span>
            )}
          </button>
          {autoRefresh && (
            <span className="text-xs text-white/50">
              Auto-refresh: {refreshInterval / 1000}s
            </span>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="glass-panel rounded-lg p-4 bg-red-500/10 border border-red-500/20">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Executions List */}
      <div className="flex-1 overflow-hidden flex space-x-4">
        {/* Left Panel - Execution List */}
        <div className="w-1/2 flex flex-col">
          <div className="glass-panel rounded-lg p-4 flex-1 overflow-y-auto">
            {isLoading && executions.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              </div>
            ) : executions.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-white">No executions</h3>
                <p className="mt-1 text-sm text-white/60">This workflow hasn't been executed yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {executions.map((execution) => (
                  <div
                    key={execution.id}
                    onClick={() => setSelectedExecution(execution)}
                    className={`
                      p-3 rounded-lg cursor-pointer transition-all duration-200
                      ${selectedExecution?.id === execution.id
                        ? 'bg-white/20 border border-white/30'
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{getStatusIcon(execution.status)}</span>
                        <span className="text-sm font-medium text-white">
                          {execution.id.slice(0, 8)}...
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(execution.status)}`}>
                        {execution.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>Started {new Date(execution.started_at).toLocaleString()}</span>
                      <span>{formatDuration(execution.started_at, execution.completed_at)}</span>
                    </div>

                    {execution.current_step_id && (
                      <div className="mt-2 text-xs text-white/60">
                        Current Step: {execution.current_step_id}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Execution Details */}
        <div className="w-1/2 flex flex-col">
          <div className="glass-panel rounded-lg p-4 flex-1 overflow-y-auto">
            {selectedExecution ? (
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">Execution Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Execution ID:</span>
                      <span className="text-white font-mono">{selectedExecution.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Workflow ID:</span>
                      <span className="text-white font-mono">{selectedExecution.workflow_id}</span>
                    </div>
                    {selectedExecution.document_id && (
                      <div className="flex justify-between">
                        <span className="text-white/60">Document ID:</span>
                        <span className="text-white font-mono">{selectedExecution.document_id}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-white/60">Status:</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(selectedExecution.status)}`}>
                        {selectedExecution.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Started:</span>
                      <span className="text-white">{new Date(selectedExecution.started_at).toLocaleString()}</span>
                    </div>
                    {selectedExecution.completed_at && (
                      <div className="flex justify-between">
                        <span className="text-white/60">Completed:</span>
                        <span className="text-white">{new Date(selectedExecution.completed_at).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-white/60">Duration:</span>
                      <span className="text-white">
                        {formatDuration(selectedExecution.started_at, selectedExecution.completed_at)}
                      </span>
                    </div>
                    {selectedExecution.current_step_id && (
                      <div className="flex justify-between">
                        <span className="text-white/60">Current Step:</span>
                        <span className="text-white">{selectedExecution.current_step_id}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedExecution.error_message && (
                  <div className="glass-panel rounded-lg p-3 bg-red-500/10 border border-red-500/20">
                    <h4 className="text-sm font-semibold text-red-300 mb-2">Error</h4>
                    <p className="text-sm text-red-200">{selectedExecution.error_message}</p>
                    {selectedExecution.error_stack && (
                      <details className="mt-2">
                        <summary className="text-xs text-red-300 cursor-pointer">Stack Trace</summary>
                        <pre className="mt-2 text-xs text-red-200 overflow-x-auto">
                          {selectedExecution.error_stack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-semibold text-white mb-2">Execution Data</h4>
                  <div className="glass-panel rounded-lg p-3 bg-white/5">
                    <pre className="text-xs text-white/80 overflow-x-auto">
                      {JSON.stringify(selectedExecution.execution_data, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-white/60 text-sm">Select an execution to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowExecutionMonitor
