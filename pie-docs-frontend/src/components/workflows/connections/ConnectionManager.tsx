import React, { useState, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store'
import { addConnection, setValidationErrors } from '@/store/slices/workflowsSlice'
import type { WorkflowConnection, ValidationError } from '@/store/slices/workflowsSlice'
import WorkflowConnectionComponent from './WorkflowConnection'

interface ConnectionPoint {
  elementId: string
  position: { x: number; y: number }
}

const ConnectionManager: React.FC = () => {
  const dispatch = useDispatch()
  const { currentWorkflow, selectedElements } = useSelector((state: RootState) => state.workflows)

  const [connectionStart, setConnectionStart] = useState<ConnectionPoint | null>(null)
  const [isCreatingConnection, setIsCreatingConnection] = useState(false)

  const validateConnection = useCallback((sourceId: string, targetId: string): ValidationError[] => {
    const errors: ValidationError[] = []

    // Check for self-connection
    if (sourceId === targetId) {
      errors.push({
        id: `validation-${Date.now()}`,
        type: 'error',
        message: 'Elements cannot connect to themselves'
      })
    }

    // Check for circular dependencies
    const hasPath = (from: string, to: string, visited = new Set<string>()): boolean => {
      if (visited.has(from)) return false
      visited.add(from)

      const connections = currentWorkflow?.connections || []
      const outgoing = connections.filter(c => c.sourceId === from)

      for (const connection of outgoing) {
        if (connection.targetId === to || hasPath(connection.targetId, to, visited)) {
          return true
        }
      }
      return false
    }

    if (hasPath(targetId, sourceId)) {
      errors.push({
        id: `validation-${Date.now()}`,
        type: 'error',
        message: 'This connection would create a circular dependency'
      })
    }

    // Check for duplicate connections
    const existingConnection = currentWorkflow?.connections.find(
      c => c.sourceId === sourceId && c.targetId === targetId
    )

    if (existingConnection) {
      errors.push({
        id: `validation-${Date.now()}`,
        type: 'warning',
        message: 'Connection already exists between these elements'
      })
    }

    return errors
  }, [currentWorkflow?.connections])

  const createConnection = useCallback((sourceId: string, targetId: string) => {
    const validationErrors = validateConnection(sourceId, targetId)

    if (validationErrors.filter(e => e.type === 'error').length > 0) {
      dispatch(setValidationErrors(validationErrors))
      return false
    }

    const newConnection: WorkflowConnection = {
      id: `connection-${Date.now()}`,
      sourceId,
      targetId,
      label: '',
      condition: undefined
    }

    dispatch(addConnection(newConnection))
    dispatch(setValidationErrors([]))
    return true
  }, [dispatch, validateConnection])

  const handleConnectionStart = useCallback((elementId: string, position: { x: number; y: number }) => {
    setConnectionStart({ elementId, position })
    setIsCreatingConnection(true)
  }, [])

  const handleConnectionEnd = useCallback((elementId: string) => {
    if (connectionStart && connectionStart.elementId !== elementId) {
      const success = createConnection(connectionStart.elementId, elementId)
      if (success) {
        setConnectionStart(null)
        setIsCreatingConnection(false)
      }
    }
  }, [connectionStart, createConnection])

  const handleConnectionCancel = useCallback(() => {
    setConnectionStart(null)
    setIsCreatingConnection(false)
  }, [])

  if (!currentWorkflow) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 1 }}
    >
      {/* Arrow marker definition */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#9CA3AF"
            className="transition-colors"
          />
        </marker>
        <marker
          id="arrowhead-selected"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#3B82F6"
            className="transition-colors"
          />
        </marker>
      </defs>

      {/* Render existing connections */}
      {currentWorkflow.connections.map((connection) => {
        const sourceElement = currentWorkflow.elements.find(e => e.id === connection.sourceId)
        const targetElement = currentWorkflow.elements.find(e => e.id === connection.targetId)

        if (!sourceElement || !targetElement) return null

        return (
          <WorkflowConnectionComponent
            key={connection.id}
            connection={connection}
            sourceElement={sourceElement.position}
            targetElement={targetElement.position}
            isSelected={selectedElements.includes(connection.id)}
          />
        )
      })}

      {/* Connection preview while creating */}
      {isCreatingConnection && connectionStart && (
        <line
          x1={connectionStart.position.x + 192}
          y1={connectionStart.position.y + 40}
          x2={connectionStart.position.x + 250}
          y2={connectionStart.position.y + 40}
          stroke="#3B82F6"
          strokeWidth={2}
          strokeDasharray="5,5"
          className="animate-pulse"
        />
      )}
    </svg>
  )
}

export default ConnectionManager