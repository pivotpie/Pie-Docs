import React, { useEffect, useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '@/store'
import {
  setCurrentWorkflow,
  createWorkflowAsync,
  updateWorkflowAsync
} from '@/store/slices/workflowsSlice'
import type { Workflow } from '@/store/slices/workflowsSlice'
import WorkflowCanvas from '@/components/workflows/WorkflowCanvas'
import ElementPalette from '@/components/workflows/ElementPalette'
import WorkflowTestModal from '@/components/workflows/testing/WorkflowTestModal'
import ValidationEngine from '@/components/workflows/validation/ValidationEngine'
import ValidationPanel from '@/components/workflows/validation/ValidationPanel'
import WorkflowTemplateLibrary from '@/components/workflows/templates/WorkflowTemplateLibrary'
import WorkflowVersionPanel from '@/components/workflows/version/WorkflowVersionPanel'
import WorkflowExportImport from '@/components/workflows/export/WorkflowExportImport'

const WorkflowDesigner: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { currentWorkflow, workflows, isLoading, error } = useSelector((state: RootState) => state.workflows)
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [isTemplateLibraryOpen, setIsTemplateLibraryOpen] = useState(false)
  const [isExportImportOpen, setIsExportImportOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    // Create a default workflow if none exists
    if (!currentWorkflow) {
      const defaultWorkflow: Workflow = {
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
      dispatch(setCurrentWorkflow(defaultWorkflow))
    }
  }, [currentWorkflow, dispatch])

  // Clear save message after 3 seconds
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveMessage])

  const handleSaveWorkflow = async () => {
    if (!currentWorkflow) return

    setIsSaving(true)
    setSaveMessage(null)

    try {
      // Check if this is a new workflow (temporary ID starts with 'workflow-new-')
      const isNewWorkflow = currentWorkflow.id.startsWith('workflow-new-')

      if (isNewWorkflow) {
        // Create new workflow
        const result = await dispatch(
          createWorkflowAsync({
            name: currentWorkflow.name,
            description: currentWorkflow.description,
            elements: currentWorkflow.elements,
            connections: currentWorkflow.connections,
            status: currentWorkflow.status
          })
        ).unwrap()

        setSaveMessage({ type: 'success', text: 'Workflow created successfully!' })
        console.log('Workflow created:', result)
      } else {
        // Update existing workflow
        const result = await dispatch(
          updateWorkflowAsync({
            id: currentWorkflow.id,
            workflow: {
              name: currentWorkflow.name,
              description: currentWorkflow.description,
              elements: currentWorkflow.elements,
              connections: currentWorkflow.connections,
              status: currentWorkflow.status
            }
          })
        ).unwrap()

        setSaveMessage({ type: 'success', text: 'Workflow saved successfully!' })
        console.log('Workflow updated:', result)
      }
    } catch (err) {
      console.error('Error saving workflow:', err)
      setSaveMessage({ type: 'error', text: 'Failed to save workflow. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleTestWorkflow = () => {
    setIsTestModalOpen(true)
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflow designer...</p>
        </div>
      </div>
    )
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentWorkflow?.name || 'Workflow Designer'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {currentWorkflow?.description || 'Design and manage your workflow automation'}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              {/* Save Message */}
              {saveMessage && (
                <div
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    saveMessage.type === 'success'
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  {saveMessage.text}
                </div>
              )}

              <button
                onClick={() => setIsTemplateLibraryOpen(true)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Templates
              </button>
              <button
                onClick={handleTestWorkflow}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test Workflow
              </button>
              <button
                onClick={() => setIsExportImportOpen(true)}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export/Import
              </button>
              <button
                onClick={handleSaveWorkflow}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : (
                  'Save Workflow'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Element Palette */}
          <ElementPalette className="w-80 flex-shrink-0" />

          {/* Canvas Area */}
          <div className="flex-1 flex flex-col">
            <WorkflowCanvas className="flex-1" />
          </div>

          {/* Right Sidebar */}
          <div className="w-80 flex-shrink-0 space-y-4">
            <ValidationPanel />
            <WorkflowVersionPanel />
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-white border-t border-gray-200 px-6 py-2">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>Status: {currentWorkflow?.status || 'Draft'}</span>
              <span>Version: {currentWorkflow?.version || 1}</span>
              <span>Last Updated: {currentWorkflow?.updatedAt ? new Date(currentWorkflow.updatedAt).toLocaleString() : 'Never'}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Elements: {currentWorkflow?.elements?.length || 0}</span>
              <span>Connections: {currentWorkflow?.connections?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Test Modal */}
        <WorkflowTestModal
          isOpen={isTestModalOpen}
          onClose={() => setIsTestModalOpen(false)}
        />

        {/* Template Library */}
        <WorkflowTemplateLibrary
          isOpen={isTemplateLibraryOpen}
          onClose={() => setIsTemplateLibraryOpen(false)}
        />

        {/* Export/Import Modal */}
        <WorkflowExportImport
          isOpen={isExportImportOpen}
          onClose={() => setIsExportImportOpen(false)}
        />

        {/* Validation Engine */}
        <ValidationEngine />
      </div>
    </DndProvider>
  )
}

export default WorkflowDesigner