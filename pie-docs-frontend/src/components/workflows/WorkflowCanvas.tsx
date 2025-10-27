import React, { useRef, useCallback } from 'react'
import { useDrop } from 'react-dnd'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store'
import { addElement, setCanvasConfig, setSelectedElements } from '@/store/slices/workflowsSlice'
import type { WorkflowElement } from '@/store/slices/workflowsSlice'
import WorkflowNode from './WorkflowNode'
import ConnectionManager from './connections/ConnectionManager'
import { useTheme } from '@/contexts/ThemeContext'

interface WorkflowCanvasProps {
  className?: string
}

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({ className = '' }) => {
  const dispatch = useDispatch()
  const canvasRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  const { currentWorkflow, canvasConfig, selectedElements } = useSelector(
    (state: RootState) => state.workflows
  )

  const [{ isOver }, drop] = useDrop({
    accept: 'workflow-element',
    drop: (item: { type: WorkflowElement['type'] }, monitor) => {
      if (!monitor.didDrop()) {
        const offset = monitor.getClientOffset()
        const canvasRect = canvasRef.current?.getBoundingClientRect()

        if (offset && canvasRect) {
          const x = (offset.x - canvasRect.left - canvasConfig.pan.x) / canvasConfig.zoom
          const y = (offset.y - canvasRect.top - canvasConfig.pan.y) / canvasConfig.zoom

          const newElement: WorkflowElement = {
            id: `element-${Date.now()}`,
            type: item.type,
            position: { x, y },
            data: {
              title: `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Step`,
              description: ''
            }
          }

          dispatch(addElement(newElement))
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  })

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      dispatch(setSelectedElements([]))
    }
  }, [dispatch])

  const handleZoom = useCallback((delta: number) => {
    const newZoom = Math.max(0.1, Math.min(3, canvasConfig.zoom + delta))
    dispatch(setCanvasConfig({ zoom: newZoom }))
  }, [canvasConfig.zoom, dispatch])

  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    dispatch(setCanvasConfig({
      pan: {
        x: canvasConfig.pan.x + deltaX,
        y: canvasConfig.pan.y + deltaY
      }
    }))
  }, [canvasConfig.pan, dispatch])

  const handleFitToScreen = useCallback(() => {
    if (!currentWorkflow?.elements.length) return

    const bounds = currentWorkflow.elements.reduce(
      (acc, element) => ({
        minX: Math.min(acc.minX, element.position.x),
        minY: Math.min(acc.minY, element.position.y),
        maxX: Math.max(acc.maxX, element.position.x + 200),
        maxY: Math.max(acc.maxY, element.position.y + 100)
      }),
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
    )

    const canvasRect = canvasRef.current?.getBoundingClientRect()
    if (!canvasRect) return

    const contentWidth = bounds.maxX - bounds.minX
    const contentHeight = bounds.maxY - bounds.minY
    const padding = 50

    const scaleX = (canvasRect.width - padding * 2) / contentWidth
    const scaleY = (canvasRect.height - padding * 2) / contentHeight
    const scale = Math.min(scaleX, scaleY, 1)

    const centerX = canvasRect.width / 2 - (bounds.minX + contentWidth / 2) * scale
    const centerY = canvasRect.height / 2 - (bounds.minY + contentHeight / 2) * scale

    dispatch(setCanvasConfig({
      zoom: scale,
      pan: { x: centerX, y: centerY }
    }))
  }, [currentWorkflow?.elements, dispatch])

  drop(canvasRef)

  return (
    <div className={`relative overflow-hidden glass-panel h-full ${className}`}>
      {/* Canvas Controls */}
      <div className="absolute top-4 right-4 z-10 flex space-x-2">
        <button
          onClick={() => handleZoom(0.1)}
          className="px-3 py-2 glass-card border border-white/10 rounded hover:scale-105 transition-all duration-300"
          title="Zoom In"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        <button
          onClick={() => handleZoom(-0.1)}
          className="px-3 py-2 glass-card border border-white/10 rounded hover:scale-105 transition-all duration-300"
          title="Zoom Out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
        <button
          onClick={handleFitToScreen}
          className="px-3 py-2 glass-card border border-white/10 rounded hover:scale-105 transition-all duration-300"
          title="Fit to Screen"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button
          onClick={() => dispatch(setCanvasConfig({ gridEnabled: !canvasConfig.gridEnabled }))}
          className={`px-3 py-2 border border-white/10 rounded hover:scale-105 transition-all duration-300 ${
            canvasConfig.gridEnabled ? 'glass-panel text-blue-300' : 'glass-card'
          }`}
          title="Toggle Grid"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`w-full h-full cursor-grab ${isOver ? 'bg-blue-50' : ''}`}
        onClick={handleCanvasClick}
        style={{
          backgroundImage: canvasConfig.gridEnabled
            ? `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`
            : 'none',
          backgroundSize: `${20 * canvasConfig.zoom}px ${20 * canvasConfig.zoom}px`,
          backgroundPosition: `${canvasConfig.pan.x}px ${canvasConfig.pan.y}px`
        }}
      >
        {/* Connection Manager */}
        <div
          style={{
            transform: `translate(${canvasConfig.pan.x}px, ${canvasConfig.pan.y}px) scale(${canvasConfig.zoom})`,
            transformOrigin: '0 0'
          }}
        >
          <ConnectionManager />
        </div>

        {/* Workflow Elements */}
        <div
          style={{
            transform: `translate(${canvasConfig.pan.x}px, ${canvasConfig.pan.y}px) scale(${canvasConfig.zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {currentWorkflow?.elements.map((element) => (
            <WorkflowNode
              key={element.id}
              element={element}
              isSelected={selectedElements.includes(element.id)}
            />
          ))}
        </div>

        {/* Drop Zone Indicator */}
        {isOver && (
          <div className="absolute inset-0 bg-blue-400/20 border-2 border-dashed border-blue-400 flex items-center justify-center">
            <div className="glass-card px-4 py-2 rounded-lg border border-white/20">
              <p className={`font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>Drop workflow element here</p>
            </div>
          </div>
        )}
      </div>

      {/* Canvas Info */}
      <div className={`absolute bottom-4 left-4 glass-card px-3 py-2 rounded border border-white/10 text-sm ${theme === 'dark' ? 'text-white/80' : 'text-gray-600'}`}>
        Zoom: {Math.round(canvasConfig.zoom * 100)}% |
        Elements: {currentWorkflow?.elements.length || 0}
      </div>
    </div>
  )
}

export default WorkflowCanvas