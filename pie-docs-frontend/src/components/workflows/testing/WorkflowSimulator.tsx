import React from 'react'
import type { Workflow } from '@/store/slices/workflowsSlice'

interface WorkflowSimulatorProps {
  workflow: Workflow | null
  currentStep: string | null
  testMode: boolean
}

const WorkflowSimulator: React.FC<WorkflowSimulatorProps> = ({
  workflow,
  currentStep,
  testMode
}) => {
  if (!workflow) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="mt-2 text-sm">No workflow to test</p>
        </div>
      </div>
    )
  }

  if (!workflow.elements.length) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <p className="mt-2 text-sm">Workflow is empty</p>
          <p className="text-xs text-gray-400">Add elements to test the workflow</p>
        </div>
      </div>
    )
  }

  const getElementStatus = (elementId: string) => {
    if (!testMode) return 'pending'
    if (elementId === currentStep) return 'active'

    // Check if this element has been completed
    const elementIndex = workflow.elements.findIndex(e => e.id === elementId)
    const currentIndex = workflow.elements.findIndex(e => e.id === currentStep)

    if (currentIndex === -1) return 'completed' // Test finished
    if (elementIndex < currentIndex) return 'completed'

    return 'pending'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 border-blue-500 text-blue-800'
      case 'completed':
        return 'bg-green-100 border-green-500 text-green-800'
      case 'pending':
      default:
        return 'bg-gray-100 border-gray-300 text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-5-10v20M7 11a4 4 0 014-4h2a4 4 0 014 4v6" />
          </svg>
        )
      case 'completed':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'pending':
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  // Calculate a simple layout for visualization
  const layoutElements = workflow.elements.map((element, index) => ({
    ...element,
    x: 50 + (index % 3) * 120,
    y: 50 + Math.floor(index / 3) * 80
  }))

  const maxX = Math.max(...layoutElements.map(e => e.x)) + 100
  const maxY = Math.max(...layoutElements.map(e => e.y)) + 60

  return (
    <div className="h-full bg-gray-50 overflow-auto">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${Math.max(maxX, 400)} ${Math.max(maxY, 300)}`}
        className="w-full h-full"
      >
        {/* Render connections */}
        {workflow.connections.map(connection => {
          const sourceElement = layoutElements.find(e => e.id === connection.sourceId)
          const targetElement = layoutElements.find(e => e.id === connection.targetId)

          if (!sourceElement || !targetElement) return null

          const sourceX = sourceElement.x + 50
          const sourceY = sourceElement.y + 25
          const targetX = targetElement.x
          const targetY = targetElement.y + 25

          return (
            <line
              key={connection.id}
              x1={sourceX}
              y1={sourceY}
              x2={targetX}
              y2={targetY}
              stroke="#9CA3AF"
              strokeWidth={2}
              markerEnd="url(#arrowhead)"
            />
          )
        })}

        {/* Arrow marker */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
          </marker>
        </defs>

        {/* Render elements */}
        {layoutElements.map(element => {
          const status = getElementStatus(element.id)
          const statusColor = getStatusColor(status)
          const statusIcon = getStatusIcon(status)

          return (
            <g key={element.id}>
              {/* Element background */}
              <rect
                x={element.x}
                y={element.y}
                width={100}
                height={50}
                rx={6}
                className={`fill-current ${statusColor.split(' ')[0]}`}
                stroke="currentColor"
                strokeWidth={status === 'active' ? 3 : 1}
              />

              {/* Element text */}
              <text
                x={element.x + 50}
                y={element.y + 30}
                textAnchor="middle"
                className="text-xs font-medium fill-current"
                style={{ dominantBaseline: 'middle' }}
              >
                {element.data.title.length > 12
                  ? element.data.title.substring(0, 12) + '...'
                  : element.data.title}
              </text>

              {/* Status indicator */}
              {status === 'active' && (
                <circle
                  cx={element.x + 85}
                  cy={element.y + 15}
                  r={8}
                  className="fill-blue-500 animate-pulse"
                />
              )}
              {status === 'completed' && (
                <circle
                  cx={element.x + 85}
                  cy={element.y + 15}
                  r={8}
                  className="fill-green-500"
                />
              )}
            </g>
          )
        })}
      </svg>

      {/* Status legend */}
      <div className="absolute bottom-2 left-2 bg-white rounded border border-gray-200 p-2 text-xs">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-300 rounded"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded animate-pulse"></div>
            <span>Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Completed</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkflowSimulator