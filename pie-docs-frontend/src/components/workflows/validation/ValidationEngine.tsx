import React, { useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store'
import type { ValidationError, Workflow } from '@/store/slices/workflowsSlice'
import { setValidationErrors } from '@/store/slices/workflowsSlice'

interface ValidationRule {
  id: string
  name: string
  type: 'error' | 'warning'
  check: (workflow: Workflow) => ValidationError[]
}

const ValidationEngine: React.FC = () => {
  const dispatch = useDispatch()
  const { currentWorkflow } = useSelector((state: RootState) => state.workflows)

  const validationRules: ValidationRule[] = [
    {
      id: 'empty-workflow',
      name: 'Empty Workflow',
      type: 'warning',
      check: (workflow) => {
        if (!workflow.elements.length) {
          return [{
            id: 'empty-workflow',
            type: 'warning',
            message: 'Workflow is empty. Add elements to create a meaningful workflow.'
          }]
        }
        return []
      }
    },
    {
      id: 'disconnected-elements',
      name: 'Disconnected Elements',
      type: 'warning',
      check: (workflow) => {
        const errors: ValidationError[] = []
        const connectedElements = new Set<string>()

        // Mark all connected elements
        workflow.connections.forEach(connection => {
          connectedElements.add(connection.sourceId)
          connectedElements.add(connection.targetId)
        })

        // Find disconnected elements
        workflow.elements.forEach(element => {
          if (!connectedElements.has(element.id) && workflow.elements.length > 1) {
            errors.push({
              id: `disconnected-${element.id}`,
              elementId: element.id,
              type: 'warning',
              message: `Element "${element.data.title}" is not connected to the workflow.`
            })
          }
        })

        return errors
      }
    },
    {
      id: 'circular-dependencies',
      name: 'Circular Dependencies',
      type: 'error',
      check: (workflow) => {
        const errors: ValidationError[] = []
        const visited = new Set<string>()
        const recursionStack = new Set<string>()

        const hasCycle = (elementId: string): boolean => {
          if (recursionStack.has(elementId)) {
            return true
          }
          if (visited.has(elementId)) {
            return false
          }

          visited.add(elementId)
          recursionStack.add(elementId)

          const outgoingConnections = workflow.connections.filter(c => c.sourceId === elementId)
          for (const connection of outgoingConnections) {
            if (hasCycle(connection.targetId)) {
              errors.push({
                id: `cycle-${connection.id}`,
                connectionId: connection.id,
                type: 'error',
                message: `Circular dependency detected involving connection from "${workflow.elements.find(e => e.id === connection.sourceId)?.data.title}" to "${workflow.elements.find(e => e.id === connection.targetId)?.data.title}".`
              })
              return true
            }
          }

          recursionStack.delete(elementId)
          return false
        }

        workflow.elements.forEach(element => {
          if (!visited.has(element.id)) {
            hasCycle(element.id)
          }
        })

        return errors
      }
    },
    {
      id: 'no-start-element',
      name: 'No Start Element',
      type: 'error',
      check: (workflow) => {
        if (workflow.elements.length === 0) return []

        const hasIncomingConnection = new Set<string>()
        workflow.connections.forEach(connection => {
          hasIncomingConnection.add(connection.targetId)
        })

        const startElements = workflow.elements.filter(element =>
          !hasIncomingConnection.has(element.id)
        )

        if (startElements.length === 0) {
          return [{
            id: 'no-start-element',
            type: 'error',
            message: 'Workflow has no starting element. Every workflow needs at least one element without incoming connections.'
          }]
        }

        if (startElements.length > 1) {
          return [{
            id: 'multiple-start-elements',
            type: 'warning',
            message: `Workflow has ${startElements.length} potential starting elements. Consider connecting them or marking one as the primary start.`
          }]
        }

        return []
      }
    },
    {
      id: 'no-end-element',
      name: 'No End Element',
      type: 'warning',
      check: (workflow) => {
        if (workflow.elements.length === 0) return []

        const hasOutgoingConnection = new Set<string>()
        workflow.connections.forEach(connection => {
          hasOutgoingConnection.add(connection.sourceId)
        })

        const endElements = workflow.elements.filter(element =>
          !hasOutgoingConnection.has(element.id)
        )

        if (endElements.length === 0) {
          return [{
            id: 'no-end-element',
            type: 'warning',
            message: 'Workflow has no ending element. Consider adding at least one element without outgoing connections.'
          }]
        }

        return []
      }
    },
    {
      id: 'decision-without-branches',
      name: 'Decision Without Branches',
      type: 'error',
      check: (workflow) => {
        const errors: ValidationError[] = []

        workflow.elements.forEach(element => {
          if (element.type === 'decision') {
            const outgoingConnections = workflow.connections.filter(c => c.sourceId === element.id)

            if (outgoingConnections.length < 2) {
              errors.push({
                id: `decision-branches-${element.id}`,
                elementId: element.id,
                type: 'error',
                message: `Decision element "${element.data.title}" must have at least 2 outgoing connections to represent different decision paths.`
              })
            }
          }
        })

        return errors
      }
    },
    {
      id: 'missing-element-config',
      name: 'Missing Element Configuration',
      type: 'warning',
      check: (workflow) => {
        const errors: ValidationError[] = []

        workflow.elements.forEach(element => {
          if (!element.data.title || element.data.title.trim() === '') {
            errors.push({
              id: `missing-title-${element.id}`,
              elementId: element.id,
              type: 'warning',
              message: `Element of type "${element.type}" is missing a title.`
            })
          }

          // Check for type-specific configurations
          if (element.type === 'approval' && !element.data.config?.assignees) {
            errors.push({
              id: `missing-assignees-${element.id}`,
              elementId: element.id,
              type: 'warning',
              message: `Approval element "${element.data.title}" should have assigned approvers.`
            })
          }

          if (element.type === 'timer' && !element.data.config?.duration) {
            errors.push({
              id: `missing-duration-${element.id}`,
              elementId: element.id,
              type: 'warning',
              message: `Timer element "${element.data.title}" should have a duration configured.`
            })
          }
        })

        return errors
      }
    }
  ]

  const validateWorkflow = useCallback((workflow: Workflow | null) => {
    if (!workflow) {
      dispatch(setValidationErrors([]))
      return
    }

    const allErrors: ValidationError[] = []

    validationRules.forEach(rule => {
      try {
        const ruleErrors = rule.check(workflow)
        allErrors.push(...ruleErrors)
      } catch (error) {
        console.error(`Validation rule "${rule.name}" failed:`, error)
      }
    })

    dispatch(setValidationErrors(allErrors))
  }, [dispatch, validationRules])

  useEffect(() => {
    validateWorkflow(currentWorkflow)
  }, [currentWorkflow, validateWorkflow])

  // This component doesn't render anything visible - it's just a validation engine
  return null
}

export default ValidationEngine