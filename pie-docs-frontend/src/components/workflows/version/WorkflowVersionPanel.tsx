import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store'
import { updateWorkflow } from '@/store/slices/workflowsSlice'

interface WorkflowVersion {
  id: string
  version: number
  name: string
  description: string
  timestamp: string
  author: string
  changes: string[]
  workflow: any
}

interface WorkflowVersionPanelProps {
  className?: string
}

const WorkflowVersionPanel: React.FC<WorkflowVersionPanelProps> = ({ className = '' }) => {
  const dispatch = useDispatch()
  const { currentWorkflow } = useSelector((state: RootState) => state.workflows)
  const [isExpanded, setIsExpanded] = useState(false)

  // Mock version history - in a real app this would come from the backend
  const versionHistory: WorkflowVersion[] = [
    {
      id: 'v3',
      version: 3,
      name: 'Current Version',
      description: 'Added validation and testing features',
      timestamp: new Date().toISOString(),
      author: 'Current User',
      changes: [
        'Added new validation rules',
        'Improved testing interface',
        'Updated connection logic'
      ],
      workflow: currentWorkflow
    },
    {
      id: 'v2',
      version: 2,
      name: 'Enhanced Workflow',
      description: 'Added decision nodes and improved layout',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      author: 'Team Member',
      changes: [
        'Added decision step functionality',
        'Improved canvas layout',
        'Enhanced element library'
      ],
      workflow: null
    },
    {
      id: 'v1',
      version: 1,
      name: 'Initial Version',
      description: 'Basic workflow structure',
      timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
      author: 'Original Creator',
      changes: [
        'Created initial workflow structure',
        'Added basic approval steps',
        'Set up notification system'
      ],
      workflow: null
    }
  ]

  const handleVersionRestore = (version: WorkflowVersion) => {
    if (version.workflow && currentWorkflow) {
      const restoredWorkflow = {
        ...version.workflow,
        id: currentWorkflow.id,
        version: currentWorkflow.version + 1,
        updatedAt: new Date().toISOString()
      }
      dispatch(updateWorkflow(restoredWorkflow))
    }
  }

  const handleCreateVersion = () => {
    if (currentWorkflow) {
      // In a real app, this would save the current state as a new version
      console.log('Creating new version of workflow:', currentWorkflow.name)
      alert('New version created successfully!')
    }
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!currentWorkflow) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-2 text-sm">No workflow for version control</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-medium text-gray-900">Version Control</h3>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              v{currentWorkflow.version}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {!isExpanded && (
          <div className="mt-2 text-sm text-gray-600">
            Last updated: {formatDate(currentWorkflow.updatedAt)}
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Quick Actions */}
          <div className="mb-4 flex space-x-2">
            <button
              onClick={handleCreateVersion}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Version
            </button>
            <button
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled
            >
              Compare Versions
            </button>
          </div>

          {/* Version History */}
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {versionHistory.map((version) => (
              <div
                key={version.id}
                className={`p-3 rounded-lg border ${
                  version.version === currentWorkflow.version
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                } transition-colors`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-grow">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        Version {version.version}
                      </h4>
                      {version.version === currentWorkflow.version && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {version.description}
                    </p>
                    <div className="text-xs text-gray-500 mb-2">
                      {formatDate(version.timestamp)} • {version.author}
                    </div>

                    {/* Changes */}
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                        {version.changes.length} changes
                      </summary>
                      <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
                        {version.changes.map((change, index) => (
                          <li key={index}>{change}</li>
                        ))}
                      </ul>
                    </details>
                  </div>

                  {/* Actions */}
                  {version.version !== currentWorkflow.version && (
                    <div className="flex space-x-1 ml-3">
                      <button
                        onClick={() => handleVersionRestore(version)}
                        className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                        disabled={!version.workflow}
                      >
                        Restore
                      </button>
                      <button
                        className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                        disabled
                      >
                        View
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Version Statistics */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-gray-900">{versionHistory.length}</div>
                <div className="text-xs text-gray-500">Versions</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{currentWorkflow.elements?.length || 0}</div>
                <div className="text-xs text-gray-500">Elements</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{currentWorkflow.connections?.length || 0}</div>
                <div className="text-xs text-gray-500">Connections</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkflowVersionPanel