import React, { useCallback, useState } from 'react'
import { useDrag } from 'react-dnd'
import { useDispatch } from 'react-redux'
import { updateElement, removeElement, setSelectedElements, type WorkflowElement } from '@/store/slices/workflowsSlice'
import { useTheme } from '@/contexts/ThemeContext'

interface WorkflowNodeProps {
  element: WorkflowElement
  isSelected: boolean
  onConnectionStart?: (elementId: string, position: { x: number; y: number }) => void
  onConnectionEnd?: (elementId: string) => void
}

const getElementIcon = (type: WorkflowElement['type']) => {
  switch (type) {
    case 'approval':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'review':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    case 'notification':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 6l6 6-6 6H3l6-6-6-6h6z" />
        </svg>
      )
    case 'decision':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'timer':
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    default:
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
  }
}

const getElementColor = (type: WorkflowElement['type'], isDark: boolean) => {
  if (isDark) {
    // Enhanced colors for dark theme with better visibility on purple background
    switch (type) {
      case 'approval':
        return 'glass-card border-green-400/50 text-green-200 bg-green-500/10'
      case 'review':
        return 'glass-card border-blue-400/50 text-blue-200 bg-blue-500/10'
      case 'notification':
        return 'glass-card border-yellow-400/50 text-yellow-200 bg-yellow-500/10'
      case 'decision':
        return 'glass-card border-purple-400/50 text-purple-200 bg-purple-500/10'
      case 'timer':
        return 'glass-card border-cyan-400/50 text-cyan-200 bg-cyan-500/10'
      default:
        return 'glass-card border-white/20 text-gray-200 bg-white/5'
    }
  } else {
    // Light theme colors
    switch (type) {
      case 'approval':
        return 'glass-card border-green-300 text-green-800 bg-green-50'
      case 'review':
        return 'glass-card border-blue-300 text-blue-800 bg-blue-50'
      case 'notification':
        return 'glass-card border-yellow-300 text-yellow-800 bg-yellow-50'
      case 'decision':
        return 'glass-card border-purple-300 text-purple-800 bg-purple-50'
      case 'timer':
        return 'glass-card border-cyan-300 text-cyan-800 bg-cyan-50'
      default:
        return 'glass-card border-gray-300 text-gray-800 bg-gray-50'
    }
  }
}

const WorkflowNode: React.FC<WorkflowNodeProps> = ({
  element,
  isSelected,
  onConnectionStart,
  onConnectionEnd
}) => {
  const dispatch = useDispatch()
  const [isConnecting, setIsConnecting] = useState(false)
  const { theme } = useTheme()

  const [{ isDragging }, drag] = useDrag({
    type: 'workflow-node',
    item: { id: element.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch(setSelectedElements([element.id]))
  }, [dispatch, element.id])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    dispatch(removeElement(element.id))
  }, [dispatch, element.id])


  const handleConnectionStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onConnectionStart) {
      setIsConnecting(true)
      onConnectionStart(element.id, element.position)
    }
  }, [onConnectionStart, element.id, element.position])

  const handleConnectionEnd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (onConnectionEnd && isConnecting) {
      onConnectionEnd(element.id)
      setIsConnecting(false)
    }
  }, [onConnectionEnd, element.id, isConnecting])

  const colorClasses = getElementColor(element.type, theme === 'dark')
  const icon = getElementIcon(element.type)

  return (
    <div
      ref={drag as any}
      className={`
        absolute select-none cursor-move
        w-48 min-h-20 p-3 rounded-lg border-2
        ${colorClasses}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${isDragging ? 'opacity-50' : 'hover:scale-105'}
        transition-all duration-300
      `}
      style={{
        left: element.position.x,
        top: element.position.y
      }}
      onClick={handleNodeClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="font-medium text-sm capitalize">{element.type}</span>
        </div>

        {/* Connection Points */}
        <div className="flex space-x-1">
          {/* Input connection point */}
          <div
            className={`w-3 h-3 rounded-full border-2 shadow-md cursor-pointer hover:scale-125 transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-blue-400/60 border-blue-300 hover:bg-blue-300 hover:border-blue-200'
                : 'bg-white/80 border-blue-400 hover:bg-blue-400'
            }`}
            onMouseDown={handleConnectionEnd}
            title="Input connection"
          ></div>
          {/* Output connection point */}
          <div
            className={`w-3 h-3 rounded-full border-2 shadow-md cursor-pointer hover:scale-125 transition-all duration-300 ${
              theme === 'dark'
                ? 'bg-green-400/60 border-green-300 hover:bg-green-300 hover:border-green-200'
                : 'bg-white/80 border-green-400 hover:bg-green-400'
            }`}
            onMouseDown={handleConnectionStart}
            title="Output connection"
          ></div>
        </div>
      </div>

      {/* Content */}
      <div className="text-sm">
        <div className="font-medium mb-1">{element.data.title}</div>
        {element.data.description && (
          <div className="text-xs opacity-75">{element.data.description}</div>
        )}
      </div>

      {/* Actions */}
      {isSelected && (
        <div className="absolute -top-8 -right-2 flex space-x-1">
          <button
            onClick={handleDelete}
            className="w-6 h-6 glass-card text-red-400 rounded-full flex items-center justify-center border border-white/20 hover:scale-110 hover:text-red-300 transition-all duration-300"
            title="Delete"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            className={`w-6 h-6 glass-card rounded-full flex items-center justify-center border border-white/20 hover:scale-110 transition-all duration-300 ${theme === 'dark' ? 'text-white/80 hover:text-white' : 'text-gray-600 hover:text-gray-800'}`}
            title="Edit"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

export default WorkflowNode