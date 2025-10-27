import React, { useCallback } from 'react'
import { useDispatch } from 'react-redux'
import { removeConnection, updateConnection } from '@/store/slices/workflowsSlice'
import type { WorkflowConnection as ConnectionType } from '@/store/slices/workflowsSlice'

interface WorkflowConnectionProps {
  connection: ConnectionType
  sourceElement: { x: number; y: number }
  targetElement: { x: number; y: number }
  isSelected?: boolean
}

const WorkflowConnection: React.FC<WorkflowConnectionProps> = ({
  connection,
  sourceElement,
  targetElement,
  isSelected = false
}) => {
  const dispatch = useDispatch()

  const handleDelete = useCallback(() => {
    dispatch(removeConnection(connection.id))
  }, [dispatch, connection.id])

  const handleLabelChange = useCallback((newLabel: string) => {
    dispatch(updateConnection({
      ...connection,
      label: newLabel
    }))
  }, [dispatch, connection])

  // Calculate connection path using bezier curves
  const sourceX = sourceElement.x + 192 // Width of node + connection point offset
  const sourceY = sourceElement.y + 40  // Half height of node
  const targetX = targetElement.x
  const targetY = targetElement.y + 40

  const midX = (sourceX + targetX) / 2
  const controlOffset = Math.abs(targetX - sourceX) * 0.3

  const pathData = `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`

  // Calculate label position
  const labelX = midX
  const labelY = (sourceY + targetY) / 2

  return (
    <g>
      {/* Connection line */}
      <path
        d={pathData}
        fill="none"
        stroke={isSelected ? "#3B82F6" : "#9CA3AF"}
        strokeWidth={isSelected ? 3 : 2}
        strokeDasharray={connection.condition ? "5,5" : "none"}
        className="transition-all duration-200 hover:stroke-blue-500"
        markerEnd="url(#arrowhead)"
      />

      {/* Connection label */}
      {connection.label && (
        <g>
          <rect
            x={labelX - 30}
            y={labelY - 10}
            width={60}
            height={20}
            fill="white"
            stroke="#D1D5DB"
            rx={4}
            className="transition-all duration-200"
          />
          <text
            x={labelX}
            y={labelY + 4}
            textAnchor="middle"
            className="text-xs fill-gray-700 font-medium"
          >
            {connection.label}
          </text>
        </g>
      )}

      {/* Conditional indicator */}
      {connection.condition && (
        <circle
          cx={labelX}
          cy={labelY + 15}
          r={6}
          fill="#F59E0B"
          stroke="white"
          strokeWidth={2}
          className="transition-all duration-200"
        />
      )}

      {/* Delete button when selected */}
      {isSelected && (
        <g>
          <circle
            cx={labelX}
            cy={labelY - 25}
            r={10}
            fill="#EF4444"
            stroke="white"
            strokeWidth={2}
            className="cursor-pointer hover:fill-red-600 transition-colors"
            onClick={handleDelete}
          />
          <path
            d={`M ${labelX - 4} ${labelY - 29} L ${labelX + 4} ${labelY - 21} M ${labelX + 4} ${labelY - 29} L ${labelX - 4} ${labelY - 21}`}
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
            className="pointer-events-none"
          />
        </g>
      )}
    </g>
  )
}

export default WorkflowConnection