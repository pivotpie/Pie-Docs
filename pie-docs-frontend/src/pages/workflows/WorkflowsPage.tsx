import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { useTheme } from '@/contexts/ThemeContext'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '@/store'
import { fetchWorkflows, setCurrentWorkflow } from '@/store/slices/workflowsSlice'
import type { Workflow } from '@/store/slices/workflowsSlice'
import WorkflowDesignerNew from '@/components/workflows/WorkflowDesignerNew'
import AdvancedElementPalette from '@/components/workflows/AdvancedElementPalette'
import WorkflowTemplateLibraryInline from '@/components/workflows/templates/WorkflowTemplateLibraryInline'
import WorkflowSimulator from '@/components/workflows/testing/WorkflowSimulator'
import WorkflowTestModal from '@/components/workflows/testing/WorkflowTestModal'
import ValidationPanel from '@/components/workflows/validation/ValidationPanel'
import WorkflowExportImportInline from '@/components/workflows/export/WorkflowExportImportInline'
import WorkflowVersionPanel from '@/components/workflows/version/WorkflowVersionPanel'
import ConnectionManager from '@/components/workflows/connections/ConnectionManager'
import WorkflowExecutionMonitor from '@/components/workflows/execution/WorkflowExecutionMonitor'
import ExecuteWorkflowModal from '@/components/workflows/execution/ExecuteWorkflowModal'

const WorkflowsPage = () => {
  const { theme } = useTheme()
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { workflows, isLoading, error } = useSelector((state: RootState) => state.workflows)
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)
  const [selectedWorkflowForMonitoring, setSelectedWorkflowForMonitoring] = useState<string | undefined>(undefined)
  const [executeModalOpen, setExecuteModalOpen] = useState(false)
  const [workflowToExecute, setWorkflowToExecute] = useState<{ id: string; name: string } | null>(null)
  const [executionMessage, setExecutionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Get active tab from URL params
  const activeTab = searchParams.get('tab') || 'overview'

  // Check authentication and fetch workflows on mount
  useEffect(() => {
    if (!isAuthenticated) {
      // Show error message and redirect after delay
      setExecutionMessage({
        type: 'error',
        text: 'Please log in to access workflows'
      })
      const timer = setTimeout(() => {
        navigate('/login')
      }, 2000)
      return () => clearTimeout(timer)
    }
    dispatch(fetchWorkflows())
  }, [dispatch, isAuthenticated, navigate])

  // Tab navigation handler
  const handleTabChange = useCallback((tab: string) => {
    setSearchParams({ tab })
  }, [setSearchParams])

  // Create new workflow handler
  const handleCreateNewWorkflow = () => {
    console.log('🎨 Creating new workflow...')

    const newWorkflow: Workflow = {
      id: 'workflow-new-' + Date.now(),
      name: 'New Workflow',
      description: 'A new workflow ready for design',
      elements: [],
      connections: [],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft'
    }

    // Set the workflow in Redux state
    dispatch(setCurrentWorkflow(newWorkflow))

    // Show success message
    setExecutionMessage({
      type: 'success',
      text: '✅ New workflow created! Drag elements from the palette to start designing.'
    })

    // Auto-dismiss after 5 seconds
    setTimeout(() => setExecutionMessage(null), 5000)

    console.log('✅ New workflow created:', newWorkflow.id)
  }

  // Edit existing workflow handler
  const handleEditWorkflow = (workflow: Workflow) => {
    console.log('📝 Editing workflow:', workflow.id)
    dispatch(setCurrentWorkflow(workflow))
    handleTabChange('designer')

    setExecutionMessage({
      type: 'success',
      text: `📝 Opened "${workflow.name}" for editing`
    })

    setTimeout(() => setExecutionMessage(null), 3000)
  }

  // Execute workflow handlers
  const handleOpenExecuteModal = (workflowId: string, workflowName: string) => {
    setWorkflowToExecute({ id: workflowId, name: workflowName })
    setExecuteModalOpen(true)
  }

  const handleExecutionSuccess = (executionId: string) => {
    setExecutionMessage({ type: 'success', text: `Workflow execution started! ID: ${executionId.slice(0, 8)}...` })
    setSelectedWorkflowForMonitoring(workflowToExecute?.id)
    handleTabChange('testing')

    // Auto-dismiss success message
    setTimeout(() => setExecutionMessage(null), 5000)
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'designer', label: 'Workflow Designer', icon: '🎨' },
    { id: 'templates', label: 'Templates', icon: '📋' },
    { id: 'testing', label: 'Testing & Validation', icon: '🧪' },
    { id: 'connections', label: 'Connections', icon: '🔗' },
    { id: 'versions', label: 'Version Control', icon: '🔄' },
    { id: 'export', label: 'Export/Import', icon: '📤' },
  ]

  // Show authentication required message
  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="glass-panel rounded-lg p-8 max-w-md text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Authentication Required</h2>
          <p className="text-white/70 mb-6">
            You need to log in to access the workflows system.
          </p>
          <p className="text-white/50 text-sm mb-4">
            Redirecting to login page...
          </p>
          <button
            onClick={() => navigate('/login')}
            className="btn-glass px-6 py-2 rounded-md text-white hover:scale-105 transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 glass-strong">
        <div className="px-6 py-4">
          <div className="flex flex-col space-y-4">
            {/* Top Row: Title and Tab Navigation */}
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              {/* Title */}
              <div className="flex items-center space-x-4">
                <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-white/90'}`}>
                  Workflows
                </h1>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center space-x-1 bg-white/10 rounded-lg p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`
                      flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200
                      ${activeTab === tab.id
                        ? 'bg-white/20 text-white shadow-sm'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    <span>{tab.icon}</span>
                    <span className="hidden md:block">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions for Designer Tab */}
            {activeTab === 'designer' && (
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleCreateNewWorkflow}
                  className="btn-glass inline-flex items-center px-3 py-2 text-sm leading-4 font-medium rounded-md text-white hover:scale-105 transition-all duration-300"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  New Workflow
                </button>
                <button className="btn-glass inline-flex items-center px-3 py-2 text-sm leading-4 font-medium rounded-md text-white hover:scale-105 transition-all duration-300">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Import Workflow
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-6">
            <div className="max-w-6xl mx-auto">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-white mb-2">Workflow Overview</h2>
                  <p className="text-white/70">Create and manage automated document workflows.</p>
                </div>
                <button
                  onClick={() => handleTabChange('designer')}
                  className="btn-glass inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white hover:scale-105 transition-all duration-300"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create New Workflow
                </button>
              </div>

              {isLoading ? (
                <div className="glass-panel rounded-lg p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p className="text-white/70">Loading workflows...</p>
                </div>
              ) : workflows.length === 0 ? (
                <div className="glass-panel rounded-lg p-6">
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-white">No workflows created</h3>
                    <p className="mt-1 text-sm text-white/60">Get started by creating your first automated workflow.</p>
                    <div className="mt-6">
                      <button
                        onClick={() => handleTabChange('designer')}
                        className="btn-glass inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white hover:scale-105 transition-all duration-300"
                      >
                        <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create New Workflow
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workflows.map((workflow) => (
                    <div key={workflow.id} className="glass-panel rounded-lg p-4 hover:scale-105 transition-all duration-300">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">{workflow.name}</h3>
                          <p className="text-sm text-white/60 line-clamp-2">{workflow.description || 'No description'}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          workflow.status === 'active' ? 'bg-green-500/20 text-green-300' :
                          workflow.status === 'archived' ? 'bg-gray-500/20 text-gray-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {workflow.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-white/50 mb-3">
                        <span>{workflow.elements?.length || 0} elements</span>
                        <span>{workflow.connections?.length || 0} connections</span>
                        <span>v{workflow.version}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-white/40">Updated {new Date(workflow.updatedAt).toLocaleDateString()}</span>
                        <div className="flex items-center gap-2">
                          {workflow.status === 'active' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenExecuteModal(workflow.id, workflow.name)
                              }}
                              className="btn-glass px-2 py-1 text-xs rounded hover:scale-105 transition-all duration-300"
                              title="Execute workflow"
                            >
                              ▶️ Run
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditWorkflow(workflow)
                            }}
                            className="text-xs text-blue-300 hover:text-blue-200"
                          >
                            Edit →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workflow Designer Tab */}
        {activeTab === 'designer' && (
          <div className="flex h-full">
            <div className="w-72 flex-shrink-0">
              <AdvancedElementPalette />
            </div>
            <div className="flex-1 min-w-0">
              <WorkflowDesignerNew />
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className="p-6">
            <div className="max-w-6xl mx-auto">
              <WorkflowTemplateLibraryInline />
            </div>
          </div>
        )}

        {/* Testing & Validation Tab */}
        {activeTab === 'testing' && (
          <div className="p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Testing & Validation</h2>
                <p className="text-white/70">Test your workflows and validate their performance.</p>
              </div>

              {/* Workflow Selector for Monitoring */}
              <div className="glass-panel rounded-lg p-4">
                <label className="block text-sm font-medium text-white mb-2">
                  Select Workflow to Monitor
                </label>
                <select
                  value={selectedWorkflowForMonitoring || ''}
                  onChange={(e) => setSelectedWorkflowForMonitoring(e.target.value || undefined)}
                  className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select a workflow --</option>
                  {workflows.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name} ({workflow.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Execution Monitor */}
              <div className="glass-panel rounded-lg p-6 h-[500px]">
                <WorkflowExecutionMonitor
                  workflowId={selectedWorkflowForMonitoring}
                  autoRefresh={true}
                  refreshInterval={5000}
                />
              </div>

              {/* Simulator and Validation */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel rounded-lg p-6">
                  <h3 className="text-lg font-medium text-white mb-4">Workflow Simulator</h3>
                  <WorkflowSimulator />
                </div>

                <div className="glass-panel rounded-lg p-6">
                  <h3 className="text-lg font-medium text-white mb-4">Validation Panel</h3>
                  <ValidationPanel />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Workflow Connections</h2>
                <p className="text-white/70">Manage connections between workflow components.</p>
              </div>

              <div className="glass-panel rounded-lg p-6">
                <ConnectionManager />
              </div>
            </div>
          </div>
        )}

        {/* Version Control Tab */}
        {activeTab === 'versions' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-2">Version Control</h2>
                <p className="text-white/70">Track and manage workflow versions.</p>
              </div>

              <div className="glass-panel rounded-lg p-6">
                <WorkflowVersionPanel />
              </div>
            </div>
          </div>
        )}

        {/* Export/Import Tab */}
        {activeTab === 'export' && (
          <div className="p-6">
            <div className="max-w-4xl mx-auto">
              <WorkflowExportImportInline />
            </div>
          </div>
        )}
      </div>

      {/* Execute Workflow Modal */}
      {workflowToExecute && (
        <ExecuteWorkflowModal
          workflowId={workflowToExecute.id}
          workflowName={workflowToExecute.name}
          isOpen={executeModalOpen}
          onClose={() => {
            setExecuteModalOpen(false)
            setWorkflowToExecute(null)
          }}
          onSuccess={handleExecutionSuccess}
        />
      )}

      {/* Success/Error Message Toast */}
      {executionMessage && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
          <div className={`glass-panel rounded-lg p-4 shadow-lg border ${
            executionMessage.type === 'success'
              ? 'border-green-500/30 bg-green-500/10'
              : 'border-red-500/30 bg-red-500/10'
          }`}>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">
                {executionMessage.type === 'success' ? '✅' : '❌'}
              </span>
              <p className={`text-sm font-medium ${
                executionMessage.type === 'success' ? 'text-green-300' : 'text-red-300'
              }`}>
                {executionMessage.text}
              </p>
              <button
                onClick={() => setExecutionMessage(null)}
                className="text-white/60 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkflowsPage