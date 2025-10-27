/**
 * Execute Workflow Modal
 * Dialog for triggering workflow execution with optional parameters
 */

import { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { workflowService } from '@/services/workflowApi'
import type { WorkflowExecutionCreate } from '@/services/workflowApi'

interface ExecuteWorkflowModalProps {
  workflowId: string
  workflowName: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: (executionId: string) => void
}

const ExecuteWorkflowModal = ({
  workflowId,
  workflowName,
  isOpen,
  onClose,
  onSuccess
}: ExecuteWorkflowModalProps) => {
  const { theme } = useTheme()
  const [documentId, setDocumentId] = useState('')
  const [initialData, setInitialData] = useState('{}')
  const [isExecuting, setIsExecuting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleExecute = async () => {
    setError(null)
    setIsExecuting(true)

    try {
      // Validate initial data JSON
      let parsedData = {}
      if (initialData.trim()) {
        try {
          parsedData = JSON.parse(initialData)
        } catch (e) {
          throw new Error('Invalid JSON in initial data')
        }
      }

      const executionData: WorkflowExecutionCreate = {
        document_id: documentId || undefined,
        initial_data: parsedData
      }

      const result = await workflowService.executeWorkflow(workflowId, executionData)

      // Success
      if (onSuccess) {
        onSuccess(result.id)
      }

      // Reset form and close
      setDocumentId('')
      setInitialData('{}')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute workflow')
      console.error('Execution error:', err)
    } finally {
      setIsExecuting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative glass-strong rounded-lg shadow-xl w-full max-w-md p-6 z-10">
          {/* Header */}
          <div className="mb-4">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
              Execute Workflow
            </h3>
            <p className="text-sm text-white/60 mt-1">
              {workflowName}
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Document ID Input */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Document ID <span className="text-white/50">(Optional)</span>
              </label>
              <input
                type="text"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                placeholder="Enter document UUID"
                className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-white/50 mt-1">
                Associate this workflow execution with a document
              </p>
            </div>

            {/* Initial Data JSON */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Initial Data <span className="text-white/50">(JSON)</span>
              </label>
              <textarea
                value={initialData}
                onChange={(e) => setInitialData(e.target.value)}
                rows={6}
                placeholder='{"key": "value"}'
                className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-white/50 mt-1">
                Provide initial context data as JSON
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="glass-panel rounded-lg p-3 bg-red-500/10 border border-red-500/20">
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isExecuting}
              className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="btn-glass px-4 py-2 text-sm font-medium rounded-md hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isExecuting ? (
                <span className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Executing...
                </span>
              ) : (
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Execute Workflow
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExecuteWorkflowModal
