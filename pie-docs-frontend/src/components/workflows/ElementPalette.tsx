import React from 'react'
import { useDrag } from 'react-dnd'
import type { WorkflowElement } from '@/store/slices/workflowsSlice'
import { useTheme } from '@/contexts/ThemeContext'

interface PaletteItemProps {
  type: WorkflowElement['type']
  title: string
  description: string
  icon: React.ReactNode
}

const PaletteItem: React.FC<PaletteItemProps> = ({ type, title, description, icon }) => {
  const { theme } = useTheme()
  const [{ isDragging }, drag] = useDrag({
    type: 'workflow-element',
    item: { type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  })

  return (
    <div
      ref={(node) => {
        drag(node)
      }}
      className={`
        p-3 border rounded-lg cursor-grab select-none
        glass-panel border-white/20
        ${isDragging ? 'opacity-50' : 'hover:scale-105'}
        transition-all duration-300
      `}
    >
      <div className="flex items-start space-x-3">
        <div className={`flex-shrink-0 mt-1 ${theme === 'dark' ? 'text-white/80' : 'text-gray-600'}`}>
          {icon}
        </div>
        <div className="flex-grow min-w-0">
          <h4 className={`text-sm font-medium mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{title}</h4>
          <p className={`text-xs leading-tight ${theme === 'dark' ? 'text-white/70' : 'text-gray-500'}`}>{description}</p>
        </div>
      </div>
    </div>
  )
}

interface ElementPaletteProps {
  className?: string
}

const ElementPalette: React.FC<ElementPaletteProps> = ({ className = '' }) => {
  const { theme } = useTheme()
  const workflowElements = [
    {
      type: 'approval' as const,
      title: 'Approval Step',
      description: 'Requires approval from assigned users before proceeding',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      type: 'review' as const,
      title: 'Review Step',
      description: 'Assigns reviewers to examine and provide feedback',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
    {
      type: 'notification' as const,
      title: 'Notification Step',
      description: 'Sends notifications to specified recipients',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM9 6l6 6-6 6H3l6-6-6-6h6z" />
        </svg>
      )
    },
    {
      type: 'decision' as const,
      title: 'Decision Step',
      description: 'Creates conditional branches based on criteria',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      type: 'timer' as const,
      title: 'Timer Step',
      description: 'Adds delays or time-based triggers to workflow',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ]

  return (
    <div className={`glass-panel border-r border-white/10 ${className}`}>
      <div className="p-4 border-b border-white/10">
        <h3 className={`text-lg font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Workflow Elements</h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-white/70' : 'text-gray-500'}`}>Drag elements to the canvas to build your workflow</p>
      </div>

      <div className="p-4 space-y-3 max-h-screen overflow-y-auto">
        {workflowElements.map((element) => (
          <PaletteItem
            key={element.type}
            type={element.type}
            title={element.title}
            description={element.description}
            icon={element.icon}
          />
        ))}
      </div>

      {/* Quick Tips */}
      <div className="p-4 border-t border-white/10 glass-card">
        <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white/90' : 'text-gray-700'}`}>Quick Tips</h4>
        <ul className={`text-xs space-y-1 ${theme === 'dark' ? 'text-white/70' : 'text-gray-600'}`}>
          <li>• Drag elements onto the canvas</li>
          <li>• Connect elements to create flow</li>
          <li>• Click to select and configure</li>
          <li>• Use grid snap for alignment</li>
        </ul>
      </div>
    </div>
  )
}

export default ElementPalette