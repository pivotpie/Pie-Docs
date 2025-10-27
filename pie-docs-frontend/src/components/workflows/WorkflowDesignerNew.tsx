/**
 * Redesigned Workflow Designer
 *
 * A complete rewrite of the workflow designer with:
 * - Simple mouse-based interactions (no react-dnd conflicts)
 * - Unified canvas with proper transforms
 * - Working node movement and connections
 * - Clear visual feedback
 */

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '@/store'
import { addElement, updateElement, removeElement, addConnection, removeConnection, setSelectedElements } from '@/store/slices/workflowsSlice'
import type { WorkflowElement, WorkflowConnection } from '@/store/slices/workflowsSlice'
import { useTheme } from '@/contexts/ThemeContext'
import { getElementByType } from './WorkflowElementTypes'

interface DragState {
  type: 'node' | 'canvas' | 'connection' | null
  nodeId?: string
  startX: number
  startY: number
  startNodeX?: number
  startNodeY?: number
  startPanX?: number
  startPanY?: number
  sourceNodeId?: string
}

interface TempPosition {
  [nodeId: string]: { x: number, y: number }
}

const WorkflowDesignerNew: React.FC = () => {
  const dispatch = useDispatch()
  const canvasRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  const { currentWorkflow, canvasConfig, selectedElements } = useSelector(
    (state: RootState) => state.workflows
  )

  // Card and connection point dimensions (must match rendered sizes)
  const CARD_WIDTH = 200        // w-[200px]
  const CARD_MIN_HEIGHT = 80    // min-h-[80px]
  const CONNECTION_POINT_SIZE = 24  // w-6 h-6 (1.5rem = 24px)
  const CONNECTION_POINT_RADIUS = CONNECTION_POINT_SIZE / 2  // 12px
  const OUTPUT_POINT_X_OFFSET = CARD_WIDTH + CONNECTION_POINT_RADIUS  // 212px
  const INPUT_POINT_X_OFFSET = 0  // Input point is centered at card's left edge

  // Local state for canvas interactions
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [connectionPreview, setConnectionPreview] = useState<{ from: { x: number, y: number }, to: { x: number, y: number }} | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [tempPositions, setTempPositions] = useState<TempPosition>({})

  // Debug: Log workflow state
  useEffect(() => {
    if (currentWorkflow) {
      console.log('📊 Workflow state:', {
        elements: currentWorkflow.elements.length,
        connections: currentWorkflow.connections.length,
        connectionsList: currentWorkflow.connections
      })
    }
  }, [currentWorkflow])

  // Convert screen coordinates to canvas coordinates
  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top - pan.y) / zoom
    }
  }, [pan, zoom])

  // Get element icon and color from the element type definitions
  const getElementIcon = (type: string) => {
    const elementDef = getElementByType(type)
    if (elementDef) {
      return elementDef.icon
    }
    // Fallback for unknown types
    return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
  }

  const getElementColor = (type: string) => {
    const elementDef = getElementByType(type)
    if (elementDef) {
      return `bg-gradient-to-br ${elementDef.color.from} ${elementDef.color.to} ${elementDef.color.border} ${elementDef.color.text}`
    }
    // Fallback for unknown types
    return 'bg-gradient-to-br from-slate-500/20 to-slate-600/30 border-slate-500/50 text-slate-400'
  }

  const getElementTextColor = (type: string) => {
    const elementDef = getElementByType(type)
    return elementDef?.color.text || 'text-slate-400'
  }

  // Handle mouse down on canvas
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // Only left click

    // Check if clicking on empty canvas (for panning)
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.workflow-canvas-bg')) {
      setDragState({
        type: 'canvas',
        startX: e.clientX,
        startY: e.clientY,
        startPanX: pan.x,
        startPanY: pan.y
      })
      dispatch(setSelectedElements([]))
    }
  }, [pan, dispatch])

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState) {
      // Update connection preview if creating connection
      if (connectionPreview) {
        const canvasPos = screenToCanvas(e.clientX, e.clientY)
        setConnectionPreview({
          from: connectionPreview.from,
          to: canvasPos
        })
      }
      return
    }

    if (dragState.type === 'canvas') {
      // Pan canvas
      const dx = e.clientX - dragState.startX
      const dy = e.clientY - dragState.startY
      setPan({
        x: (dragState.startPanX || 0) + dx,
        y: (dragState.startPanY || 0) + dy
      })
    } else if (dragState.type === 'node' && dragState.nodeId) {
      // Move node - update temp position only (no Redux dispatch)
      const dx = (e.clientX - dragState.startX) / zoom
      const dy = (e.clientY - dragState.startY) / zoom
      const newX = (dragState.startNodeX || 0) + dx
      const newY = (dragState.startNodeY || 0) + dy

      setTempPositions(prev => ({
        ...prev,
        [dragState.nodeId!]: { x: newX, y: newY }
      }))
    } else if (dragState.type === 'connection') {
      // Update connection preview
      const canvasPos = screenToCanvas(e.clientX, e.clientY)
      const sourceNode = currentWorkflow?.elements.find(el => el.id === dragState.sourceNodeId)
      if (sourceNode) {
        const from = { x: sourceNode.position.x + OUTPUT_POINT_X_OFFSET, y: sourceNode.position.y + CARD_MIN_HEIGHT / 2 }
        console.log('🖱️ Updating connection preview:', { from, to: canvasPos })
        setConnectionPreview({
          from,
          to: canvasPos
        })
      }
    }
  }, [dragState, zoom, dispatch, connectionPreview, screenToCanvas, currentWorkflow])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (dragState?.type === 'connection') {
      setConnectionPreview(null)
    }

    // If we were dragging a node, commit the position to Redux
    if (dragState?.type === 'node' && dragState.nodeId) {
      const tempPos = tempPositions[dragState.nodeId]
      const element = currentWorkflow?.elements.find(el => el.id === dragState.nodeId)

      if (tempPos && element) {
        // updateElement expects the COMPLETE element, not just changes
        dispatch(updateElement({
          ...element,
          position: tempPos
        }))
        // Clear temp position
        setTempPositions(prev => {
          const newPositions = { ...prev }
          delete newPositions[dragState.nodeId!]
          return newPositions
        })
      }
    }

    setDragState(null)
  }, [dragState, tempPositions, dispatch, currentWorkflow])

  // Handle node mouse down
  const handleNodeMouseDown = useCallback((e: React.MouseEvent, element: WorkflowElement) => {
    // Don't start dragging if clicking on connection point (safety check)
    if ((e.target as HTMLElement).closest('.connection-point')) {
      console.log('⚠️ Click on connection point detected in handleNodeMouseDown (should be handled by point)')
      return
    }

    e.stopPropagation()
    if (e.button !== 0) return

    // Ensure element has valid position
    if (!element.position) return

    console.log('🖱️ Starting node drag:', element.id)

    setDragState({
      type: 'node',
      nodeId: element.id,
      startX: e.clientX,
      startY: e.clientY,
      startNodeX: element.position.x || 0,
      startNodeY: element.position.y || 0
    })

    dispatch(setSelectedElements([element.id]))
  }, [dispatch])

  // Handle connection point click
  const handleConnectionPointClick = useCallback((e: React.MouseEvent, elementId: string, isOutput: boolean) => {
    e.stopPropagation()
    console.log('🔗 Connection point clicked:', { elementId, isOutput, dragState: dragState?.type })

    if (isOutput) {
      // Start connection
      const element = currentWorkflow?.elements.find(el => el.id === elementId)
      if (element) {
        const outputX = element.position.x + OUTPUT_POINT_X_OFFSET
        const outputY = element.position.y + CARD_MIN_HEIGHT / 2

        console.log('▶️ Starting connection from:', { elementId, from: { x: outputX, y: outputY } })

        setDragState({
          type: 'connection',
          sourceNodeId: elementId,
          startX: e.clientX,
          startY: e.clientY
        })
        setConnectionPreview({
          from: { x: outputX, y: outputY },
          to: { x: outputX, y: outputY }
        })
      }
    } else {
      // End connection
      if (dragState?.type === 'connection' && dragState.sourceNodeId && dragState.sourceNodeId !== elementId) {
        const newConnection: WorkflowConnection = {
          id: `conn-${Date.now()}`,
          sourceId: dragState.sourceNodeId,
          targetId: elementId
        }
        console.log('✅ Creating connection:', newConnection)
        dispatch(addConnection(newConnection))
        setConnectionPreview(null)
        setDragState(null)
      } else {
        console.log('❌ Cannot end connection:', {
          dragStateType: dragState?.type,
          sourceId: dragState?.sourceNodeId,
          targetId: elementId
        })
      }
    }
  }, [dragState, currentWorkflow, dispatch, OUTPUT_POINT_X_OFFSET, CARD_MIN_HEIGHT])

  // Handle delete element
  const handleDeleteElement = useCallback((e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()
    dispatch(removeElement(elementId))

    // Also remove connections involving this element
    // Support both sourceId/targetId and source/target formats
    currentWorkflow?.connections.forEach(conn => {
      const sourceId = (conn as any).sourceId || (conn as any).source
      const targetId = (conn as any).targetId || (conn as any).target

      if (sourceId === elementId || targetId === elementId) {
        dispatch(removeConnection(conn.id))
      }
    })
  }, [dispatch, currentWorkflow])

  // Handle zoom
  const handleZoom = useCallback((delta: number, centerX?: number, centerY?: number) => {
    setZoom(prev => Math.max(0.1, Math.min(3, prev + delta)))
  }, [])

  // Handle wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      handleZoom(delta, e.clientX, e.clientY)
    }
  }, [handleZoom])

  // Handle drop from palette
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('elementType') as WorkflowElement['type']
    if (!type) return

    const canvasPos = screenToCanvas(e.clientX, e.clientY)

    const newElement: WorkflowElement = {
      id: `element-${Date.now()}`,
      type,
      position: canvasPos,
      data: {
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Step`,
        description: ''
      }
    }

    dispatch(addElement(newElement))
  }, [screenToCanvas, dispatch])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // Render connection line
  const renderConnection = (conn: WorkflowConnection) => {
    // Support both sourceId/targetId and source/target formats for compatibility
    const sourceId = (conn as any).sourceId || (conn as any).source
    const targetId = (conn as any).targetId || (conn as any).target

    const source = currentWorkflow?.elements.find(el => el.id === sourceId)
    const target = currentWorkflow?.elements.find(el => el.id === targetId)

    // Ensure both elements exist and have valid positions
    if (!source || !target || !source.position || !target.position) {
      console.warn('❌ Cannot render connection:', { conn, sourceFound: !!source, targetFound: !!target })
      return null
    }

    console.log('✏️ Rendering connection:', { id: conn.id, from: sourceId, to: targetId })

    // Use temp positions if elements are being dragged
    const sourcePos = tempPositions[sourceId] || source.position
    const targetPos = tempPositions[targetId] || target.position

    // Calculate actual connection point positions
    // Output point: at right edge + radius = 212px from card left
    // Input point: at left edge center = 0px from card left
    // Y position: centered vertically at card's midpoint
    const x1 = (sourcePos?.x || 0) + OUTPUT_POINT_X_OFFSET  // Output point center (right side)
    const y1 = (sourcePos?.y || 0) + CARD_MIN_HEIGHT / 2
    const x2 = (targetPos?.x || 0) + INPUT_POINT_X_OFFSET  // Input point center (left side)
    const y2 = (targetPos?.y || 0) + CARD_MIN_HEIGHT / 2

    console.log('📐 Connection coordinates:', {
      id: conn.id,
      source: { x: sourcePos.x, y: sourcePos.y },
      target: { x: targetPos.x, y: targetPos.y },
      line: { x1, y1, x2, y2 }
    })

    // Calculate control points for curved line
    const dx = x2 - x1
    const controlX1 = x1 + dx * 0.5
    const controlX2 = x2 - dx * 0.5

    const isSelected = selectedElements.includes(conn.id)

    return (
      <g key={conn.id}>
        {/* Glow effect for selected connection */}
        {isSelected && (
          <path
            d={`M ${x1} ${y1} C ${controlX1} ${y1}, ${controlX2} ${y2}, ${x2} ${y2}`}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={8}
            opacity={0.3}
            className="pointer-events-none"
            filter="blur(4px)"
          />
        )}
        {/* Main connection line - DEBUG: Made super visible */}
        <path
          d={`M ${x1} ${y1} C ${controlX1} ${y1}, ${controlX2} ${y2}, ${x2} ${y2}`}
          fill="none"
          stroke="#ff0000"
          strokeWidth={10}
          markerEnd="url(#arrowhead-selected)"
          className="cursor-pointer hover:stroke-blue-400 transition-all duration-200"
          onClick={() => dispatch(setSelectedElements([conn.id]))}
          style={{
            pointerEvents: 'stroke',
            opacity: 1
          }}
        />
        {/* DEBUG: Also draw a simple straight line */}
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#00ff00"
          strokeWidth={5}
          opacity={0.8}
        />
        {conn.label && (
          <text
            x={(x1 + x2) / 2}
            y={(y1 + y2) / 2 - 10}
            fill={theme === 'dark' ? '#fff' : '#000'}
            fontSize="12"
            fontWeight="500"
            textAnchor="middle"
            className="pointer-events-none"
            style={{
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))'
            }}
          >
            {conn.label}
          </text>
        )}
      </g>
    )
  }

  if (!currentWorkflow) {
    return (
      <div className="flex items-center justify-center h-full glass-panel">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-white/40 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-white/70">No workflow selected</p>
          <p className="text-sm text-white/50 mt-2">Create a new workflow or select an existing one to start designing</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full overflow-hidden glass-panel">
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={() => handleZoom(0.1)}
          className="px-3 py-2 glass-card border border-white/10 rounded hover:scale-105 transition-all text-white"
          title="Zoom In"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>
        <button
          onClick={() => handleZoom(-0.1)}
          className="px-3 py-2 glass-card border border-white/10 rounded hover:scale-105 transition-all text-white"
          title="Zoom Out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
          </svg>
        </button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}
          className="px-3 py-2 glass-card border border-white/10 rounded hover:scale-105 transition-all text-white"
          title="Reset View"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Canvas Info */}
      <div className="absolute bottom-4 left-4 z-20 glass-card px-3 py-2 rounded border border-white/10 text-sm text-white/80">
        Zoom: {Math.round(zoom * 100)}% | Elements: {currentWorkflow.elements.length} | Connections: {currentWorkflow.connections.length}
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="workflow-canvas-bg w-full h-full cursor-grab active:cursor-grabbing relative"
        style={{
          background: `
            radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle, rgba(255,255,255,0.05) 1.5px, transparent 1.5px)
          `,
          backgroundSize: `100% 100%, 100% 100%, ${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `0 0, 0 0, ${pan.x}px ${pan.y}px`,
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.2)'
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {/* SVG Layer for connections */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0'
          }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="rgba(156, 163, 175, 0.8)" />
            </marker>
            <marker
              id="arrowhead-selected"
              markerWidth="12"
              markerHeight="8"
              refX="10"
              refY="4"
              orient="auto"
            >
              <polygon points="0 0, 12 4, 0 8" fill="#3b82f6" />
            </marker>
          </defs>

          {/* Render connections */}
          {currentWorkflow.connections.map(renderConnection)}

          {/* Connection preview */}
          {connectionPreview && (
            <g>
              {/* Glow for preview */}
              <line
                x1={connectionPreview.from.x}
                y1={connectionPreview.from.y}
                x2={connectionPreview.to.x}
                y2={connectionPreview.to.y}
                stroke="#3b82f6"
                strokeWidth={6}
                opacity={0.3}
                className="pointer-events-none"
                filter="blur(3px)"
              />
              {/* Main preview line */}
              <line
                x1={connectionPreview.from.x}
                y1={connectionPreview.from.y}
                x2={connectionPreview.to.x}
                y2={connectionPreview.to.y}
                stroke="#3b82f6"
                strokeWidth={3}
                strokeDasharray="8,4"
                className="pointer-events-none"
                style={{
                  filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))'
                }}
              />
            </g>
          )}
        </svg>

        {/* Elements Layer */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: 'max-content',
            height: 'max-content',
            minWidth: '100%',
            minHeight: '100%'
          }}
        >
          {currentWorkflow.elements.map(element => {
            // Skip elements without valid positions
            if (!element.position || typeof element.position.x !== 'number' || typeof element.position.y !== 'number') {
              console.warn('Element missing valid position:', element.id, element)
              return null
            }

            const isSelected = selectedElements.includes(element.id)
            const colorClass = getElementColor(element.type)
            const textColor = getElementTextColor(element.type)
            const iconPath = getElementIcon(element.type)
            const elementDef = getElementByType(element.type)

            // Support both 'title' and 'label' for backward compatibility
            const displayTitle = element.data?.title || (element.data as any)?.label || elementDef?.name || element.type

            // Use temp position if dragging, otherwise use actual position
            const position = tempPositions[element.id] || element.position

            return (
              <div
                key={element.id}
                className={`absolute w-[200px] min-h-[80px] p-3 rounded-lg border-2 cursor-move select-none backdrop-blur-sm ${colorClass}
                  ${isSelected ? 'ring-2 ring-blue-500 shadow-2xl scale-105' : 'hover:shadow-xl hover:scale-[1.02]'}
                  ${tempPositions[element.id] ? '' : 'transition-all duration-300 ease-out'}`}
                style={{
                  left: position.x,
                  top: position.y,
                  boxShadow: isSelected
                    ? '0 20px 40px rgba(0,0,0,0.3), 0 0 20px rgba(59, 130, 246, 0.5)'
                    : hoveredNode === element.id
                      ? '0 10px 30px rgba(0,0,0,0.25)'
                      : '0 4px 12px rgba(0,0,0,0.15)'
                }}
                onMouseDown={(e) => handleNodeMouseDown(e, element)}
                onMouseEnter={() => setHoveredNode(element.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className={`w-5 h-5 ${textColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
                    </svg>
                    <span className={`font-semibold text-xs ${textColor}`}>
                      {elementDef?.category.toUpperCase()}
                    </span>
                  </div>

                  {/* Delete button */}
                  {isSelected && (
                    <button
                      onClick={(e) => handleDeleteElement(e, element.id)}
                      className="text-red-400 hover:text-red-300 hover:scale-110 transition-all"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="text-sm text-white mb-2">
                  <div className="font-medium">{displayTitle}</div>
                  {element.data?.description && (
                    <div className="text-xs opacity-75 mt-1">{element.data.description}</div>
                  )}
                </div>

                {/* Connection Points */}
                <div className="absolute top-1/2 -translate-y-1/2 pointer-events-none">
                  {/* Input (left) */}
                  <div
                    className="connection-point absolute -left-3 w-6 h-6 bg-blue-500 rounded-full border-2 border-white cursor-pointer hover:scale-150 hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-200 shadow-lg pointer-events-auto z-50"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleConnectionPointClick(e, element.id, false)
                    }}
                    title="Input connection"
                    style={{
                      boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.7)',
                      animation: hoveredNode === element.id ? 'pulse-blue 1.5s infinite' : 'none'
                    }}
                  />

                  {/* Output (right) */}
                  <div
                    className="connection-point absolute -right-3 left-[200px] w-6 h-6 bg-green-500 rounded-full border-2 border-white cursor-pointer hover:scale-150 hover:shadow-2xl hover:shadow-green-500/50 transition-all duration-200 shadow-lg pointer-events-auto z-50"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleConnectionPointClick(e, element.id, true)
                    }}
                    title="Output connection - click to start connecting"
                    style={{
                      boxShadow: '0 0 0 0 rgba(34, 197, 94, 0.7)',
                      animation: hoveredNode === element.id ? 'pulse-green 1.5s infinite' : 'none'
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Help overlay */}
      {currentWorkflow.elements.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="glass-panel p-6 rounded-lg border border-white/20 text-center max-w-md">
            <h3 className="text-lg font-semibold text-white mb-2">Start Building Your Workflow</h3>
            <ul className="text-sm text-white/70 space-y-1 text-left">
              <li>• Drag elements from the left palette onto the canvas</li>
              <li>• Click and drag elements to reposition them</li>
              <li>• Click the green dot to start a connection</li>
              <li>• Click the blue dot on another element to complete the connection</li>
              <li>• Hold Ctrl/Cmd and scroll to zoom</li>
              <li>• Click and drag empty space to pan the canvas</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkflowDesignerNew
