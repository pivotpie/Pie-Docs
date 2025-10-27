import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store'
import { setSelectedElements } from '@/store/slices/workflowsSlice'
import type { ValidationError } from '@/store/slices/workflowsSlice'

interface ValidationPanelProps {
  className?: string
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({ className = '' }) => {
  const dispatch = useDispatch()
  const { validationErrors, currentWorkflow } = useSelector((state: RootState) => state.workflows)

  const handleErrorClick = (error: ValidationError) => {
    if (error.elementId) {
      dispatch(setSelectedElements([error.elementId]))
    } else if (error.connectionId) {
      dispatch(setSelectedElements([error.connectionId]))
    }
  }

  const getErrorIcon = (type: ValidationError['type']) => {
    if (type === 'error') {
      return (
        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    } else {
      return (
        <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    }
  }

  const getErrorBgColor = (type: ValidationError['type']) => {
    return type === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
  }

  const getErrorTextColor = (type: ValidationError['type']) => {
    return type === 'error' ? 'text-red-800' : 'text-yellow-800'
  }

  const errorCount = validationErrors.filter(e => e.type === 'error').length
  const warningCount = validationErrors.filter(e => e.type === 'warning').length

  if (!currentWorkflow) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-2 text-sm">No workflow to validate</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Validation</h3>
          <div className="flex items-center space-x-4 text-sm">
            {errorCount > 0 && (
              <div className="flex items-center text-red-600">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errorCount} {errorCount === 1 ? 'Error' : 'Errors'}
              </div>
            )}
            {warningCount > 0 && (
              <div className="flex items-center text-yellow-600">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                {warningCount} {warningCount === 1 ? 'Warning' : 'Warnings'}
              </div>
            )}
            {validationErrors.length === 0 && (
              <div className="flex items-center text-green-600">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Valid
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {validationErrors.length === 0 ? (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Workflow is valid!</h3>
            <p className="mt-1 text-sm text-gray-500">
              No validation errors or warnings found.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {validationErrors.map((error) => (
              <div
                key={error.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors hover:shadow-md ${getErrorBgColor(error.type)}`}
                onClick={() => handleErrorClick(error)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getErrorIcon(error.type)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className={`text-sm font-medium ${getErrorTextColor(error.type)}`}>
                      {error.type === 'error' ? 'Error' : 'Warning'}
                    </p>
                    <p className={`text-sm mt-1 ${getErrorTextColor(error.type)}`}>
                      {error.message}
                    </p>
                    {(error.elementId || error.connectionId) && (
                      <p className="text-xs text-gray-500 mt-2">
                        Click to highlight the affected element
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {validationErrors.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Fix these issues to improve your workflow
            </span>
            <div className="space-x-2">
              <button
                onClick={() => dispatch(setSelectedElements([]))}
                className="text-gray-500 hover:text-gray-700"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ValidationPanel