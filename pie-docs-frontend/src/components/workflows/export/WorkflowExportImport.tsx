import React, { useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store'
import { setCurrentWorkflow, addWorkflow } from '@/store/slices/workflowsSlice'
import type { Workflow } from '@/store/slices/workflowsSlice'

interface WorkflowExportImportProps {
  isOpen: boolean
  onClose: () => void
}

const WorkflowExportImport: React.FC<WorkflowExportImportProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch()
  const { currentWorkflow, workflows } = useSelector((state: RootState) => state.workflows)
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')
  const [exportFormat, setExportFormat] = useState<'json' | 'yaml'>('json')
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([])
  const [importData, setImportData] = useState('')
  const [importError, setImportError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExportSingle = () => {
    if (!currentWorkflow) return

    const exportData = {
      workflow: currentWorkflow,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: 'Current User',
        version: '1.0',
        format: exportFormat
      }
    }

    const content = exportFormat === 'json'
      ? JSON.stringify(exportData, null, 2)
      : `# Workflow Export\n# ${currentWorkflow.name}\n# Exported: ${new Date().toLocaleString()}\n\n${JSON.stringify(exportData, null, 2)}`

    const blob = new Blob([content], { type: exportFormat === 'json' ? 'application/json' : 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentWorkflow.name.toLowerCase().replace(/\s+/g, '-')}.${exportFormat}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportMultiple = () => {
    const selectedWorkflowData = workflows.filter(w => selectedWorkflows.includes(w.id))

    if (selectedWorkflowData.length === 0) return

    const exportData = {
      workflows: selectedWorkflowData,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: 'Current User',
        version: '1.0',
        format: exportFormat,
        count: selectedWorkflowData.length
      }
    }

    const content = exportFormat === 'json'
      ? JSON.stringify(exportData, null, 2)
      : `# Multiple Workflows Export\n# Count: ${selectedWorkflowData.length}\n# Exported: ${new Date().toLocaleString()}\n\n${JSON.stringify(exportData, null, 2)}`

    const blob = new Blob([content], { type: exportFormat === 'json' ? 'application/json' : 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workflows-export-${selectedWorkflowData.length}.${exportFormat}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setImportData(content)
    }
    reader.readAsText(file)
  }

  const handleImport = () => {
    try {
      setImportError('')
      const data = JSON.parse(importData)

      if (data.workflow) {
        // Single workflow import
        const importedWorkflow: Workflow = {
          ...data.workflow,
          id: `imported-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'draft'
        }
        dispatch(addWorkflow(importedWorkflow))
        dispatch(setCurrentWorkflow(importedWorkflow))
        alert('Workflow imported successfully!')
      } else if (data.workflows && Array.isArray(data.workflows)) {
        // Multiple workflows import
        let importedCount = 0
        data.workflows.forEach((workflow: any) => {
          const importedWorkflow: Workflow = {
            ...workflow,
            id: `imported-${Date.now()}-${importedCount}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'draft'
          }
          dispatch(addWorkflow(importedWorkflow))
          importedCount++
        })
        alert(`${importedCount} workflows imported successfully!`)
      } else {
        setImportError('Invalid workflow data format')
      }

      onClose()
    } catch (error) {
      setImportError('Invalid JSON format. Please check your data.')
    }
  }

  const toggleWorkflowSelection = (workflowId: string) => {
    setSelectedWorkflows(prev =>
      prev.includes(workflowId)
        ? prev.filter(id => id !== workflowId)
        : [...prev, workflowId]
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl leading-6 font-bold text-gray-900">
                Export / Import Workflows
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-4 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('export')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'export'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Export Workflows
                </button>
                <button
                  onClick={() => setActiveTab('import')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'import'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Import Workflows
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6">
            {activeTab === 'export' ? (
              <div className="space-y-6">
                {/* Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Format
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="json"
                        checked={exportFormat === 'json'}
                        onChange={(e) => setExportFormat(e.target.value as 'json' | 'yaml')}
                        className="mr-2"
                      />
                      JSON
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="yaml"
                        checked={exportFormat === 'yaml'}
                        onChange={(e) => setExportFormat(e.target.value as 'json' | 'yaml')}
                        className="mr-2"
                      />
                      YAML
                    </label>
                  </div>
                </div>

                {/* Current Workflow Export */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Current Workflow</h4>
                  {currentWorkflow ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{currentWorkflow.name}</div>
                        <div className="text-sm text-gray-500">
                          {currentWorkflow.elements?.length || 0} elements, {currentWorkflow.connections?.length || 0} connections
                        </div>
                      </div>
                      <button
                        onClick={handleExportSingle}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Export Current
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-500">No workflow currently open</div>
                  )}
                </div>

                {/* Multiple Workflows Export */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-3">Multiple Workflows</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {workflows.map(workflow => (
                      <label key={workflow.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedWorkflows.includes(workflow.id)}
                          onChange={() => toggleWorkflowSelection(workflow.id)}
                          className="rounded"
                        />
                        <div className="flex-grow">
                          <div className="font-medium">{workflow.name}</div>
                          <div className="text-sm text-gray-500">
                            Version {workflow.version} • {workflow.elements?.length || 0} elements
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedWorkflows.length > 0 && (
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-gray-600">
                        {selectedWorkflows.length} workflow(s) selected
                      </span>
                      <button
                        onClick={handleExportMultiple}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                      >
                        Export Selected
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* File Import */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Import from File
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.yaml,.yml"
                    onChange={handleFileImport}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {/* Manual Import */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Or paste workflow data
                  </label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder="Paste your workflow JSON data here..."
                    rows={12}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Import Error */}
                {importError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="text-red-800 text-sm">{importError}</div>
                  </div>
                )}

                {/* Import Actions */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setImportData('')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!importData.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Import Workflow
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowExportImport