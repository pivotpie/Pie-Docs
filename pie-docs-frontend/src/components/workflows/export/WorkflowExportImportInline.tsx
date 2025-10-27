import React, { useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store'
import { setCurrentWorkflow, addWorkflow } from '@/store/slices/workflowsSlice'
import type { Workflow } from '@/store/slices/workflowsSlice'
import { useTheme } from '@/contexts/ThemeContext'

const WorkflowExportImportInline: React.FC = () => {
  const dispatch = useDispatch()
  const { theme } = useTheme()
  const { currentWorkflow, workflows } = useSelector((state: RootState) => state.workflows)
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export')
  const [exportFormat, setExportFormat] = useState<'json' | 'yaml'>('json')
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>([])
  const [importData, setImportData] = useState('')
  const [importError, setImportError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
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

    setSuccessMessage('Workflow exported successfully!')
    setTimeout(() => setSuccessMessage(''), 3000)
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

    setSuccessMessage(`${selectedWorkflowData.length} workflows exported successfully!`)
    setTimeout(() => setSuccessMessage(''), 3000)
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
        setSuccessMessage('Workflow imported successfully!')
        setImportData('')
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
        setSuccessMessage(`${importedCount} workflows imported successfully!`)
        setImportData('')
      } else {
        setImportError('Invalid workflow data format')
      }

      setTimeout(() => setSuccessMessage(''), 3000)
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

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-white/10">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('export')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'export'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-white/60 hover:text-white/80 hover:border-white/30'
            }`}
          >
            Export Workflows
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-300'
                : 'border-transparent text-white/60 hover:text-white/80 hover:border-white/30'
            }`}
          >
            Import Workflows
          </button>
        </nav>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="glass-panel rounded-lg p-4 bg-green-500/10 border border-green-500/20">
          <p className="text-green-300 text-sm">✅ {successMessage}</p>
        </div>
      )}

      {/* Content */}
      {activeTab === 'export' ? (
        <div className="space-y-6">
          {/* Format Selection */}
          <div className="glass-panel rounded-lg p-4">
            <label className="block text-sm font-medium text-white mb-2">
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
                <span className="text-white/80">JSON</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="yaml"
                  checked={exportFormat === 'yaml'}
                  onChange={(e) => setExportFormat(e.target.value as 'json' | 'yaml')}
                  className="mr-2"
                />
                <span className="text-white/80">YAML</span>
              </label>
            </div>
          </div>

          {/* Current Workflow Export */}
          <div className="glass-panel rounded-lg p-4">
            <h4 className="text-lg font-medium text-white mb-3">Current Workflow</h4>
            {currentWorkflow ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{currentWorkflow.name}</div>
                  <div className="text-sm text-white/60">
                    {currentWorkflow.elements?.length || 0} elements, {currentWorkflow.connections?.length || 0} connections
                  </div>
                </div>
                <button
                  onClick={handleExportSingle}
                  className="btn-glass px-4 py-2 text-sm rounded-md hover:scale-105 transition-all duration-300 text-blue-300"
                >
                  Export Current
                </button>
              </div>
            ) : (
              <div className="text-white/60">No workflow currently open</div>
            )}
          </div>

          {/* Multiple Workflows Export */}
          <div className="glass-panel rounded-lg p-4">
            <h4 className="text-lg font-medium text-white mb-3">Multiple Workflows</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {workflows.map(workflow => (
                <label key={workflow.id} className="flex items-center space-x-3 text-white/80 hover:text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedWorkflows.includes(workflow.id)}
                    onChange={() => toggleWorkflowSelection(workflow.id)}
                    className="rounded"
                  />
                  <div className="flex-grow">
                    <div className="font-medium">{workflow.name}</div>
                    <div className="text-sm text-white/50">
                      Version {workflow.version} • {workflow.elements?.length || 0} elements
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {selectedWorkflows.length > 0 && (
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-white/60">
                  {selectedWorkflows.length} workflow(s) selected
                </span>
                <button
                  onClick={handleExportMultiple}
                  className="btn-glass px-4 py-2 text-sm rounded-md hover:scale-105 transition-all duration-300 text-green-300"
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
          <div className="glass-panel rounded-lg p-4">
            <label className="block text-sm font-medium text-white mb-2">
              Import from File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleFileImport}
              className="block w-full text-sm text-white/80 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-300 hover:file:bg-blue-500/30 file:cursor-pointer"
            />
          </div>

          {/* Manual Import */}
          <div className="glass-panel rounded-lg p-4">
            <label className="block text-sm font-medium text-white mb-2">
              Or paste workflow data
            </label>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste your workflow JSON data here..."
              rows={12}
              className="w-full bg-white/5 border border-white/20 rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-white/40"
            />
          </div>

          {/* Import Error */}
          {importError && (
            <div className="glass-panel rounded-lg p-4 bg-red-500/10 border border-red-500/20">
              <div className="text-red-300 text-sm">❌ {importError}</div>
            </div>
          )}

          {/* Import Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setImportData('')}
              className="btn-glass px-4 py-2 text-sm font-medium rounded-md hover:scale-105 transition-all duration-300 text-white/80"
            >
              Clear
            </button>
            <button
              onClick={handleImport}
              disabled={!importData.trim()}
              className="btn-glass px-4 py-2 text-sm font-medium rounded-md hover:scale-105 transition-all duration-300 text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Import Workflow
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkflowExportImportInline
