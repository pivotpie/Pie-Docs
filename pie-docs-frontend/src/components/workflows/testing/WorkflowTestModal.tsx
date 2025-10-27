import React, { useState, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store'
import { setTestMode } from '@/store/slices/workflowsSlice'
import WorkflowSimulator from './WorkflowSimulator'
import TestDataForm from './TestDataForm'
import { useTheme } from '@/contexts/ThemeContext'

interface WorkflowTestModalProps {
  isOpen: boolean
  onClose: () => void
}

const WorkflowTestModal: React.FC<WorkflowTestModalProps> = ({ isOpen, onClose }) => {
  const dispatch = useDispatch()
  const { currentWorkflow, testMode } = useSelector((state: RootState) => state.workflows)
  const { theme } = useTheme()
  const [testData, setTestData] = useState<any>({})
  const [executionStep, setExecutionStep] = useState<string | null>(null)
  const [executionLogs, setExecutionLogs] = useState<string[]>([])

  const handleStartTest = useCallback(() => {
    if (!currentWorkflow?.elements.length) {
      alert('Cannot test empty workflow')
      return
    }

    dispatch(setTestMode({
      isActive: true,
      currentStep: currentWorkflow.elements[0]?.id || null,
      testData
    }))

    setExecutionStep(currentWorkflow.elements[0]?.id || null)
    setExecutionLogs([`Starting workflow test at ${new Date().toLocaleTimeString()}`])
  }, [dispatch, currentWorkflow, testData])

  const handleStopTest = useCallback(() => {
    dispatch(setTestMode({
      isActive: false,
      currentStep: null,
      testData: null
    }))
    setExecutionStep(null)
    setExecutionLogs([])
  }, [dispatch])

  const handleStepForward = useCallback(() => {
    if (!currentWorkflow || !executionStep) return

    const currentElement = currentWorkflow.elements.find(e => e.id === executionStep)
    if (!currentElement) return

    // Find next element through connections
    const connection = currentWorkflow.connections.find(c => c.sourceId === executionStep)
    const nextStep = connection?.targetId || null

    setExecutionStep(nextStep)
    dispatch(setTestMode({
      isActive: true,
      currentStep: nextStep,
      testData
    }))

    const stepName = currentElement.data.title
    const timestamp = new Date().toLocaleTimeString()
    setExecutionLogs(prev => [
      ...prev,
      `${timestamp}: Completed step "${stepName}"`,
      nextStep ? `${timestamp}: Moving to next step` : `${timestamp}: Workflow completed`
    ])
  }, [dispatch, currentWorkflow, executionStep, testData])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom modal-glass rounded-lg text-left overflow-hidden transform transition-all hover:scale-105 sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="modal-glass-header px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-lg leading-6 font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Test Workflow: {currentWorkflow?.name}
              </h3>
              <button
                onClick={onClose}
                className={`hover:scale-110 transition-all duration-300 ${theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="modal-glass-content px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Test Controls */}
              <div className="space-y-4">
                <div>
                  <h4 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Test Controls</h4>
                  <div className="flex space-x-2">
                    {!testMode.isActive ? (
                      <button
                        onClick={handleStartTest}
                        disabled={!currentWorkflow?.elements.length}
                        className="px-4 py-2 glass-card text-green-300 text-sm rounded-md hover:scale-105 hover:text-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                      >
                        Start Test
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={handleStepForward}
                          disabled={!executionStep}
                          className="px-4 py-2 glass-card text-blue-300 text-sm rounded-md hover:scale-105 hover:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                        >
                          Next Step
                        </button>
                        <button
                          onClick={handleStopTest}
                          className="px-4 py-2 glass-card text-red-300 text-sm rounded-md hover:scale-105 hover:text-red-200 transition-all duration-300"
                        >
                          Stop Test
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Test Data Form */}
                <TestDataForm
                  testData={testData}
                  onChange={setTestData}
                  disabled={testMode.isActive}
                />

                {/* Execution Logs */}
                <div>
                  <h4 className={`text-sm font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Execution Logs</h4>
                  <div className="glass-panel rounded-md p-3 h-32 overflow-y-auto border border-white/10">
                    {executionLogs.length > 0 ? (
                      <div className="space-y-1">
                        {executionLogs.map((log, index) => (
                          <div key={index} className={`text-xs font-mono ${theme === 'dark' ? 'text-white/80' : 'text-gray-700'}`}>
                            {log}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`text-sm italic ${theme === 'dark' ? 'text-white/60' : 'text-gray-500'}`}>
                        No execution logs yet. Start a test to see logs.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Workflow Visualization */}
              <div className="space-y-4">
                <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Workflow Execution</h4>
                <div className="glass-panel border border-white/10 rounded-md h-96 overflow-hidden">
                  <WorkflowSimulator
                    workflow={currentWorkflow}
                    currentStep={executionStep}
                    testMode={testMode.isActive}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="modal-glass-header border-t border-white/10 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className={`w-full inline-flex justify-center rounded-md border border-white/20 glass-card px-4 py-2 text-base font-medium hover:scale-105 transition-all duration-300 sm:ml-3 sm:w-auto sm:text-sm ${theme === 'dark' ? 'text-white/90 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowTestModal